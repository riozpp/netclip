import sodium from 'file:///C:/Users/15516/AppData/Local/Temp/sec/node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js';

const TOKEN = process.env.GH_TOKEN;
const REPO = 'riozpp/netclip';
const secrets = {
  CLOUDFLARE_API_TOKEN: process.env.CF_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: process.env.CF_ACCOUNT,
};

const gh = async (path, init = {}) => {
  const res = await fetch('https://api.github.com' + path, {
    ...init,
    headers: {
      authorization: 'Bearer ' + TOKEN,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'netclip-deploy',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

await sodium.ready;
const keyRes = await gh(`/repos/${REPO}/actions/secrets/public-key`);
if (keyRes.status !== 200) { console.log('ERR', keyRes.status, String(JSON.stringify(keyRes.body)).slice(0,200)); process.exit(1); }
const { key, key_id } = keyRes.body;
const pk = sodium.from_base64(key, sodium.base64_variants.ORIGINAL);

for (const [name, value] of Object.entries(secrets)) {
  if (!value) { console.log('skip', name); continue; }
  const sealed = sodium.crypto_box_seal(sodium.from_string(value), pk);
  const res = await gh(`/repos/${REPO}/actions/secrets/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL), key_id }),
  });
  console.log(name, '->', res.status === 201 || res.status === 204 ? 'set' : String(JSON.stringify(res.body)).slice(0,200));
}

const list = await gh(`/repos/${REPO}/actions/secrets`);
console.log('secrets now:', (list.body.secrets || []).map((s) => s.name).join(', ') || 'none');
