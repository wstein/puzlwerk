import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root = new URL('../references/cubistry/',import.meta.url);
test('pinned original source files retain their hashes', async () => {
 const manifest=JSON.parse(await readFile(new URL('source-manifest.json',root),'utf8'));
 assert.equal(manifest.revision,'efafcc1d97687eccea0cde87a230f447ce1b6c66');
 assert.ok(manifest.files['packages/cube-viewer/src/index.ts']);
 assert.ok(manifest.files['packages/cube-mechanics/res/PwMechanics.res.mjs']);
 for(const [path,expected] of Object.entries(manifest.files)) {
   const bytes=await readFile(new URL(path,root));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,path);
 }
});
