import { request } from '../src/lib/http.js';
const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_D = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const cases = [
  ['weixin singleFeed', `https://www.xiaohongshu.com/fe_api/burdock/weixin/v2/note/${id}/singleFeed?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`, UA_M],
  ['weixin singleFeed v1', `https://www.xiaohongshu.com/fe_api/burdock/weixin/v1/note/${id}/singleFeed`, UA_M],
  ['weixin(v2) no token', `https://www.xiaohongshu.com/fe_api/burdock/weixin/v2/note/${id}/singleFeed`, UA_M],
  ['web feed api', `https://edith.xiaohongshu.com/api/sns/web/v1/feed`, UA_D],
];
for (const [name, url, ua] of cases) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 15000, redirect: 'manual' });
    const t = await r.text();
    console.log(`\n[${name}] ${r.status} len ${t.length}`);
    if (r.status >= 300 && r.status < 400) console.log('  ->', r.headers.get('location')?.slice(0, 80));
    else console.log('  head:', t.slice(0, 220).replace(/\s+/g, ' '));
  } catch (e) { console.log(`\n[${name}] ERR ${e.code || e.name}`); }
}
