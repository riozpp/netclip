import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// step1: get UIFID_TEMP from iesdouyin share page
const s = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const cookies = s.headers.getSetCookie?.() || [];
const map = {};
for (const c of cookies) { const kv = c.split(';')[0]; const i = kv.indexOf('='); map[kv.slice(0, i)] = kv.slice(i + 1); }
console.log('cookies:', Object.keys(map).join(','));
const uifid = map.UIFID_TEMP || '';
console.log('uifid len:', uifid.length);

const variants = [
  ['desktop+uifid header', 'https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=' + id, { 'user-agent': DESK, referer: `https://www.douyin.com/video/${id}`, uifid }],
  ['desktop+cookie', 'https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=' + id, { 'user-agent': DESK, referer: `https://www.douyin.com/video/${id}`, cookie: `ttwid=${map.ttwid || ''}; UIFID_TEMP=${uifid}` }],
  ['iesdouyin+uifid', 'https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=' + id + '&device_platform=webapp&aid=6383', { 'user-agent': DESK, referer: 'https://www.iesdouyin.com/', uifid }],
];
for (const [name, url, headers] of variants) {
  try {
    const r = await request(url, { headers, timeout: 15000 });
    const t = await r.text();
    console.log(`\n[${name}] ${r.status} len ${t.length} | ${t.slice(0, 120).replace(/\s+/g, ' ')}`);
    if (t.includes('play_addr')) console.log('  >>> HAS play_addr !');
  } catch (e) { console.log(`\n[${name}] ERR ${e.code} ${e.message}`); }
}
