import { request, extractJsonObject } from '../src/lib/http.js';
const id = '7696894804868779298';

const UAS = {
  baiduspider: 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  googlebot: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

for (const [name, ua] of Object.entries(UAS)) {
  try {
    const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { 'user-agent': ua, referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
    const html = await r.text();
    const rd = extractJsonObject(html, ['window._ROUTER_DATA', '_ROUTER_DATA=']);
    const loader = rd?.loaderData || {};
    const page = loader['video_(id)/page'] || {};
    const resKey = Object.keys(page).find(k => /Res$/.test(k));
    const item = page?.[resKey]?.item_list?.[0];
    console.log(`[${name}]`, r.status, 'len', html.length, '| resKey:', resKey || '-', '| item:', !!item, item ? '| desc: ' + String(item.desc).slice(0, 30) : '');
    if (!item) console.log('   page keys:', Object.keys(page).slice(0, 8).join(','), '| markers:', ['__INITIAL_STATE__','RENDER_DATA'].filter(m => html.includes(m)));
  } catch (e) { console.log(`[${name}] ERR`, e.code, e.message); }
}
