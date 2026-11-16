import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import * as THREE from 'three';import {createPresentationStudio} from '../dist/studio.js';
test('source caster fit retains defaults and follows configured direction reversibly',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-casters.json',import.meta.url)));const scene=new THREE.Scene(),studio=createPresentationStudio(scene),lights=scene.children.filter(o=>o.isDirectionalLight&&o.castShadow);const centers=[new THREE.Vector3(-1.4,0,0),new THREE.Vector3(1.4,0,0)];
 const snapshot=()=>lights.map(l=>({position:l.position.toArray(),frustum:['left','right','bottom','top','near','far'].map(k=>l.shadow.camera[k])}));
 studio.fitCasters(centers,1.5,.08);assert.deepEqual(snapshot(),fixture.standard);
 const initial=lights.map(l=>l.position.clone()); lights.forEach(l=>{l.shadow.needsUpdate=false});studio.setCasterDirections(new THREE.Vector3(...fixture.namesKey),new THREE.Vector3(-2,3,4)); assert.ok(lights.every(l=>l.shadow.needsUpdate));studio.fitCasters(centers,1.5,.08);
 const expected=new THREE.Vector3(...fixture.namesKey).normalize().multiplyScalar(20);assert.ok(lights[0].position.distanceTo(expected)<1e-12);assert.notDeepEqual(snapshot()[0].frustum,fixture.standard[0].frustum);assert.ok(lights[1].position.distanceTo(new THREE.Vector3(-2,3,4).normalize().multiplyScalar(20))<1e-12);
 studio.setCasterDirections(initial[0],initial[1]);studio.fitCasters(centers,1.5,.08);assert.deepEqual(snapshot(),fixture.standard);
 assert.throws(()=>studio.setCasterDirections(new THREE.Vector3(...fixture.namesKey),new THREE.Vector3(0,0,0))); studio.fitCasters(centers,1.5,.08);assert.deepEqual(snapshot(),fixture.standard);studio.dispose();
});
