import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const base = 'https://wstein.github.io/puzlwerk/';
const walk = dir => readdirSync(dir).flatMap(name => statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]);
const files = walk(root), html = files.filter(p => p.endsWith('.html'));
const errors = [];
let links = 0;
for (const file of html) {
  const text = readFileSync(file, 'utf8');
  const page = new URL(relative(root, file).replaceAll('\\', '/'), base);
  for (const m of text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const url = new URL(m[1].replaceAll('&amp;', '&'), page);
    if (url.origin !== new URL(base).origin || /^(?:data:|mailto:)/.test(url.protocol)) continue;
    links++;
    if (!url.pathname.startsWith('/puzlwerk/')) { errors.push(`Wrong base: ${url}`); continue; }
    let target = resolve(root, '.' + decodeURIComponent(url.pathname.slice('/puzlwerk'.length)));
    if (!(target === root.slice(0, -1) || target.startsWith(root))) { errors.push(`Escaping path: ${url}`); continue; }
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
    if (!existsSync(target) && url.pathname.endsWith('/404/')) target = join(root, '404.html');
    if (!existsSync(target)) { errors.push(`Missing asset/page: ${url}`); continue; }
    if (url.hash && target.endsWith('.html')) {
      const ids = [...readFileSync(target, 'utf8').matchAll(/\bid=["']([^"']+)["']/g)].map(x => x[1]);
      if (!ids.includes(decodeURIComponent(url.hash.slice(1)))) errors.push(`Missing built anchor: ${url}`);
    }
  }
}
assert.ok(html.length >= 7, 'Curated pages and 404 required');
assert.ok(files.some(p => p.endsWith('pagefind/pagefind.js')), 'Search bundle required');
assert.ok(files.some(p => p.endsWith('.pf_index')), 'Search index required');
const selection = JSON.parse(readFileSync(new URL('../knowledge-base/publication.json', import.meta.url)));
for (const id of selection.views.developer.flatMap(g => g.notes)) {
  const text = readFileSync(join(root, 'notes', id, 'index.html'), 'utf8');
  assert.ok(text.includes(`id="${id}"`), 'Stable ID anchor required');
  assert.ok(text.includes('Canonical source'), 'Canonical source link required');
}
assert.deepEqual(errors, []);
console.log(`PASS: ${html.length} HTML pages, ${links} local links/assets, stable IDs and search index`);
