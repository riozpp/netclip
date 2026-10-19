import pw from 'file:///C:/Users/15516/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;
const b = await chromium.launch({ executablePath: 'C:/Users/15516/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe', headless: true, args: ['--no-proxy-server'] });
const pages = [
  ['home', 'http://127.0.0.1:8899/', 1440, 1000],
  ['pro', 'http://127.0.0.1:8899/kuku.html', 1440, 1000],
  ['home-mobile', 'http://127.0.0.1:8899/', 390, 844],
];
for (const [name, url, w, h] of pages) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `.rea/evidence/ui-${name}-top.png` });
  await p.screenshot({ path: `.rea/evidence/ui-${name}-full.png`, fullPage: true });
  console.log(name, 'ok', 'errors:', errs.length ? errs : 'none');
  await ctx.close();
}
await b.close();
