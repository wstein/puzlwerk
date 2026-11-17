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
