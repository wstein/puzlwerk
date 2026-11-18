import {Element as NativeElement} from './native-rotation-binding-harness.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createStageForTest} from '../dist/stage.js';
const t=(position=[0,0,0])=>({position,rotation:[0,0,0,1]});
function attachNative(stage,element,now=()=>0,document=new EventTarget()){
 document.hidden=false;document.createElement=tag=>new NativeElement(tag);
 const media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div');media.matches=false;
 return stage.attachInput(element,panel,undefined,{now:()=>now()/1000,document,media,window});
}

const projection={pieces:[{id:'same',transform:t(),stickers:[]}]};
function harness(resolver=async()=>({ok:false}),onError=()=>{}){let now=0,id=0,renders=0;const frames=new Map();let scene,view;const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key)};const stage=createStageForTest({resolveAsset:resolver,onError,initialOrientation:[0,0,0,1],fovDegrees:35,sensitivity:.004,dragThreshold:0},clock,{render:s=>{scene=s;renders++},setView:v=>{view=v},dispose(){}});return {stage,frames,get now(){return now},get scene(){return scene},get renders(){return renders},get view(){return view},step(ms){now+=ms;const pending=[...frames.values()];frames.clear();for(const f of pending)f(now)}};}
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
 const withAsset={pieces:[{id:'same',transform:t(),stickers:[{id:'tile',transform:t([0,0,.5]),size:[1,1],color:'#fff',imageId:'image'}]}]};
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
test('view policy receives zoom and aspect before they commit',()=>{
 const h=harness(),views=[];assert.equal(h.stage.setViewPolicy(v=>{views.push([v.aspect,v.zoom]);return {distance:10*v.zoom,far:100,groupScale:v.aspect}}).ok,true);
 assert.equal(h.stage.resize(2).ok,true);assert.equal(h.stage.setZoom(.5).ok,true);assert.deepEqual(views.at(-1),[2,.5]);h.step(0);
 const before=h.renders;assert.equal(h.stage.resize(NaN).error.code,'InvalidView');assert.equal(h.stage.setZoom(0).error.code,'InvalidView');h.step(0);assert.equal(h.renders,before);h.stage.dispose();
});
test('adding a child evaluates the candidate layout atomically',()=>{
 const h=harness();assert.equal(h.stage.setViewPolicy(v=>{if(v.placements.length>1)throw Error('layout');return {distance:10,far:100,groupScale:1}}).ok,true);
 assert.equal(h.stage.addCube({position:[1,0,0]}).ok,true);const result=h.stage.addCube({position:[2,0,0]});assert.equal(result.error.code,'InvalidView');h.step(0);assert.equal(h.scene.children.filter(o=>o.type==='Group')[0].children.length,1);h.stage.dispose();
});
test('exposure policy reads candidate view and failure rolls back the whole frame',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 const seen=[];assert.equal(h.stage.setExposurePolicy(s=>{seen.push(s.cameraPosition[2]);return s.cameraPosition[2]>15?NaN:1}).ok,true);h.step(0);
 const result=h.stage.setViewPolicy(()=>({distance:20,far:100,groupScale:.5}));assert.equal(result.error.code,'InvalidLighting');assert.equal(seen.at(-1),20);assert.equal(h.view.distance,10);assert.equal(h.view.exposure,1);h.step(0);assert.equal(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).x,1);assert.equal(h.frames.size,0);h.stage.dispose();
});
test('hidden shared stage suspends all child turns without idle redraw',async()=>{
 let now=0,id=0,hidden=false,draws=0;const frames=new Map(),listeners=new Set();const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:id=>frames.delete(id),isHidden:()=>hidden,onVisibility:cb=>{listeners.add(cb);return()=>listeners.delete(cb)}};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){draws++},dispose(){}}),child=stage.addCube({position:[0,0,0]}).value;
 const from={pieces:[{id:'p',transform:t([1,0,0]),stickers:[]}]},to={pieces:[{id:'p',transform:{position:[-1,0,0],rotation:[0,0,1,0]},stickers:[]}]};await child.setProjection(from);
 const step=ms=>{now+=ms;const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(now)};step(0);const pending=child.transition({from,to,pieceIds:['p'],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI,durationMs:100});step(25);const before=draws;
 hidden=true;for(const fn of listeners)fn();assert.equal(frames.size,0);step(500);assert.equal(draws,before);hidden=false;for(const fn of listeners)fn();step(0);step(75);assert.equal((await pending).ok,true);assert.equal(frames.size,0);stage.dispose();assert.equal(listeners.size,0);
});
test('stage drag uses the source controller and reset restores its initial display',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 const listeners=new Map(),captured=new Set();const element={style:{touchAction:''},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type)=>listeners.delete(type),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
 assert.equal(h.stage.setRotationMode('classic').ok,true);assert.equal(attachNative(h.stage,element,()=>h.now).ok,true);
 const emit=(type,x,y)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:y,timeStamp:0});emit('pointerdown',0,0);emit('pointermove',100,0);emit('pointerup',100,0);h.step(0);
 const moved=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(moved.z)>.1);assert.equal(h.stage.resetDisplayOrientation().ok,true);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);h.stage.dispose();assert.equal(listeners.size,0);
});
test('smart return uses one timer while idle and resumes frames at its deadline',async()=>{
 let now=0,id=0;const frames=new Map(),timers=new Map();const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:id=>frames.delete(id),setTimer:(cb,delay)=>{timers.set(++id,{cb,at:now+delay});return id},clearTimer:id=>timers.delete(id)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){},dispose(){}}),child=stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);
 const listeners=new Map(),capture=new Set(),el={style:{touchAction:''},addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)};attachNative(stage,el,()=>now);
 const step=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb()}const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(now)};
 const emit=(type,x)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:now});step(0);emit('pointerdown',0);emit('pointermove',300);step(400);emit('pointerup',300);step(0);
 assert.equal(frames.size,0);assert.equal(timers.size,1);step(1000);assert.ok(frames.size>0);for(let i=0;i<50&&frames.size;i++)step(100);assert.equal(frames.size,0);assert.equal(timers.size,0);stage.dispose();
});
test('registered UI contacts block overlapping canvas drags until all contacts end',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);h.stage.setRotationMode('classic');
 const fake=()=>{const handlers=new Map(),captured=new Set(),listeners=new Map();return {handlers,style:{touchAction:''},addEventListener(t,f){if(!listeners.has(t)){listeners.set(t,new Set());handlers.set(t,event=>{for(const listener of [...listeners.get(t)])listener(event);});}listeners.get(t).add(f);},removeEventListener(t,f){listeners.get(t)?.delete(f);if(!listeners.get(t)?.size){listeners.delete(t);handlers.delete(t);}},setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)}};
 const document=fake(),canvas=fake(),panel=fake();panel.ownerDocument=document;attachNative(h.stage,canvas,()=>h.now,document);const registration=h.stage.registerInteractionSurface(panel);assert.equal(registration.ok,true);
 const emit=(target,type,id,x=0)=>target.handlers.get(type)?.({type,pointerId:id,clientX:x,clientY:0,timeStamp:0});
 emit(canvas,'pointerdown',1);emit(panel,'pointerdown',2);emit(canvas,'pointermove',1,100);emit(document,'pointerup',2);emit(canvas,'pointermove',1,200);emit(canvas,'pointerup',1,200);h.step(0);
 assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);
 emit(canvas,'pointerdown',3);emit(canvas,'pointermove',3,100);emit(canvas,'pointerup',3,100);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)>.1);
 registration.value();stageCleanup();function stageCleanup(){h.stage.dispose()}assert.equal(panel.handlers.size,0);assert.equal(document.handlers.size,0);
});
test('removing an active UI surface releases its contacts',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);h.stage.setRotationMode('classic');
 const fake=()=>{const handlers=new Map();return {handlers,style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}}};
 const doc=fake(),canvas=fake(),panel=fake();panel.ownerDocument=doc;attachNative(h.stage,canvas,()=>h.now,doc);const remove=h.stage.registerInteractionSurface(panel).value;panel.handlers.get('pointerdown')({pointerId:9});remove();
 const emit=(type,x)=>canvas.handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:0});emit('pointerdown',0);emit('pointermove',100);emit('pointerup',100);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)>.1);h.stage.dispose();
});
test('asynchronous display policy errors report once and do not schedule a motion loop',async()=>{
 const errors=[],h=harness(undefined,e=>errors.push(e.code)),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 assert.equal(h.stage.setViewPolicy(v=>{if(Math.abs(v.orientation[1])>.01)throw Error('bad');return {distance:10,far:100,groupScale:1}}).ok,true);h.step(0);
 const handlers=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};attachNative(h.stage,el,()=>h.now);
 const emit=(type,x)=>handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:0});emit('pointerdown',0);h.step(10);emit('pointermove',100);emit('pointerup',100);h.step(0);
 assert.ok(errors.includes('InvalidView'));assert.equal(h.frames.size,0);h.stage.dispose();
});
test('configured display sensitivity and drag threshold follow caller options',async()=>{
 let now=0,next=0,rendered;const frames=new Map(),clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false}),initialOrientation:[0,0,0,1],sensitivity:.01,dragThreshold:10,mode:'classic'},clock,{render:s=>{rendered=s},dispose(){}}),child=stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);
 const listeners=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};attachNative(stage,el,()=>now);const step=()=>{const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(now)};step();
 const emit=(type,x)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:now});emit('pointerdown',0);emit('pointermove',5);step();assert.ok(Math.abs(rendered.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);emit('pointermove',12);emit('pointerup',12);step();assert.ok(Math.abs(rendered.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z-Math.sin(-.12))<1e-6);stage.dispose();
});
test('child material settings survive artwork replacement and remain child-local',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const p={pieces:[{id:'same',transform:t(),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.8,.8],color:'#fff'}]}]};await a.setProjection(p);await b.setProjection(p);h.step(0);
 assert.equal(a.setMaterial({specularIntensity:.03,roughness:.65,clearcoat:.01,receiveShadow:false}).ok,true);assert.equal((await a.setArtwork({stickers:[{id:'tile',color:'#ff0000'}]})).ok,true);h.step(0);
 const tiles=[];h.scene.traverse(o=>{if(o.name==='tile')tiles.push(o)});const red=tiles.find(o=>o.material.color.getHexString()==='ff0000'),white=tiles.find(o=>o.material.color.getHexString()==='ffffff');assert.equal(red.material.specularIntensity,.03);assert.equal(red.receiveShadow,false);assert.notEqual(white.material.specularIntensity,.03);h.stage.dispose();
});
const directional=(position,intensity)=>({color:'#ffffff',intensity,visible:true,position,target:[0,0,0]});
const namesLighting=()=>({ambient:{color:'#ffffff',intensity:.8,visible:true},hemisphere:{sky:'#ffffff',ground:'#77808d',intensity:0,visible:true,position:[0,1,0]},key:directional([1,2.5,6.5],2.4),fill:directional([-4,1,2],.85),rim:directional([1,3,-4],1.3),shadowFill:directional([-1,7,3],1),extraDirectionals:[directional([-8,1.5,1.5],.9)],keyShadowStrength:.6,shadowFillStrength:.33,floorOpacity:.5,contactShadow:true,fineShadowEdges:false,colorTemperature:false,toneMapping:'softShoulder',exposure:s=>s.lights.ambient});
test('candidate lighting reaches exposure and fitted caster direction without accumulating',()=>{
 const h=harness();h.stage.addCube({position:[-1.4,0,0]});h.stage.addCube({position:[1.4,0,0]});const cfg=namesLighting();assert.equal(h.stage.setLighting(cfg).ok,true);h.step(0);
 const ambient=h.scene.children.find(o=>o.isAmbientLight),key=h.scene.children.find(o=>o.isDirectionalLight&&o.castShadow),floor=h.scene.getObjectByName('studio-shadow-receiver');assert.equal(ambient.intensity,.8);assert.equal(key.intensity,2.4);assert.ok(key.position.distanceTo(new THREE.Vector3(1,2.5,6.5).normalize().multiplyScalar(20))<1e-12);assert.equal(key.shadow.intensity,.6);assert.equal(floor.material.opacity,.5);assert.equal(h.view.exposure,.8);
 assert.equal(h.stage.setLighting(cfg).ok,true);assert.equal(key.shadow.intensity,.6);const invalid={...cfg,key:{...cfg.key,intensity:NaN}};assert.equal(h.stage.setLighting(invalid).error.code,'InvalidLighting');assert.equal(key.intensity,2.4);h.stage.dispose();
});
test('lighting uses candidate target direction and rolls back on invalid exposure',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});const cfg=namesLighting();assert.equal(h.stage.setLighting(cfg).ok,true);h.step(0);
 const key=h.scene.children.find(o=>o.isDirectionalLight&&o.castShadow),previous=key.position.clone(),bad={...cfg,key:{...cfg.key,intensity:9},exposure:()=>NaN};assert.equal(h.stage.setLighting(bad).error.code,'InvalidLighting');assert.equal(key.intensity,2.4);assert.ok(key.position.equals(previous));
 const shifted={...cfg,key:{...cfg.key,position:[2,3.5,7.5],target:[1,1,1]}};assert.equal(h.stage.setLighting(shifted).ok,true);const direction=key.position.clone().sub(key.target.position).normalize();assert.ok(direction.distanceTo(new THREE.Vector3(1,2.5,6.5).normalize())<1e-12);h.stage.dispose();
});
test('configured light colors survive temperature toggles and match exposure snapshot',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});const cfg=namesLighting(),red={...cfg,key:{...cfg.key,color:'#ff0000'},exposure:s=>s.lights.directionals[0].amount};
 assert.equal(h.stage.setLighting(red).ok,true);h.step(0);const key=h.scene.children.find(o=>o.isDirectionalLight&&o.castShadow);assert.equal(key.color.getHexString(),'ff0000');assert.ok(Math.abs(h.view.exposure-2.4*.2126)<1e-12);
 assert.equal(h.stage.setLighting({...red,colorTemperature:true}).ok,true);assert.equal(key.color.getHexString(),'fff3e3');assert.equal(h.stage.setLighting(red).ok,true);assert.equal(key.color.getHexString(),'ff0000');h.stage.dispose();
});
test('caller caster envelope scales with view and invalid envelopes preserve floor',()=>{
 const h=harness();h.stage.addCube({position:[0,1,0]});assert.equal(h.stage.setViewPolicy(()=>({distance:10,far:100,groupScale:.5})).ok,true);assert.equal(h.stage.setCasterEnvelope({radius:2,clearance:.2}).ok,true);h.step(0);const floor=h.scene.getObjectByName('studio-shadow-receiver');assert.ok(Math.abs(floor.position.y-(-.6))<1e-12);
 assert.equal(h.stage.setCasterEnvelope({radius:0,clearance:.2}).error.code,'InvalidView');assert.ok(Math.abs(floor.position.y-(-.6))<1e-12);h.stage.dispose();
});
test('removing a child refits the remaining layout',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;await a.setProjection(projection);await b.setProjection(projection);
 assert.equal(h.stage.setViewPolicy(v=>({distance:10,far:100,groupScale:v.placements.length===1?.5:1})).ok,true);h.step(0);a.dispose();h.step(0);assert.equal(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).x,1);h.stage.dispose();
});
test('stage disposal does not refit or draw while removing children',()=>{
 let views=0,draws=0,id=0;const frames=new Map(),clock={now:()=>0,request:cb=>{frames.set(++id,cb);return id},cancel:id=>frames.delete(id)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){draws++},setView(){views++},dispose(){}});stage.addCube({position:[-1,0,0]});stage.addCube({position:[1,0,0]});const before=views;stage.dispose();assert.equal(views,before);assert.equal(draws,0);assert.equal(frames.size,0);
});
test('configured FOV and successful view callback use immutable snapshots',()=>{
 const observed=[],clock={now:()=>0,request:()=>1,cancel(){}};const stage=createStageForTest({resolveAsset:async()=>({ok:false}),fovDegrees:28,onViewChanged:v=>observed.push(v)},clock,{render(){},dispose(){}});
 assert.equal(stage.setViewPolicy(v=>({distance:v.fovDegrees,far:100,groupScale:1})).ok,true);assert.equal(observed.at(-1).fovDegrees,28);assert.ok(Object.isFrozen(observed.at(-1)));assert.ok(Object.isFrozen(observed.at(-1).placements));const count=observed.length;assert.equal(stage.setViewPolicy(()=>({distance:0,far:100,groupScale:1})).error.code,'InvalidView');assert.equal(observed.length,count);stage.dispose();
});
test('shared stage owns one visibility listener for multiple children',()=>{
 const listeners=new Set(),clock={now:()=>0,request:()=>1,cancel(){},onVisibility:cb=>{listeners.add(cb);return()=>listeners.delete(cb)}};const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){},dispose(){}});
 stage.addCube({position:[0,0,0]});stage.addCube({position:[2,0,0]});assert.equal(listeners.size,1);stage.dispose();assert.equal(listeners.size,0);
});
test('nonfinite derived caster bounds reject a view before backend commit',async()=>{
 const h=harness(),child=h.stage.addCube({position:[100,0,0]}).value;await child.setProjection(projection);h.step(0);const previous=h.view;
 const invalid=h.stage.setViewPolicy(()=>({distance:10,far:100,groupScale:1e308}));assert.equal(invalid.error.code,'InvalidView');assert.deepEqual(h.view,previous);h.step(0);assert.equal(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).x,100);h.stage.dispose();
});
test('source plasticity render values 0, .6 and 1 reach material, lights and floor',async()=>{
 const {readFile}=await import('node:fs/promises'),fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-names-plasticity.json',import.meta.url)));const h=harness(),child=h.stage.addCube({position:[0,0,0]}).value;
 const p={pieces:[{id:'p',transform:t(),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.8,.8],color:'#fff'}]}]};await child.setProjection(p);h.step(0);
 for(const c of fixture.cases){const base=namesLighting(),cfg={...base,keyShadowStrength:c.parts.shadowStrength,shadowFillStrength:.55*c.parts.shadowStrength,floorOpacity:.3*c.floorFactor,exposure:()=>c.gain};assert.equal(h.stage.setLighting(cfg).ok,true);assert.equal(child.setMaterial({specularIntensity:c.parts.specular,roughness:c.roughness,clearcoat:c.clearcoat,receiveShadow:c.parts.faceShadows}).ok,true);h.step(0);const mesh=h.scene.getObjectByName('tile'),key=h.scene.children.find(o=>o.isDirectionalLight&&o.castShadow),floor=h.scene.getObjectByName('studio-shadow-receiver');assert.equal(mesh.material.specularIntensity,c.parts.specular);assert.equal(mesh.material.roughness,c.roughness);assert.equal(mesh.material.clearcoat,c.clearcoat);assert.equal(mesh.receiveShadow,c.parts.faceShadows);assert.equal(key.shadow.intensity,c.parts.shadowStrength);assert.equal(floor.material.opacity,.3*c.floorFactor);assert.equal(h.view.exposure,c.gain);}
 h.stage.dispose();
});
test('configured non-shadow light targets update their world matrices before drawing',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});const cfg=namesLighting();cfg.fill.target=[1,.5,0];assert.equal(h.stage.setLighting(cfg).ok,true);h.step(0);const lights=h.scene.children.filter(o=>o.isDirectionalLight),target=lights[1].target.matrixWorld.elements;assert.deepEqual([target[12],target[13],target[14]],[1,.5,0]);h.stage.dispose();
});
test('failed synchronous controller operations leave the previous display state',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.stage.setRotationMode('classic');
 const handlers=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};attachNative(h.stage,el,()=>h.now);const emit=(type,x)=>handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:0});h.step(0);emit('pointerdown',0);emit('pointermove',100);emit('pointerup',100);h.step(0);
 const before=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).clone();let invalid=false;h.stage.setExposurePolicy(()=>invalid?NaN:1);h.step(0);invalid=true;
 for(const op of [()=>h.stage.resetDisplayOrientation(),()=>h.stage.setRotationMode('smart'),()=>h.stage.setReducedMotion(true),()=>h.stage.interact()])assert.equal(op().error.code,'InvalidLighting');
 invalid=false;assert.equal(h.stage.invalidate().ok,true);h.step(0);assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-12);h.stage.dispose();
});
test('visibility resume does not restore input while blurred',()=>{
 let now=0,id=0,hidden=false,visibility;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:i=>frames.delete(i),setTimer:(cb,delay)=>{timers.set(++id,{cb,at:now+delay});return id},clearTimer:i=>timers.delete(i),isHidden:()=>hidden,onVisibility:cb=>(visibility=cb,()=>{})};const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){},dispose(){}});stage.addCube({position:[0,0,0]});const handlers=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};attachNative(stage,el,()=>now);const emit=(type,x)=>handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:now});emit('pointerdown',0);emit('pointermove',300);now=400;emit('pointerup',300);assert.equal(timers.size,1);stage.suspendInput();assert.equal(timers.size,0);hidden=true;visibility();hidden=false;visibility();assert.equal(timers.size,0);stage.resumeInput();assert.equal(timers.size,1);stage.dispose();
});
test('far plane must lie strictly beyond the near plane',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.step(0);const before=h.view,renders=h.renders;for(const far of [.05,.1]){assert.equal(h.stage.setViewPolicy(()=>({distance:10,far,groupScale:1})).error.code,'InvalidView');assert.deepEqual(h.view,before);h.step(0);assert.equal(h.renders,renders);}assert.equal(h.stage.setViewPolicy(()=>({distance:10,far:.1001,groupScale:1})).ok,true);h.stage.dispose();
});
test('child material survives full projection replacement without affecting its neighbor',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;const p={pieces:[{id:'same',transform:t(),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.8,.8],color:'#fff'}]}],core:{center:[0,0,0],halfExtent:1}};await a.setProjection(p);await b.setProjection(p);a.setMaterial({specularIntensity:.03,roughness:.65,clearcoat:.01,receiveShadow:false});await a.setProjection(p);h.step(0);const tiles=[];h.scene.traverse(o=>{if(o.name==='tile')tiles.push(o)});const changed=tiles.find(o=>o.material.specularIntensity===.03),other=tiles.find(o=>o!==changed);assert.ok(changed);assert.equal(changed.material.roughness,.65);assert.equal(changed.material.clearcoat,.01);assert.equal(changed.receiveShadow,false);assert.notEqual(other.material.specularIntensity,.03);h.stage.dispose();
});

test('default stage starts with native Cubistry camera and presentation orientation',()=>{
 let view;const clock={now:()=>0,request:()=>1,cancel:()=>{}};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false}),onViewChanged:v=>{view=v}},clock,{render(){},dispose(){}});
 assert.equal(stage.resize(1).ok,true);assert.equal(view.fovDegrees,18);
 const expected=new THREE.Quaternion().setFromEuler(new THREE.Euler(7*Math.PI/180,-Math.PI/18,0,'XYZ'));
 assert.ok(1-Math.abs(expected.dot(new THREE.Quaternion(...view.orientation)))<1e-12);stage.dispose();
});

test('stage input uses native HUD and rejects mode changes when the view policy rejects',()=>{
 const h=harness(),document=new EventTarget(),media=new EventTarget(),window=new EventTarget();
 const panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 const writes=[],environment={now:()=>0,document,media,window,storage:{getItem:()=>null,setItem:(...args)=>writes.push(args)}};
 assert.equal(h.stage.attachInput(canvas,panel,'test-key',environment).ok,true);
 const select=panel.children[0].children[0];assert.equal(select.value,'smart');let reject=false;
 assert.equal(h.stage.setViewPolicy(()=>{if(reject)throw Error('denied');return {distance:10,far:100,groupScale:1}}).ok,true);
 reject=true;select.value='free';select.dispatchEvent(new Event('change'));assert.equal(select.value,'smart');assert.deepEqual(writes,[]);h.stage.dispose();
});

test('native blur cancels a held pointer and focus permits a fresh drag',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.stage.setRotationMode('classic');h.step(0);
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 const environment={now:()=>h.now/1000,document,media,window};assert.equal(h.stage.attachInput(canvas,panel,undefined,environment).ok,true);
 canvas.pointer('pointerdown',0,0);canvas.pointer('pointermove',50,0);h.step(0);const before=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).clone();
 window.dispatchEvent(new Event('blur'));canvas.pointer('pointermove',150,0);h.step(0);assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-9);
 window.dispatchEvent(new Event('focus'));canvas.pointer('pointerdown',0,0,2);canvas.pointer('pointermove',50,0,2);canvas.pointer('pointerup',50,0,2);h.step(0);assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)>.01);h.stage.dispose();
});

test('context loss cancels native held pointer capture before later events',()=>{
 const h=harness(),document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(h.stage.attachInput(canvas,panel,undefined,{now:()=>h.now/1000,document,media,window}).ok,true);
 canvas.pointer('pointerdown',0,0,7);assert.equal(canvas.hasPointerCapture(7),true);h.stage.contextLost();assert.equal(canvas.hasPointerCapture(7),false);h.stage.dispose();
});

test('rejected native pointer input does not mutate the last accepted display',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(h.stage.attachInput(canvas,panel,undefined,{now:()=>h.now/1000,document,media,window}).ok,true);let reject=false;
 assert.equal(h.stage.setViewPolicy(()=>{if(reject)throw Error('denied');return {distance:10,far:100,groupScale:1}}).ok,true);h.step(0);
 const before=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).clone();reject=true;canvas.pointer('pointerdown',0,0);canvas.pointer('pointermove',100,0);h.step(0);h.scene.updateMatrixWorld(true);
 assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-9);reject=false;assert.equal(h.stage.invalidate().ok,true);h.step(0);assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-9);h.stage.dispose();
});

test('native HUD cannot change mode or storage after context loss',()=>{
 const h=harness(),document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;const writes=[];
 assert.equal(h.stage.attachInput(canvas,panel,'key',{now:()=>0,document,media,window,storage:{getItem:()=>null,setItem:(...args)=>writes.push(args)}}).ok,true);
 const select=panel.children[0].children[0],note=panel.children.find(child=>String(child.id).startsWith('cube-rotation-note')),before=note.textContent;h.stage.contextLost();select.value='free';select.dispatchEvent(new Event('change'));media.matches=true;media.dispatchEvent(new Event('change'));assert.equal(select.value,'smart');assert.equal(note.textContent,before);assert.deepEqual(writes,[]);h.stage.dispose();
});

test('native input still drives the committed controller after stage mode transactions',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(h.stage.attachInput(canvas,panel,undefined,{now:()=>h.now/1000,document,media,window}).ok,true);
 for(const [index,operation] of [()=>h.stage.setRotationMode('free'),()=>h.stage.setReducedMotion(true),()=>h.stage.resetDisplayOrientation()].entries()){
  assert.equal(operation().ok,true);h.step(0);const before=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).clone();
  canvas.pointer('pointerdown',0,0,index+1);canvas.pointer('pointermove',100,0,index+1);canvas.pointer('pointerup',100,0,index+1);h.step(0);
  assert.ok(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).distanceTo(before)>.1);
 }
 const select=panel.children[0].children[0];select.value='classic';select.dispatchEvent(new Event('change'));assert.equal(select.value,'classic');
 media.matches=false;media.dispatchEvent(new Event('change'));h.stage.dispose();
});

test('native stage preserves source inertia and settling at deterministic times',async()=>{
 const {SmartRotation:SourceRotation}=await import('../../../acceptance/references/cubistry/packages/cube-viewer/src/smart-rotation.ts');
 let now=0,id=0,view;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key),setTimer:(cb,delay)=>{timers.set(++id,{cb,at:now+delay});return id},clearTimer:key=>timers.delete(key)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false}),initialOrientation:[0,0,0,1],mode:'free',onViewChanged:value=>{view=value}},clock,{render(){},dispose(){}});
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(stage.attachInput(canvas,panel,undefined,{now:()=>now/1000,document,media,window}).ok,true);assert.equal(stage.resize(1).ok,true);
 const source=new SourceRotation(new THREE.Quaternion(),'free',false);canvas.pointer('pointerdown',0,0);source.down(0);now=16;canvas.pointer('pointermove',100,0);source.drag(0,.8,.016);canvas.pointer('pointerup',100,0);source.up(.016,false);
 for(const time of [32,80,160,320,640,1200,2400]){now=time;source.step(time/1000);const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(time);assert.ok(1-Math.abs(source.quaternion.dot(new THREE.Quaternion(...view.orientation)))<1e-10,`pose at ${time}ms`);}
 stage.dispose();source.dispose();
});

test('viewer appearance prepares all children before committing any child',async()=>{
 let rejectSecond=false;const h=harness(async id=>rejectSecond&&id==='second'?{ok:false,error:{code:'UnresolvedAsset',message:'second'}}:{ok:true,value:{}});
 const a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const make=(id,imageId)=>({pieces:[{id,transform:t(),stickers:[{id:`${id}-tile`,transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId}]}]});
 assert.equal((await a.setProjection(make('a','first'))).ok,true);assert.equal((await b.setProjection(make('b','second'))).ok,true);h.step(0);
 const beforeA=h.scene.getObjectByName('a'),beforeB=h.scene.getObjectByName('b');rejectSecond=true;
 const {PhysicalCubeScene}=await import('../dist/physical-scene.js'),originalDispose=PhysicalCubeScene.prototype.dispose;let disposed=0;PhysicalCubeScene.prototype.dispose=function(){disposed++;return originalDispose.call(this)};let rejected;
 try{rejected=await h.stage.setViewerAppearance({construction:'stickerless',frameColor:'#123456'});}finally{PhysicalCubeScene.prototype.dispose=originalDispose;}
 assert.equal(rejected.ok,false);assert.equal(disposed,1,'prepared successful child is disposed on another child failure');assert.equal(h.scene.getObjectByName('a'),beforeA);assert.equal(h.scene.getObjectByName('b'),beforeB);
 rejectSecond=false;assert.equal((await h.stage.setViewerAppearance({construction:'stickerless',frameColor:'#123456'})).ok,true);h.step(0);
 assert.notEqual(h.scene.getObjectByName('a'),beforeA);assert.notEqual(h.scene.getObjectByName('b'),beforeB);assert.ok(Array.isArray(h.scene.getObjectByName('a').children[0].material));assert.ok(Array.isArray(h.scene.getObjectByName('b').children[0].material));h.stage.dispose();
});

test('initial viewer appearance survives an empty stage and a later asynchronous first projection',async()=>{
 let release;const h=harness(()=>new Promise(resolve=>{release=resolve}));
 const initial=h.stage.setViewerAppearance({construction:'stickerless',frameColor:'#123456'});
 const added=h.stage.addCube({position:[0,0,0]});assert.equal(added.ok,true);const child=added.value,p={pieces:[{id:'late',transform:t(),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId:'image'}]}]};
 const setting=child.setProjection(p);release({ok:true,value:{}});assert.equal((await initial).ok,true);assert.equal((await setting).ok,true);h.step(0);
 assert.ok(Array.isArray(h.scene.getObjectByName('late').children[0].material));h.stage.dispose();
});

test('appearance transaction rejects new children until the current children commit',async()=>{
 let wait=false,release;const h=harness(()=>wait?new Promise(resolve=>{release=resolve}):Promise.resolve({ok:true,value:{}}));const child=h.stage.addCube({position:[0,0,0]}).value;
 const p={pieces:[{id:'p',transform:t(),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId:'image'}]}]};assert.equal((await child.setProjection(p)).ok,true);h.step(0);
 wait=true;const pending=h.stage.setViewerAppearance({construction:'stickerless',frameColor:null});const added=h.stage.addCube({position:[1,0,0]});assert.equal(added.ok,false);assert.equal(added.error.code,'Busy');release({ok:true,value:{}});assert.equal((await pending).ok,true);
 assert.equal(h.stage.addCube({position:[1,0,0]}).ok,true);h.stage.dispose();
});

test('removing a child during appearance preparation aborts the whole update',async()=>{
 let wait=false,release;const h=harness(()=>wait?new Promise(resolve=>{release=resolve}):Promise.resolve({ok:true,value:{}}));const a=h.stage.addCube({position:[0,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const p={pieces:[{id:'p',transform:t(),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId:'image'}]}]};assert.equal((await a.setProjection(p)).ok,true);h.step(0);const before=h.scene.getObjectByName('p');
 wait=true;const pending=h.stage.setViewerAppearance({construction:'stickerless',frameColor:null});b.dispose();release({ok:true,value:{}});assert.equal((await pending).ok,false);assert.equal(h.scene.getObjectByName('p'),before);h.stage.dispose();
});

test('appearance preparation failure preserves two active turns and their current poses',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const from={pieces:[{id:'piece',transform:t([1,0,0]),stickers:[{id:'tile',transform:t([0,0,.5]),size:[.87,.87],color:'#fff'}]}]},to={pieces:[{...from.pieces[0],transform:{position:[-1,0,0],rotation:[0,0,1,0]}}]};
 assert.equal((await a.setProjection(from)).ok,true);assert.equal((await b.setProjection(from)).ok,true);h.step(0);const motion={from,to,pieceIds:['piece'],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI,durationMs:100},pa=a.transition(motion),pb=b.transition(motion);h.step(50);
 const pieces=[];h.scene.traverse(o=>{if(o.name==='piece')pieces.push(o)});h.scene.updateMatrixWorld(true);const positions=pieces.map(p=>p.getWorldPosition(new THREE.Vector3()));
 const {PhysicalCubeScene}=await import('../dist/physical-scene.js'),original=PhysicalCubeScene.prototype.beginTurn;let count=0;PhysicalCubeScene.prototype.beginTurn=function(...args){if(++count===2)throw Error('second candidate fails');return original.apply(this,args)};
 try{assert.equal((await h.stage.setViewerAppearance({construction:'stickerless',frameColor:null})).ok,false);}finally{PhysicalCubeScene.prototype.beginTurn=original;}
 h.scene.updateMatrixWorld(true);for(let i=0;i<pieces.length;i++)assert.ok(pieces[i].getWorldPosition(new THREE.Vector3()).distanceTo(positions[i])<1e-9);h.step(50);assert.equal((await pa).ok,true);assert.equal((await pb).ok,true);h.stage.dispose();
});

test('shared viewer appearance switches projected and per-sticker picture modes',async()=>{
 const image={width:8,height:8},h=harness(async()=>({ok:true,value:image})),child=h.stage.addCube({position:[0,0,0]}).value,sf={normal:[0,0,1],up:[0,1,0]},faces={U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'};
 const p={pieces:[{id:'p',transform:t([-.5,.5,.5]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',sourceFace:sf,picture:{face:'F',layerIndex:[0,1,1]}}]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],picture:{widths:[1,1],faces}};
 assert.equal((await child.setProjection(p)).ok,true);h.step(0);assert.ok(h.scene.getObjectByName('s').material.map);
 assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:null,pictureMode:'per-sticker'})).ok,true);h.step(0);assert.equal(h.scene.getObjectByName('s').material.map,null);
 assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:null,pictureMode:'projected'})).ok,true);h.step(0);assert.ok(h.scene.getObjectByName('s').material.map);h.stage.dispose();
});

test('an empty child cannot start its first projection during another child appearance preparation',async()=>{
 let wait=false,release;const h=harness(()=>wait?new Promise(resolve=>{release=resolve}):Promise.resolve({ok:true,value:{}}));const a=h.stage.addCube({position:[0,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const p=id=>({pieces:[{id,transform:t(),stickers:[{id:`${id}-tile`,transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId:'image'}]}]});assert.equal((await a.setProjection(p('a'))).ok,true);h.step(0);wait=true;
 const pending=h.stage.setViewerAppearance({construction:'stickerless',frameColor:null});const competing=await Promise.race([b.setProjection(p('b')),Promise.resolve({ok:false,error:{code:'StillPending'}})]);assert.equal(competing.error.code,'Busy');release({ok:true,value:{}});assert.equal((await pending).ok,true);wait=false;assert.equal((await b.setProjection(p('b'))).ok,true);h.step(0);assert.ok(Array.isArray(h.scene.getObjectByName('b').children[0].material));h.stage.dispose();
});

test('failed appearance preparation cancels another child resolver without cancelling its turn',async()=>{
 let mode='ready',signal;const h=harness((id,current)=>{if(mode==='ready')return Promise.resolve({ok:true,value:{}});if(id==='first'){signal=current;return new Promise(()=>{});}return Promise.resolve({ok:false,error:{code:'UnresolvedAsset',message:'second'}})});
 const a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value,make=(id,imageId)=>({pieces:[{id,transform:t(),stickers:[{id:`${id}-tile`,transform:t([0,0,.5]),size:[.87,.87],color:'#fff',imageId}]}]});
 const from=make('a','first'),to={...from,pieces:[{...from.pieces[0],transform:{position:[0,0,0],rotation:[0,0,1,0]}}]};assert.equal((await a.setProjection(from)).ok,true);assert.equal((await b.setProjection(make('b','second'))).ok,true);h.step(0);const turning=a.transition({from,to,pieceIds:['a'],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI,durationMs:100});h.step(25);const before=h.scene.getObjectByName('a');mode='fail';
 const result=await Promise.race([h.stage.setViewerAppearance({construction:'stickerless',frameColor:null}),new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:{code:'Timeout'}}),100))]);assert.equal(result.error.code,'UnresolvedAsset');assert.equal(signal.aborted,true);assert.equal(h.scene.getObjectByName('a'),before);h.step(75);assert.equal((await turning).ok,true);mode='ready';assert.equal((await h.stage.setViewerAppearance({construction:'stickerless',frameColor:null})).ok,true);h.stage.dispose();
});

test('shared appearance commits preserve each child material overrides',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-1,0,0]}).value,b=h.stage.addCube({position:[1,0,0]}).value,p=id=>({pieces:[{id,transform:t(),stickers:[]}]});assert.equal((await a.setProjection(p('a'))).ok,true);assert.equal((await b.setProjection(p('b'))).ok,true);
 assert.equal(a.setMaterial({specularIntensity:.2,roughness:.25,clearcoat:.3,receiveShadow:false}).ok,true);assert.equal(b.setMaterial({specularIntensity:.4,roughness:.45,clearcoat:.5,receiveShadow:true}).ok,true);
 assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:'#112233'})).ok,true);h.step(0);const ma=h.scene.getObjectByName('a').children[0],mb=h.scene.getObjectByName('b').children[0];assert.equal(ma.material.roughness,.25);assert.equal(mb.material.roughness,.45);assert.equal(ma.receiveShadow,false);assert.equal(mb.receiveShadow,true);h.stage.dispose();
});

test('picture mode switching retains unequal layer geometry and body poses',async()=>{
 const h=harness(async()=>({ok:true,value:{width:8,height:8}})),child=h.stage.addCube({position:[0,0,0]}).value,sf={normal:[0,0,1],up:[0,1,0]},faces={U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'};
 const p={pieces:[{id:'p',transform:t([.5,-.6,.5]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',sourceFace:sf,picture:{face:'F',layerIndex:[1,0,1]}}]},{id:'other',transform:t([-.6,.5,-.6]),stickers:[]}],picture:{widths:[1,1.2],faces}};
 assert.equal((await child.setProjection(p)).ok,true);h.step(0);const before=h.scene.getObjectByName('p'),position=before.position.clone(),geometry=before.children[0].geometry,vertices=[...geometry.attributes.position.array],tile=h.scene.getObjectByName('s'),tilePosition=tile.position.clone(),tileScale=tile.scale.clone();geometry.computeBoundingBox();const width=geometry.boundingBox.max.x-geometry.boundingBox.min.x;
 assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:null,pictureMode:'per-sticker'})).ok,true);h.step(0);const after=h.scene.getObjectByName('p'),nextTile=h.scene.getObjectByName('s');after.children[0].geometry.computeBoundingBox();assert.ok(Math.abs(after.children[0].geometry.boundingBox.max.x-after.children[0].geometry.boundingBox.min.x-width)<1e-9);assert.deepEqual([...after.children[0].geometry.attributes.position.array],vertices);assert.ok(after.position.distanceTo(position)<1e-9);assert.ok(nextTile.position.distanceTo(tilePosition)<1e-9);assert.ok(nextTile.scale.distanceTo(tileScale)<1e-9);
 const to={...p,pieces:[{...p.pieces[0],transform:{position:[.5,-.6,.5],rotation:[0,0,1,0]}},p.pieces[1]]},turn=child.transition({from:p,to,pieceIds:['p'],axis:[0,0,1],pivot:[.5,-.6,.5],signedAngleRadians:Math.PI,durationMs:100});h.step(50);assert.ok(h.scene.getObjectByName('p').getWorldPosition(new THREE.Vector3()).distanceTo(position)<1e-9);child.cancel();assert.equal((await turn).error.code,'Cancelled');h.stage.dispose();
});

test('style default restores each child canonical frame color independently',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-1,0,0]}).value,b=h.stage.addCube({position:[1,0,0]}).value,p=(id,color)=>({pieces:[{id,transform:t(),stickers:[]}],appearance:{construction:'stickered',frameColor:color}});
 assert.equal((await a.setProjection(p('red','#ff0000'))).ok,true);assert.equal((await b.setProjection(p('blue','#0000ff'))).ok,true);assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:'#00ff00'})).ok,true);h.step(0);assert.equal(h.scene.getObjectByName('red').children[0].material.color.getHexString(),'00ff00');assert.equal(h.scene.getObjectByName('blue').children[0].material.color.getHexString(),'00ff00');
 assert.equal((await h.stage.setViewerAppearance({construction:'stickered',frameColor:null})).ok,true);h.step(0);assert.equal(h.scene.getObjectByName('red').children[0].material.color.getHexString(),'ff0000');assert.equal(h.scene.getObjectByName('blue').children[0].material.color.getHexString(),'0000ff');h.stage.dispose();
});
test('setShadowOpacity sets the strength of the floor shadow, rejects invalid values and is overridden by the next lighting',async()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.step(0);
 const floor=h.scene.getObjectByName('studio-shadow-receiver');assert.equal(floor.material.opacity,.3);
 for(const value of [.34,.62,0,1]){const before=h.renders;assert.equal(h.stage.setShadowOpacity(value).ok,true);assert.equal(floor.material.opacity,value);assert.equal(h.frames.size,1);h.step(0);assert.equal(h.renders,before+1);}
 for(const bad of [-.01,1.01,NaN,Infinity,'.5',undefined]){assert.equal(h.stage.setShadowOpacity(bad).error.code,'InvalidLighting');assert.equal(floor.material.opacity,1);}
 const cfg=namesLighting();assert.equal(h.stage.setLighting(cfg).ok,true);assert.equal(floor.material.opacity,cfg.floorOpacity);
 assert.equal(h.stage.setShadowOpacity(.5).ok,true);assert.equal(floor.material.opacity,.5);
 h.stage.dispose();assert.equal(h.stage.setShadowOpacity(.5).error.code,'Disposed');
});

const yawOf=h=>{const q=h.scene.children[0].quaternion;return 2*Math.atan2(q.y,q.w)};
test('auto-rotate is off by default and spins about the vertical axis, with the frame time capped',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.step(0);h.step(16);assert.equal(h.frames.size,0);assert.equal(yawOf(h),0);
 assert.equal(h.stage.setAutoRotate(true,{radiansPerMs:.001,resumeDelayMs:1000}).ok,true);
 for(let i=0;i<5;i++)h.step(16);assert.ok(Math.abs(yawOf(h)-.08)<1e-9,String(yawOf(h)));assert.equal(h.frames.size,1,'frames continue while it spins');
 const before=yawOf(h);h.step(1000);assert.ok(Math.abs(yawOf(h)-before-.05)<1e-9,'a long frame advances at most 50 ms');
 assert.equal(h.stage.setAutoRotate(false).ok,true);const stopped=yawOf(h);h.step(16);h.step(16);assert.equal(yawOf(h),stopped);assert.equal(h.frames.size,0);h.stage.dispose();
});
test('auto-rotate pauses for the resume delay after an interaction and not at all with reduced motion',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.step(0);h.stage.setAutoRotate(true,{radiansPerMs:.001,resumeDelayMs:1000});h.step(16);const a=yawOf(h);assert.ok(a>0);
 assert.equal(h.stage.beginPlay().ok,true);h.step(16);assert.equal(yawOf(h),a,'no spin while a contact holds the view');h.stage.endPlay();
 h.step(400);assert.equal(yawOf(h),a,'paused during the delay');h.step(400);assert.equal(yawOf(h),a);
 h.step(400);const resumed=yawOf(h);assert.ok(resumed>a,'resumes after the delay');
 assert.equal(h.stage.interact().ok,true);h.step(500);assert.equal(yawOf(h),resumed,'an interaction pauses again');
 h.stage.setReducedMotion(true);h.step(2000);h.step(16);assert.equal(yawOf(h),resumed,'reduced motion suppresses it');assert.equal(h.frames.size,0);
 h.stage.setReducedMotion(false);h.step(16);assert.ok(yawOf(h)>resumed,'and lifting it resumes');h.stage.dispose();
});
test('auto-rotate rejects invalid settings, keeps the previous ones and fails after dispose',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.stage.setAutoRotate(true,{radiansPerMs:.001,resumeDelayMs:0});h.step(0);
 for(const bad of [{radiansPerMs:0},{radiansPerMs:-1},{radiansPerMs:NaN},{radiansPerMs:Infinity},{resumeDelayMs:-1},{resumeDelayMs:NaN}])assert.equal(h.stage.setAutoRotate(true,bad).error.code,'InvalidView');
 assert.equal(h.stage.setAutoRotate('yes').error.code,'InvalidView');h.step(10);assert.ok(Math.abs(yawOf(h)-.01)<1e-9,'rate unchanged after rejected calls');
 assert.deepEqual(h.stage.getAutoRotate(),{enabled:true,radiansPerMs:.001,resumeDelayMs:0});
 h.stage.dispose();assert.equal(h.stage.setAutoRotate(false).error.code,'Disposed');assert.equal(h.stage.getAutoRotate().enabled,false,'a disposed stage reports auto-rotate as off');
});
test('auto-rotate does not spin while a contact holds the view for longer than the resume delay',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.stage.setRotationMode('free');h.step(0);
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(h.stage.attachInput(canvas,panel,undefined,{now:()=>h.now/1000,document,media,window}).ok,true);
 h.stage.setAutoRotate(true,{radiansPerMs:.001,resumeDelayMs:100});
 canvas.pointer('pointerdown',0,0);canvas.pointer('pointermove',50,0);h.step(16);const held=yawOf(h);
 for(let i=0;i<40;i++)h.step(40);assert.equal(yawOf(h),held,'a contact held for 1600 ms, far beyond the 100 ms resume delay, keeps the view still');
 canvas.pointer('pointerup',50,0);h.step(16);for(let i=0;i<10;i++)h.step(40);assert.notEqual(yawOf(h),held,'after the release the spin resumes');h.stage.dispose();
});
// The view motion of a release (coasting, then the smart mode's wait, return and leveling) is the controller's: auto-rotate adds nothing to it while it lasts (resume delay 0: the spin may start only once the controller is idle).
const releaseTrajectory=(mode,drag,rate)=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});h.stage.setRotationMode(mode);h.step(0);
 const document=new EventTarget(),media=new EventTarget(),window=new EventTarget(),panel=new NativeElement('div'),canvas=new NativeElement('canvas');document.hidden=false;document.createElement=tag=>new NativeElement(tag);media.matches=false;
 assert.equal(h.stage.attachInput(canvas,panel,undefined,{now:()=>h.now/1000,document,media,window}).ok,true);
 h.stage.setAutoRotate(true,{radiansPerMs:rate,resumeDelayMs:0});
 canvas.pointer('pointerdown',0,0);for(let i=1;i<=6;i++){h.step(16);canvas.pointer('pointermove',drag[0]*i,drag[1]*i)}canvas.pointer('pointerup',drag[0]*6,drag[1]*6);
 const samples=[];for(let i=0;i<220;i++){h.step(16);samples.push(h.scene.children[0].quaternion.toArray().map(v=>Math.round(v*1e6)/1e6).join())}
 h.stage.dispose();return samples;
};
for(const [mode,drag,label] of [['free',[40,0],'coasting after a fast release'],['smart',[50,50],'the wait, return and leveling after a diagonal release in the smart mode']]){
 test(`auto-rotate stays out of the controller motion: ${label}`,()=>{
  // Both runs keep the frames running (auto-rotate on); the reference rate is too small to turn anything, so only the stepping of the frames is common to both.
  const without=releaseTrajectory(mode,drag,1e-12),withAuto=releaseTrajectory(mode,drag,.001);
  let last=0;for(let i=1;i<without.length;i++)if(without[i]!==without[i-1])last=i;
  assert.ok(new Set(without).size>5&&last>5&&last<without.length-1,`the release moves the view by itself for ${last} frames and then rests`);
  assert.deepEqual(withAuto.slice(0,last),without.slice(0,last),'with no resume delay the poses of the controller motion, up to the frame in which it comes to rest, are those of a rate that turns nothing');
 });
}
