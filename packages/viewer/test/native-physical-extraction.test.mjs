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

test('a body without stickers retains its opaque identity and can be turned without fabricating stickers',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const body={id:'inner/α',position:[0,0,0],rotation:[0,0,0,1]};
 const scene=new PhysicalCubeScene(parent,[],new Map(),material,.5,geometry,new Map(),{bodies:[body]});
 scene.sync([],[body]);const turn=scene.beginTurn([body.id],1,Math.PI/2);turn.update(.5);
 assert.ok(parent.children.some(child=>Math.abs(child.rotation.y-Math.PI/4)<1e-8));
 let stickers=0;parent.traverse(o=>{if(o.userData.stickerId!==undefined)stickers++;});assert.equal(stickers,0);
 turn.dispose();scene.dispose();material.dispose();assert.equal(parent.children.length,0);
});

test('body pose validation rejects duplicates and missing poses before moving anything',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const body={id:'inner',position:[0,0,0],rotation:[0,0,0,1]};
 assert.throws(()=>new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies:[body,body]}),/Duplicate physical body/);
 const overlapping={id:'face',cubie:body.id,p:[0,0,0],n:[0,0,1],up:[0,1,0]};
 assert.throws(()=>new PhysicalCubeScene(parent,[overlapping],new Map([['face',material]]),material,1,geometry,new Map(),{bodies:[body]}),/Duplicate physical body/);
 const scene=new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies:[body]});
 assert.throws(()=>scene.sync([],[]),/Missing or duplicate/);
 assert.throws(()=>scene.sync([],[{...body,position:[1,0,0]},{...body,position:[2,0,0]}]),/Missing or duplicate/);
 assert.equal(parent.children[0].position.x,0);
 scene.dispose();material.dispose();
});


test('missing sticker frames do not partially move previously validated bodies',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const a={id:'face-a',cubie:'piece-a',p:[-1,1,1],n:[0,0,1],up:[0,1,0]}, b={...a,id:'face-b',cubie:'piece-b',p:[1,1,1]};
 const scene=new PhysicalCubeScene(parent,[a,b],new Map([[a.id,material],[b.id,material]]),material,1,geometry);scene.sync([a,b]);
 const old=parent.children[0].position.x;assert.throws(()=>scene.sync([{...a,p:[0,1,1]}]),/Missing physical body frame/);
 assert.equal(parent.children[0].position.x,old);scene.dispose();material.dispose();
});
