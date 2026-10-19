const p = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(50000) });
const j = await p.json();
const v = j.data.videos[0];
console.log('url ok', !!v.url);
for (const [label, rng] of [['range', 'bytes=0-2047'], ['none', null]]) {
  const t0 = Date.now();
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 30000);
    const r = await fetch('https://qsy.20240225.xyz/api/proxy?u=' + encodeURIComponent(v.url) + '&name=test', { headers: rng ? { range: rng } : {}, signal: c.signal });
    console.log(`[${label}] ${r.status} ${Date.now() - t0}ms ctype=${r.headers.get('content-type')} len=${r.headers.get('content-length')} cr=${r.headers.get('content-range')}`);
    const rd = r.body.getReader();
    const { value } = await rd.read();
    console.log('  chunk', value?.length, '|', value ? [...value.slice(4, 12)].map(b => String.fromCharCode(b)).join('') : '-');
    await rd.cancel();
    clearTimeout(timer);
  } catch (e) { console.log(`[${label}] ERR ${e.name} ${e.message} ${Date.now() - t0}ms`); }
}
