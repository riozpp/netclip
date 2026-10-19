import { request, extractJsonObject } from '../src/lib/http.js';
const noteId = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

const r = await request(`https://www.xiaohongshu.com/discovery/item/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`, {
  headers: { 'user-agent': UA_M, referer: 'https://www.xiaohongshu.com/' }, timeout: 18000,
});
const html = await r.text();
const st = extractJsonObject(html, ['window.__INITIAL_STATE__']);
console.log('state keys:', st ? Object.keys(st) : 'null');
if (st) {
  console.log('note keys:', st.note ? Object.keys(st.note) : '-');
  const map = st.note?.noteDetailMap || {};
  console.log('noteDetailMap keys:', Object.keys(map));
  for (const k of Object.keys(map)) {
    const v = map[k];
    console.log('  entry', k, '| keys:', Object.keys(v || {}).join(','));
    const n = v?.note;
    if (n) {
      console.log('  -> type:', n.type, '| title:', String(n.title).slice(0, 40));
      console.log('  -> desc:', String(n.desc).slice(0, 60));
      console.log('  -> user:', n.user?.nickname);
      console.log('  -> imageList:', Array.isArray(n.imageList) ? n.imageList.length : 'none');
      console.log('  -> video:', n.video ? JSON.stringify(n.video).slice(0, 400) : 'none');
      console.log('  -> interact:', JSON.stringify(n.interactInfo || {}).slice(0, 200));
    }
  }
}
const i = html.indexOf('__INITIAL_STATE__');
console.log('\n--- raw slice ---');
console.log(html.slice(i, i + 400).replace(/\s+/g, ' '));
