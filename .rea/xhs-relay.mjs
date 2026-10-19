const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const target = `https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`;
const e = encodeURIComponent(target);

const relays = [
  ['allorigins', `https://api.allorigins.win/raw?url=${e}`],
  ['codetabs', `https://api.codetabs.com/v1/proxy?quest=${e}`],
  ['corsproxy', `https://corsproxy.io/?url=${e}`],
  ['jina', `https://r.jina.ai/${target}`],
];
await Promise.all(relays.map(async ([n, url]) => {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'Mozilla/5.0' } });
    const t = await r.text();
    const has = ['__INITIAL_STATE__', 'noteData', 'noteDetailMap', 'og:title'].filter(m => t.includes(m));
    console.log(`[${n}] ${r.status} ${Date.now() - t0}ms len=${t.length} markers=${has.join(',') || 'none'}`);
    if (has.length) console.log('   hit!', t.slice(0, 120).replace(/\s+/g, ' '));
    else console.log('   head:', t.slice(0, 120).replace(/\s+/g, ' '));
  } catch (err) { console.log(`[${n}] ERR ${err.name} ${Date.now() - t0}ms`); }
}));
