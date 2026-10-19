import worker from '../src/index.js';
const env = { ASSETS: { fetch: async () => new Response('') }, PARSE_LIMIT_PER_HOUR: '60' };
const text = '9.94 复制打开抖音，看看【亮活的作品】80后苏北初中，80%的人没体验过 #苏北四星... https://v.douyin.com/DJUL3bv7jEA/ :2pm ICh/ 06/22 t@r.eB';
const res = await worker.fetch(new Request('http://l/api/parse?text=' + encodeURIComponent(text)), env);
const j = await res.json();
console.log('HTTP', res.status, 'ok', j.ok);
if (!j.ok) { console.log(JSON.stringify(j, null, 2)); process.exit(0); }
const d = j.data;
console.log('平台:', d.platformName, '| 类型:', d.type);
console.log('标题:', d.title);
console.log('作者:', d.author.name, '| 时长:', d.duration + 's');
console.log('数据:', JSON.stringify(d.stats));
console.log('封面:', (d.cover || '').slice(0, 70) + '...');
console.log('视频数:', d.videos.length);
d.videos.forEach(v => console.log('  -', v.label, '|', v.url.slice(0, 80) + '...'));
console.log('音频:', d.music ? d.music.title : '无');
console.log('note:', d.note || '-');
