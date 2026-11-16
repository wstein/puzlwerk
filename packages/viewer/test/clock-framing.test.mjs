import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {Quaternion,Euler,Vector3} from 'three';
import {clockRequiredDistance,clockCameraRadius,clockPresentationScale,clockWorldCenters} from '../dist/clock-framing.js';
test('clock view policy helpers match pinned source at two and three cubes',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-clock-framing.json',import.meta.url)));
 for(const c of fixture.cases){const q=new Quaternion().setFromEuler(new Euler(c.pitch,c.yaw,0));const required=clockRequiredDistance(c.aspect,q,28,c.count),distance=clockCameraRadius(c.aspect,0,0,28,c.count),scale=clockPresentationScale(c.aspect,q,28,c.count),centers=Array.from({length:c.count},()=>new Vector3());clockWorldCenters(q,scale,centers,c.count);assert.deepEqual({required,distance,scale,centers:centers.map(v=>v.toArray())},{required:c.required,distance:c.distance,scale:c.scale,centers:c.centers});}
});
