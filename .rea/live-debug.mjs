import pw from 'file:///C:/Users/15516/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: 'C:/Users/15516/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true, args: ['--no-proxy-server'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, locale: 'zh-CN' });
const p = await ctx.newPage();
p.on('requestfailed', r => console.log('REQFAIL', r.url().slice(0, 90), r.failure()?.errorText));
p.on('response', r => { const u = r.url(); if (u.includes('.js') || u.includes('.css')) console.log('RES', r.status(), u.slice(-40)); });
await p.goto('https://qsy.20240225.xyz/', { waitUntil: 'load', timeout: 45000 });
await p.waitForTimeout(1500);
console.log('scripts:', await p.$$eval('script[src]', n => n.map(s => s.getAttribute('src'))));
console.log('has submit handler?', await p.evaluate(() => !!document.querySelector('#parse-form')));
await p.fill('#url-input', 'https://v.douyin.com/DJUL3bv7jEA/');
const res = await p.evaluate(async () => {
  const r = await fetch('/api/parse?url=' + encodeURIComponent('https://v.douyin.com/DJUL3bv7jEA/'));
  const j = await r.json();
  return { status: r.status, ok: j.ok, title: (j.data?.title || '').slice(0, 20) };
});
console.log('page fetch:', JSON.stringify(res));
await b.close();
