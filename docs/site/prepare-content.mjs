// Disposable publishing view. The source Markdown remains authoritative.
import { readFileSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const kb = resolve(root, 'docs/knowledge-base');
execFileSync(process.execPath, [resolve(root, 'scripts/check-knowledge.mjs')], { cwd: root, stdio: 'inherit' });
const selection = JSON.parse(readFileSync(resolve(kb, 'publication.json')));
const entries = [];
for (const id of selection.views.developer.flatMap(group => group.notes)) {
  const names = readdirSync(resolve(kb, 'notes')).filter(name => name.startsWith(id + '-'));
  if (names.length !== 1) throw Error(`Unresolved stable ID ${id}`);
  const path = 'docs/knowledge-base/notes/' + names[0];
  const source = readFileSync(resolve(root, path), 'utf8');
  entries.push({ path, slug: `notes/${id}`, title: source.match(/^title: (.+)$/m)[1], id });
}
entries.push(...selection.documents);
const routes = new Map(entries.map(entry => [resolve(root, entry.path), `/puzlwerk/${entry.slug}/`]));
const output = resolve(root, 'docs/site/src/content/docs');
const gitSource = path => 'https://github.com/wstein/puzlwerk/blob/main/' + path.split('/').map(encodeURIComponent).join('/');
function link(target, source) {
  if (/^(?:https?:|mailto:|#)/.test(target)) return target;
  const at = target.indexOf('#'), path = at < 0 ? target : target.slice(0, at), fragment = at < 0 ? '' : target.slice(at);
  const absolute = resolve(root, dirname(source), decodeURIComponent(path));
  return (routes.get(absolute) ?? gitSource(relative(root, absolute))) + fragment;
}
function rewrite(text, source) {
  let fence = null;
  return text.split('\n').map(line => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) { fence = fence ? null : marker[1]; return line; }
    if (fence) return line;
    return line.replace(/(!?\[[^\]]*\]\()([^\s)]+)(\))/g, (_m, before, url, after) => before + link(url, source) + after)
      .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/, (_m, before, url) => before + link(url, source));
  }).join('\n');
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const entry of entries) {
  let body = readFileSync(resolve(root, entry.path), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^# .+\n/m, '');
  body = rewrite(body, entry.path);
  const file = resolve(output, entry.slug + '.md');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `---\ntitle: ${JSON.stringify(entry.title)}\neditUrl: ${JSON.stringify('https://github.com/wstein/puzlwerk/edit/main/' + entry.path)}\n---\n${entry.id ? `<span id="${entry.id}"></span>\n\nStable knowledge ID: \`${entry.id}\`.\n` : ''}\n${body}\n\n[Canonical source](${gitSource(entry.path)}). This page is generated from that source.\n`);
}
const groups = selection.views.developer.map(group => `## ${group.label}\n\n` + group.notes.map(id => {
  const entry = entries.find(e => e.id === id);
  return `- [${entry.title}](/puzlwerk/${entry.slug}/)`;
}).join('\n')).join('\n\n');
writeFileSync(resolve(output, 'index.md'), `---\ntitle: PuzlWerk documentation\n---\n\nCurated developer knowledge and the private 2×2 solver reference. The general\nfoundation remains proposed; the scoped solver is implemented. No package\npublication or broader framework release is implied.\n\n${groups}\n\n## Reference and guides\n\n${selection.documents.map(e => `- [${e.title}](/puzlwerk/${e.slug}/)`).join('\n')}\n\n## Source and scope\n\nAll notes remain available in the [public canonical knowledge base](${gitSource('docs/knowledge-base/README.md')}). Selection does not make unselected content private. This disposable publishing view is generated from the canonical Markdown and ID-based [selection](${gitSource('docs/knowledge-base/publication.json')}); do not edit generated files.\n`);
console.log(`Prepared ${entries.length + 1} curated pages; source notes unchanged`);
