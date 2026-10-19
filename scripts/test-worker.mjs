import worker from '../src/index.js';

const assets = {
  fetch: async (request) => new Response('ASSET:' + new URL(request.url).pathname, {
    status: 200,
    headers: { 'content-type': 'text/plain' },
  }),
};

const env = { ASSETS: assets, PARSE_LIMIT_PER_HOUR: '60' };

async function call(path, init) {
  const res = await worker.fetch(new Request('http://local.test' + path, init), env);
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

const cases = [
  { name: 'GET /  (static passthrough)', path: '/', expect: 200, match: 'ASSET:/' },
  { name: 'GET /api/health', path: '/api/health', expect: 200, match: 'netclip' },
  { name: 'GET /api/platforms', path: '/api/platforms', expect: 200, match: 'xiaohongshu' },
  { name: 'GET /api/parse no url', path: '/api/parse', expect: 400, match: 'no_url' },
  { name: 'GET /api/parse unsupported', path: '/api/parse?url=https%3A%2F%2Fexample.com%2Fa', expect: 400, match: 'unsupported_platform' },
  { name: 'GET /api/proxy blocked host', path: '/api/proxy?u=https%3A%2F%2Fexample.com%2Fa.mp4', expect: 403, match: 'not allowed' },
  { name: 'GET /api/proxy no url', path: '/api/proxy', expect: 400, match: 'missing' },
  { name: 'GET /api/nope', path: '/api/nope', expect: 404, match: 'not_found' },
  { name: 'POST /api/parse bad body', path: '/api/parse', init: { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"url":""}' }, expect: 400, match: 'no_url' },
  { name: 'DELETE /api/parse', path: '/api/parse', init: { method: 'DELETE' }, expect: 405, match: 'method_not_allowed' },
];

let failed = 0;
for (const c of cases) {
  const out = await call(c.path, c.init);
  const ok = out.status === c.expect && out.text.includes(c.match);
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name}  -> ${out.status}`);
  if (!ok) console.log('       body:', out.text.slice(0, 200));
}

/* 真实解析链路（可选，需外网可达） */
const live = process.argv.includes('--live') ? process.argv[process.argv.indexOf('--live') + 1] : '';
if (live) {
  const res = await call('/api/parse?url=' + encodeURIComponent(live));
  console.log('\nLIVE parse ->', res.status);
  console.log(res.text.slice(0, 900));
}

console.log(failed ? `\n${failed} case(s) failed` : '\nall worker cases passed');
process.exit(failed ? 1 : 0);
