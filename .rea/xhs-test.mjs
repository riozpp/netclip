import worker from '../src/index.js';
const env = { ASSETS: { fetch: async () => new Response('') }, PARSE_LIMIT_PER_HOUR: '60' };
const text = '本人和朋友买了两张10.17常州gapday音乐节的票，官方… https://xhslink.cn/o/1NEDFxum6cy 戳进【小红书】阅读这篇分享笔记~';
const res = await worker.fetch(new Request('http://l/api/parse?text=' + encodeURIComponent(text)), env);
const j = await res.json();
console.log('HTTP', res.status, 'ok', j.ok);
if (!j.ok) { console.log(JSON.stringify(j, null, 2)); process.exit(0); }
const d = j.data;
console.log('平台:', d.platformName, '| 类型:', d.type, '| id:', d.id);
console.log('标题:', d.title);
console.log('作者:', d.author.name, '| 点赞:', d.stats.like, '| 评论:', d.stats.comment);
console.log('图片数:', d.images.length, '| 视频数:', d.videos.length);
d.images.slice(0, 3).forEach((u, i) => console.log(`  img${i + 1}:`, u.slice(0, 90)));
d.videos.forEach(v => console.log('  vid:', v.label, v.url.slice(0, 80)));
console.log('desc:', d.desc.slice(0, 80));
