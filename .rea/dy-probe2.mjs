import { request, extractJsonObject } from '../src/lib/http.js';
const id = '7696894804868779298';

console.log('--- A) iteminfo API');
try {
  const r = await request(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${id}&a_bogus=`, {
    headers: { referer: 'https://www.iesdouyin.com/' }, timeout: 15000,
  });
  const t = await r.text();
  console.log('status', r.status, 'len', t.length, 'head', t.slice(0, 200).replace(/\s+/g, ' '));
} catch (e) { console.log('ERR', e.code, e.message); }

console.log('--- B) share page');
try {
  const r = await request(`https://www.iesdouyin.com/share/video/${id}/`, {
    headers: { referer: 'https://www.iesdouyin.com/' }, timeout: 15000,
  });
  const html = await r.text();
  console.log('status', r.status, 'len', html.length);
  const rd = extractJsonObject(html, ['window._ROUTER_DATA', '_ROUTER_DATA=']);
  console.log('has _ROUTER_DATA:', !!rd, 'keys:', rd ? Object.keys(rd.loaderData || {}) : '-');
  const loader = rd?.loaderData || {};
  const key = Object.keys(loader).find(k => k.startsWith('video_')) || Object.keys(loader)[0];
  const item = loader?.[key]?.videoInfoRes?.item_list?.[0];
  console.log('item found:', !!item, 'desc:', item?.desc?.slice(0, 40));
  if (!item) console.log('loader keys sample:', JSON.stringify(Object.keys(loader)).slice(0,300), '| html markers:', ['__INITIAL_STATE__','RENDER_DATA','_ROUTER_DATA'].filter(m=>html.includes(m)));
} catch (e) { console.log('ERR', e.code, e.message); }
