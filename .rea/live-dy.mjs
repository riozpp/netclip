const parse = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'));
const j = await parse.json();
if (!j.ok) { console.log('PARSE FAIL', JSON.stringify(j.error)); process.exit(1); }
const v = j.data.videos[0];
console.log('解析 OK | 视频:', v.label, '| 地址前缀:', v.url.slice(0, 60));
const r = await fetch('https://qsy.20240225.xyz/api/proxy?u=' + encodeURIComponent(v.url) + '&name=' + encodeURIComponent('抖音视频'), { headers: { range: 'bytes=0-8191' } });
const buf = new Uint8Array(await r.arrayBuffer());
console.log('代理 status:', r.status, '| type:', r.headers.get('content-type'), '| 收到:', buf.length, '字节');
console.log('文件头:', [...buf.slice(4, 12)].map(b => String.fromCharCode(b)).join(''));
console.log('disposition:', r.headers.get('content-disposition'));
console.log('content-range:', r.headers.get('content-range'));
