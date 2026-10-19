const short = 'https://v.douyin.com/DJUL3bv7jEA/';
const r = await fetch(`https://api.bugpk.com/api/douyin?url=${encodeURIComponent(short)}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
const j = await r.json();
console.log('root keys:', Object.keys(j));
console.log('data keys:', Object.keys(j.data || {}));
console.log('extra keys:', Object.keys(j.data?.extra || {}));
console.log('extra statistics:', JSON.stringify(j.data?.extra?.statistics));
console.log('video_backup count:', j.data?.video_backup?.length);
console.log('qualities:', (j.data?.video_backup||[]).map(v => `${v.quality}|${v.size_label}|${v.width}x${v.height}`).join(' , '));
console.log('music:', JSON.stringify(j.data?.music));
// 也试一下带完整文本入参
const r2 = await fetch(`https://api.bugpk.com/api/douyin?url=${encodeURIComponent('https://www.douyin.com/video/7696894804868779298')}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
const j2 = await r2.json();
console.log('\nfull-url variant code:', j2.code, 'url?', !!j2.data?.url);
