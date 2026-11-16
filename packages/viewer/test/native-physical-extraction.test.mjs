import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PhysicalCubeScene} from '../dist/physical-scene.js';

test('native physical scene keeps opaque sticker and piece identities through a turn',()=>{
 const parent=new THREE.Group(), material=new THREE.MeshStandardMaterial();
 const frame={id:'sticker/α',cubie:'piece/β',p:[1,1,1],n:[0,0,1],up:[0,1,0]};
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const scene=new PhysicalCubeScene(parent,[frame],new Map([[frame.id,material]]),material,.5,geometry);
 scene.sync([frame]);const turn=scene.beginTurn(['piece/β'],0,Math.PI/2);turn.update(.5);parent.updateMatrixWorld(true);
 assert.ok(parent.children.some(child=>Math.abs(child.rotation.x-Math.PI/4)<1e-8));
 turn.dispose();scene.dispose();material.dispose();assert.equal(parent.children.length,0);
});
