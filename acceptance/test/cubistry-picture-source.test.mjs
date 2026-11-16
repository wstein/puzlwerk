import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../references/cubistry-picture/', import.meta.url);
test('pinned Picture3 sources retain their recorded hashes', async () => {
  const manifest = JSON.parse(await readFile(new URL('source-manifest.json',root)));
  assert.equal(manifest.revision,'efafcc1d97687eccea0cde87a230f447ce1b6c66');
  for (const path of ['src/apps/picture3/model.ts','src/apps/picture3/editor.ts','src/apps/picture3/images.ts','src/apps/picture3/presets.ts','src/apps/calendar/viewer.ts','src/apps/calendar/model.ts','LICENSE']) assert.ok(manifest.files[path],path);
  for (const [path,hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,path);
});
