import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createStageForTest} from '../dist/stage.js';
const t=(position=[0,0,0])=>({position,rotation:[0,0,0,1]});
const projection={pieces:[{id:'same',transform:t(),stickers:[]}]};
function harness(resolver=async()=>({ok:false}),onError=()=>{}){let now=0,id=0,renders=0;const frames=new Map();let scene,view;const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key)};const stage=createStageForTest({resolveAsset:resolver,onError},clock,{render:s=>{scene=s;renders++},setView:v=>{view=v},dispose(){}});return {stage,frames,get scene(){return scene},get renders(){return renders},get view(){return view},step(ms){now+=ms;const pending=[...frames.values()];frames.clear();for(const f of pending)f(now)}};}
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
 assert.equal(h.stage.setRotationMode('classic').ok,true);assert.equal(h.stage.attachInput(element).ok,true);
 const emit=(type,x,y)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:y,timeStamp:0});emit('pointerdown',0,0);emit('pointermove',100,0);emit('pointerup',100,0);h.step(0);
 const moved=h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(moved.z)>.1);assert.equal(h.stage.resetDisplayOrientation().ok,true);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);h.stage.dispose();assert.equal(listeners.size,0);
});
test('smart return uses one timer while idle and resumes frames at its deadline',async()=>{
 let now=0,id=0;const frames=new Map(),timers=new Map();const clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:id=>frames.delete(id),setTimer:(cb,delay)=>{timers.set(++id,{cb,at:now+delay});return id},clearTimer:id=>timers.delete(id)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false})},clock,{render(){},dispose(){}}),child=stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);
 const listeners=new Map(),capture=new Set(),el={style:{touchAction:''},addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)};stage.attachInput(el);
 const step=ms=>{now+=ms;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb()}const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(now)};
 const emit=(type,x)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:now});step(0);emit('pointerdown',0);emit('pointermove',300);step(400);emit('pointerup',300);step(0);
 assert.equal(frames.size,0);assert.equal(timers.size,1);step(1000);assert.ok(frames.size>0);for(let i=0;i<50&&frames.size;i++)step(100);assert.equal(frames.size,0);assert.equal(timers.size,0);stage.dispose();
});
test('registered UI contacts block overlapping canvas drags until all contacts end',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);h.stage.setRotationMode('classic');
 const fake=()=>{const handlers=new Map(),captured=new Set();return {handlers,style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)}};
 const document=fake(),canvas=fake(),panel=fake();panel.ownerDocument=document;h.stage.attachInput(canvas);const registration=h.stage.registerInteractionSurface(panel);assert.equal(registration.ok,true);
 const emit=(target,type,id,x=0)=>target.handlers.get(type)?.({type,pointerId:id,clientX:x,clientY:0,timeStamp:0});
 emit(canvas,'pointerdown',1);emit(panel,'pointerdown',2);emit(canvas,'pointermove',1,100);emit(document,'pointerup',2);emit(canvas,'pointermove',1,200);emit(canvas,'pointerup',1,200);h.step(0);
 assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);
 emit(canvas,'pointerdown',3);emit(canvas,'pointermove',3,100);emit(canvas,'pointerup',3,100);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)>.1);
 registration.value();stageCleanup();function stageCleanup(){h.stage.dispose()}assert.equal(panel.handlers.size,0);assert.equal(document.handlers.size,0);
});
test('removing an active UI surface releases its contacts',async()=>{
 const h=harness(),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);h.stage.setRotationMode('classic');
 const fake=()=>{const handlers=new Map();return {handlers,style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}}};
 const doc=fake(),canvas=fake(),panel=fake();panel.ownerDocument=doc;h.stage.attachInput(canvas);const remove=h.stage.registerInteractionSurface(panel).value;panel.handlers.get('pointerdown')({pointerId:9});remove();
 const emit=(type,x)=>canvas.handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:0});emit('pointerdown',0);emit('pointermove',100);emit('pointerup',100);h.step(0);assert.ok(Math.abs(h.scene.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)>.1);h.stage.dispose();
});
test('asynchronous display policy errors report once and do not schedule a motion loop',async()=>{
 const errors=[],h=harness(undefined,e=>errors.push(e.code)),child=h.stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);h.step(0);
 assert.equal(h.stage.setViewPolicy(v=>{if(Math.abs(v.orientation[1])>.01)throw Error('bad');return {distance:10,far:100,groupScale:1}}).ok,true);h.step(0);
 const handlers=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>handlers.set(t,f),removeEventListener:t=>handlers.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};h.stage.attachInput(el);
 const emit=(type,x)=>handlers.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:0});emit('pointerdown',0);h.step(10);emit('pointermove',100);emit('pointerup',100);h.step(0);
 assert.ok(errors.includes('InvalidView'));assert.equal(h.frames.size,0);h.stage.dispose();
});
test('configured display sensitivity and drag threshold follow caller options',async()=>{
 let now=0,next=0,rendered;const frames=new Map(),clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id)};
 const stage=createStageForTest({resolveAsset:async()=>({ok:false}),sensitivity:.01,dragThreshold:10,mode:'classic'},clock,{render:s=>{rendered=s},dispose(){}}),child=stage.addCube({position:[1,0,0]}).value;await child.setProjection(projection);
 const listeners=new Map(),el={style:{touchAction:''},addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),setPointerCapture(){},hasPointerCapture(){return false},releasePointerCapture(){}};stage.attachInput(el);const step=()=>{const pending=[...frames.values()];frames.clear();for(const cb of pending)cb(now)};step();
 const emit=(type,x)=>listeners.get(type)?.({type,pointerId:1,clientX:x,clientY:0,timeStamp:now});emit('pointerdown',0);emit('pointermove',5);step();assert.ok(Math.abs(rendered.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z)<1e-12);emit('pointermove',12);emit('pointerup',12);step();assert.ok(Math.abs(rendered.getObjectByName('same').getWorldPosition(new THREE.Vector3()).z-Math.sin(-.12))<1e-6);stage.dispose();
});
test('child material settings survive artwork replacement and remain child-local',async()=>{
 const h=harness(),a=h.stage.addCube({position:[-2,0,0]}).value,b=h.stage.addCube({position:[2,0,0]}).value;
 const p={pieces:[{id:'same',transform:t(),stickers:[{id:'tile',transform:t(),size:[.8,.8],color:'#fff'}]}]};await a.setProjection(p);await b.setProjection(p);h.step(0);
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
 const p={pieces:[{id:'p',transform:t(),stickers:[{id:'tile',transform:t(),size:[.8,.8],color:'#fff'}]}]};await child.setProjection(p);h.step(0);
 for(const c of fixture.cases){const base=namesLighting(),cfg={...base,keyShadowStrength:c.parts.shadowStrength,shadowFillStrength:.55*c.parts.shadowStrength,floorOpacity:.3*c.floorFactor,exposure:()=>c.gain};assert.equal(h.stage.setLighting(cfg).ok,true);assert.equal(child.setMaterial({specularIntensity:c.parts.specular,roughness:c.roughness,clearcoat:c.clearcoat,receiveShadow:c.parts.faceShadows}).ok,true);h.step(0);const mesh=h.scene.getObjectByName('tile'),key=h.scene.children.find(o=>o.isDirectionalLight&&o.castShadow),floor=h.scene.getObjectByName('studio-shadow-receiver');assert.equal(mesh.material.specularIntensity,c.parts.specular);assert.equal(mesh.material.roughness,c.roughness);assert.equal(mesh.material.clearcoat,c.clearcoat);assert.equal(mesh.receiveShadow,c.parts.faceShadows);assert.equal(key.shadow.intensity,c.parts.shadowStrength);assert.equal(floor.material.opacity,.3*c.floorFactor);assert.equal(h.view.exposure,c.gain);}
 h.stage.dispose();
});
test('configured non-shadow light targets update their world matrices before drawing',()=>{
 const h=harness();h.stage.addCube({position:[0,0,0]});const cfg=namesLighting();cfg.fill.target=[1,.5,0];assert.equal(h.stage.setLighting(cfg).ok,true);h.step(0);const lights=h.scene.children.filter(o=>o.isDirectionalLight),target=lights[1].target.matrixWorld.elements;assert.deepEqual([target[12],target[13],target[14]],[1,.5,0]);h.stage.dispose();
});
