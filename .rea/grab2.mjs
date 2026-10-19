import fs from 'node:fs';
const r = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(50000) });
const j = await r.json();
const v = j.data.videos[0];
const res = await fetch(v.url, { headers: { referer: 'https://www.douyin.com/', range: 'bytes=0-2500000', 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(45000) });
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync('.rea/evidence/dy-sample.mp4', buf);
console.log('直连下载', res.status, buf.length, '字节');
