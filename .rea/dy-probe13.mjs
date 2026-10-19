const short = 'https://v.douyin.com/DJUL3bv7jEA/';
const e = encodeURIComponent(short);
const cases = [
  ['xingzhige', `https://api.xingzhige.com/API/douyin/?url=${e}`],
  ['pearktrue', `https://api.pearktrue.cn/api/video/douyin/?url=${e}`],
  ['52vmy', `https://api.52vmy.cn/api/video/dy?url=${e}`],
  ['kxzjoker', `https://api.kxzjoker.cn/api/dy?url=${e}`],
  ['bugpk', `https://api.bugpk.com/api/douyin?url=${e}`],
];
for (const [name, url] of cases) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json,text/plain,*/*' } });
    clearTimeout(t);
    const txt = await r.text();
    console.log(`\n[${name}] ${r.status} len ${txt.length}`);
    console.log('  ', txt.slice(0, 260).replace(/\s+/g, ' '));
  } catch (err) { console.log(`\n[${name}] ERR ${err.name} ${err.message}`); }
}
