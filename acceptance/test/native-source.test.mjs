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

test('reference build emits runnable imports and required notices', async () => {
 const {mkdtemp,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {compileReference}=await import('../references/cubistry/compile.mjs');
 const out=await mkdtemp(join(tmpdir(),'puzlwerk-reference-test-'));
 try {
   await compileReference(out);
   const source=await readFile(join(out,'packages/cube-viewer/src/index.js'),'utf8');
   assert.match(source,/\.\/physical-scene\.js/);
   assert.doesNotMatch(source,/\.\/physical-scene\.ts/);
   assert.match(await readFile(join(out,'original.js'),'utf8'),/export async function mountOriginal/);
   for(const file of ['LICENSE','CUBE_ASSEMBLER_LICENSE.txt','source-manifest.json']) assert.ok((await readFile(join(out,file))).length);
 } finally { await rm(out,{recursive:true,force:true}); }
});
