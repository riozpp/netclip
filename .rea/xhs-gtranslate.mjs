const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const inner = `https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`;
const gt = `https://www-xiaohongshu-com.translate.goog/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share&_x_tr_sl=zh-CN&_x_tr_tl=zh-CN&_x_tr_hl=zh-CN`;
console.log('target:', gt.slice(0, 130));
try {
  const r = await fetch(gt, { signal: AbortSignal.timeout(30000), headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'accept-language': 'zh-CN,zh;q=0.9' }, redirect: 'follow' });
  const t = await r.text();
  console.log('status', r.status, 'final', r.url.slice(0, 100), 'len', t.length);
  ['__INITIAL_STATE__', 'noteData', 'noteDetailMap', 'og:title', 'translated-ltr'].forEach(m => {
    const i = t.indexOf(m);
    if (i >= 0) console.log('  marker', m, '@', i);
  });
  const title = t.match(/<title>([^<]*)<\/title>/);
  console.log('  title:', title ? title[1].slice(0, 60) : '-');
  console.log('  head:', t.slice(0, 200).replace(/\s+/g, ' '));
} catch (e) { console.log('ERR', e.name, e.message.slice(0, 80)); }
