import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrientationIndicator} from '../dist/orientation-indicator.js';

const identity=[0,0,0,1];
const q=(axis,angle)=>new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...axis),angle).toArray();
const camera=()=>{const c=new THREE.PerspectiveCamera(45,2,.1,100);c.position.z=10;c.updateProjectionMatrix();c.updateMatrixWorld();return c};
test('independent orientations, anchor and disposal',()=>{
 const scene=new THREE.Scene(),c=camera(), original={physicalOrientation:q([1,0,0],.3),solverFrame:q([0,1,0],.4),presentationOrientation:q([0,0,1],.5),colors:{x:0xff0000,y:0xffffff,z:0x00ff00}};
 const snapshot=JSON.stringify(original);let invalidations=0;
 const indicator=createOrientationIndicator(scene,c,{anchor:[.2,.8],invalidate:()=>invalidations++});
 indicator.resize({width:800,height:400});indicator.update(original);
 const group=scene.getObjectByName('orientation-indicator');assert.ok(group);
 const expected=new THREE.Quaternion(...original.presentationOrientation).multiply(new THREE.Quaternion(...original.physicalOrientation)).multiply(new THREE.Quaternion(...original.solverFrame));
 assert.ok(1-Math.abs(group.quaternion.dot(expected))<1e-10);
 const projected=group.position.clone().project(c);assert.ok(Math.abs(projected.x+.6)<1e-10);assert.ok(Math.abs(projected.y+.6)<1e-10);
 assert.equal(JSON.stringify(original),snapshot);assert.ok(invalidations>=2);
 assert.equal(group.getObjectByName('orientation-axis-x').children[0].material.color.getHex(),0xff0000);
 indicator.update({...original,physicalOrientation:identity,solverFrame:identity,presentationOrientation:identity});assert.ok(1-Math.abs(group.quaternion.w)<1e-10);
 indicator.reset();assert.ok(1-Math.abs(group.quaternion.w)<1e-10);
 let disposed=0;group.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>disposed++);});indicator.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,6);indicator.dispose();assert.equal(disposed,6);
});
test('reset retains physical and frame data, anchor is owned and malformed input is atomic',()=>{
 const scene=new THREE.Scene(), c=camera(), anchor=[.2,.8];
 const i=createOrientationIndicator(scene,c,{anchor});
 const input={physicalOrientation:q([1,0,0],.6),solverFrame:q([0,1,0],.7),presentationOrientation:q([0,0,1],.8),colors:{x:1,y:2,z:3}};
 i.update(input);const group=scene.getObjectByName('orientation-indicator');anchor[0]=.9;i.resize({width:800,height:400});assert.ok(Math.abs(group.position.clone().project(c).x+.6)<1e-10);
 i.reset();const expected=new THREE.Quaternion(...input.physicalOrientation).multiply(new THREE.Quaternion(...input.solverFrame));assert.ok(1-Math.abs(group.quaternion.dot(expected))<1e-10);assert.equal(group.getObjectByName('orientation-axis-x').children[0].material.color.getHex(),1);
 const before=group.quaternion.clone();for(const bad of [[0,,0,1],[0,0,0,0],[0,0,0,2],[0,NaN,0,1]])assert.throws(()=>i.update({...input,presentationOrientation:bad}));assert.ok(group.quaternion.equals(before));
 for(const bad of [[.2,,],[NaN,.2],[-1,.2]])assert.throws(()=>createOrientationIndicator(new THREE.Scene(),c,{anchor:bad}));
 i.dispose();
});
test('labels retain axis colors and offsets when an earlier canvas context is unavailable',()=>{
 const previous=globalThis.document;let n=0;
 globalThis.document={createElement(){return {getContext(){if(n++===0)return null;return {strokeText(){},fillText(){}}}}}};
 try {const scene=new THREE.Scene(),i=createOrientationIndicator(scene,camera(),{anchor:[.2,.8]});i.update({physicalOrientation:identity,solverFrame:identity,presentationOrientation:identity,colors:{x:0xff0000,y:0x00ff00,z:0x0000ff}});const group=scene.getObjectByName('orientation-indicator'),y=group.getObjectByName('orientation-label-y'),z=group.getObjectByName('orientation-label-z');assert.equal(y.material.color.getHex(),0x00ff00);assert.equal(z.material.color.getHex(),0x0000ff);assert.deepEqual(y.position.toArray(),[.13,.98,-.1]);assert.deepEqual(z.position.toArray(),[-.2,.14,.98]);i.dispose();} finally {globalThis.document=previous;}
});
test('scene parent rotation applies once and anchor remains in viewport',()=>{
 const scene=new THREE.Scene(),c=camera();scene.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),.6);const i=createOrientationIndicator(scene,c,{anchor:[.2,.8]});const input={physicalOrientation:q([1,0,0],.4),solverFrame:q([0,0,1],.3),presentationOrientation:q([0,1,0],.2),colors:{x:1,y:2,z:3}};i.update(input);scene.updateMatrixWorld(true);const group=scene.getObjectByName('orientation-indicator');const expected=scene.quaternion.clone().multiply(new THREE.Quaternion(...input.presentationOrientation)).multiply(new THREE.Quaternion(...input.physicalOrientation)).multiply(new THREE.Quaternion(...input.solverFrame));assert.ok(1-Math.abs(group.getWorldQuaternion(new THREE.Quaternion()).dot(expected))<1e-10);assert.ok(Math.abs(group.getWorldPosition(new THREE.Vector3()).project(c).x+.6)<1e-10);i.dispose();
});
