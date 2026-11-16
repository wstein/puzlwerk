import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base = new URL('../fixtures/cube-assembler-solved-2/',import.meta.url);
test('source-native solved cube and R action match recorded colors', async () => {
 const {createSolvedCube} = await import('../references/cube-assembler/src/cube/CapturedFaceMatching.res.mjs');
 const {applyCubeMove} = await import('../references/cube-assembler/src/cube/CubeMoves.res.mjs');
 const fixture=JSON.parse(await readFile(new URL('native.json',base),'utf8'));
 assert.deepEqual(fixture.home,createSolvedCube(2));
 const moved=applyCubeMove(fixture.home,2,'R',1);
 assert.deepEqual(moved,fixture.trace[0].state);
 assert.deepEqual(moved.u,['W','G','W','G']);
 assert.deepEqual(moved.f,['G','Y','G','Y']);
 assert.deepEqual(moved.b,['W','B','W','B']);
 assert.notDeepEqual(moved,applyCubeMove(fixture.home,2,'R',-1));
});

test('pinned viewer and generated bundle match source manifest', async () => {
 const {createHash}=await import('node:crypto');
 const root=new URL('../references/cube-assembler/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('source-manifest.json',root),'utf8'));
 assert.equal(manifest.revision,'1b7387b3acd40d817ebff820ae3cfcff8b7b1dc2');
 for(const path of ['src/client/view3d/cubeView3D.tsx','src/cube/CubeMoves.res','dist/original.js','dist/original.css','vendor/preact/LICENSE','vendor/@rescript/runtime/LICENSE']) assert.ok(manifest.files[path],path);
 for(const [path,hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(new URL(path,root))).digest('hex'),hash,path);
});
