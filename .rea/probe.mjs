import pw from 'file:///C:/Users/15516/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;
import fs from 'node:fs';

const EXEC = 'C:/Users/15516/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const targets = [
  { name: 'hellotik', url: 'https://www.hellotik.app/zh' },
  { name: 'kukutool', url: 'https://dy.kukutool.com/' },
];

const browser = await chromium.launch({ executablePath: EXEC, headless: true, proxy: { server: 'http://127.0.0.1:57813' }, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: 'zh-CN',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});

for (const t of targets) {
  const page = await ctx.newPage();
  const reqs = [];
  page.on('request', (r) => {
    const rt = r.resourceType();
    if (rt === 'xhr' || rt === 'fetch' || rt === 'document' || rt === 'script' || rt === 'stylesheet') {
      reqs.push({ rt, method: r.method(), url: r.url(), body: r.postData() || null });
    }
  });
  const t0 = Date.now();
  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `.rea/evidence/${t.name}-top.png`, fullPage: false });
    await page.screenshot({ path: `.rea/evidence/${t.name}-full.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`.rea/evidence/${t.name}.dom.html`, html);
    const info = await page.evaluate(() => {
      const pick = (sel) => Array.from(document.querySelectorAll(sel)).slice(0, 6).map((el) => ({
        text: (el.innerText || '').slice(0, 120),
        cls: el.className?.toString?.().slice(0, 160),
        bg: getComputedStyle(el).backgroundColor,
      }));
      return {
        title: document.title,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        bodyFont: getComputedStyle(document.body).fontFamily,
        h1: pick('h1'), h2: pick('h2'), inputs: pick('input'), buttons: pick('button'),
        nav: pick('nav a'), tabs: pick('[role=tab], .tab, .lang a, header a'),
      };
    });
    fs.writeFileSync(`.rea/evidence/${t.name}-info.json`, JSON.stringify(info, null, 2));
    fs.writeFileSync(`.rea/evidence/${t.name}-requests.json`, JSON.stringify(reqs, null, 2));
    console.log(t.name, 'OK', Date.now() - t0, 'ms', 'title=', info.title, 'bytes=', html.length, 'reqs=', reqs.length);
  } catch (e) {
    console.log(t.name, 'ERR', e.message);
  }
  await page.close();
}
await browser.close();
