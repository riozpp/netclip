const short = 'https://xhslink.cn/o/1NEDFxum6cy';
const e = encodeURIComponent(short);
const list = [
  ['bugpk-xhs', `https://api.bugpk.com/api/xhs?url=${e}`],
  ['bugpk-xiaohongshu', `https://api.bugpk.com/api/xiaohongshu?url=${e}`],
  ['bugpk-redbook', `https://api.bugpk.com/api/redbook?url=${e}`],
  ['xingzhige', `https://api.xingzhige.com/API/xhs/?url=${e}`],
  ['lolimi', `https://api.lolimi.cn/API/xiaohongshu/?url=${e}`],
  ['pearktrue', `https://api.pearktrue.cn/api/xhs/?url=${e}`],
  ['52vmy', `https://api.52vmy.cn/api/video/xhs?url=${e}`],
  ['kxzjoker', `https://api.kxzjoker.cn/api/xhs?url=${e}`],
];
await Promise.all(list.map(async ([n, url]) => {
  const t0 = Date.now();
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
    const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
    clearTimeout(t);
    const txt = await r.text();
    let hint = '-';
    try {
      const j = JSON.parse(txt);
      const keys = Object.keys(j).slice(0, 6).join(',');
      const d = j.data || j;
      hint = keys + ' || data:' + (d && typeof d === 'object' ? Object.keys(d).slice(0, 8).join(',') : typeof d);
    } catch { hint = 'non-json'; }
    console.log(`[${n}] ${r.status} ${Date.now() - t0}ms ${hint}`);
    console.log('   ', txt.slice(0, 150).replace(/\s+/g, ' '));
  } catch (err) { console.log(`[${n}] ERR ${err.name} ${Date.now() - t0}ms`); }
}));
