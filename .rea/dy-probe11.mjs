import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const ua = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
const at = html.indexOf('<video');
console.log('--- video tag context ---');
console.log(html.slice(at, at + 1500).replace(/\n/g, ' '));
console.log('\n--- all source/videoId refs ---');
for (const m of ['video_id', 'vid=', '/video/tos/', 'aweme/v1/play']) {
  const i = html.indexOf(m);
  console.log(m.padEnd(14), i >= 0 ? '@' + i + ' ' + html.slice(i, i + 100).replace(/\s+/g, ' ') : 'missing');
}
