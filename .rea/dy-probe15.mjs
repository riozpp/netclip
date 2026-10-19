import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const cases = [
  ['m.iesdouyin', `https://m.iesdouyin.com/share/video/${id}/`, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'],
  ['iesdouyin wm', `https://www.iesdouyin.com/share/video/${id}/?region=CN&mid=0&u_code=0&did=0`, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'],
];
for (const [name, url, ua] of cases) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000, redirect: 'follow' });
    const html = await r.text();
    console.log(`\n[${name}] ${r.status} len ${html.length} final ${r.url.slice(0,70)}`);
    for (const m of ['play_addr', 'item_list', 'videoInfoRes', 'mp4', 'RENDER_DATA']) {
      const i = html.indexOf(m);
      if (i >= 0) console.log('  ', m, '@', i);
    }
  } catch (e) { console.log(`\n[${name}] ERR ${e.code}`); }
}
