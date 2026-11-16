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

test('candidate home slots reproduce native solved facelets without inferred native IDs', async () => {
 const {faceletsFromWire}=await import('../fixtures/cube-assembler-solved-2/facelets.mjs');
 const read=async n=>JSON.parse(await readFile(new URL(n,base),'utf8'));
 const native=await read('native.json');
 const definition=await read('definition.json');
 const state=await read('state.json');
 const appearance=await read('appearance.json');
 assert.deepEqual(faceletsFromWire(definition,state,appearance),native.home);
 assert.equal(definition.pieces.length,8);
 assert.equal(definition.pieces.flatMap(p=>p.stickers).length,24);
 const changed=structuredClone(appearance);
 changed.stickers[0].color='B';
 assert.notDeepEqual(faceletsFromWire(definition,state,changed),native.home);
});

test('core move trace reproduces every native facelet state', async () => {
 const C=await import('../../core/res/PwCodec.res.mjs');
 const M=await import('../../core/res/PwMove.res.mjs');
 const V=await import('../../core/res/PwValidate.res.mjs');
 const {faceletsFromWire}=await import('../fixtures/cube-assembler-solved-2/facelets.mjs');
 const read=async n=>JSON.parse(await readFile(new URL(n,base),'utf8'));
 const definition=await read('definition.json'), appearance=await read('appearance.json'), native=await read('native.json');
 const d=C.decodeDefinition(JSON.stringify(definition)); assert.equal(d.TAG,'Ok');
 let s=C.decodeState(d._0,JSON.stringify(await read('state.json'))); assert.equal(s.TAG,'Ok');
 for(const [i,[axis,turns]] of [['X',-1],['Y',-1],['X',1],['Y',1]].entries()) {
  const move=M.make(C.size(d._0),axis,[1],turns); assert.equal(move.TAG,'Ok');
  s=V.applyMove(d._0,s._0,move._0); assert.equal(s.TAG,'Ok');
  assert.deepEqual(faceletsFromWire(definition,JSON.parse(C.encodeState(s._0)),appearance),native.trace[i].state,`step ${i+1}`);
 }
});
