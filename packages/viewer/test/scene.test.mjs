import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSceneForTest } from '../dist/scene.js';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
const t = (position = [0,0,0], rotation = [0,0,0,1]) => ({position,rotation});
const projection = {pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t(),size:[1,1],color:'#fff'}]}]};
function harness(resolver = async () => ({ok:true,value:{}})) {
  let now=0, next=0; const frames=new Map(), draws=[];
  const clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id)};
  const scene=createSceneForTest({resolveAsset:resolver},clock,{render:s=>draws.push(s.getObjectByName('a')?.getWorldPosition({setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this}})),dispose(){}});
  return {scene,draws,frames, step(ms){now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));}};
}
function turn(angle,duration=100) {
  const q=[0,0,Math.sin(angle/2),Math.cos(angle/2)];
  return {from:projection,to:{pieces:[{...projection.pieces[0],transform:t([Math.cos(angle),Math.sin(angle),0],q)}]},pieceIds:['a'],axis:[0,0,1],signedAngleRadians:angle,pivot:[0,0,0],durationMs:duration};
}
test('signed turns animate through intermediate frames and settle without idle frames', async () => {
  for (const angle of [Math.PI,-Math.PI,3*Math.PI/2,2*Math.PI]) {
    const h=harness(); assert.equal((await h.scene.setProjection(projection)).ok,true); h.step(0);
    const promise=h.scene.transition(turn(angle)); await Promise.resolve(); h.step(50);
    const p=h.draws.at(-1); assert.ok(Math.abs(p.x-Math.cos(angle/2))<1e-6); assert.ok(Math.abs(p.y-Math.sin(angle/2))<1e-6);
    h.step(50); assert.equal((await promise).ok,true); assert.equal(h.frames.size,0);
  }
});
test('cancel restores source and ends the operation', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.step(0);
  const pending=h.scene.transition(turn(Math.PI)); await Promise.resolve(); h.step(50);
  assert.equal(h.scene.cancel().ok,true); assert.equal((await pending).error.code,'Cancelled'); h.step(0);
  assert.ok(Math.abs(h.draws.at(-1).x-1)<1e-6);
});
test('late resolver completion cannot commit after cancellation', async () => {
  let resolve; const h=harness(()=>new Promise(r=>resolve=r));
  const asset={pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'image'}]}]};
  const pending=h.scene.setProjection(asset); h.scene.cancel(); assert.equal((await pending).error.code,'Cancelled');
  resolve({ok:true,value:{}}); await Promise.resolve(); assert.equal(h.draws.length,0); assert.equal(h.frames.size,0);
  h.scene.dispose(); assert.equal((await h.scene.setProjection(projection)).error.code,'Disposed');
});

test('asset failure retains the last projection and allows a later request', async () => {
  const h=harness(async()=>({ok:false,error:{code:'UnresolvedAsset',message:'missing'}}));
  await h.scene.setProjection(projection); h.step(0);
  const bad={pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'missing'}]}]};
  assert.equal((await h.scene.setProjection(bad)).error.code,'UnresolvedAsset');
  assert.equal((await h.scene.transition(turn(0,0))).ok,true);
});
test('context loss interrupts work and prevents further rendering', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.step(0);
  const pending=h.scene.transition(turn(Math.PI)); h.scene.contextLost();
  assert.equal((await pending).error.code,'ContextLost'); assert.equal(h.frames.size,0);
  assert.equal((await h.scene.setProjection(projection)).error.code,'ContextLost');
  h.scene.dispose(); assert.equal(h.frames.size,0);
});
test('invalidate coalesces and dispose stops queued rendering', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.scene.invalidate(); h.scene.invalidate();
  assert.equal(h.frames.size,1); h.scene.dispose(); assert.equal(h.frames.size,0); h.step(100);
  assert.equal(h.draws.length,0); assert.equal(h.scene.invalidate().error.code,'Disposed');
});
test('turn rotates around supplied nonzero pivot', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.step(0);
  const angle=Math.PI; const changed=turn(angle); changed.pivot=[0.5,0,0];
  changed.to.pieces[0].transform.position=[0,0,0];
  const pending=h.scene.transition(changed); h.step(50);
  assert.ok(Math.abs(h.draws.at(-1).x-.5)<1e-6); assert.ok(Math.abs(h.draws.at(-1).y-.5)<1e-6);
  h.step(50); assert.equal((await pending).ok,true);
});
test('zero duration completes visually without waiting for the animation clock', async () => {
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
  await scene.setProjection(projection);
  assert.equal((await scene.transition(turn(Math.PI,0))).ok,true);
  scene.dispose();
});
test('hidden animation pauses without rendering and resumes without a time jump', async () => {
  let now=0, next=0, hidden=false, listener; const frames=new Map(), draws=[];
  const clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id),isHidden:()=>hidden,onVisibility:cb=>{listener=cb;return ()=>{listener=undefined;}}};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>draws.push(s.getObjectByName('a').getWorldPosition({setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];return this}})),dispose(){}});
  const step=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
  await scene.setProjection(projection); step(0); const pending=scene.transition(turn(Math.PI)); step(25);
  const before={...draws.at(-1)}; hidden=true; listener(); assert.equal(frames.size,0); step(500); assert.deepEqual(draws.at(-1),before);
  hidden=false; listener(); step(0); assert.ok(Math.abs(draws.at(-1).x-before.x)<1e-6); assert.ok(Math.abs(draws.at(-1).y-before.y)<1e-6);
  step(75); assert.equal((await pending).ok,true); scene.dispose(); assert.equal(listener,undefined);
});
test('smoothstep easing applies the supplied duration once', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.step(0);
  const pending=h.scene.transition(turn(Math.PI)); h.step(25);
  const angle=Math.PI*(3*.25**2-2*.25**3);
  assert.ok(Math.abs(h.draws.at(-1).x-Math.cos(angle))<1e-6);
  assert.ok(Math.abs(h.draws.at(-1).y-Math.sin(angle))<1e-6);
  h.step(75); assert.equal((await pending).ok,true);
});
test('late asset from cancelled request cannot replace a subsequent projection', async () => {
  let resolve; const h=harness(()=>new Promise(r=>resolve=r));
  const asset={pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'image'}]}]};
  const a=h.scene.setProjection(asset); h.scene.cancel(); assert.equal((await a).error.code,'Cancelled');
  const b={pieces:[{...projection.pieces[0],transform:t([2,0,0])}]};
  assert.equal((await h.scene.setProjection(b)).ok,true); h.step(0); const count=h.draws.length;
  resolve({ok:true,value:{}}); await new Promise(r=>setImmediate(r)); h.step(0);
  assert.equal(h.draws.length,count); assert.equal(h.draws.at(-1).x,2);
  assert.equal((await h.scene.transition({...turn(0,0),from:b,to:b})).ok,true);
});
test('invalidation is coalesced while a transition is active', async () => {
  const h=harness(); await h.scene.setProjection(projection); h.step(0);
  const pending=h.scene.transition(turn(Math.PI)); assert.equal(h.scene.invalidate().ok,true); assert.equal(h.frames.size,1);
  h.step(100); assert.equal((await pending).ok,true); assert.equal(h.frames.size,0);
});
test('piece and sticker frames retain their world up and normal through a turn', async () => {
  const s=Math.SQRT1_2;
  // Piece starts at +90° around Z; sticker starts at +90° around its local X.
  // Therefore piece up = -X, sticker up = +Z, sticker normal = +X.
  const from={pieces:[{id:'piece',transform:t([1,0,0],[0,0,s,s]),stickers:[{id:'sticker',transform:t([0,0,.5],[s,0,0,s]),size:[.8,.6],color:'#fff'}]}]};
  const to={pieces:[{...from.pieces[0],transform:t([0,1,0],[0,0,1,0])}]};
  let now=0,next=0; const frames=new Map(), draws=[];
  const clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next;},cancel:id=>frames.delete(id)};
  const axes=object=>{const m=object.matrixWorld.elements;return {up:[m[4],m[5],m[6]],normal:[m[8],m[9],m[10]]};};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:root=>draws.push({piece:axes(root.getObjectByName('piece')),sticker:axes(root.getObjectByName('sticker'))}),dispose(){}});
  const step=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
  const near=(actual,expected)=>actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-6,`${actual} != ${expected}`));
  await scene.setProjection(from); step(0);
  near(draws.at(-1).piece.up,[-1,0,0]); near(draws.at(-1).piece.normal,[0,0,1]);
  near(draws.at(-1).sticker.up,[0,0,1]); near(draws.at(-1).sticker.normal,[1,0,0]);
  const pending=scene.transition({from,to,pieceIds:['piece'],axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:100});
  step(25);
  // At 25% time smoothstep is 5/32, so the extra rotation is 5π/64.
  const c=Math.cos(5*Math.PI/64), d=Math.sin(5*Math.PI/64);
  near(draws.at(-1).piece.up,[-c,-d,0]); near(draws.at(-1).piece.normal,[0,0,1]);
  near(draws.at(-1).sticker.up,[0,0,1]); near(draws.at(-1).sticker.normal,[c,d,0]);
  step(75); assert.equal((await pending).ok,true);
  // F1/Core's +Z half-turn matrix maps local +Y to -Y and -Y to +Y.
  const coreHalfTurn=Orientation.make([-1,0,0,0,-1,0,0,0,1])._0;
  const coreAxis=v=>{const r=Orientation.apply(coreHalfTurn,v);return [r.x,r.y,r.z];};
  near(draws.at(-1).piece.up,coreAxis({x:0,y:1,z:0})); near(draws.at(-1).piece.normal,coreAxis({x:0,y:0,z:1}));
  near(draws.at(-1).sticker.up,coreAxis({x:0,y:0,z:1})); near(draws.at(-1).sticker.normal,coreAxis({x:0,y:-1,z:0}));
  scene.dispose();
});

test('presentation uses rounded physical pieces, rounded stickers and a shadow studio', async () => {
  let rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  await scene.setProjection(projection); frames.shift()(0);
  const piece=rendered.getObjectByName('a'), sticker=rendered.getObjectByName('s');
  const body=piece.children.find(c=>c!==sticker);
  assert.equal(body.material.type,'MeshPhysicalMaterial');
  assert.ok(body.geometry.getAttribute('position').count>24);
  assert.equal(body.castShadow,true);
  assert.equal(sticker.material.type,'MeshPhysicalMaterial');
  assert.ok(sticker.geometry.getAttribute('position').count>4);
  assert.ok(rendered.getObjectByName('studio-shadow-receiver').receiveShadow);
  assert.equal(rendered.children.filter(c=>c.isDirectionalLight && c.castShadow).length,2);
  scene.dispose();
});

test('2x2 body keeps Cubistry exterior and seam radii and floor clears turn sweep', async () => {
  const {createTwoRadiusBody}=await import('../dist/two-radius-body.js');
  let rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const corner={pieces:[{...projection.pieces[0],stickers:[...projection.pieces[0].stickers,{id:'top',transform:t([0,.471,0],[-Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.8,.8],color:'#fff'}]}]};
  await scene.setProjection(corner); frames.shift()(0);
  const actual=rendered.getObjectByName('a').children.find(c=>c.isMesh && !c.name).geometry;
  const expected=createTwoRadiusBody({size:[.94,.94,.94],outer:[[false,false],[false,true],[false,true]],big:.03,small:.018,segments:3});
  assert.deepEqual([...actual.getAttribute('position').array],[...expected.getAttribute('position').array]);
  assert.ok(rendered.getObjectByName('studio-shadow-receiver').position.y < -Math.SQRT2);
  expected.dispose(); scene.dispose();
});

test('renderer enables bounded PCF shadows and neutral output', async () => {
  const THREE=await import('three');
  const {configurePresentationRenderer}=await import('../dist/presentation-preset.js');
  const renderer={shadowMap:{},setPixelRatio(value){this.pixelRatio=value}};
  const previous=globalThis.devicePixelRatio; globalThis.devicePixelRatio=3;
  try { configurePresentationRenderer(renderer,null); } finally { if(previous===undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio=previous; }
  assert.equal(renderer.pixelRatio,2); assert.equal(renderer.shadowMap.enabled,true);
  assert.equal(renderer.shadowMap.type,THREE.PCFShadowMap);
  assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);
  assert.equal(renderer.toneMapping,THREE.NeutralToneMapping);
});

test('source 2x2 profile retains Cubistry widths and two-radius geometry', async () => {
  const {presentationLayerProfile,presentationWidths}=await import('../dist/presentation-preset.js');
  const {readFile}=await import('node:fs/promises'); const {createHash}=await import('node:crypto');
  const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-2x2-profile.json',import.meta.url)));
  const widths=presentationWidths(2); assert.deepEqual(widths,fixture.widths);
  const profile=presentationLayerProfile(widths,2);
  const geometry=profile.body([widths[0],widths[0],widths[0]],[[true,false],[true,false],[true,false]]);
  geometry.computeBoundingBox();
  assert.ok(Math.abs(geometry.boundingBox.max.x-geometry.boundingBox.min.x-1.002)<1e-6);
  const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
  for (const name of ['position','normal','uv']) assert.equal(hash(geometry.getAttribute(name).array),fixture[name]);
  assert.equal(hash(geometry.index.array),fixture.index);
  geometry.dispose();
});

test('valid empty and sticker-free projections remain renderable', async () => {
  let rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  assert.equal((await scene.setProjection({pieces:[]})).ok,true); frames.shift()(0);
  const bare={pieces:[{id:'free-id',transform:t([.3,.4,.5],[0,0,0,1]),stickers:[]}]};
  assert.equal((await scene.setProjection(bare)).ok,true); frames.shift()(0);
  assert.ok(rendered.getObjectByName('free-id')); scene.dispose();
});

test('free sticker frame and non-axis turn preserve supplied poses around a nonzero pivot', async () => {
  const THREE=await import('three'); let now=0; const frames=[]; let rendered;
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,0).normalize(),.37);
  const from={pieces:[{id:'piece/α',transform:t([1,2,3]),stickers:[{id:'art/β',transform:t([.1,.2,.3],rotation.toArray()),size:[.5,.7],color:'#fff'}]}]};
  const axis=new THREE.Vector3(1,1,1).normalize(), pivot=new THREE.Vector3(.2,.3,.4), angle=1.2;
  const q=new THREE.Quaternion().setFromAxisAngle(axis,angle), end=new THREE.Vector3(1,2,3).sub(pivot).applyQuaternion(q).add(pivot);
  const to={pieces:[{...from.pieces[0],transform:t(end.toArray(),q.toArray())}]};
  await scene.setProjection(from); frames.shift()(0);
  const sticker=rendered.getObjectByName('art/β'); assert.ok(sticker.quaternion.angleTo(rotation)<1e-7); assert.deepEqual(sticker.position.toArray(),[.1,.2,.3]);
  const turn=scene.transition({from,to,pieceIds:['piece/α'],axis:axis.toArray(),pivot:pivot.toArray(),signedAngleRadians:angle,durationMs:100});
  now=50; frames.shift()(now); const expected=new THREE.Vector3(1,2,3).sub(pivot).applyAxisAngle(axis,angle/2).add(pivot);
  assert.ok(rendered.getObjectByName('piece/α').getWorldPosition(new THREE.Vector3()).distanceTo(expected)<1e-6);
  now=100; frames.shift()(now); assert.equal((await turn).ok,true); scene.dispose();
});

test('explicit source cell geometry is validated, snapshotted and invariant in a transition', async () => {
  let rendered, resolve; const frames=[]; const clock={now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}};
  const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{resolve=r})},clock,{render:s=>{rendered=s},dispose(){}});
  const geometry={cellSize:[1.012,1.012,1.012],outerSides:[[true,false],[true,false],[true,false]]};
  const source={pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'image'}],geometry}]};
  for(const cellSize of [[.01,1,1],[.010000000000000002,1,1],[.005,1,1],[Infinity,1,1]]) {
    const invalid={pieces:[{...source.pieces[0],stickers:[],geometry:{...geometry,cellSize}}]};
    assert.equal((await scene.setProjection(invalid)).error.code,'InvalidProjection');
  }
  const invalidFlags={pieces:[{...source.pieces[0],stickers:[],geometry:{...geometry,outerSides:[[true,false],[true,false],[true,1]]}}]};
  assert.equal((await scene.setProjection(invalidFlags)).error.code,'InvalidProjection');
  const setting=scene.setProjection(source); geometry.cellSize[0]=2; geometry.outerSides[0][0]=false; resolve({ok:true,value:{}});
  assert.equal((await setting).ok,true); frames.shift()(0);
  const body=rendered.getObjectByName('a').children.find(c=>c.isMesh && !c.name);
  body.geometry.computeBoundingBox(); assert.ok(Math.abs(body.geometry.boundingBox.max.x-body.geometry.boundingBox.min.x-1.002)<1e-6);
  const {readFile}=await import('node:fs/promises'); const {createHash}=await import('node:crypto');
  const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-2x2-profile.json',import.meta.url)));
  const a=body.geometry.getAttribute('position').array;
  assert.equal(createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex'),fixture.position);
  const original={pieces:[{...source.pieces[0],geometry:{...geometry,cellSize:[1.012,1.012,1.012],outerSides:[[true,false],[true,false],[true,false]]}}]};
  const changed={...turn(0,0),from:original,to:{pieces:[{...original.pieces[0],geometry:{...geometry,cellSize:[1.1,1.012,1.012]}}]}};
  assert.equal((await scene.transition(changed)).error.code,'InvalidTransition');
  const changedSides={...turn(0,0),from:original,to:{pieces:[{...original.pieces[0],geometry:{...original.pieces[0].geometry,outerSides:[[false,true],[true,false],[true,false]]}}]}};
  assert.equal((await scene.transition(changedSides)).error.code,'InvalidTransition');
  scene.dispose();
});

test('source 2x2 profile preserves body and sticker poses and sticker up', async () => {
  const THREE=await import('three'); const {readFile}=await import('node:fs/promises');
  const expected=JSON.parse(await readFile(new URL('./fixtures/cubistry-2x2-poses.json',import.meta.url)));
  const faces=[[[1,0,0],[0,1,0]],[[-1,0,0],[0,1,0]],[[0,1,0],[0,0,-1]],[[0,-1,0],[0,0,1]],[[0,0,1],[0,1,0]],[[0,0,-1],[0,1,0]]];
  const pieces=[]; let id=0;
  for(const x of [-1,1]) for(const y of [-1,1]) for(const z of [-1,1]) {
    const v=[x,y,z], stickers=[];
    for(const [n,up] of faces) if(n.reduce((sum,a,i)=>sum+a*v[i],0)===1) {
      const normal=new THREE.Vector3(...n), u=new THREE.Vector3(...up), right=u.clone().cross(normal);
      const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,u,normal));
      stickers.push({id:`s${id++}`,transform:t(n.map(a=>a*.508),q.toArray()),size:[.87,.87],color:'#fff'});
    }
    pieces.push({id:`p${pieces.length}`,transform:t(v.map(a=>a*.506)),geometry:{cellSize:[1.012,1.012,1.012],outerSides:v.map(a=>[a<0,a>0])},stickers});
  }
  let rendered; const frames=[]; const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  await scene.setProjection({pieces}); frames.shift()(0);
  for(const [i,piece] of pieces.entries()) {
    const body=rendered.getObjectByName(piece.id), ref=expected[i];
    body.position.toArray().forEach((v,j)=>assert.ok(Math.abs(v-ref.position[j])<1e-9));
    for(const [j,sticker] of piece.stickers.entries()) {
      const actual=rendered.getObjectByName(sticker.id), e=ref.stickers[j];
      actual.position.toArray().forEach((v,k)=>assert.ok(Math.abs(v-e.position[k])<1e-9));
      const q=new THREE.Quaternion(...e.quaternion); assert.ok(1-Math.abs(actual.quaternion.dot(q))<1e-9);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(actual.quaternion), sourceUp=new THREE.Vector3(0,1,0).applyQuaternion(q);
      assert.ok(up.distanceTo(sourceUp)<1e-9);
    }
  }
  scene.dispose();
});

test('explicit core stays static through nonzero-pivot turn and owns its resources', async () => {
  let now=0,next=0,seen; const frames=new Map();
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id)},{render:s=>{seen=s},dispose(){}});
  const step=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
  const from={...projection,core:{center:[2,3,4],halfExtent:2}};
  await scene.setProjection(from); step(0);
  const core=seen.children.find(o=>o.isMesh && o.geometry.type==='SphereGeometry');
  assert.ok(core); assert.deepEqual(core.position.toArray(),[2,3,4]); assert.equal(core.scale.x,1.6);
  assert.equal(core.geometry.parameters.widthSegments,48); assert.equal(core.geometry.parameters.heightSegments,24);
  assert.equal(core.castShadow,true); assert.equal(core.receiveShadow,true);
  assert.equal(seen.getObjectByName('a').children[0].receiveShadow,true);
  const sticker=seen.getObjectByName('s'); assert.equal(sticker.castShadow,true); assert.equal(sticker.receiveShadow,true);
  let geometryDisposals=0, materialDisposals=0;
  core.geometry.addEventListener('dispose',()=>geometryDisposals++); core.material.addEventListener('dispose',()=>materialDisposals++);
  const motion=turn(Math.PI); motion.from=from; motion.to={...motion.to,core:structuredClone(from.core)}; motion.pivot=[.5,0,0]; motion.to.pieces[0].transform.position=[0,0,0];
  const pending=scene.transition(motion); step(50); assert.deepEqual(core.getWorldPosition(core.position.clone()).toArray(),[2,3,4]);
  scene.cancel(); assert.equal((await pending).error.code,'Cancelled'); step(0);
  scene.dispose(); scene.dispose(); assert.equal(geometryDisposals,1); assert.equal(materialDisposals,1);
});

test('scene snapshots core and presentation while resolving caller assets', async () => {
  let resolve,rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>resolve=r)},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const input={presentation:{size:7,nominalEdge:7},core:{center:[1,2,3],halfExtent:3.5},pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'image'}]}]};
  const snapshot=structuredClone(input); const pending=scene.setProjection(input);
  input.core.center[0]=9; input.core.halfExtent=1; input.presentation.nominalEdge=9;
  resolve({ok:true,value:{}}); assert.equal((await pending).ok,true); frames.shift()(0);
  const core=rendered.children.find(o=>o.isMesh && o.geometry.type==='SphereGeometry');
  assert.deepEqual(core.position.toArray(),[1,2,3]); assert.ok(Math.abs(core.scale.x-2.8)<1e-12);
  assert.equal((await scene.transition({from:snapshot,to:snapshot,pieceIds:[],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:0,durationMs:0})).ok,true);
  assert.equal((await scene.transition({from:input,to:input,pieceIds:[],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:0,durationMs:0})).error.code,'InvalidTransition');
  scene.dispose();
});

test('empty and free projections do not infer a core or take caller image ownership', async () => {
  let rendered,closed=0; const frames=[]; const image={close(){closed++}};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:image})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  await scene.setProjection({pieces:[]}); frames.shift()(0);
  assert.equal(rendered.children.some(o=>o.isMesh && o.geometry.type==='SphereGeometry'),false);
  const free={pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'free'}]}]};
  await scene.setProjection(free); frames.shift()(0);
  assert.equal(rendered.children.some(o=>o.isMesh && o.geometry.type==='SphereGeometry'),false);
  assert.equal(rendered.getObjectByName('s').material.transparent,true);
  scene.dispose(); assert.equal(closed,0);
});
