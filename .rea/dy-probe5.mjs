import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const ua = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
console.log('len', html.length);
for (const m of ['play_addr','item_list','RENDER_DATA','__INITIAL_STATE__','_ROUTER_DATA','aweme_detail','videoInfoRes','苏北']) {
  const i = html.indexOf(m);
  console.log(m.padEnd(18), i >= 0 ? 'FOUND @' + i : 'missing');
}
const at = html.indexOf('苏北');
if (at > 0) console.log('\ncontext:', html.slice(Math.max(0, at - 600), at + 300).replace(/\s+/g, ' '));
