const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
// 内容平台普遍对搜索引擎蜘蛛单独放行（用于生成搜索结果与分享卡片），
// 这是普通 UA 被登录墙拦下时唯一还能拿到 SSR 数据的通道。
const UA_SPIDER =
  'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)';

export const UA = { ios: UA_IOS, desktop: UA_DESKTOP, spider: UA_SPIDER };

export class ParseError extends Error {
  constructor(message, code = 'parse_failed', status = 422, detail) {
    super(message);
    this.code = code;
    this.status = status;
    if (detail) this.detail = detail;
  }
}

export async function request(url, options = {}) {
  const { timeout = 12000, headers = {}, ...rest } = options;
  // 这里有个非常反直觉的 Workers 行为：即使你的代码已经 return 了 Response，
  // 只要还有一个 fetch 挂着没结束，worker 就不会把响应发出去，客户端只能干等到那个
  // fetch 自己超时（实测代码层 3s 就返回了，用户 34s 才拿到响应）。
  // 所以超时后必须「真的 abort 掉连接」，光是 Promise.race 提前返回没用。
  const controller = new AbortController();
  const doFetch = fetch(url, {
    ...rest,
    headers: {
      'user-agent': UA_IOS,
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      ...headers,
    },
    signal: controller.signal,
  });
  try {
    return await withTimeout(doFetch, timeout, 'fetch_timeout');
  } catch (err) {
    try {
      controller.abort();
    } catch {
      /* 已经结束 */
    }
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.message === 'fetch_timeout') {
      throw new ParseError('上游响应超时，请稍后重试', 'upstream_timeout', 504);
    }
    throw new ParseError('无法连接上游平台，请检查链接或稍后重试', 'upstream_unreachable', 502);
  }
}

export async function requestJson(url, options = {}) {
  const res = await request(url, options);
  if (!res.ok) throw new ParseError(`上游返回 ${res.status}`, 'upstream_status', 502);
  const text = await res.text();
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new ParseError('上游返回内容无法解析', 'upstream_bad_payload', 502);
  }
}

export async function requestText(url, options = {}) {
  const res = await request(url, options);
  if (!res.ok) throw new ParseError(`上游返回 ${res.status}`, 'upstream_status', 502);
  return res.text();
}

export function extractJsonObject(text, markers) {
  for (const marker of markers) {
    const at = text.indexOf(marker);
    if (at < 0) continue;
    let i = text.indexOf('{', at);
    if (i < 0) continue;
    let depth = 0;
    let inString = false;
    for (let j = i; j < text.length; j += 1) {
      const ch = text[j];
      if (inString) {
        if (ch === '\\') j += 1;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const raw = text.slice(i, j + 1).replace(/:undefined/g, ':null');
          try {
            return JSON.parse(raw);
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

// Workers 上 res.text() 读某些响应会「拿到响应头后永久卡住」，而且此时事件循环被占住，
// 连 setTimeout 都不再触发（实测整条请求 60s 无响应、硬超时形同虚设）。
// 唯一可靠的做法是自己分块 read，每块之间重新计时，超时就 cancel 掉 reader。
export async function readTextSafe(res, ms, maxBytes = 4_000_000) {
  if (!res?.body) return '';
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  const deadline = Date.now() + ms;
  try {
    for (;;) {
      const remain = deadline - Date.now();
      if (remain <= 0) throw new Error('body_timeout');
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('body_timeout')), remain);
      });
      timeout.catch(() => {});
      let chunk;
      try {
        chunk = await Promise.race([reader.read(), timeout]);
      } finally {
        clearTimeout(timer);
      }
      if (chunk.done) break;
      chunks.push(chunk.value);
      total += chunk.value.length;
      if (total > maxBytes) throw new Error('body_too_large');
    }
  } finally {
    try {
      reader.cancel().catch(() => {});
    } catch {
      /* 已关闭 */
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

// 只读响应头就返回时必须把 body 关掉。不消费也不 cancel 的响应在 Workers 上
// 会一直占着连接，表现是「通道 500ms 就出结果，但整个请求要 15s 才返回」。
export function releaseBody(res) {
  try {
    res?.body?.cancel().catch(() => {});
  } catch {
    /* 已关闭 */
  }
}

export async function expandShortLink(url, { maxHops = 4, headers = {} } = {}) {
  let current = url;
  for (let i = 0; i < maxHops; i += 1) {
    const res = await request(current, { redirect: 'manual', headers, timeout: 9000 });
    const location = res.headers.get('location');
    if (!location) {
      releaseBody(res);
      return current;
    }
    releaseBody(res);
    current = new URL(location, current).toString();
  }
  return current;
}

export function pick(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      const found = value.find((item) => typeof item === 'string' && item.length > 0);
      if (found) return found;
      continue;
    }
    return value;
  }
  return '';
}

export function firstUrl(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const list = node.url_list || node.urlList || node.url;
  if (Array.isArray(list)) return list[0] || '';
  if (typeof list === 'string') return list;
  return '';
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// 给任意 promise 套一层硬超时。提前给原 promise 挂空 catch，
// 否则 race 落败方稍后 reject 时会变成 unhandled rejection，Workers 会直接杀掉整个请求。
export function withTimeout(promise, ms, message = 'timeout') {
  promise.catch(() => {});
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

// 上游接口不稳定，命中缓存可以同时降低延迟和对单一通道的依赖。
// Cache API 只在本边缘节点有效，同一份结果换地区就没了；绑定了 CACHE_KV 时优先走 KV，
// 让所有节点共享一份（小红书国际站对单出口有速率限制，这一点很关键）。
// KV 读写偶尔会挂住（实测有一次卡了 20s），所以两个方向都要封顶，不能让缓存拖死主流程。
// 只在 Workers 运行时启用（Node 本地测试既没有 caches 也没有 KV 绑定）。
export async function cacheRead(key, env) {
  const kv = env?.CACHE_KV;
  if (kv) {
    try {
      const hit = await withTimeout(kv.get(key, 'json'), 1500, 'kv_read_timeout');
      if (hit) return hit;
    } catch {
      /* KV 读失败或超时就退回 Cache API */
    }
  }
  if (typeof caches === 'undefined' || !caches.default) return null;
  try {
    const hit = await withTimeout(
      caches.default.match(new Request(`https://netclip.cache/${encodeURIComponent(key)}`)),
      1500,
      'cache_read_timeout',
    );
    return hit ? await withTimeout(hit.json(), 1500, 'cache_json_timeout') : null;
  } catch {
    return null;
  }
}

export async function cacheWrite(key, value, ttl = 300, env) {
  const kv = env?.CACHE_KV;
  if (kv) {
    try {
      // KV 的 expirationTtl 下限是 60 秒
      await withTimeout(
        kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttl) }),
        2500,
        'kv_write_timeout',
      );
    } catch {
      /* 写失败不影响主流程 */
    }
  }
  if (typeof caches === 'undefined' || !caches.default) return;
  try {
    await withTimeout(
      caches.default.put(
        new Request(`https://netclip.cache/${encodeURIComponent(key)}`),
        new Response(JSON.stringify(value), {
          headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` },
        }),
      ),
      2000,
      'cache_write_timeout',
    );
  } catch {
    /* 缓存失败不影响主流程 */
  }
}
