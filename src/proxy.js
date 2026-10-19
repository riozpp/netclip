import { UA } from './lib/http.js';

const ALLOWED_HOSTS = [
  'douyin.com',
  'douyinpic.com',
  'douyinvod.com',
  'douyincdn.com',
  'iesdouyin.com',
  'byteimg.com',
  'bytecdn.cn',
  'bytedance.com',
  'pstatp.com',
  'snssdk.com',
  'zjcdn.com',
  'ibytedtos.com',
  'tiktok.com',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokv.com',
  'tikwm.com',
  'xiaohongshu.com',
  'xhscdn.com',
  'sns-video-bd.xhscdn.com',
  'bilibili.com',
  'bilivideo.com',
  'hdslb.com',
  'akamaized.net',
  'cdninstagram.com',
  'fbcdn.net',
  'scontent.cdninstagram.com',
];

const REFERERS = {
  'douyin.com': 'https://www.douyin.com/',
  'iesdouyin.com': 'https://www.iesdouyin.com/',
  'douyinpic.com': 'https://www.douyin.com/',
  'douyinvod.com': 'https://www.douyin.com/',
  'byteimg.com': 'https://www.douyin.com/',
  'tiktok.com': 'https://www.tiktok.com/',
  'tiktokcdn.com': 'https://www.tiktok.com/',
  'tikwm.com': 'https://www.tikwm.com/',
  'xiaohongshu.com': 'https://www.xiaohongshu.com/',
  'xhscdn.com': 'https://www.xiaohongshu.com/',
  'bilibili.com': 'https://www.bilibili.com/',
  'bilivideo.com': 'https://www.bilibili.com/',
  'hdslb.com': 'https://www.bilibili.com/',
  'cdninstagram.com': 'https://www.instagram.com/',
  'fbcdn.net': 'https://www.instagram.com/',
};

function hostAllowed(host) {
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function refererFor(host) {
  const entry = Object.keys(REFERERS).find((key) => host === key || host.endsWith(`.${key}`));
  return entry ? REFERERS[entry] : undefined;
}

function safeName(name, fallback) {
  const base = String(name || '')
    .replace(/[\\/:*?"<>|\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return base ? `${base}.${fallback}` : `media.${fallback}`;
}

function guessExt(contentType, urlPath) {
  const fromPath = (urlPath.split('.').pop() || '').toLowerCase();
  if (['mp4', 'm4a', 'mp3', 'jpg', 'jpeg', 'png', 'webp', 'mov'].includes(fromPath)) return fromPath;
  if (contentType.includes('video/mp4')) return 'mp4';
  if (contentType.includes('audio')) return 'm4a';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('image')) return 'jpg';
  return 'mp4';
}

export async function proxyMedia(request, env) {
  const url = new URL(request.url);
  const target = url.searchParams.get('u');
  if (!target) return new Response('missing u', { status: 400 });

  let remote;
  try {
    remote = new URL(target);
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (!/^https?:$/.test(remote.protocol) || !hostAllowed(remote.hostname.toLowerCase())) {
    return new Response('host not allowed', { status: 403 });
  }

  const range = request.headers.get('range');
  const headers = {
    'user-agent': UA.ios,
    accept: '*/*',
    'accept-encoding': 'identity',
  };
  const referer = refererFor(remote.hostname.toLowerCase());
  if (referer) headers.referer = referer;
  if (range) headers.range = range;

  const upstream = await fetch(remote.toString(), { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const ext = guessExt(contentType, remote.pathname);
  const nameParam = url.searchParams.get('name');
  const filename = safeName(nameParam, ext);
  const inline = url.searchParams.get('inline') === '1';

  const out = new Headers();
  out.set('content-type', contentType);
  out.set('cache-control', 'public, max-age=3600');
  out.set('accept-ranges', 'bytes');
  if (!inline) {
    out.set(
      'content-disposition',
      `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
  }
  const length = upstream.headers.get('content-length');
  if (length) out.set('content-length', length);
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) out.set('content-range', contentRange);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
