// Offline repository graph checks; no content rewriting or network access.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const kb = 'docs/knowledge-base/';
const fields = ['id', 'title', 'kind', 'status', 'audience', 'publication', 'related', 'sources'];
const withoutFences = text => text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
function anchors(text) {
  const ids = new Set(), counts = new Map();
  for (const m of withoutFences(text).matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const slug = m[1].toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    ids.add(count ? `${slug}-${count}` : slug);
  }
  for (const m of text.matchAll(/\bid=["']([^"']+)["']/g)) ids.add(m[1]);
  return ids;
}
export function destinations(text) {
  const clean = withoutFences(text).replace(/`[^`\n]*`/g, '');
  const out = [], refs = new Map();
  const label = s => s.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const m of clean.matchAll(/^\s*\[([^\]]+)\]:\s*(\S+)/gm)) {
    refs.set(label(m[1]), m[2]); out.push(m[2]);
  }
  for (const m of clean.matchAll(/!?\[[^\]\n]*\]\(([^\n]*?)\)/g)) {
    const target = m[1].match(/^(?:<([^>]+)>|(\S+?))(?:\s+["'][^\n]*["'])?$/);
    if (!target) throw Error(`Unsupported Markdown destination: ${m[1]}`);
    out.push(target[1] ?? target[2]);
  }
  for (const m of clean.matchAll(/!?\[([^\]\n]+)\]\[([^\]\n]*)\]/g)) {
    const key = label(m[2] || m[1]);
    if (!refs.has(key)) throw Error(`Undefined link reference: ${key}`);
  }
  for (const m of clean.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) out.push(m[1]);
  return out;
}
function metadata(text) {
  const front = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!front) throw Error('Note requires front matter');
  const data = {};
  for (const line of front[1].split('\n')) {
    const m = line.match(/^([a-z]+): (.+)$/);
    if (!m || !fields.includes(m[1]) || Object.hasOwn(data, m[1])) throw Error('Invalid or duplicate metadata key');
    data[m[1]] = ['related', 'sources'].includes(m[1]) ? JSON.parse(m[2]) : m[2];
  }
  if (fields.some(k => !Object.hasOwn(data, k))) throw Error('Missing note metadata');
  if (!/^pw-\d{8}-\d{3}$/.test(data.id)) throw Error('Invalid stable note ID');
  if (data.kind !== 'evergreen' || !['draft', 'proposed', 'verified', 'superseded'].includes(data.status)) throw Error('Invalid note kind/status');
  if (!['developer', 'user'].includes(data.audience) || !['repository', 'developer-candidate', 'user-candidate'].includes(data.publication)) throw Error('Invalid audience/publication');
  for (const k of ['related', 'sources']) {
    if (!Array.isArray(data[k]) || !data[k].length || data[k].some(x => typeof x !== 'string' || !x) || new Set(data[k]).size !== data[k].length) throw Error(`Invalid ${k}`);
  }
  const body = text.slice(front[0].length);
  if (body.match(/^# (.+)$/m)?.[1] !== data.title) throw Error('Note title does not match H1');
  const visible = destinations(body);
  if (data.sources.some(s => !visible.includes(s))) throw Error('Source missing from visible links');
  return { ...data, body, visible };
}
export function checkKnowledge(root, files) {
  const errors = [], notes = new Map();
  const report = (file, fn) => { try { return fn(); } catch (e) { errors.push(`${file}: ${e.message}`); } };
  const read = p => readFileSync(resolve(root, p), 'utf8');
  for (const file of files) report(file, () => {
    const text = read(file);
    for (const target of destinations(text)) {
      if (/^https?:\/\//.test(target) || /^mailto:/.test(target)) continue;
      if (/^[a-z]+:/i.test(target)) throw Error(`Unsupported link scheme: ${target}`);
      const [path, fragment] = target.split('#');
      const decoded = decodeURIComponent(path.split('?')[0]);
      const absolute = !decoded ? resolve(root, file) : decoded.startsWith('/') ? resolve(root, '.' + decoded) : resolve(root, dirname(file), decoded);
      if (relative(root, absolute).startsWith('..')) throw Error(`Link escapes repository: ${target}`);
      if (!existsSync(absolute)) throw Error(`Broken local link: ${target}`);
      if (fragment && statSync(absolute).isFile() && /\.md$/i.test(absolute) && !anchors(readFileSync(absolute, 'utf8')).has(decodeURIComponent(fragment))) throw Error(`Broken heading anchor: ${target}`);
    }
    if (file.startsWith(kb + 'notes/') && file.endsWith('.md')) {
      const data = metadata(text);
      if (!file.startsWith(kb + 'notes/' + data.id + '-')) throw Error('Filename must begin with stable ID');
      if (notes.has(data.id)) throw Error(`Duplicate stable ID: ${data.id}`);
      notes.set(data.id, { ...data, file });
    }
  });
  report('knowledge graph', () => {
    if (notes.size < 3) throw Error('Three representative notes required');
    const index = read(kb + 'README.md');
    for (const [id, note] of notes) {
      if (!destinations(index).includes(relative(kb, note.file))) throw Error(`Unindexed note: ${id}`);
      for (const other of note.related) {
        if (other === id || !notes.has(other)) throw Error(`Dangling related ID: ${id} → ${other}`);
        if (!notes.get(other).related.includes(id)) throw Error(`Missing reciprocal relation: ${id} → ${other}`);
        if (!note.visible.includes(relative(dirname(note.file), notes.get(other).file))) throw Error(`Related note missing visible link: ${other}`);
      }
    }
  });
  report('inventory', () => {
    const inventory = JSON.parse(read(kb + 'inventory.json'));
    if (inventory.version !== 1 || !/^[a-f0-9]{40}$/.test(inventory.baseline)) throw Error('Invalid inventory version/baseline');
    const pathDigest = createHash('sha256').update(inventory.documents.map(entry => entry.path).sort().join('\n') + '\n').digest('hex');
    if (pathDigest !== inventory.markdownPathsSha256) throw Error('Baseline Markdown inventory is incomplete or changed');
    const seen = new Set();
    for (const entry of inventory.documents) {
      if (seen.has(entry.path) || !files.includes(entry.path)) throw Error(`Missing/duplicate baseline document: ${entry.path}`);
      seen.add(entry.path);
      if (!['preserve', 'update-navigation', 'annotate-status'].includes(entry.disposition) || !/^[a-f0-9]{64}$/.test(entry.baselineSha256)) throw Error('Invalid inventory record');
      if (entry.disposition === 'preserve' && createHash('sha256').update(readFileSync(resolve(root, entry.path))).digest('hex') !== entry.baselineSha256) throw Error(`Preserved source changed: ${entry.path}`);
    }
  });
  report('publication', () => {
    const pub = JSON.parse(read(kb + 'publication.json'));
    if (pub.version !== 1 || pub.status !== 'proposed' || Object.keys(pub.views).sort().join() !== 'developer,user') throw Error('Invalid publication version/status/views');
    const paths = new Set(), slugs = new Set();
    for (const doc of pub.documents ?? []) {
      if (!files.includes(doc.path) || doc.path.startsWith(kb + 'notes/') || !doc.title || !/^(?:guides|reference|architecture)\/[a-z0-9-]+$/.test(doc.slug) || paths.has(doc.path) || slugs.has(doc.slug)) throw Error('Invalid curated document mapping');
      paths.add(doc.path); slugs.add(doc.slug);
    }
    for (const [view, groups] of Object.entries(pub.views)) {
      if (!Array.isArray(groups)) throw Error('Invalid navigation groups');
      const seen = new Set();
      for (const group of groups) {
        if (!group.label || !Array.isArray(group.notes) || !group.notes.length) throw Error('Empty navigation group');
        for (const id of group.notes) {
          const note = notes.get(id);
          if (seen.has(id) || !note || note.audience !== view || note.publication !== `${view}-candidate` || ['draft', 'superseded'].includes(note.status)) throw Error(`Invalid curated selection: ${id}`);
          seen.add(id);
        }
      }
    }
  });
  const backlinks = Object.fromEntries([...notes].map(([id]) => [id, [...notes].filter(([, n]) => n.related.includes(id)).map(([other]) => other)]));
  return { errors, markdownFiles: files.length, notes: notes.size, backlinks };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.md'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean))];
  const result = checkKnowledge(root, files);
  console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) process.exitCode = 1;
}
