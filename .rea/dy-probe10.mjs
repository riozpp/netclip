import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const ua = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
console.log('set-cookie:', r.headers.getSetCookie?.() || r.headers.get('set-cookie'));
for (const m of ['.mp4', 'play(', '/aweme/v1/play', '<video', 'src=']) {
  const i = html.indexOf(m);
  console.log(m.padEnd(16), i >= 0 ? '@' + i + ' -> ' + html.slice(i, i + 120).replace(/\s+/g, ' ') : 'missing');
}

console.log('\n--- cookie jar approach');
const jar = {};
const collect = (res) => { for (const c of (res.headers.getSetCookie?.() || [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar[kv.slice(0, i)] = kv.slice(i + 1); } };
const r2 = await request('https://www.douyin.com/', { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' }, timeout: 15000 });
collect(r2);
console.log('cookies after home:', Object.keys(jar).join(', ') || 'none');
const cookie = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
const r3 = await request(`https://www.douyin.com/aweme/v1/web/aweme/detail/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${id}`, {
  headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', referer: `https://www.douyin.com/video/${id}`, cookie },
  timeout: 15000,
});
const t3 = await r3.text();
console.log('detail status', r3.status, 'len', t3.length, t3.slice(0, 150).replace(/\s+/g, ' '));
