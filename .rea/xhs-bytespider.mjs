import { request, extractJsonObject } from '../src/lib/http.js';
const id = '6ad5d3420000000027015614';
const token = 'CB16VWFZCqt8nQsU1G_FMsliRfVoc_Bd_VnYH8m37_oPQ=';
const ua = 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)';
for (const [tag, url] of [
  ['discovery', `https://www.xiaohongshu.com/discovery/item/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=app_share`],
  ['explore', `https://www.xiaohongshu.com/explore/${id}?xsec_token=${encodeURIComponent(token)}&xsec_source=pc_feed`],
  ['explore no token', `https://www.xiaohongshu.com/explore/${id}`],
]) {
  try {
    const r = await request(url, { headers: { 'user-agent': ua, referer: 'https://www.xiaohongshu.com/' }, timeout: 20000, redirect: 'manual' });
    const html = await r.text();
    const st = r.status === 200 ? extractJsonObject(html, ['window.__INITIAL_STATE__']) : null;
    const nd = st?.noteData?.data?.noteData;
    console.log(`\n[${tag}] ${r.status} len=${html.length} state=${!!st} note=${!!nd}`);
    if (nd) {
      console.log('  type:', nd.type, '| title:', String(nd.title || '').slice(0, 30));
      console.log('  desc:', String(nd.desc || '').slice(0, 60));
      console.log('  user:', nd.user?.nickName, '| images:', (nd.imageList || []).length);
      console.log('  video:', nd.video ? JSON.stringify(nd.video).slice(0, 260) : 'none');
      console.log('  likedCount:', nd.interactInfo?.likedCount);
    }
  } catch (e) { console.log(`\n[${tag}] ERR ${e.code || e.name}`); }
}
