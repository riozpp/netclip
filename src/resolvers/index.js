import {
  ParseError,
  UA,
  expandShortLink,
  firstUrl,
  pick,
  request,
  requestJson,
  requestText,
  extractJsonObject,
  toNumber,
} from '../lib/http.js';

export { ParseError };

const ID_PATTERNS = [
  /\/video\/(\d{6,})/,
  /\/note\/(\d{6,})/,
  /\/share\/video\/(\d{6,})/,
  /modal_id=(\d{6,})/,
  /aweme_id=(\d{6,})/,
  /item_ids=(\d{6,})/,
];

function findId(text) {
  for (const pattern of ID_PATTERNS) {
    const m = text.match(pattern);
    if (m) return m[1];
  }
  return '';
}

function normalizeDouyinItem(item) {
  if (!item) return null;
  const video = item.video || {};
  const rawPlay = firstUrl(video.play_addr) || firstUrl(video.play_addr_h264) || firstUrl(video.download_addr);
  const play = rawPlay ? rawPlay.replace('/playwm/', '/play/').replace('playwm', 'play') : '';
  const images = Array.isArray(item.images)
    ? item.images.map((img) => firstUrl(img)).filter(Boolean)
    : [];
  const cover = firstUrl(video.origin_cover) || firstUrl(video.cover) || firstUrl(video.dynamic_cover);
  const stat = item.statistics || {};
  const author = item.author || {};

  return {
    platform: 'douyin',
    platformName: '抖音',
    id: String(item.aweme_id || ''),
    type: images.length ? (play ? 'mixed' : 'image') : 'video',
    title: item.desc || '抖音作品',
    desc: item.desc || '',
    cover,
    duration: Math.round(toNumber(video.duration) / 1000) || 0,
    author: {
      name: pick(author.nickname, '抖音用户'),
      id: pick(author.unique_id, author.short_id),
      avatar: firstUrl(author.avatar_thumb) || firstUrl(author.avatar_medium),
    },
    stats: {
      play: toNumber(stat.play_count),
      like: toNumber(stat.digg_count),
      comment: toNumber(stat.comment_count),
      share: toNumber(stat.share_count),
    },
    videos: play
      ? [{ label: '无水印视频', url: play, ext: 'mp4', quality: 'origin' }]
      : [],
    images,
    music: item.music
      ? {
          title: pick(item.music.title, '原声'),
          url: firstUrl(item.music.play_url) || firstUrl(item.music.play_url_h265),
        }
      : null,
    sourceUrl: item.share_url || '',
  };
}

async function viaItemInfo(id) {
  const data = await requestJson(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${id}&a_bogus=`, {
    headers: { referer: 'https://www.iesdouyin.com/' },
  });
  const item = data?.item_list?.[0];
  if (!item) throw new ParseError('作品不存在或已删除', 'not_found', 404);
  return normalizeDouyinItem(item);
}

async function viaSharePage(id) {
  const html = await requestText(`https://www.iesdouyin.com/share/video/${id}/`, {
    headers: { referer: 'https://www.iesdouyin.com/' },
  });
  const router = extractJsonObject(html, ['window._ROUTER_DATA', '_ROUTER_DATA=']);
  const loader = router?.loaderData || {};
  const key = Object.keys(loader).find((k) => k.startsWith('video_')) || Object.keys(loader)[0];
  const item = loader?.[key]?.videoInfoRes?.item_list?.[0];
  if (!item) throw new ParseError('分享页未返回作品数据', 'not_found', 404);
  return normalizeDouyinItem(item);
}

async function viaFallback(id, env) {
  const base = env?.DOUYIN_FALLBACK_API;
  if (!base) throw new ParseError('抖音解析失败，请稍后再试', 'douyin_unavailable');
  const data = await requestJson(`${base}${base.includes('?') ? '&' : '?'}url=https://www.douyin.com/video/${id}`);
  const item = data?.data || data;
  if (!item?.play) throw new ParseError('备用通道无数据', 'douyin_fallback_empty');
  return {
    platform: 'douyin',
    platformName: '抖音',
    id,
    type: 'video',
    title: pick(item.title, item.desc, '抖音作品'),
    desc: pick(item.desc, ''),
    cover: pick(item.cover, item.origin_cover),
    duration: toNumber(item.duration),
    author: {
      name: pick(item.author, item.nickname, '抖音用户'),
      id: pick(item.uid, ''),
      avatar: pick(item.avatar, ''),
    },
    stats: { play: toNumber(item.play_count), like: toNumber(item.digg_count), comment: toNumber(item.comment_count), share: 0 },
    videos: [{ label: '无水印视频', url: item.play, ext: 'mp4', quality: 'origin' }],
    images: Array.isArray(item.images) ? item.images : [],
    music: item.music ? { title: item.music.title || '原声', url: item.music.play } : null,
    sourceUrl: item.url || '',
  };
}

export async function resolveDouyin(input, env) {
  let target = input;
  if (/v\.douyin\.com|v\.iesdouyin\.com|www\.iesdouyin\.com\/share/.test(target)) {
    target = await expandShortLink(target, { headers: { referer: 'https://www.douyin.com/' } });
  }
  const id = findId(target);
  if (!id) throw new ParseError('未能从链接中识别作品 ID，请使用完整分享链接', 'bad_url', 400);

  const strategies = [
    () => viaItemInfo(id),
    () => viaSharePage(id),
    () => viaFallback(id, env),
  ];
  let last;
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (result) return { ...result, id: result.id || id, sourceUrl: result.sourceUrl || target };
    } catch (err) {
      last = err;
    }
  }
  throw last || new ParseError('抖音解析失败', 'douyin_unavailable');
}

function normalizeTikTok(payload, sourceUrl) {
  const data = payload?.data;
  if (!data) throw new ParseError('TikTok 未返回数据', 'not_found', 404);
  const videos = [];
  const hd = pick(data.hdplay, data.play);
  const sd = pick(data.play, data.wmplay);
  if (hd) videos.push({ label: '无水印 · 高清', url: hd, ext: 'mp4', quality: 'hd' });
  if (sd && sd !== hd) videos.push({ label: '无水印 · 标清', url: sd, ext: 'mp4', quality: 'sd' });
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];

  return {
    platform: 'tiktok',
    platformName: 'TikTok',
    id: pick(String(data.id || ''), ''),
    type: images.length ? 'mixed' : 'video',
    title: pick(data.title, 'TikTok video'),
    desc: pick(data.title, ''),
    cover: pick(data.cover, data.origin_cover),
    duration: toNumber(data.duration),
    author: {
      name: pick(data.author?.nickname, data.author?.unique_id, 'TikTok user'),
      id: pick(data.author?.unique_id, ''),
      avatar: pick(data.author?.avatar, ''),
    },
    stats: {
      play: toNumber(data.play_count),
      like: toNumber(data.digg_count),
      comment: toNumber(data.comment_count),
      share: toNumber(data.share_count),
    },
    videos,
    images,
    music: data.music_info ? { title: pick(data.music_info.title, 'Original sound'), url: pick(data.music_info.play, '') } : null,
    sourceUrl,
  };
}

export async function resolveTikTok(input, env) {
  let target = input;
  if (/vt\.tiktok\.com|vm\.tiktok\.com/.test(target)) {
    target = await expandShortLink(target, { headers: { referer: 'https://www.tiktok.com/' } });
  }
  const endpoints = ['https://www.tikwm.com/api/?hd=1&url=', 'https://tikwm.com/api/?hd=1&url='];
  let last;
  for (const endpoint of endpoints) {
    try {
      const payload = await requestJson(`${endpoint}${encodeURIComponent(target)}`, {
        headers: { referer: 'https://www.tikwm.com/' },
        timeout: 15000,
      });
      if (payload?.code === 0 && payload.data) return normalizeTikTok(payload, target);
      last = new ParseError(payload?.msg || 'TikTok 解析通道返回异常', 'tiktok_upstream');
    } catch (err) {
      last = err;
    }
  }
  const fallback = env?.TIKTOK_FALLBACK_API;
  if (fallback) {
    const data = await requestJson(`${fallback}${fallback.includes('?') ? '&' : '?'}url=${encodeURIComponent(target)}`);
    if (data?.data) return normalizeTikTok({ data: data.data }, target);
  }
  throw last || new ParseError('TikTok 解析失败，请稍后重试', 'tiktok_unavailable');
}

export async function resolveXiaohongshu(input) {
  const target = input;
  const idMatch = target.match(/\/(?:explore|discovery\/item|item)\/([0-9a-f]{16,})/i) || target.match(/noteId=([0-9a-f]{16,})/i);
  const noteId = idMatch ? idMatch[1] : '';
  const url = noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : target;

  const html = await requestText(url, {
    headers: { referer: 'https://www.xiaohongshu.com/', 'user-agent': UA.desktop },
  });
  const state = extractJsonObject(html, ['window.__INITIAL_STATE__']);
  const detail = state?.note?.noteDetailMap || {};
  const key = noteId && detail[noteId] ? noteId : Object.keys(detail)[0];
  const note = key ? detail[key]?.note : null;
  if (!note) throw new ParseError('小红书笔记不存在，或需要登录态才能访问', 'not_found', 404);

  const videos = [];
  const stream = note.video?.media?.stream || {};
  for (const codec of ['h264', 'h265', 'av1']) {
    const list = stream[codec];
    if (Array.isArray(list) && list[0]?.masterUrl) {
      videos.push({ label: codec === 'h264' ? '无水印视频' : `无水印视频 · ${codec.toUpperCase()}`, url: list[0].masterUrl, ext: 'mp4', quality: codec });
      break;
    }
  }
  if (!videos.length && note.video?.consumer?.originVideoKey) {
    videos.push({
      label: '无水印视频',
      url: `https://sns-video-bd.xhscdn.com/${note.video.consumer.originVideoKey}`,
      ext: 'mp4',
      quality: 'origin',
    });
  }

  const images = (note.imageList || [])
    .map((img) => pick(img.urlDefault, img.urlPre, img.infoList?.[0]?.url))
    .filter(Boolean);

  return {
    platform: 'xiaohongshu',
    platformName: '小红书',
    id: noteId,
    type: videos.length ? (images.length ? 'mixed' : 'video') : 'image',
    title: pick(note.title, note.desc, '小红书笔记'),
    desc: pick(note.desc, ''),
    cover: pick(images[0], note.video?.image?.firstFrameFileid, ''),
    duration: 0,
    author: {
      name: pick(note.user?.nickname, '小红书用户'),
      id: pick(note.user?.userId, ''),
      avatar: pick(note.user?.avatar, ''),
    },
    stats: {
      play: 0,
      like: toNumber(String(pick(note.interactInfo?.likedCount, '0')).replace(/\D/g, '')),
      comment: toNumber(String(pick(note.interactInfo?.commentCount, '0')).replace(/\D/g, '')),
      share: toNumber(String(pick(note.interactInfo?.shareCount, '0')).replace(/\D/g, '')),
    },
    videos,
    images,
    music: null,
    sourceUrl: url,
  };
}

function biliCookie() {
  const hex = () => Math.random().toString(16).slice(2, 12).toUpperCase();
  return `buvid3=${hex()}-${hex()}-${hex()}-${hex()}infoc; b_nut=${Math.floor(Date.now() / 1000)};`;
}

function biliHeaders(referer = 'https://www.bilibili.com/') {
  return {
    'user-agent': UA.desktop,
    referer,
    origin: 'https://www.bilibili.com',
    cookie: biliCookie(),
    accept: 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
  };
}

async function biliView(query, bvid, env) {
  const viaProxy = Boolean(env?.BILI_PROXY);
  const proxy = viaProxy ? (u) => env.BILI_PROXY + encodeURIComponent(u) : (u) => u;

  try {
    const res = await request(proxy(`https://api.bilibili.com/x/web-interface/view?${query}`), {
      headers: biliHeaders(),
      timeout: 12000,
    });
    if (res.ok) {
      const payload = await res.json().catch(() => ({}));
      if (payload?.code === 0 && payload.data) return { info: payload.data, via: viaProxy ? 'proxy' : 'api' };
    }
  } catch {
    /* 落到 HTML 兜底 */
  }

  if (!bvid) throw new ParseError('B 站接口返回异常，请稍后重试', 'bili_blocked', 502);

  let html = '';
  try {
    html = await requestText(proxy(`https://www.bilibili.com/video/${bvid}/`), {
      headers: { ...biliHeaders(`https://www.bilibili.com/video/${bvid}/`), accept: 'text/html,application/xhtml+xml' },
      timeout: 15000,
    });
  } catch {
    html = '';
  }
  const state = extractJsonObject(html, ['window.__INITIAL_STATE__']);
  const video = state?.videoData;
  if (!video) {
    throw new ParseError(
      'B 站对当前出口 IP 做了风控（412）。可配置 BILI_PROXY 走转发通道，或改在网络环境正常的节点访问。',
      'bili_blocked',
      502,
    );
  }
  return { info: { ...video, bvid: video.bvid || bvid }, via: 'html' };
}

export async function resolveBilibili(input, env) {
  const bv = input.match(/(BV[0-9A-Za-z]{10})/);
  const av = input.match(/\/av(\d+)/i);
  const query = bv ? `bvid=${bv[1]}` : av ? `aid=${av[1]}` : '';
  if (!query) throw new ParseError('未能识别 B 站视频号', 'bad_url', 400);

  const { info } = await biliView(query, bv ? bv[1] : '', env);
  if (!info?.bvid) throw new ParseError('B 站视频不存在或已删除', 'not_found', 404);

  const cid = info.pages?.[0]?.cid || info.cid;
  const playQuery = `bvid=${info.bvid}&cid=${cid}`;

  let videos = [];
  const attempts = [
    `${playQuery}&qn=64&fnval=1&platform=html5&high_quality=1`,
    `${playQuery}&qn=32&fnval=0&platform=html5&high_quality=1`,
  ];
  for (const qs of attempts) {
    try {
      const target = `https://api.bilibili.com/x/player/playurl?${qs}`;
      const res = await request(env?.BILI_PROXY ? env.BILI_PROXY + encodeURIComponent(target) : target, {
        headers: biliHeaders(`https://www.bilibili.com/video/${info.bvid}`),
        timeout: 12000,
      });
      if (!res.ok) continue;
      const play = await res.json().catch(() => ({}));
      const durl = play?.data?.durl?.[0];
      if (durl?.url) {
        videos = [{ label: qs.includes('qn=64') ? '视频 · 720P' : '视频 · 360P', url: durl.url, ext: 'mp4', quality: '720p' }];
        break;
      }
    } catch {
      /* 尝试下一档 */
    }
  }

  return {
    platform: 'bilibili',
    platformName: '哔哩哔哩',
    id: info.bvid,
    type: 'video',
    title: info.title,
    desc: info.desc || '',
    cover: info.pic,
    duration: toNumber(info.duration),
    author: { name: pick(info.owner?.name, 'UP 主'), id: String(info.owner?.mid || ''), avatar: pick(info.owner?.face, '') },
    stats: { play: toNumber(info.stat?.view), like: toNumber(info.stat?.like), comment: toNumber(info.stat?.reply), share: toNumber(info.stat?.share) },
    videos,
    images: [],
    music: null,
    sourceUrl: `https://www.bilibili.com/video/${info.bvid}`,
    note: videos.length ? '' : 'B 站直链需要登录态或当前出口被限流，已回退为页面信息，可在源站播放。',
  };
}

export async function resolveInstagram(input) {
  const codeMatch = input.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  if (!codeMatch) throw new ParseError('未能识别 Instagram 短码', 'bad_url', 400);
  const code = codeMatch[1];
  const html = await requestText(`https://www.instagram.com/p/${code}/embed/captioned/`, {
    headers: { 'user-agent': UA.desktop, referer: 'https://www.instagram.com/' },
    timeout: 15000,
  });

  const unescape = (s) => s.replace(/\\u0026/g, '&').replace(/\\\//g, '/');
  const videoMatch = html.match(/"video_url":"([^"]+)"/);
  const imageMatch = html.match(/"display_url":"([^"]+)"/);
  const titleMatch = html.match(/"caption":"([^"]*)"/) || html.match(/<div class="Caption">([\s\S]*?)<\/div>/);
  const authorMatch = html.match(/"owner":\{[^}]*"username":"([^"]+)"/) || html.match(/"username":"([^"]+)"/);

  const videos = videoMatch ? [{ label: '视频', url: unescape(videoMatch[1]), ext: 'mp4', quality: 'origin' }] : [];
  const images = !videos.length && imageMatch ? [unescape(imageMatch[1])] : [];
  if (!videos.length && !images.length) {
    throw new ParseError('Instagram 返回登录墙，暂无法解析该贴文', 'login_wall', 403);
  }

  return {
    platform: 'instagram',
    platformName: 'Instagram',
    id: code,
    type: videos.length ? 'video' : 'image',
    title: pick((titleMatch?.[1] || '').replace(/<[^>]+>/g, '').slice(0, 120), 'Instagram post'),
    desc: '',
    cover: images[0] || '',
    duration: 0,
    author: { name: pick(authorMatch?.[1], 'Instagram user'), id: pick(authorMatch?.[1], ''), avatar: '' },
    stats: { play: 0, like: 0, comment: 0, share: 0 },
    videos,
    images,
    music: null,
    sourceUrl: `https://www.instagram.com/p/${code}/`,
  };
}

export const PLATFORMS = [
  { key: 'douyin', name: '抖音', hosts: ['douyin.com', 'iesdouyin.com'], color: '#000000' },
  { key: 'tiktok', name: 'TikTok', hosts: ['tiktok.com'], color: '#25F4EE' },
  { key: 'xiaohongshu', name: '小红书', hosts: ['xiaohongshu.com', 'xhslink.com'], color: '#FF2442' },
  { key: 'bilibili', name: '哔哩哔哩', hosts: ['bilibili.com', 'b23.tv'], color: '#FB7299' },
  { key: 'instagram', name: 'Instagram', hosts: ['instagram.com', 'instagr.am'], color: '#E1306C' },
];

export function detectPlatform(rawUrl) {
  let host = '';
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) || null;
}

const RESOLVERS = {
  douyin: resolveDouyin,
  tiktok: resolveTikTok,
  xiaohongshu: resolveXiaohongshu,
  bilibili: resolveBilibili,
  instagram: resolveInstagram,
};

export function extractUrls(text) {
  const found = String(text || '').match(/https?:\/\/[^\s"'<>，。、）)】]+/g) || [];
  const cleaned = found.map((u) => u.replace(/[.,;:!?]+$/, ''));
  return [...new Set(cleaned)];
}

export async function parseOne(rawUrl, env) {
  const platform = detectPlatform(rawUrl);
  if (!platform) {
    throw new ParseError('暂不支持该平台，目前支持抖音 / TikTok / 小红书 / B站 / Instagram', 'unsupported_platform', 400);
  }
  const resolver = RESOLVERS[platform.key];
  const result = await resolver(rawUrl, env);
  return {
    ...result,
    platform,
    fetchedAt: new Date().toISOString(),
  };
}
