const short = 'https://xhslink.cn/o/1NEDFxum6cy';
const full = 'https://www.xiaohongshu.com/explore/6ad5d3420000000027015614?xsec_token=CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ%3D';
const e1 = encodeURIComponent(short);
const e2 = encodeURIComponent(full);
const list = [
  ['bugpk-video-xhs', `https://api.bugpk.com/api/video?url=${e1}`],
  ['bugpk-parse', `https://api.bugpk.com/api/parse?url=${e1}`],
  ['iiilab', `https://api.iiilab.com/api/v1/xhs?url=${e2}`],
  ['zhangyazhou', `https://api.zhangyazhou.com/api/xhs/?url=${e1}`],
  ['oioweb', `https://api.oioweb.cn/api/common/xhs?url=${e1}`],
  ['nki', `https://api.nki.pw/api/xhs?url=${e1}`],
  ['abdd', `https://api.abdd.cn/api/xhs?url=${e1}`],
  ['yujn', `https://api.yujn.cn/api/xhs.php?url=${e1}`],
];
const out = await Promise.all(list.map(async ([n, url]) => {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
    const txt = await r.text();
    let hint = txt.slice(0, 100).replace(/\s+/g, ' ');
    try { const j = JSON.parse(txt); hint = 'code=' + (j.code ?? j.status ?? '-') + ' msg=' + (j.msg || j.message || '-') + ' keys=' + Object.keys(j).slice(0, 5).join(','); } catch {}
    return `[${n}] ${r.status} ${Date.now() - t0}ms ${hint}`;
  } catch (err) { return `[${n}] ERR ${err.name} ${Date.now() - t0}ms`; }
}));
out.forEach(l => console.log(l));
