const r = await fetch('https://qsy.20240225.xyz/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'), { signal: AbortSignal.timeout(30000) });
const j = await r.json();
j.data.videos.forEach(v => console.log('-', v.label));
