import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../assets/cubistry-picture3/', import.meta.url);
test('source presets retain distinct faces and native 54-tile identities', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.printing.length, 54);
  assert.equal(new Set(manifest.printing.map(s => s.id)).size, 54);
  assert.deepEqual(manifest.printing.find(s => s.id === 0), {id:0,cubie:6,p:[-1,1,-1],n:[0,1,0],up:[0,0,-1],image:'U_0_0',slot:0});
  for (const preset of ['coast','orbit','blocks']) {
    const hashes = [];
    for (const face of ['U','D','F','B','L','R']) {
      const name = `${preset}-${face}.svg`;
      const bytes = await readFile(new URL(name, root));
      const hash = createHash('sha256').update(bytes).digest('hex');
      assert.equal(hash, manifest.files[name]);
      hashes.push(hash);
    }
    assert.equal(new Set(hashes).size, 6);
  }
});
