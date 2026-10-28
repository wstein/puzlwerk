// Static production fixture, not a development server or deployment service.
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.wasm':'application/wasm' };
createServer((req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!path.startsWith('/puzlwerk/')) throw Error('Wrong base');
    let file = resolve(root, '.' + path.slice('/puzlwerk'.length));
    if (!(file === root.slice(0, -1) || file.startsWith(root))) throw Error('Escaping path');
    if (statSync(file).isDirectory()) file += '/index.html';
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'content-type': types[ext] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.DOCS_PORT ?? 5231), '127.0.0.1');
