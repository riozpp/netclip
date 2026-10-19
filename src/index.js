import { PLATFORMS, ParseError, extractUrls, parseOne } from './resolvers/index.js';
import { proxyMedia } from './proxy.js';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = Number(globalThis.__PARSE_LIMIT || 60);
const hits = new Map();

function clientKey(request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'anonymous'
  );
}

async function checkLimit(request, env) {
  const key = clientKey(request);
  const now = Date.now();
  const limit = Number(env?.PARSE_LIMIT_PER_HOUR || MAX_PER_WINDOW);

  if (env?.RATE_KV) {
    const bucket = `rl:${key}:${Math.floor(now / WINDOW_MS)}`;
    const current = Number((await env.RATE_KV.get(bucket)) || 0);
    if (current >= limit) return { allowed: false, limit, remaining: 0, resetAt: (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS };
    await env.RATE_KV.put(bucket, String(current + 1), { expirationTtl: 3700 });
    return { allowed: true, limit, remaining: limit - current - 1, resetAt: (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS };
  }

  const entry = hits.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }
  if (entry.count >= limit) {
    hits.set(key, entry);
    return { allowed: false, limit, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  hits.set(key, entry);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
  }
  return { allowed: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    try {
      if (url.pathname === '/api/health') {
        return json({
          ok: true,
          service: 'netclip',
          version: '1.0.0',
          platforms: PLATFORMS.map((p) => p.key),
          time: new Date().toISOString(),
        });
      }

      if (url.pathname === '/api/platforms') {
        return json({ ok: true, data: PLATFORMS });
      }

      if (url.pathname === '/api/parse') {
        return await handleParse(request, env, url);
      }

      if (url.pathname === '/api/proxy') {
        return await proxyMedia(request, env);
      }

      if (url.pathname.startsWith('/api/')) {
        return json({ ok: false, error: { code: 'not_found', message: '接口不存在' } }, 404);
      }
    } catch (err) {
      if (err instanceof ParseError) {
        return json({ ok: false, error: { code: err.code, message: err.message, detail: err.detail } }, err.status);
      }
      return json({ ok: false, error: { code: 'internal_error', message: String(err?.message || err) } }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleParse(request, env, url) {
  let rawInput = '';
  if (request.method === 'GET') {
    rawInput = url.searchParams.get('url') || url.searchParams.get('text') || '';
  } else if (request.method === 'POST') {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => ({}));
      rawInput = Array.isArray(body.urls) ? body.urls.join('\n') : body.url || body.text || '';
    } else {
      rawInput = await request.text();
    }
  } else {
    return json({ ok: false, error: { code: 'method_not_allowed', message: '仅支持 GET / POST' } }, 405);
  }

  const urls = extractUrls(rawInput);
  if (!urls.length) {
    return json({ ok: false, error: { code: 'no_url', message: '没有识别到有效的链接，请粘贴完整的分享链接' } }, 400);
  }
  if (urls.length > 6) {
    return json({ ok: false, error: { code: 'too_many', message: '单次最多解析 6 条链接' } }, 400);
  }

  const quota = await checkLimit(request, env);
  if (!quota.allowed) {
    return json(
      {
        ok: false,
        error: {
          code: 'rate_limited',
          message: `解析次数已达上限（每小时 ${quota.limit} 次），请 ${new Date(quota.resetAt).toLocaleTimeString('zh-CN')} 后再试`,
        },
      },
      429,
      { 'retry-after': String(Math.ceil((quota.resetAt - Date.now()) / 1000)) },
    );
  }

  const settled = await Promise.all(
    urls.map(async (target) => {
      try {
        const data = await parseOne(target, env);
        return { ok: true, input: target, data };
      } catch (err) {
        return {
          ok: false,
          input: target,
          error: {
            code: err instanceof ParseError ? err.code : 'parse_failed',
            message: err?.message || '解析失败',
            detail: err?.detail,
          },
        };
      }
    }),
  );

  const success = settled.filter((item) => item.ok);
  return json(
    {
      ok: success.length > 0,
      count: success.length,
      failed: settled.length - success.length,
      quota: { limit: quota.limit, remaining: quota.remaining },
      data: success.length === 1 ? success[0].data : undefined,
      items: settled,
      error: success.length ? undefined : settled[0]?.error,
    },
    success.length ? 200 : settled[0]?.error?.code === 'unsupported_platform' ? 400 : 422,
  );
}
