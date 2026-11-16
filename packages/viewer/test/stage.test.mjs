import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createStageForTest} from '../dist/stage.js';
const t=(position=[0,0,0])=>({position,rotation:[0,0,0,1]});
const projection={pieces:[{id:'same',transform:t(),stickers:[]}]};
function harness(resolver=async()=>({ok:false})){let now=0,id=0,renders=0;const frames=new Map();let scene;const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key)};const stage=createStageForTest({resolveAsset:resolver},clock,{render:s=>{scene=s;renders++},dispose(){}});return {stage,frames,get scene(){return scene},get renders(){return renders},step(ms){now+=ms;const pending=[...frames.values()];frames.clear();for(const f of pending)f(now)}};}
test('shared stage draws two independently disposed children in one frame',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 assert.equal((await a.setProjection(projection)).ok,true);assert.equal((await b.setProjection(projection)).ok,true);assert.equal(h.frames.size,1);h.step(0);assert.equal(h.renders,1);assert.equal(h.scene.children.filter(o=>o.name==='studio-shadow-receiver').length,1);
 const pieces=[];h.scene.traverse(o=>{if(o.name==='same')pieces.push(o)});assert.equal(pieces.length,2);assert.deepEqual(pieces.map(o=>o.getWorldPosition(new THREE.Vector3()).x).sort((x,y)=>x-y),[-2,2]);
 a.dispose();h.step(0);assert.equal(h.renders,2);assert.equal((await b.setProjection(projection)).ok,true);h.step(0);h.stage.dispose();assert.equal(h.frames.size,0);assert.equal((await b.setProjection(projection)).error.code,'Disposed');
});
test('shared children turn and cancel independently while core follows its placement',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const from={pieces:[{id:'same',transform:t([1,0,0]),stickers:[]}],core:{center:[0,0,0],halfExtent:1}};
 const to={...from,pieces:[{...from.pieces[0],transform:{position:[-1,0,0],rotation:[0,0,1,0]}}]};
 await a.setProjection(from);await b.setProjection(from);h.step(0);
 const turn={from,to,pieceIds:['same'],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI,durationMs:100};const pa=a.transition(turn),pb=b.transition(turn);h.step(50);
 const cores=[];h.scene.traverse(o=>{if(o.isMesh&&o.geometry.type==='SphereGeometry')cores.push(o)});assert.equal(cores.length,2);assert.deepEqual(cores.map(o=>o.getWorldPosition(new THREE.Vector3()).x).sort((x,y)=>x-y),[-2,2]);
 assert.equal(a.cancel().ok,true);assert.equal((await pa).error.code,'Cancelled');h.step(50);assert.equal((await pb).ok,true);assert.equal(h.frames.size,0);h.stage.dispose();
});
test('context loss cancels all child asset work and prevents late rendering',async()=>{
 const pending=[],signals=[];const h=harness((id,signal)=>{signals.push(signal);return new Promise(resolve=>pending.push(resolve))}),a=h.stage.addCube({position:[0,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const withAsset={pieces:[{id:'same',transform:t(),stickers:[{id:'tile',transform:t(),size:[1,1],color:'#fff',imageId:'image'}]}]};
 const pa=a.setProjection(withAsset),pb=b.setProjection(withAsset);h.stage.contextLost();assert.ok(signals.every(signal=>signal.aborted));assert.equal((await pa).error.code,'ContextLost');assert.equal((await pb).error.code,'ContextLost');assert.equal(h.frames.size,0);
 for(const resolve of pending)resolve({ok:true,value:{}});await Promise.resolve();h.step(0);assert.equal(h.renders,0);assert.equal((await a.setProjection(projection)).error.code,'ContextLost');h.stage.dispose();
});
test('view-policy failures preserve the last accepted presentation',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 assert.equal(h.stage.setViewPolicy(()=>({distance:10,far:100,groupScale:.5})).ok,true);h.step(0);const body=h.scene.getObjectByName('same');assert.equal(body.getWorldPosition(new THREE.Vector3()).x,.5);
 const result=h.stage.setViewPolicy(()=>({distance:10,far:100,groupScale:NaN}));assert.equal(result.error.code,'InvalidView');h.step(0);assert.equal(body.getWorldPosition(new THREE.Vector3()).x,.5);assert.equal(h.frames.size,0);h.stage.dispose();
});
test('placement changes evaluate view policy before committing child movement',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 assert.equal(h.stage.setViewPolicy(v=>({distance:10,far:100,groupScale:v.placements[0].position[0]===3?.25:1})).ok,true);h.step(0);
 assert.equal(child.setPosition([3,0,0]).ok,true);h.step(0);assert.equal(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).x,.75);
 assert.equal(h.stage.setViewPolicy(v=>{if(v.placements[0].position[0]===4)throw Error('bad');return {distance:10,far:100,groupScale:1}}).ok,true);h.step(0);
 const invalid=child.setPosition([4,0,0]);assert.equal(invalid.error.code,'InvalidView');h.step(0);assert.equal(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).x,3);h.stage.dispose();
});
test('live artwork changes only its own child during simultaneous turns',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const from={pieces:[{id:'same',transform:t([1,0,0]),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.8,.8],color:'#ffffff'}]}]};
 const to={pieces:[{...from.pieces[0],transform:{position:[-1,0,0],rotation:[0,0,1,0]}}]};await a.setProjection(from);await b.setProjection(from);h.step(0);
 const motion={from,to,pieceIds:['same'],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI,durationMs:100};const pa=a.transition(motion),pb=b.transition(motion);h.step(50);
 assert.equal((await a.setArtwork({stickers:[{id:'tile',color:'#ff0000'}]})).ok,true);h.step(0);
 const tiles=[];h.scene.traverse(o=>{if(o.name==='tile')tiles.push(o)});assert.deepEqual(tiles.map(o=>o.material.color.getHexString()).sort(),['ff0000','ffffff']);
 h.step(50);assert.equal((await pa).ok,true);assert.equal((await pb).ok,true);h.stage.dispose();
});
