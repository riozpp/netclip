import { request, extractJsonObject } from '../src/lib/http.js';
const noteId = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const r = await request(`https://www.xiaohongshu.com/discovery/item/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`, {
  headers: { 'user-agent': UA_M, referer: 'https://www.xiaohongshu.com/' }, timeout: 18000,
});
const html = await r.text();
const st = extractJsonObject(html, ['window.__INITIAL_STATE__']);
const nd = st?.noteData;
console.log('noteData type:', typeof nd, Array.isArray(nd) ? 'array' : '');
console.log('noteData keys:', nd ? Object.keys(nd).join(',') : '-');
console.log('\n--- full noteData (first 2500) ---');
console.log(JSON.stringify(nd, null, 1).slice(0, 2500));
