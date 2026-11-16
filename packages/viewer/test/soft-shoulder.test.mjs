import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as THREE from 'three';import {shoulder,SHOULDER_GLSL,installSoftShoulder} from '../dist/soft-shoulder.js';
test('soft shoulder matches source and installs its fixed shader idempotently',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-soft-shoulder.json',import.meta.url)));
 assert.equal(SHOULDER_GLSL,fixture.glsl);assert.deepEqual(fixture.inputs.map(x=>shoulder(x)),fixture.outputs);
 const original=THREE.ShaderChunk.tonemapping_pars_fragment;
 try{installSoftShoulder();const installed=THREE.ShaderChunk.tonemapping_pars_fragment;assert.ok(installed.includes(fixture.glsl));assert.ok(installed.includes('vec3 NeutralToneMapping'));installSoftShoulder();assert.equal(THREE.ShaderChunk.tonemapping_pars_fragment,installed);THREE.ShaderChunk.tonemapping_pars_fragment='unexpected custom shader';assert.throws(()=>installSoftShoulder());}
 finally{THREE.ShaderChunk.tonemapping_pars_fragment=original;}
});
