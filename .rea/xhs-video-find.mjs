import { request, extractJsonObject } from '../src/lib/http.js';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const probes = [
  ['search page', 'https://www.xiaohongshu.com/search_result?keyword=%E7%BE%8E%E9%A3%9F', UA_D],
  ['topic page', 'https://www.xiaohongshu.com/page/topics', UA_M],
];
for (const [name, url, ua] of probes) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 15000, redirect: 'manual' });
    const html = await r.text();
    console.log(`[${name}] ${r.status} len ${html.length}`);
    if (r.status === 200) {
      const tokens = [...html.matchAll(/(?:noteId|note_id)["':=]+([0-9a-f]{24})[^"'}\s]{0,120}?(?:xsec_token|xsecToken)["':=]+([A-Za-z0-9_\-=]+)/g)].slice(0, 3);
      console.log('  found pairs:', tokens.map(m => m[1] + ' token=' + m[2].slice(0, 20)).join(' | ') || 'none');
      const t2 = [...html.matchAll(/xsec_token=([A-Za-z0-9_%\-]+)/g)].slice(0, 3).map(m => m[1]);
      console.log('  raw tokens:', t2.join(', ') || 'none');
    } else console.log('  ->', r.headers.get('location')?.slice(0, 80));
  } catch (e) { console.log(`[${name}] ERR ${e.code || e.name}`); }
}
