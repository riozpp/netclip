import { request, extractJsonObject } from '../src/lib/http.js';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// 首页 feed 找带 video 的笔记 id
const r = await request('https://www.xiaohongshu.com/explore', { headers: { 'user-agent': UA_M, referer: 'https://www.xiaohongshu.com/' }, timeout: 18000, redirect: 'manual' });
const html = await r.text();
console.log('status', r.status, 'len', html.length);
const st = extractJsonObject(html, ['window.__INITIAL_STATE__']);
if (st) {
  const feed = st.feed || st.noteData?.data?.feeds || st.noteData;
  console.log('top keys:', Object.keys(st).join(','));
  const json = JSON.stringify(st);
  const vids = [...json.matchAll(/"noteId":"([0-9a-f]{24})"[^}]{0,2000}?"type":"video"/g)].map(m => m[1]);
  console.log('video notes found:', [...new Set(vids)].slice(0, 5));
}
