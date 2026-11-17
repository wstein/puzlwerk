import {test} from 'node:test';import assert from 'node:assert/strict';
import {cubePresentationRadius,presentationCameraRadius} from '../dist/index.js';
test('the cube radius and camera distance of a presentation are public for apps with their own view policy',()=>{
  assert.equal(cubePresentationRadius(1),Math.sqrt(3)*1.001);
  assert.ok(Math.abs(cubePresentationRadius(3.5)-Math.sqrt(3)*3.501)<1e-12);
  const near=presentationCameraRadius(1,cubePresentationRadius(1),18),far=presentationCameraRadius(1,cubePresentationRadius(3.5),18);
  assert.ok(Math.abs(far/near-3.501/1.001)<1e-9);
  assert.ok(presentationCameraRadius(.5,1,18)>presentationCameraRadius(2,1,18));
});
