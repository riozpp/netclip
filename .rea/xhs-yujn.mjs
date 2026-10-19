const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const variants = [
  ['explore+token(url)', `https://api.yujn.cn/api/xhs.php?url=${encodeURIComponent(`https://www.xiaohongshu.com/explore/${id}?xsec_token=${encodeURIComponent(token)}`)}`],
  ['discovery+token(url)', `https://api.yujn.cn/api/xhs.php?url=${encodeURIComponent(`https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`)}`],
  ['explore no token', `https://api.yujn.cn/api/xhs.php?url=${encodeURIComponent(`https://www.xiaohongshu.com/explore/${id}`)}`],
  ['param link', `https://api.yujn.cn/api/xhs.php?link=${encodeURIComponent(`https://www.xiaohongshu.com/explore/${id}?xsec_token=${encodeURIComponent(token)}`)}`],
];
for (const [name, url] of variants) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0' } });
    const txt = await r.text();
    console.log(`\n[${name}] ${r.status} len=${txt.length}`);
    console.log('  ', txt.slice(0, 500).replace(/\s+/g, ' '));
  } catch (e) { console.log(`\n[${name}] ERR ${e.name}`); }
}
