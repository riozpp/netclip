import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const ua = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
console.log('script tags:', scripts.length);
scripts.forEach((s, i) => {
  const attrs = s[1].slice(0, 120);
  const body = s[2].trim();
  console.log(`#${i} attrs="${attrs}" len=${body.length} head=${body.slice(0, 90).replace(/\s+/g, ' ')}`);
});
for (const m of ['video_','duration','播','cover','videoId','itemId']) {
  const idxs = []; let p = -1;
  while ((p = html.indexOf(m, p + 1)) >= 0 && idxs.length < 3) idxs.push(p);
  console.log(m.padEnd(9), idxs.join(',') || 'none');
}
