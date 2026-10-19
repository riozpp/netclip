import { request } from '../src/lib/http.js';
const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const url = `https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`;

const UAS = {
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  twitter: 'Twitterbot/1.0',
  telegram: 'TelegramBot (like TwitterBot)',
  whatsapp: 'WhatsApp/2.23.20.0',
  bytespider: 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
  wechat: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.49',
};
await Promise.all(Object.entries(UAS).map(async ([name, ua]) => {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 20000, redirect: 'manual' });
    const t = await r.text();
    const marks = ['og:title', 'og:image', '__INITIAL_STATE__', 'noteData'].filter(m => t.includes(m));
    console.log(`[${name}] ${r.status} len=${t.length} markers=${marks.join(',') || 'none'}`);
    if (r.status >= 300 && r.status < 400) console.log('   ->', r.headers.get('location')?.slice(0, 70));
    else if (marks.length) {
      const og = t.match(/<meta[^>]*og:title[^>]*>/);
      if (og) console.log('   og:', og[0].slice(0, 150));
    }
  } catch (e) { console.log(`[${name}] ERR ${e.code || e.name}`); }
}));
