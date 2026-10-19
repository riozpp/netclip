import pw from 'file:///C:/Users/15516/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: 'C:/Users/15516/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true, args: ['--no-proxy-server'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
const p = await ctx.newPage();
const seen = new Set();
p.on('response', r => { const u = r.url(); if (u.includes('xiaohongshu.com') && u.includes('xsec_token')) seen.add(u.slice(0, 160)); });
try {
  await p.goto('https://www.xiaohongshu.com/explore', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await p.waitForTimeout(4000);
  console.log('url:', p.url());
  const links = await p.$$eval('a[href*="xsec_token"]', as => as.slice(0, 8).map(a => a.getAttribute('href')));
  console.log('anchor links:', links.length);
  links.slice(0, 5).forEach(l => console.log('  ', l.slice(0, 140)));
  console.log('responses with token:', [...seen].slice(0, 3).join('\n  '));
  const html = await p.content();
  const m = [...html.matchAll(/([0-9a-f]{24})[^"']{0,200}?xsec_token=([A-Za-z0-9_%\-=]+)/g)].slice(0, 5);
  console.log('html pairs:', m.map(x => x[1] + ' -> ' + decodeURIComponent(x[2]).slice(0, 20)).join(' | ') || 'none');
  await p.screenshot({ path: '.rea/evidence/xhs-web.png' });
} catch (e) { console.log('ERR', e.message.slice(0, 120)); }
await b.close();
