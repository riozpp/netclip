import { request } from '../src/lib/http.js';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
for (const [name, url, ua] of [
  ['search https', 'https://www.xiaohongshu.com/search_result/?keyword=%E7%BE%8E%E9%A3%9F', UA_D],
  ['search mobile', 'https://www.xiaohongshu.com/search_result/?keyword=%E7%BE%8E%E9%A3%9F&type=51', UA_M],
  ['home mobile', 'https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend', UA_M],
]) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 15000, redirect: 'manual' });
    const html = await r.text();
    const toks = [...html.matchAll(/xsec_token=([A-Za-z0-9_%\-]+)/g)].slice(0, 4).map(m => decodeURIComponent(m[1]));
    const ids = [...html.matchAll(/(?:noteId|note_id)["':=]+([0-9a-f]{24})/g)].slice(0, 4).map(m => m[1]);
    console.log(`[${name}] ${r.status} len ${html.length} | ids: ${ids.join(',') || '-'} | tokens: ${toks.length}`);
    if (toks.length) console.log('   ', toks.join('\n    ').slice(0, 300));
  } catch (e) { console.log(`[${name}] ERR ${e.code || e.name}`); }
}
