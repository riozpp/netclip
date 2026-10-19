import { request, extractJsonObject } from '../src/lib/http.js';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ids = ['67ee5ab9000000001b024f8e', '68065dc8000000001c007eb7', '66c337ce000000001d018bdc'];
for (const id of ids) {
  for (const [tag, url] of [['explore', `https://www.xiaohongshu.com/explore/${id}`], ['discovery', `https://www.xiaohongshu.com/discovery/item/${id}`]]) {
    try {
      const r = await request(url, { headers: { 'user-agent': UA_M, referer: 'https://www.xiaohongshu.com/' }, timeout: 15000, redirect: 'manual' });
      const html = await r.text();
      let noteType = '-', hasVid = false;
      if (r.status === 200) {
        const st = extractJsonObject(html, ['window.__INITIAL_STATE__']);
        const n = st?.noteData?.data?.noteData || st?.note?.noteDetailMap?.[id]?.note;
        noteType = n?.type || '-';
        hasVid = !!(n?.video);
        console.log(`${id} [${tag}] 200 type=${noteType} video=${hasVid}`);
        if (n?.video) {
          console.log('   video keys:', Object.keys(n.video).join(','));
          console.log('   media.stream keys:', Object.keys(n.video.media?.stream || {}).join(','));
          console.log('   consumer:', JSON.stringify(n.video.consumer || {}).slice(0, 200));
          const s = n.video.media?.stream || {};
          for (const c of ['h264', 'h265', 'av1']) if (s[c]?.[0]) console.log(`   ${c}[0]:`, JSON.stringify(s[c][0]).slice(0, 300));
        }
      } else {
        console.log(`${id} [${tag}] ${r.status} -> ${r.headers.get('location')?.slice(0, 60)}`);
      }
    } catch (e) { console.log(`${id} [${tag}] ERR ${e.code || e.name}`); }
  }
}
