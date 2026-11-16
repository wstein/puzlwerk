import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PerspectiveCamera,Object3D} from 'three';
import {cubePresentationRadius,fitPresentationCamera,rotatePresentation} from '../dist/presentation-rotation.js';
test('presentation camera and rotation match pinned source frames',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-presentation-framing.json',import.meta.url)));
 for(const c of fixture.cases){
  const sphere=cubePresentationRadius(c.extent),camera=new PerspectiveCamera(c.fov,c.aspect,.1,100),object=new Object3D();
  const distance=fitPresentationCamera(camera,sphere,c.zoom);rotatePresentation(object,c.yaw,c.pitch);
  assert.deepEqual({sphere,distance,far:camera.far,cameraPosition:camera.position.toArray(),rotation:object.quaternion.toArray()}, {sphere:c.sphere,distance:c.distance,far:c.far,cameraPosition:c.cameraPosition,rotation:c.rotation});
 }
});
