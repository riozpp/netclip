const base = 'https://qsy.20240225.xyz';
const text = '本人和朋友买了两张10.17常州gapday音乐节的票，官方… https://xhslink.cn/o/1NEDFxum6cy 戳进【小红书】阅读这篇分享笔记~';
for (let i = 1; i <= 3; i++) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/api/parse?text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(60000) });
    const j = await r.json();
    const ms = Date.now() - t0;
    if (!j.ok) { console.log(`#${i} ${r.status} ${ms}ms FAIL ${JSON.stringify(j.items?.[0]?.error || j.error)}`); continue; }
    const d = j.data;
    console.log(`#${i} ${r.status} ${ms}ms ok | ${d.platformName} | ${d.type} | img=${d.images.length} vid=${d.videos.length}`);
    console.log('   标题:', d.title.slice(0, 30), '| 作者:', d.author.name, '| 赞:', d.stats.like);
    console.log('   图片域名:', (d.images[0] || '').split('/')[2], '| 源:', d.sourceUrl);
    if (i === 1) {
      const pr = await fetch(`${base}/api/proxy?u=${encodeURIComponent(d.images[0])}&name=${encodeURIComponent('小红书图片')}`, { signal: AbortSignal.timeout(40000) });
      const buf = new Uint8Array(await pr.arrayBuffer());
      console.log(`   代理: ${pr.status} ${pr.headers.get('content-type')} ${buf.length}B magic=${buf[0].toString(16)}${buf[1].toString(16)}`);
    }
  } catch (e) { console.log(`#${i} ERR ${e.name} ${Date.now() - t0}ms`); }
}
