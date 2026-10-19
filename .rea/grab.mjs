import fs from 'node:fs';
const r = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(50000) });
const j = await r.json();
const v = j.data.videos[0];
console.log('下载:', v.label);
const res = await fetch('https://qsy.20240225.xyz/api/proxy?u=' + encodeURIComponent(v.url) + '&name=check', { headers: { range: 'bytes=0-6000000' }, signal: AbortSignal.timeout(60000) });
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync('.rea/evidence/dy-sample.mp4', buf);
console.log('已保存', buf.length, '字节');
