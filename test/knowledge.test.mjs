import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkKnowledge, destinations } from '../scripts/check-knowledge.mjs';
const source = fileURLToPath(new URL('../', import.meta.url));
const files = [...new Set(execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', '*.md'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean))];
const kb = 'docs/knowledge-base/';
const doc = kb + 'solver-2x2.md';
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'puzlwerk-knowledge-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [...files, kb + 'inventory.json', kb + 'publication.json',
    'packages/solver-2x2/package.json', 'packages/solver-2x2/src/index.d.ts', 'test/helpers/physical-replay.mjs',
    'test/solver.test.mjs', 'test/fixtures/cubistry-42-43.json', 'scripts/verify-package.mjs', 'packages/solver-2x2/provenance.json']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(source, path), join(root, path));
  }
  assert.deepEqual(checkKnowledge(root, files).errors, [], 'Fixture must be valid before mutation');
  return {
    check: () => checkKnowledge(root, files),
    edit: (path, fn) => writeFileSync(join(root, path), fn(readFileSync(join(root, path), 'utf8'))),
  };
}
test('repository graph validates without note errors', () => {
  const result = checkKnowledge(source, files);
  assert.deepEqual(result.errors, []);
});
for (const [name, path, mutate, expected] of [
  ['broken link', doc, s => s + '\n[bad](missing.md)\n', /Broken local link/],
  ['same-page fragment', doc, s => s + '\n[bad](#nonexistent-heading)\n', /Broken heading anchor/],
  ['inventory omission', kb + 'inventory.json', s => { const d = JSON.parse(s); d.documents.pop(); return JSON.stringify(d); }, /inventory is incomplete/],
  ['broken fragment', doc, s => s + '\n[bad](INVENTORY.md#missing-anchor)\n', /Broken heading anchor/],
  ['preserved ADR changed', 'docs/adr/0001-engine-boundaries.md', s => s + '\nChanged decision\n', /Preserved source changed/],
  ['leftover note views', kb + 'publication.json', s => { const d = JSON.parse(s); d.views = { developer: [], user: [] }; return JSON.stringify(d); }, /Note views are no longer supported/],
]) test(`reject ${name}`, t => {
  const f = fixture(t); f.edit(path, mutate);
  assert.match(f.check().errors.join('\n'), expected);
});
test('destinations cover reference, HTML and inline links while ignoring fenced examples', () => {
  assert.deepEqual(destinations('[a][ref]\n[ref]: target.md\n<a href="page.md">x</a>\n[x](other.md)\n```md\n[ignored](gone.md)\n```'), ['target.md', 'other.md', 'page.md']);
  assert.throws(() => destinations('[x][unknown]'), /Undefined link reference/);
});

test('same-page links accept existing headings and reject missing headings', t => {
  const f = fixture(t);
  f.edit(doc, s => s + '\n[Ownership](#ownership-and-provenance)\n');
  assert.deepEqual(f.check().errors, []);
  f.edit(doc, s => s + '\n[Missing](#absent)\n');
  assert.match(f.check().errors.join('\n'), /Broken heading anchor/);
});

test('curated document routes reject traversal and missing sources', t => {
  const f = fixture(t);
  f.edit(kb + 'publication.json', s => { const d = JSON.parse(s); d.documents[0].slug = '../escape'; return JSON.stringify(d); });
  assert.match(f.check().errors.join('\n'), /Invalid curated document mapping/);
});
test('curated document mapping rejects a nonexistent source', t => {
  const f = fixture(t);
  f.edit(kb + 'publication.json', s => { const d = JSON.parse(s); d.documents[0].path = 'docs/missing.md'; return JSON.stringify(d); });
  assert.match(f.check().errors.join('\n'), /Invalid curated document mapping/);
});
