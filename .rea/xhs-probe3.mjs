import { request } from '../src/lib/http.js';
const noteId = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';

const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const UA_BAIDU = 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)';
const UA_GOOGLE = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const cases = [
  ['mobile share', `https://www.xiaohongshu.com/discovery/item/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`, UA_M],
  ['baidu spider', `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed`, UA_BAIDU],
  ['google spider', `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed`, UA_GOOGLE],
];

for (const [name, url, ua] of cases) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 18000, redirect: 'manual' });
    const html = await r.text();
    console.log(`\n[${name}] ${r.status} len ${html.length}`);
    if (r.status >= 300 && r.status < 400) console.log('  ->', r.headers.get('location')?.slice(0, 90));
    const marks = ['__INITIAL_STATE__', 'noteDetailMap', 'og:title', 'ld+json', 'originVideoKey'];
    marks.forEach(m => { const i = html.indexOf(m); if (i >= 0) console.log('   ', m, '@', i); });
    const t = html.match(/<title>([^<]*)<\/title>/);
    if (t) console.log('   title:', t[1].slice(0, 60));
  } catch (e) { console.log(`\n[${name}] ERR ${e.code || e.name} ${e.message}`); }
}
