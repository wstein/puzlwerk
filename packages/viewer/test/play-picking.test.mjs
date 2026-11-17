import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {pickPlayFace} from '../dist/play-picking.js';
test('face picking uses the target cube frame and ignores unrelated scene meshes',()=>{
 const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,0,8);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix();const parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial());mesh.userData.stickerId='sticker:s1';parent.add(mesh);parent.updateMatrixWorld(true);
 const hit=pickPlayFace(parent,camera,{left:0,top:0,width:400,height:400},200,200,1);assert.equal(hit.hit.face,'F');assert.equal(hit.stickerId,'sticker:s1');assert.ok(Math.abs(hit.hit.point[0])<1e-8);assert.deepEqual(hit.hit.point.slice(1),[0,1]);assert.equal(pickPlayFace(parent,camera,{left:0,top:0,width:400,height:400},0,0,1),undefined);
});
