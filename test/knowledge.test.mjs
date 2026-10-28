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
const note = kb + 'notes/pw-20261028-001-identity-and-equivalence.md';
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
test('canonical graph has indexed stable notes, visible sources and computed backlinks', () => {
  const result = checkKnowledge(source, files);
  assert.deepEqual(result.errors, []);
  assert.ok(result.notes >= 3);
  assert.equal(result.backlinks['pw-20261028-001'].length, 2);
});
for (const [name, path, mutate, expected] of [
  ['broken source', note, s => s.replaceAll('../solver-2x2.md', '../missing.md'), /Broken local link/],
  ['same-page fragment', note, s => s + '\n[bad](#nonexistent-heading)\n', /Broken heading anchor/],
  ['inventory omission', kb + 'inventory.json', s => { const d = JSON.parse(s); d.documents.pop(); return JSON.stringify(d); }, /inventory is incomplete/],
  ['broken fragment', note, s => s + '\n[bad](../solver-2x2.md#missing-anchor)\n', /Broken heading anchor/],
  ['missing ID', note, s => s.replace('id: pw-20261028-001\n', ''), /Missing note metadata/],
  ['dangling relation', note, s => s.replace('related: ["pw-20261028-002", "pw-20261028-003"]', 'related: ["pw-20261028-999"]'), /Dangling related ID/],
  ['asymmetric relation', note, s => s.replace('related: ["pw-20261028-002", "pw-20261028-003"]', 'related: ["pw-20261028-002"]'), /Missing reciprocal relation/],
  ['invisible source', note, s => s.replace('[Current API and exact mode semantics](../solver-2x2.md)', 'Current API reference'), /Source missing from visible links/],
  ['unindexed note', kb + 'README.md', s => s.replace(/^- \[pw-20261028-001.*\n/m, ''), /Unindexed note/],
  ['invalid maturity', note, s => s.replace('status: verified', 'status: accepted'), /Invalid note kind\/status/],
  ['repository-only selection', note, s => s.replace('publication: developer-candidate', 'publication: repository'), /Invalid curated selection/],
  ['preserved ADR changed', 'docs/adr/0001-engine-boundaries.md', s => s + '\nChanged decision\n', /Preserved source changed/],
  ['duplicate metadata', note, s => s.replace('kind: evergreen', 'kind: evergreen\nkind: evergreen'), /duplicate metadata/],
]) test(`reject ${name}`, t => {
  const f = fixture(t); f.edit(path, mutate);
  assert.match(f.check().errors.join('\n'), expected);
});
test('duplicate stable note IDs are rejected', t => {
  const f = fixture(t);
  f.edit(kb + 'notes/pw-20261028-003-package-and-foundation.md', s => s.replace('id: pw-20261028-003', 'id: pw-20261028-001'));
  assert.match(f.check().errors.join('\n'), /Filename must begin with stable ID|Duplicate stable ID/);
});
test('destinations cover reference, HTML and inline links while ignoring fenced examples', () => {
  assert.deepEqual(destinations('[a][ref]\n[ref]: target.md\n<a href="page.md">x</a>\n[x](other.md)\n```md\n[ignored](gone.md)\n```'), ['target.md', 'other.md', 'page.md']);
  assert.throws(() => destinations('[x][unknown]'), /Undefined link reference/);
});

test('same-page links accept existing headings and reject missing headings', t => {
  const f = fixture(t);
  f.edit(note, s => s + '\n[Sources](#sources)\n');
  assert.deepEqual(f.check().errors, []);
  f.edit(note, s => s + '\n[Missing](#absent)\n');
  assert.match(f.check().errors.join('\n'), /Broken heading anchor/);
});
