import { request, extractJsonObject } from '../src/lib/http.js';
const noteId = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const UA_DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const urls = [
  ['no token', `https://www.xiaohongshu.com/explore/${noteId}`],
  ['discovery+token', `https://www.xiaohongshu.com/discovery/item/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`],
  ['explore+token', `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed`],
];

for (const [name, url] of urls) {
  try {
    const r = await request(url, { headers: { 'user-agent': UA_DESK, referer: 'https://www.xiaohongshu.com/' }, timeout: 18000, redirect: 'manual' });
    const html = await r.text();
    console.log(`\n[${name}] ${r.status} len ${html.length} final ${r.url.slice(0, 70)}`);
    if (r.status >= 300 && r.status < 400) { console.log('  location:', r.headers.get('location')?.slice(0, 100)); continue; }
    const st = extractJsonObject(html, ['window.__INITIAL_STATE__']);
    console.log('  has __INITIAL_STATE__:', !!st);
    if (st) {
      const map = st.note?.noteDetailMap || {};
      console.log('  noteDetailMap keys:', Object.keys(map));
      const k = noteId in map ? noteId : Object.keys(map)[0];
      const note = map[k]?.note;
      console.log('  note found:', !!note, note ? '| type=' + note.type + ' title=' + String(note.title).slice(0, 30) : '');
    }
    for (const m of ['__INITIAL_STATE__', 'noteDetailMap', 'originVideoKey', 'imageList', 'xsec_token']) {
      const i = html.indexOf(m);
      if (i >= 0) console.log('   marker', m, '@', i);
    }
  } catch (e) { console.log(`\n[${name}] ERR ${e.code || e.name} ${e.message}`); }
}
