const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const variants = [
  ['explore+token', `https://www.xiaohongshu.com/explore/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`],
  ['discovery+token', `https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`],
  ['explore no token', `https://www.xiaohongshu.com/explore/${id}`],
];
for (const [name, u] of variants) {
  try {
    const r = await fetch(`https://api.bugpk.com/api/xhs?url=${encodeURIComponent(u)}`, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
    const txt = await r.text();
    const j = JSON.parse(txt);
    console.log(`\n[${name}] ${r.status} code=${j.code} msg=${j.msg || '-'}`);
    if (j.code === 200 && j.data) {
      console.log('  data keys:', Object.keys(j.data).join(','));
      console.log('  title:', String(j.data.title || j.data.desc || '').slice(0, 50));
      console.log('  type:', j.data.type);
      console.log('  images:', (j.data.images || j.data.image_list || []).length);
      console.log('  video:', JSON.stringify(j.data.video || j.data.videos || '').slice(0, 200));
      console.log('  raw:', JSON.stringify(j.data).slice(0, 700));
    }
  } catch (e) { console.log(`\n[${name}] ERR ${e.name} ${e.message.slice(0, 60)}`); }
}
