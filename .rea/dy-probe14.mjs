const short = 'https://v.douyin.com/DJUL3bv7jEA/';
const r = await fetch(`https://api.bugpk.com/api/douyin?url=${encodeURIComponent(short)}`, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
const j = await r.json();
console.log(JSON.stringify(j, null, 2).slice(0, 3000));
