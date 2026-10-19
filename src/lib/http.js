const UA_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export const UA = { ios: UA_IOS, desktop: UA_DESKTOP };

export class ParseError extends Error {
  constructor(message, code = 'parse_failed', status = 422) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function request(url, options = {}) {
  const { timeout = 12000, headers = {}, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      ...rest,
      headers: {
        'user-agent': UA_IOS,
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        ...headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ParseError('上游响应超时，请稍后重试', 'upstream_timeout', 504);
    throw new ParseError('无法连接上游平台，请检查链接或稍后重试', 'upstream_unreachable', 502);
  } finally {
    clearTimeout(timer);
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

export async function expandShortLink(url, { maxHops = 4, headers = {} } = {}) {
  let current = url;
  for (let i = 0; i < maxHops; i += 1) {
    const res = await request(current, { redirect: 'manual', headers, timeout: 9000 });
    const location = res.headers.get('location');
    if (!location) return current;
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
