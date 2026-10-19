import { normalizeXhsNote, detectPlatform, extractUrls } from '../src/resolvers/index.js';

// 1) 视频笔记（字段取自小红书网页 data 结构）
const videoNote = {
  noteId: '6ad5d3420000000027015614',
  type: 'video',
  title: '',
  desc: '今天去了音乐节\n第二行内容',
  user: { nickName: '测试号', userId: 'u1', avatar: 'http://sns-avatar-qc.xhscdn.com/a.jpg' },
  imageList: [{ infoList: [{ imageScene: 'H5_DTL', url: 'http://sns-webpic-qc.xhscdn.com/cover!h5_1080jpg' }], fileId: 'cover' }],
  video: {
    capa: { duration: 42 },
    media: { stream: {
      h264: [{ masterUrl: 'http://sns-video-bd.xhscdn.com/stream/1.mp4', duration: 42000, size: 5242880, backupUrls: ['http://sns-video-bd.xhscdn.com/b1.mp4'] }],
      h265: [{ masterUrl: 'http://sns-video-bd.xhscdn.com/stream/2.mp4', duration: 42000, size: 3145728 }],
    } },
  },
  interactInfo: { likedCount: '1.2万', commentCount: '88', shareCount: '9' },
};
const v = normalizeXhsNote(videoNote, '6ad5d3420000000027015614');
console.log('== 视频笔记');
console.log('type:', v.type, '| duration:', v.duration, '| title:', v.title);
console.log('author:', v.author.name, '| avatar:', v.author.avatar);
console.log('stats:', JSON.stringify(v.stats));
v.videos.forEach(x => console.log('  ', x.label, '|', x.quality, '|', x.url));

// 2) 多图图文笔记
const imageNote = {
  noteId: 'aaaa', type: 'normal', title: '', desc: '标题行\n正文',
  user: { nickname: '旧字段名' },
  imageList: [
    { infoList: [{ imageScene: 'H5_PRV', url: 'http://a/prev.jpg' }, { imageScene: 'H5_DTL', url: 'http://a/dtl.jpg' }] },
    { url: 'http://a/plain.jpg' },
    { fileId: 'onlyfileid' },
  ],
  interactInfo: { likedCount: '', commentCount: '', shareCount: '' },
};
const i = normalizeXhsNote(imageNote, 'aaaa');
console.log('\n== 多图笔记');
console.log('type:', i.type, '| images:', i.images.length);
i.images.forEach(u => console.log('  ', u));

// 3) 平台识别
console.log('\n== 平台识别');
['https://xhslink.cn/o/1NEDFxum6cy', 'http://xhslink.com/a/AbCdEf', 'https://www.xiaohongshu.com/explore/6ad5d3420000000027015614?xsec_token=x',
 'https://www.rednote.com/explore/abc', 'https://v.douyin.com/xxx/'].forEach(u => {
  const p = detectPlatform(u);
  console.log(' ', u.slice(0, 55).padEnd(57), '->', p ? p.name : 'UNSUPPORTED');
});

// 4) 分享文本抽取
const text = '本人和朋友买了两张10.17常州gapday音乐节的票… https://xhslink.cn/o/1NEDFxum6cy 戳进【小红书】阅读这篇分享笔记~';
console.log('\n== URL 抽取:', extractUrls(text));
