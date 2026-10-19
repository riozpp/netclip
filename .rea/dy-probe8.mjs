import { request } from '../src/lib/http.js';
const id = '7696894804868779298';
const ua = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
console.log(scripts[1][2].trim());
