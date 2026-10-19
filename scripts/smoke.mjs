import { spawn } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';

const checks = [
  { name: 'GET /', path: '/', expect: 200, contains: '净影' },
  { name: 'GET /kuku.html', path: '/kuku.html', expect: 200, contains: 'NetClip' },
  { name: 'GET /api/health', path: '/api/health', expect: 200, contains: 'netclip' },
  { name: 'GET /api/platforms', path: '/api/platforms', expect: 200, contains: 'douyin' },
  { name: 'GET /api/parse (no url)', path: '/api/parse', expect: 400, contains: 'no_url' },
  { name: 'GET /api/parse (bad host)', path: '/api/parse?url=https://example.com/x', expect: 400, contains: 'unsupported_platform' },
  { name: 'GET /api/proxy (blocked)', path: '/api/proxy?u=https://example.com/a.mp4', expect: 403, contains: 'not allowed' },
  { name: 'GET /api/nope', path: '/api/nope', expect: 404, contains: 'not_found' },
];

let failed = 0;
for (const check of checks) {
  try {
    const res = await fetch(BASE + check.path, { redirect: 'manual' });
    const text = await res.text();
    const ok = res.status === check.expect && (!check.contains || text.includes(check.contains));
    if (!ok) failed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name}  -> ${res.status}`);
    if (!ok) console.log('      body:', text.slice(0, 180).replace(/\s+/g, ' '));
  } catch (err) {
    failed += 1;
    console.log(`FAIL  ${check.name}  -> ${err.message}`);
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
