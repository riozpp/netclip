import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('public');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.xml':'application/xml', '.txt':'text/plain', '.webmanifest':'application/manifest+json' };
http.createServer((req,res)=>{
  let p = decodeURIComponent(new URL(req.url,'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(8899,'127.0.0.1',()=>console.log('static on 8899'));
