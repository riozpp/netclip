import fs from 'node:fs';
let url = '';
for (let i = 0; i < 4 && !url; i++) {
  try {
    const r = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(25000) });
    const j = await r.json();
    url = j.data?.videos?.[0]?.url || '';
  } catch (e) { console.log('parse retry', i, e.name); }
}
if (!url) { console.log('no url'); process.exit(1); }
fs.writeFileSync('.rea/evidence/dy-url.txt', url);
console.log('url saved');
for (const size of [1200000, 3000000]) {
  try {
    const res = await fetch(url, { headers: { referer: 'https://www.douyin.com/', range: `bytes=0-${size}`, 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(40000) });
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync('.rea/evidence/dy-sample.mp4', buf);
    console.log('downloaded', res.status, buf.length);
    break;
  } catch (e) { console.log('media retry', e.name); }
}
