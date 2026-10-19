import { expandShortLink, request } from '../src/lib/http.js';

const short = 'https://v.douyin.com/DJUL3bv7jEA/';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

console.log('--- 1) expand short link');
try {
  const t = await expandShortLink(short, { headers: { referer: 'https://www.douyin.com/' } });
  console.log('resolved:', t);
} catch (e) { console.log('expand ERR', e.code, e.message); }

console.log('--- 2) raw redirect chain');
let cur = short;
for (let i = 0; i < 4; i++) {
  try {
    const r = await request(cur, { redirect: 'manual', headers: { referer: 'https://www.douyin.com/' }, timeout: 9000 });
    const loc = r.headers.get('location');
    console.log(i, r.status, loc ? '-> ' + loc.slice(0, 160) : '(no location)');
    if (!loc) break;
    cur = new URL(loc, cur).toString();
  } catch (e) { console.log('ERR', e.code, e.message); break; }
}
