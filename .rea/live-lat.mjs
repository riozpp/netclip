for (let i = 0; i < 3; i++) {
  const t0 = Date.now();
  try {
    const r = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(55000) });
    const j = await r.json();
    console.log(`#${i + 1} ${r.status} ${Date.now() - t0}ms ok=${j.ok} videos=${j.data?.videos?.length ?? '-'} err=${j.error?.code || '-'}`);
  } catch (e) {
    console.log(`#${i + 1} ERR ${e.name} ${Date.now() - t0}ms`);
  }
}
