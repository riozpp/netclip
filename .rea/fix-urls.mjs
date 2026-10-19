import fs from 'node:fs';

const edits = [
  ['public/index.html', 'href="/kuku.html"', 'href="/kuku"'],
  ['public/kuku.html', '<link rel="canonical" href="/kuku.html" />', '<link rel="canonical" href="/kuku" />'],
  ['public/kuku.html', 'href="/kuku.html"', 'href="/kuku"'],
  ['public/robots.txt', 'https://netclip.pages.dev/sitemap.xml', 'https://qsy.20240225.xyz/sitemap.xml'],
];

for (const [file, from, to] of edits) {
  let s = fs.readFileSync(file, 'utf8');
  const n = s.split(from).length - 1;
  s = s.split(from).join(to);
  fs.writeFileSync(file, s);
  console.log(file, 'replaced', n, 'x');
}

let sm = fs.readFileSync('public/sitemap.xml', 'utf8');
sm = sm.split('https://netclip.pages.dev/kuku.html').join('https://qsy.20240225.xyz/kuku');
sm = sm.split('https://netclip.pages.dev').join('https://qsy.20240225.xyz');
fs.writeFileSync('public/sitemap.xml', sm);
console.log('sitemap updated');
