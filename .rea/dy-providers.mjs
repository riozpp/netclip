const u = 'https://www.douyin.com/video/7696894804868779298';
const e = encodeURIComponent(u);
const list = [
  ['lolimi', `https://api.lolimi.cn/API/douyin/api.php?url=${e}`],
  ['vvhan', `https://api.vvhan.com/api/douyin?url=${e}`],
  ['qsbye', `https://api.qsbye.cn/api/dy?url=${e}`],
  ['mxgf', `https://api.mxgf.cn/api/dy?url=${e}`],
  ['ocr168', `https://api.ocr168.cn/api/dsp?url=${e}`],
  ['bugpk', `https://api.bugpk.com/api/douyin?url=${e}`],
];
await Promise.all(list.map(async ([n, url]) => {
  const t0 = Date.now();
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
    const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
    clearTimeout(t);
    const txt = await r.text();
    let has = '-';
    try { const j = JSON.parse(txt); has = j?.data?.url ? 'HAS_URL' : (j?.data?.video ? 'HAS_VIDEO' : Object.keys(j).join('|').slice(0, 40)); } catch {}
    console.log(`[${n}] ${r.status} ${Date.now() - t0}ms ${has} | ${txt.slice(0, 90).replace(/\s+/g, ' ')}`);
  } catch (err) { console.log(`[${n}] ERR ${err.name} ${Date.now() - t0}ms`); }
}));
