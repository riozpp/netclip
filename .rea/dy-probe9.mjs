const short = 'https://v.douyin.com/DJUL3bv7jEA/';
const full = 'https://www.douyin.com/video/7696894804868779298';
const cases = [
  ['douyin.wtf', `https://api.douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(full)}&minimal=true`],
  ['tikwm-douyin', `https://www.tikwm.com/api/?url=${encodeURIComponent(short)}`],
  ['tikwm-douyin2', `https://api.tikwm.com/api/?url=${encodeURIComponent(full)}`],
];
for (const [name, url] of cases) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 20000);
    const r = await fetch(url, { signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
    clearTimeout(t);
    const txt = await r.text();
    console.log(`\n[${name}] ${r.status} len ${txt.length}`);
    console.log('  ', txt.slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) { console.log(`\n[${name}] ERR ${e.name} ${e.message}`); }
}
