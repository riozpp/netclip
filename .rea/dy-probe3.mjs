import { request, extractJsonObject } from '../src/lib/http.js';
const id = '7696894804868779298';
const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, { headers: { referer: 'https://www.iesdouyin.com/' }, timeout: 15000 });
const html = await r.text();
const rd = extractJsonObject(html, ['window._ROUTER_DATA', '_ROUTER_DATA=']);
const loader = rd?.loaderData || {};
for (const k of Object.keys(loader)) {
  const v = loader[k];
  console.log('KEY', k, '| keys:', Object.keys(v || {}).join(','));
}
const page = loader['video_(id)/page'];
console.log('--- page keys:', Object.keys(page || {}));
const key = Object.keys(page || {}).find(k => String(k).includes('Res'));
console.log('res key:', key);
const res = page?.[key];
console.log('res keys:', Object.keys(res || {}).slice(0, 20).join(','));
const item = res?.item_list?.[0];
console.log('has item:', !!item);
if (item) {
  console.log('desc:', String(item.desc).slice(0, 60));
  console.log('aweme_id:', item.aweme_id);
  console.log('author:', item.author?.nickname);
  console.log('play_addr:', JSON.stringify(item.video?.play_addr)?.slice(0, 400));
  console.log('images:', Array.isArray(item.images) ? item.images.length : 'none');
  console.log('music:', JSON.stringify(item.music?.play_url)?.slice(0, 150));
}
if (!item) console.log('RAW head:', JSON.stringify(res).slice(0, 1200));
