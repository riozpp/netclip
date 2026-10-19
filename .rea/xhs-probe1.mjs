import { request } from '../src/lib/http.js';
const short = 'https://xhslink.cn/o/1NEDFxum6cy';
const UA_DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

console.log('--- redirect chain');
let cur = short;
for (let i = 0; i < 5; i++) {
  try {
    const r = await request(cur, { redirect: 'manual', headers: { 'user-agent': UA_DESK, referer: 'https://www.xiaohongshu.com/' }, timeout: 12000 });
    const loc = r.headers.get('location');
    console.log(i, r.status, loc ? '-> ' + loc.slice(0, 140) : '(no loc) len=' + (await r.text()).length);
    if (!loc) break;
    cur = new URL(loc, cur).toString();
  } catch (e) { console.log(i, 'ERR', e.code || e.name, e.message); break; }
}
console.log('\nfinal:', cur);
