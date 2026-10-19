import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const cases = [
  ['iesdouyin web detail', `https://www.iesdouyin.com/aweme/v1/web/aweme/detail/?aweme_id=${id}&device_platform=webapp&aid=6383`, {}],
  ['douyin web detail', `https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${id}`, { 'user-agent': DESK, referer: `https://www.douyin.com/video/${id}` }],
  ['iesdouyin iteminfo2', `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${id}`, { 'user-agent': DESK, referer: 'https://www.iesdouyin.com/' }],
  ['m.douyin share', `https://m.douyin.com/share/video/${id}`, { 'user-agent': DESK }],
  ['douyin html', `https://www.douyin.com/video/${id}`, { 'user-agent': DESK }],
];

for (const [name, url, headers] of cases) {
  try {
    const r = await request(url, { headers, timeout: 15000, redirect: 'follow' });
    const t = await r.text();
    console.log(`\n[${name}] status ${r.status} len ${t.length} final ${r.url.slice(0, 90)}`);
    console.log('  head:', t.slice(0, 180).replace(/\s+/g, ' '));
    for (const m of ['play_addr', 'item_list', 'aweme_detail', 'RENDER_DATA', '_ROUTER_DATA', 'status_code']) {
      const i = t.indexOf(m);
      if (i >= 0) console.log('  marker', m, '@', i);
    }
  } catch (e) { console.log(`\n[${name}] ERR`, e.code, e.message); }
}
