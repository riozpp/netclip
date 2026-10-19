const url = 'https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/');
for (let i = 1; i <= 2; i++) {
  const t0 = Date.now();
  const r = await fetch(url, { signal: AbortSignal.timeout(55000) });
  const j = await r.json();
  console.log(`#${i} ${r.status} ${Date.now() - t0}ms ok=${j.ok} 视频=${j.data?.videos?.length} 标题=${String(j.data?.title).slice(0, 20)}`);
  if (i === 1 && j.ok) {
    const v = j.data.videos[0];
    const pr = await fetch('https://qsy.20240225.xyz/api/proxy?u=' + encodeURIComponent(v.url) + '&name=' + encodeURIComponent('抖音视频'), { headers: { range: 'bytes=0-4095' }, signal: AbortSignal.timeout(30000) });
    const buf = new Uint8Array(await pr.arrayBuffer());
    console.log(`   代理 ${pr.status} ${pr.headers.get('content-type')} ${buf.length}B magic=${[...buf.slice(4, 12)].map(b => String.fromCharCode(b)).join('')}`);
    console.log('   disposition:', pr.headers.get('content-disposition'));
  }
}
