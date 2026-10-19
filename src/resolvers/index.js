import {
  ParseError,
  UA,
  cacheRead,
  cacheWrite,
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
    timeout: 8000,
  });
  const item = data?.item_list?.[0];
  if (!item) throw new ParseError('作品不存在或已删除', 'not_found', 404);
  return normalizeDouyinItem(item);
}

// 抖音自 2026 年起收紧了 web 接口：/aweme/v1/web/aweme/detail 需要 uifid + a_bogus 签名，
// 分享页也退化为客户端渲染，_ROUTER_DATA 里只剩壳。这里保留三条路径：
//   1) 老 iteminfo 接口（部分作品/区域仍可用，成本最低）
//   2) 公开解析通道（可换源，见 DOUYIN_FALLBACK_API）
//   3) SEO 结构化数据兜底（只出元数据，保证不返回「解析失败」）
const SPIDER_UA = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';

const SEO_DURATION = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/;

function parseIsoDuration(value) {
  const m = String(value || '').match(SEO_DURATION);
  if (!m) return 0;
  return toNumber(m[1]) * 3600 + toNumber(m[2]) * 60 + Math.round(toNumber(m[3]));
}

async function viaSeoPage(id) {
  const html = await requestText(`https://www.iesdouyin.com/share/video/${id}/`, {
    headers: { 'user-agent': SPIDER_UA, referer: 'https://www.iesdouyin.com/' },
  });

  for (const block of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let node;
    try {
      node = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const list = Array.isArray(node) ? node : [node];
    const video = list.find((entry) => entry && entry['@type'] === 'VideoObject');
    if (!video) continue;

    const creator = video.creator || {};
    const stats = { play: 0, like: 0, comment: toNumber(video.commentCount), share: 0 };
    for (const item of video.interactionStatistic || []) {
      const type = String(item?.interactionType?.['@type'] || item?.interactionType || '');
      if (type.includes('Like')) stats.like = toNumber(item.userInteractionCount);
      if (type.includes('View') || type.includes('Watch')) stats.play = toNumber(item.userInteractionCount);
    }
    const cover = Array.isArray(video.thumbnailUrl) ? video.thumbnailUrl[0] : video.thumbnailUrl;

    return {
      platform: 'douyin',
      platformName: '抖音',
      id,
      type: 'video',
      title: String(video.name || '').replace(/\s*-\s*抖音$/, '') || '抖音作品',
      desc: pick(video.description, ''),
      cover: pick(cover, ''),
      duration: parseIsoDuration(video.duration),
      author: { name: pick(creator.name, '抖音用户'), id: '', avatar: '' },
      stats,
      videos: [],
      images: [],
      music: null,
      sourceUrl: '',
      note: '已取到作品信息，但抖音已停止对外开放直链，视频请点击「打开原站」保存。',
    };
  }

  throw new ParseError('分享页未返回作品数据', 'not_found', 404);
}

function normalizeThirdParty(payload, id) {
  const root = payload?.data || payload?.result || payload;
  if (!root || typeof root !== 'object') throw new ParseError('备用通道无数据', 'douyin_fallback_empty');

  const authorNode = root.author ?? root.author_info ?? {};
  const author = typeof authorNode === 'string' ? { name: authorNode } : authorNode;
  const stat = root.statistics || root.stats || root.extra?.statistics || {};

  const videos = [];
  const main = pick(root.url, root.play, root.video_url, root.videoUrl, root.nwm_video_url, root.video);
  if (typeof main === 'string' && main) {
    videos.push({ label: '无水印 · 原画', url: main, ext: 'mp4', quality: 'origin' });
  }
  const backups = root.video_backup || root.videos || root.quality_list || [];
  if (Array.isArray(backups)) {
    for (const item of backups) {
      const url = typeof item === 'string' ? item : pick(item?.url, item?.play, '');
      if (!url || url === main) continue;
      const quality = pick(item?.quality, item?.gear_name, '');
      const size = pick(item?.size_label, '');
      const codec = pick(item?.codec, '');
      const label = ['无水印', quality || '备用', codec ? codec.toUpperCase() : '', size].filter(Boolean).join(' · ');
      videos.push({ label, url, ext: 'mp4', quality: quality || 'backup' });
    }
  }

  const rawImages = root.images || root.image_list || [];
  const images = (Array.isArray(rawImages) ? rawImages : [])
    .map((img) => (typeof img === 'string' ? img : pick(img?.url, img?.url_list?.[0], '')))
    .filter(Boolean);

  const musicNode = root.music;
  const music = musicNode
    ? {
        title: pick(musicNode.title, '原声'),
        url: pick(musicNode.url, musicNode.play, musicNode.play_url),
      }
    : null;

  if (!videos.length && !images.length) throw new ParseError('备用通道无直链', 'douyin_fallback_empty');

  return {
    platform: 'douyin',
    platformName: '抖音',
    id: pick(String(root.aweme_id || root.extra?.aweme_id || id), id),
    type: images.length ? (videos.length ? 'mixed' : 'image') : 'video',
    title: pick(root.title, root.desc, '抖音作品'),
    desc: pick(root.desc, root.title, ''),
    cover: pick(root.cover, root.origin_cover, root.cover_url),
    duration: Math.round(toNumber(root.duration) || toNumber(root.extra?.duration_ms) / 1000),
    author: {
      name: pick(author.name, author.nickname, root.nickname, '抖音用户'),
      id: pick(author.id, author.uid, ''),
      avatar: pick(author.avatar, author.avatar_url, ''),
    },
    stats: {
      play: toNumber(stat.play_count),
      like: toNumber(stat.digg_count ?? stat.like_count),
      comment: toNumber(stat.comment_count),
      share: toNumber(stat.share_count),
    },
    videos,
    images,
    music: music?.url ? music : null,
    sourceUrl: `https://www.douyin.com/video/${pick(String(root.aweme_id || id), id)}`,
  };
}

async function viaFallback(id, env) {
  const target = `https://www.douyin.com/video/${id}`;
  const providers = [];
  if (env?.DOUYIN_FALLBACK_API) {
    const base = env.DOUYIN_FALLBACK_API;
    providers.push(`${base}${base.includes('?') ? '&' : '?'}url=${encodeURIComponent(target)}`);
  }
  providers.push(`https://api.bugpk.com/api/douyin?url=${encodeURIComponent(target)}`);

  let last;
  for (const endpoint of providers) {
    try {
      const payload = await requestJson(endpoint, {
        headers: { 'user-agent': UA.desktop, accept: 'application/json', referer: 'https://www.douyin.com/' },
        timeout: 15000,
      });
      const code = Number(payload?.code);
      if (Number.isFinite(code) && code !== 0 && code !== 200) {
        throw new ParseError(pick(payload?.msg, '备用通道返回异常'), 'douyin_fallback_error');
      }
      return normalizeThirdParty(payload, id);
    } catch (err) {
      last = err;
    }
  }
  throw last || new ParseError('抖音解析失败，请稍后再试', 'douyin_unavailable');
}

export async function resolveDouyin(input, env) {
  let target = input;
  if (/v\.douyin\.com|v\.iesdouyin\.com|www\.iesdouyin\.com\/share/.test(target)) {
    target = await expandShortLink(target, { headers: { referer: 'https://www.douyin.com/' } });
  }
  const id = findId(target);
  if (!id) throw new ParseError('未能从链接中识别作品 ID，请使用完整分享链接', 'bad_url', 400);

  const cacheKey = `douyin:${id}`;
  const cached = await cacheRead(cacheKey);
  if (cached) return { ...cached, sourceUrl: cached.sourceUrl || target };

  const strategies = [
    () => viaItemInfo(id),
    () => viaFallback(id, env),
    () => viaSeoPage(id),
  ];
  let last;
  for (const strategy of strategies) {
    try {
      const result = await strategy();
      if (!result) continue;
      const merged = { ...result, id: result.id || id, sourceUrl: result.sourceUrl || target };
      // 只缓存真正拿到媒体的结果，避免把「仅元数据」状态固化 5 分钟
      if (merged.videos?.length || merged.images?.length) await cacheWrite(cacheKey, merged, 300);
      return merged;
    } catch (err) {
      last = err;
    }
  }
  if (last?.code === 'not_found' || last?.code === 'bad_url') throw last;
  throw new ParseError(
    '抖音通道暂时不可用，请稍后重试；也可以先打开原帖在线观看。',
    'douyin_unavailable',
    502,
  );
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

const XHS_NOTE_ID = /\/(?:explore|discovery\/item|item|board)\/([0-9a-f]{16,})/i;
const XHS_SHORT_HOSTS = ['xhslink.com', 'xhslink.cn', 'xhslink.net'];

// 小红书对机房 IP 段（含 Cloudflare 边缘）直接 302 到登录页，
// 这里借其它出口的中转服务代抓同一页面，再在本地解析 SSR 数据。
// Google 翻译对同一目标地址会按语言对分别缓存，多开几个语言相当于多几次机会。
const XHS_RELAYS = [
  { name: 'gt_en', build: (url) => gtRelay(url, 'auto', 'en', 'en') },
  { name: 'gt_tw', build: (url) => gtRelay(url, 'zh-CN', 'zh-TW', 'zh-TW') },
  { name: 'gt_ja', build: (url) => gtRelay(url, 'auto', 'ja', 'ja') },
  { name: 'allorigins', build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
];

function gtRelay(url, sl, tl, hl) {
  const u = new URL(url);
  const host = u.hostname.replace(/\./g, '-');
  return `https://${host}.translate.goog${u.pathname}${u.search}${u.search ? '&' : '?'}_x_tr_sl=${sl}&_x_tr_tl=${tl}&_x_tr_hl=${hl}`;
}

function isXhsShortLink(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return XHS_SHORT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function readXsecToken(url) {
  try {
    return new URL(url).searchParams.get('xsec_token') || '';
  } catch {
    return '';
  }
}

// 小红书从 2025 年起对笔记强制 xsec_token 校验：没有 token 的 explore 链接一律 307 到 404 页。
// token 只存在于 App「分享 → 复制链接」得到的短链里，所以短链必须逐跳展开并把 token 带走。
async function expandXhsShortLink(input) {
  let current = input;
  for (let hop = 0; hop < 5; hop += 1) {
    const res = await request(current, {
      redirect: 'manual',
      headers: { referer: 'https://www.xiaohongshu.com/', 'user-agent': UA.ios },
      timeout: 12000,
    });
    const location = res.headers.get('location');
    if (!location) break;
    const next = new URL(location, current).toString();
    if (XHS_NOTE_ID.test(next) || /xsec_token=/.test(next)) return next;
    // 登录墙会把原始链接塞进 redirectPath，URL 解码后仍可取到 noteId 与 token
    if (next.includes('redirectPath=')) {
      const decoded = decodeURIComponent(next);
      if (XHS_NOTE_ID.test(decoded) || /xsec_token=/.test(decoded)) return decoded;
    }
    current = next;
  }
  return current;
}

// 小红书互动数返回的是 "1.2万" / "3.4亿" 这类带单位的字符串，直接抽数字会差四个数量级
function parseCount(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const m = raw.match(/([\d.]+)\s*(万|亿|w|W)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = m[2];
  if (unit === '万' || unit === 'w' || unit === 'W') return Math.round(n * 10000);
  if (unit === '亿') return Math.round(n * 100000000);
  return Math.round(n);
}

export function normalizeXhsNote(note, noteId) {
  const stream = note.video?.media?.stream || note.video?.stream || {};
  const videos = [];
  const seen = new Set();

  const pushVideo = (rawUrl, codec, item) => {
    let url = String(rawUrl || '').trim();
    if (!url || seen.has(url)) return;
    if (url.startsWith('http://')) url = 'https://' + url.slice(7);
    seen.add(url);
    const label = codec === 'h264' ? '无水印视频' : `无水印视频 · ${codec.toUpperCase()}`;
    const size = toNumber(item?.size);
    videos.push({
      label: size ? `${label} · ${(size / 1048576).toFixed(1)}MB` : label,
      url,
      ext: 'mp4',
      quality: codec,
    });
  };

  for (const codec of ['h264', 'h265', 'av1', 'h266']) {
    const list = stream[codec];
    if (!Array.isArray(list) || !list.length) continue;
    const item = list.find((v) => v?.masterUrl) || list[0];
    pushVideo(item?.masterUrl || item?.backupUrls?.[0], codec, item);
  }
  if (!videos.length && note.video?.consumer?.originVideoKey) {
    pushVideo(`https://sns-video-bd.xhscdn.com/${note.video.consumer.originVideoKey}`, 'h264');
  }

  const images = (note.imageList || [])
    .map((img) => {
      const list = img.infoList || [];
      const preferred =
        list.find((i) => i?.imageScene === 'H5_DTL') ||
        list.find((i) => i?.imageScene === 'WB_DFT') ||
        list[0];
      let url = pick(preferred?.url, img.urlDefault, img.urlPre, img.url);
      if (!url && img.fileId) url = `https://sns-img-bd.xhscdn.com/${img.fileId}`;
      return String(url || '').replace(/^http:\/\//, 'https://');
    })
    .filter(Boolean);

  const title = String(note.title || '').trim();
  const desc = String(note.desc || '').trim();
  const fallbackTitle = desc.split('\n')[0].slice(0, 60) || '小红书笔记';
  const videoItems = stream.h264 || stream.h265 || stream.av1 || [];
  // capa.duration 是秒，stream[].duration 是毫秒，两者不能混着直接取
  const capaDuration = toNumber(note.video?.capa?.duration);
  const streamDuration = toNumber(videoItems[0]?.duration);
  let duration = 0;
  if (capaDuration > 0) duration = Math.round(capaDuration);
  else if (streamDuration > 1000) duration = Math.round(streamDuration / 1000);
  else if (streamDuration > 0) duration = Math.round(streamDuration);

  const isVideo = note.type === 'video' || videos.length > 0;

  return {
    platform: 'xiaohongshu',
    platformName: '小红书',
    id: noteId || note.noteId || '',
    type: isVideo ? (images.length > 1 ? 'mixed' : 'video') : 'image',
    title: pick(title, fallbackTitle),
    desc,
    cover: pick(images[0], ''),
    duration,
    author: {
      name: pick(note.user?.nickName, note.user?.nickname, '小红书用户'),
      id: pick(note.user?.userId, ''),
      avatar: String(pick(note.user?.avatar, '')).replace(/^http:\/\//, 'https://'),
    },
    stats: {
      play: 0,
      like: parseCount(note.interactInfo?.likedCount),
      comment: parseCount(note.interactInfo?.commentCount),
      share: parseCount(note.interactInfo?.shareCount),
    },
    videos,
    images,
    music: null,
    sourceUrl: noteId ? `https://www.xiaohongshu.com/explore/${noteId}` : '',
  };
}

export async function resolveXiaohongshu(input, env) {
  let target = input;
  let noteId = (target.match(XHS_NOTE_ID) || [])[1] || '';
  let token = readXsecToken(target);
  const trace = [];

  if (!noteId || !token) {
    try {
      const expanded = await expandXhsShortLink(target);
      if (expanded !== target) {
        target = expanded;
        if (!noteId) noteId = (target.match(XHS_NOTE_ID) || [])[1] || '';
        if (!token) token = readXsecToken(target);
      }
      trace.push(`expand:${noteId ? 'id' : 'noid'}/${token ? 'token' : 'notoken'}`);
    } catch (err) {
      trace.push(`expand_err:${err?.code || err?.name || 'unknown'}`);
    }
  }

  if (!noteId) {
    throw new ParseError(
      '未能识别小红书笔记 ID，请用 App 里的「分享 → 复制链接」重新获取',
      'bad_url',
      400,
      trace.join('|') || 'no_note_id',
    );
  }

  const cacheKey = `xhs:${noteId}`;
  const cached = await cacheRead(cacheKey);
  if (cached) return cached;

  const attempts = [];
  const push = (url, ua, tag, group, redirect = 'manual', timeout = 12000) =>
    attempts.push({ url, ua, tag, group, redirect, timeout });
  const shareUrl = (id) => `https://www.xiaohongshu.com/discovery/item/${id}`;
  const shareQuery = token ? `?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share` : '';

  // 直连只在住宅/本机出口有效，机房 IP 必被 302，所以只试一次，失败就把并发交给转发通道。
  push(`${shareUrl(noteId)}${shareQuery}`, UA.spider, 'direct', 'direct', 'manual', 7000);
  if (token) {
    if (env?.XHS_PROXY) {
      push(`${env.XHS_PROXY}${encodeURIComponent(`${shareUrl(noteId)}${shareQuery}`)}`, UA.desktop, 'own_proxy', 'relay', 'follow', 12000);
    }
    for (const relay of XHS_RELAYS) {
      try {
        push(relay.build(`${shareUrl(noteId)}${shareQuery}`), UA.desktop, relay.name, 'relay', 'follow', 9000);
      } catch {
        /* 忽略构造失败的转发通道 */
      }
    }
  }
  // 无 token 的直连只作为兜底：多数情况会 307 到 404，但部分老笔记仍可访问
  push(`https://www.xiaohongshu.com/explore/${noteId}`, UA.spider, 'expl_bare', 'last', 'manual', 7000);

  const finish = async (result) => {
    // 图片直链是按时段签名的，缓存时间要短于签名有效期
    await cacheWrite(cacheKey, result, 240);
    return result;
  };

  const runAttempt = async (attempt) => {
    let res;
    try {
      res = await request(attempt.url, {
        redirect: attempt.redirect,
        headers: { referer: 'https://www.xiaohongshu.com/', 'user-agent': attempt.ua },
        timeout: attempt.timeout,
      });
    } catch (err) {
      trace.push(`${attempt.tag}:err_${err?.code || err?.name || 'x'}`);
      return null;
    }
    if (res.status !== 200) {
      trace.push(`${attempt.tag}:${res.status}`);
      return null;
    }

    const html = await res.text();
    const state = extractJsonObject(html, ['window.__INITIAL_STATE__']);
    if (!state) {
      trace.push(`${attempt.tag}:200/no_state/len${html.length}`);
      return null;
    }
    const detailMap = state?.note?.noteDetailMap || {};
    const note =
      state?.noteData?.data?.noteData ||
      detailMap[noteId]?.note ||
      Object.values(detailMap).map((v) => v?.note).find(Boolean) ||
      null;
    if (!note) {
      trace.push(`${attempt.tag}:200/no_note/${Object.keys(state).slice(0, 5).join('+')}`);
      return null;
    }

    const result = normalizeXhsNote(note, noteId);
    if (!result.videos.length && !result.images.length) {
      trace.push(`${attempt.tag}:200/empty_media`);
      return null;
    }
    return result;
  };

  for (const attempt of attempts.filter((a) => a.group === 'direct')) {
    const result = await runAttempt(attempt);
    if (result) return finish(result);
  }

  // 转发通道并发跑，谁先拿到数据用谁，避免一个个超时叠加把请求拖到几十秒
  const relays = attempts.filter((a) => a.group === 'relay');
  if (relays.length) {
    try {
      const result = await Promise.any(
        relays.map((a) =>
          runAttempt(a).then((value) => {
            if (!value) throw new Error('miss');
            return value;
          }),
        ),
      );
      if (result) return finish(result);
    } catch {
      /* 全部通道失败，落到下面的兜底与报错 */
    }
  }

  for (const attempt of attempts.filter((a) => a.group === 'last')) {
    const result = await runAttempt(attempt);
    if (result) return finish(result);
  }

  throw new ParseError(
    token
      ? '小红书拒绝了这次请求，链接可能已过期，请在 App 里重新「分享 → 复制链接」'
      : '该小红书链接缺少访问凭证（xsec_token），请在 App 里用「分享 → 复制链接」重新获取',
    'xhs_need_token',
    422,
    trace.join('|') || 'no_attempt',
  );
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
  { key: 'xiaohongshu', name: '小红书', hosts: ['xiaohongshu.com', 'rednote.com', 'xhslink.com', 'xhslink.cn', 'xhslink.net'], color: '#FF2442' },
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
