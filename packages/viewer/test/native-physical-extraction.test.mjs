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

test('universal turn supports an arbitrary axis and pivot without changing opaque identity',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const body={id:'inner',position:[2,0,0],rotation:[0,0,0,1]};
 const scene=new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies:[body]});
 const turn=scene.beginTurn([body.id],[0,0,1],Math.PI/2,[1,0,0]);turn.update(1);parent.updateMatrixWorld(true);
 const mesh=[];parent.traverse(o=>{if(o.isMesh)mesh.push(o)});const pos=mesh[0].getWorldPosition(new THREE.Vector3());
 assert.ok(pos.distanceTo(new THREE.Vector3(1,1,0))<1e-8);turn.dispose();scene.dispose();material.dispose();
});

test('numeric native axis turns match the original Euler rotations',()=>{
 for(let axis=0;axis<3;axis++)for(const angle of [-Math.PI/2,Math.PI/2,Math.PI]){
  const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
  const body={id:'piece',position:[1,0,0],rotation:[0,0,0,1]};
  const scene=new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies:[body]});
  const turn=scene.beginTurn([body.id],axis,angle);turn.update(.37);parent.updateMatrixWorld(true);
  const pivot=parent.children.find(c=>c.children.length && c.rotation.toArray().slice(0,3).some(v=>Math.abs(v)>1e-8));
  const expected=new THREE.Euler();expected[['x','y','z'][axis]]=angle*.37;
  assert.ok(1-Math.abs(pivot.quaternion.dot(new THREE.Quaternion().setFromEuler(expected)))<1e-12);
  turn.dispose();scene.dispose();material.dispose();
 }
});

test('direct Core body poses orient stickered native bodies without quantization',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const frame={id:'face',cubie:'piece',p:[1,0,0],n:[0,0,1],up:[0,1,0]},rotation=[0,Math.sin(.2),0,Math.cos(.2)];
 const scene=new PhysicalCubeScene(parent,[frame],new Map([['face',material]]),material,1,geometry);
 scene.syncBodyPoses([{id:'piece',position:[1,0,0],rotation}]);
 assert.ok(1-Math.abs(parent.children[0].quaternion.dot(new THREE.Quaternion(...rotation)))<1e-12);
 const previous=parent.children[0].position.clone();assert.throws(()=>scene.syncBodyPoses([]),/Missing or duplicate/);assert.ok(parent.children[0].position.equals(previous));
 scene.dispose();material.dispose();
});

test('direct free body pose preserves exact sticker center, normal, and up in world coordinates',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.71,.83),stickerOffset:.4321};
 const frame={id:'face',cubie:'piece',p:[1,2,3],n:[0,0,1],up:[0,1,0]},q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.4);
 const pose={id:'piece',position:[1,2,3],rotation:q.toArray()}, scene=new PhysicalCubeScene(parent,[frame],new Map([['face',material]]),material,1,geometry);
 scene.syncBodyPoses([pose]);parent.updateMatrixWorld(true);let sticker;parent.traverse(o=>{if(o.userData.stickerId==='face')sticker=o});
 const center=sticker.getWorldPosition(new THREE.Vector3()),expected=new THREE.Vector3(1,2,3).add(new THREE.Vector3(0,0,.4321).applyQuaternion(q));
 assert.ok(center.distanceTo(expected)<1e-9);const worldQ=sticker.getWorldQuaternion(new THREE.Quaternion());
 assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(worldQ).distanceTo(new THREE.Vector3(0,0,1).applyQuaternion(q))<1e-9);
 assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(worldQ).distanceTo(new THREE.Vector3(0,1,0).applyQuaternion(q))<1e-9);scene.dispose();material.dispose();
});

test('unprinted body respects source stickerless material and restores frame material',()=>{
 const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial({color:'#123456'});
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const body={id:'inner',position:[0,0,0],rotation:[0,0,0,1]},scene=new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies:[body]});
 const mesh=parent.children[0].children[0];scene.setConstruction('stickerless');assert.equal(mesh.material.color.getHexString(),'3a3d42');
 scene.setConstruction('stickered');assert.equal(mesh.material,material);scene.dispose();material.dispose();
});

test('native unequal layer grids place every body at canonical world centers once',async()=>{
 const {presentationLayerProfile}=await import('../dist/presentation-preset.js');const parent=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const geometry={body:new THREE.BoxGeometry(.9,.9,.9),sticker:new THREE.PlaneGeometry(.8,.8),stickerOffset:.46};
 const bodies=[];for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5])bodies.push({id:`${x}/${y}/${z}`,position:[x,y,z],rotation:[0,0,0,1]});
 const scene=new PhysicalCubeScene(parent,[],new Map(),material,1,geometry,new Map(),{bodies,layers:presentationLayerProfile([1,1.2])});scene.syncBodyPoses(bodies);
 const positions=parent.children.map(o=>o.position.toArray());for(const position of positions)for(const v of position)assert.ok(Math.abs(v+.6)<1e-9||Math.abs(v-.5)<1e-9);
 scene.dispose();material.dispose();
});
