const base = 'https://qsy.20240225.xyz';
const text = '本人和朋友买了两张10.17常州gapday音乐节的票，官方… https://xhslink.cn/o/1NEDFxum6cy 戳进【小红书】阅读这篇分享笔记~';

for (let i = 1; i <= 2; i++) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/parse?text=${encodeURIComponent(text)}`, { signal: AbortSignal.timeout(50000) });
  const j = await r.json();
  console.log(`#${i} ${r.status} ${Date.now() - t0}ms ok=${j.ok}`);
  if (!j.ok) { console.log('  error:', JSON.stringify(j.error)); continue; }
  const d = j.data;
  console.log('  平台:', d.platformName, '| 类型:', d.type, '| 图片:', d.images.length, '| 视频:', d.videos.length);
  console.log('  标题:', String(d.title).slice(0, 40));
  console.log('  作者:', d.author.name, '| 点赞:', d.stats.like, '| 评论:', d.stats.comment);
  console.log('  源:', d.sourceUrl);

  if (i === 1 && d.images.length) {
    const pr = await fetch(`${base}/api/proxy?u=${encodeURIComponent(d.images[0])}&name=${encodeURIComponent('小红书图片')}`, { signal: AbortSignal.timeout(40000) });
    const buf = new Uint8Array(await pr.arrayBuffer());
    console.log(`  代理: ${pr.status} ${pr.headers.get('content-type')} ${buf.length}B magic=${buf[0].toString(16)}${buf[1].toString(16)}`);
    console.log('  disposition:', pr.headers.get('content-disposition'));
  }
}
