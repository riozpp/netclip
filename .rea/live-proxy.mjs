const parse = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(40000) });
const j = await parse.json();
const v = j.data.videos[0];
console.log('video url ok:', !!v?.url);
for (const [label, range] of [['range 0-1023', 'bytes=0-1023'], ['full head', null]]) {
  const t0 = Date.now();
  try {
    const c = new AbortController();
    const timer = setTimeout(() => c.abort(), 25000);
    const headers = range ? { range } : {};
    const r = await fetch('https://qsy.20240225.xyz/api/proxy?u=' + encodeURIComponent(v.url) + '&name=test', { headers, signal: c.signal });
    console.log(`[${label}] status ${r.status} type ${r.headers.get('content-type')} ct-length ${r.headers.get('content-length')} cr ${r.headers.get('content-range')} (${Date.now() - t0}ms)`);
    const reader = r.body.getReader();
    const { value } = await reader.read();
    console.log('  first chunk bytes:', value?.length, '| magic:', value ? [...value.slice(4, 12)].map(b => String.fromCharCode(b)).join('') : '-');
    await reader.cancel();
    clearTimeout(timer);
  } catch (e) {
    console.log(`[${label}] ERR ${e.name} ${e.message} (${Date.now() - t0}ms)`);
  }
}
