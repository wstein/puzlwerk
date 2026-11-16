import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSceneForTest } from '../dist/scene.js';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
const t = (position = [0,0,0], rotation = [0,0,0,1]) => ({position,rotation});
const coresIn = root => {const cores=[];root.traverse(o=>{if(o.userData.plasticCore)cores.push(o)});return cores;};
const projection = {pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[1,1],color:'#fff'}]}]};
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
  const from={pieces:[{id:'piece',transform:t([1,0,0],[0,0,s,s]),stickers:[{id:'sticker',transform:t([0,-.5,0],[s,0,0,s]),size:[.8,.6],color:'#fff'}]}]};
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

test('explicit Cubistry 2x2 corner keeps source geometry and floor clears turn sweep', async () => {
  const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');
  const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-2x2-profile.json',import.meta.url)));
  let rendered;const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const corner={pieces:[{id:'corner',transform:t([-.506,-.506,-.506]),geometry:{cellSize:[1.012,1.012,1.012],outerSides:fixture.outer},stickers:[{id:'back',transform:t([0,0,-.508],[0,1,0,0]),size:[.87,.87],color:'#fff'},{id:'bottom',transform:t([0,-.508,0],[Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.87,.87],color:'#fff'}]}],presentation:{size:2,nominalEdge:2}};
  assert.equal((await scene.setProjection(corner)).ok,true);frames.shift()(0);
  const actual=rendered.getObjectByName('corner').children.find(c=>c.isMesh && !c.name).geometry;
  const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
  for(const key of ['position','normal','uv'])assert.equal(hash(actual.getAttribute(key).array),fixture[key]);
  assert.equal(hash(actual.index.array),fixture.index);
  assert.ok(rendered.getObjectByName('studio-shadow-receiver').position.y < -Math.SQRT2);scene.dispose();
});

test('unspecified size uses the native default body geometry',async()=>{
  const {createPresentationGeometry}=await import('../dist/presentation-preset.js');let rendered;const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  assert.equal((await scene.setProjection(projection)).ok,true);frames.shift()(0);
  const body=rendered.getObjectByName('a').children.find(c=>c.isMesh && !c.name),source=createPresentationGeometry(3);
  assert.deepEqual([...body.geometry.getAttribute('position').array],[...source.body.getAttribute('position').array]);
  source.body.dispose();source.sticker.dispose();source.core.dispose();scene.dispose();
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

test('unsupported free sticker frame is rejected atomically while non-axis turns remain supported', async () => {
  const THREE=await import('three'); let now=0; const frames=[]; let rendered;
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,1,0).normalize(),.37);
  assert.equal((await scene.setProjection(projection)).ok,true);frames.shift()(0);const previous=rendered.getObjectByName('a');
  const unsupported={pieces:[{id:'piece/α',transform:t([1,2,3]),stickers:[{id:'art/β',transform:t([.1,.2,.3],rotation.toArray()),size:[.5,.7],color:'#fff'}]}]};
  assert.equal((await scene.setProjection(unsupported)).error.code,'Unavailable');assert.equal(rendered.getObjectByName('a'),previous);
  const from={pieces:[{id:'piece/α',transform:t([1,2,3]),stickers:[{id:'art/β',transform:t([0,0,.5]),size:[.5,.7],color:'#fff'}]}]};
  const axis=new THREE.Vector3(1,1,1).normalize(), pivot=new THREE.Vector3(.2,.3,.4), angle=1.2;
  const q=new THREE.Quaternion().setFromAxisAngle(axis,angle), end=new THREE.Vector3(1,2,3).sub(pivot).applyQuaternion(q).add(pivot);
  const to={pieces:[{...from.pieces[0],transform:t(end.toArray(),q.toArray())}]};
  await scene.setProjection(from); frames.shift()(0);
  const sticker=rendered.getObjectByName('art/β'); assert.ok(sticker.quaternion.angleTo(new THREE.Quaternion())<1e-7); assert.deepEqual(sticker.position.toArray(),[0,0,.5]);
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
  const core=coresIn(seen)[0];
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

test('explicit size profiles match pinned Cubistry body and sticker buffers', async () => {
  const {readFile}=await import('node:fs/promises'); const {createHash}=await import('node:crypto');
  const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-model-profiles.json',import.meta.url)));
  const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
  for (const item of fixture.cases) {
    let rendered; const frames=[];
    const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
    const input={presentation:{size:item.size,nominalEdge:item.nominalEdge},pieces:[{id:'fixture',transform:t(),geometry:{cellSize:item.cell,outerSides:item.outer},stickers:[{id:'fixture-sticker',transform:t([0,0,.5]),size:[item.stickerSide,item.stickerSide],color:'#fff'}]}]};
    assert.equal((await scene.setProjection(input)).ok,true); frames.shift()(0);
    const body=rendered.getObjectByName('fixture').children.find(o=>o.isMesh && !o.name).geometry;
    const sticker=rendered.getObjectByName('fixture-sticker').geometry;
    for (const [attribute,key] of [['position','bodyPosition'],['normal','bodyNormal'],['uv','bodyUv']]) assert.equal(hash(body.getAttribute(attribute).array),item[key],`${item.name} ${key}`);
    assert.equal(hash(body.index.array),item.bodyIndex,item.name);
    assert.equal(hash(sticker.getAttribute('position').array),item.stickerPosition,`${item.name} sticker`);
    assert.equal(hash(sticker.getAttribute('uv').array),item.stickerUv,`${item.name} sticker UV`);
    scene.dispose();
  }
});

test('scene snapshots core and presentation while resolving caller assets', async () => {
  let resolve,rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>resolve=r)},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const input={presentation:{size:7,nominalEdge:7},core:{center:[1,2,3],halfExtent:3.5},pieces:[{...projection.pieces[0],stickers:[{...projection.pieces[0].stickers[0],imageId:'image'}]}]};
  const snapshot=structuredClone(input); const pending=scene.setProjection(input);
  input.core.center[0]=9; input.core.halfExtent=1; input.presentation.nominalEdge=9;
  resolve({ok:true,value:{}}); assert.equal((await pending).ok,true); frames.shift()(0);
  const core=coresIn(rendered)[0];
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

test('replacing core projections removes and disposes each previous core once', async () => {
  let rendered; const frames=[];
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const show=async p=>{assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0)};
  const cores=()=>coresIn(rendered);
  const watch=core=>{const calls={geometry:0,material:0};core.geometry.addEventListener('dispose',()=>calls.geometry++);core.material.addEventListener('dispose',()=>calls.material++);return calls};
  await show({pieces:[],core:{center:[1,2,3],halfExtent:2}});
  const first=cores()[0],firstCalls=watch(first);
  await show({pieces:[],core:{center:[4,5,6],halfExtent:3}});
  assert.equal(first.parent===null,true); assert.equal(cores().length,1); assert.notEqual(cores()[0],first); assert.deepEqual(firstCalls,{geometry:1,material:1});
  const second=cores()[0],secondCalls=watch(second);
  await show({pieces:[]});
  assert.equal(second.parent===null,true); assert.equal(cores().length,0); assert.deepEqual(secondCalls,{geometry:1,material:1});
  scene.dispose(); assert.deepEqual(firstCalls,{geometry:1,material:1}); assert.deepEqual(secondCalls,{geometry:1,material:1});
});

test('stickerless construction uses explicit source faces and restores stickered state',async()=>{
 let rendered;const frames=[];const clock={now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>{rendered=s},dispose(){}});
 const s={id:'face',transform:t([0,0,.5]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]}};
 const base={pieces:[{id:'piece',transform:t(),stickers:[s]}]};
 assert.equal((await scene.setProjection({...base,appearance:{construction:'stickerless'}})).ok,true);frames.shift()(0);
 const body=rendered.getObjectByName('piece'),sticker=rendered.getObjectByName('face'),shell=body.children.find(c=>c.isMesh && c!==sticker);
 assert.equal(sticker.visible,false);assert.ok(Array.isArray(shell.material));assert.equal(shell.material[4].color.getHexString(),'ff0000');
 assert.equal((await scene.setProjection(base)).ok,true);frames.shift()(0);assert.equal(rendered.getObjectByName('face').visible,true);scene.dispose();
});

test('picture resolves six faces atomically and maps a source window',async()=>{
 let rendered,fail=false;const frames=[];const closed=[];const clock={now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}};
 const scene=createSceneForTest({resolveAsset:async id=>fail&&id==='missing'?{ok:false}:{ok:true,value:{close(){closed.push(id)}}}},clock,{render:s=>{rendered=s},dispose(){}});
 const sticker={id:'face',transform:t([0,0,.5]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[0,1,1]}};
 const pic={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
 const p={pieces:[{id:'piece',transform:t([-.5,.5,.5]),stickers:[sticker]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],picture:pic};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);
 const pictureMaterial=rendered.getObjectByName('face').material;assert.equal(pictureMaterial.transparent,false);const map=pictureMaterial.map;assert.equal(map.flipY,false);assert.ok(Math.abs(map.repeat.x-.435)<1e-9);assert.ok(Math.abs(map.offset.x-.0325)<1e-9);
 fail=true;const bad={...p,picture:{...pic,faces:{...pic.faces,B:'missing'}}};assert.equal((await scene.setProjection(bad)).error.code,'UnresolvedAsset');
 assert.equal(rendered.getObjectByName('face').material.map,map);scene.dispose();assert.deepEqual(closed,[]);
});

test('stickerless piece without annotated faces uses source body fallback',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 await scene.setProjection({pieces:[{id:'bare',transform:t(),stickers:[]}],appearance:{construction:'stickerless'}});frames.shift()(0);
 const shell=rendered.getObjectByName('bare').children[0];assert.equal(shell.material.color.getHexString(),'3a3d42');scene.dispose();
});

test('stickerless cut materials match actual Cubistry miter fixture',async()=>{
 const {createHash}=await import('node:crypto'),{readFile}=await import('node:fs/promises');const expected=JSON.parse(await readFile(new URL('./fixtures/cubistry-stickerless-miter.json',import.meta.url)));
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const stickers=[{id:'front',transform:t([0,0,.502]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0],edgeColors:{left:[{to:.3,color:'#ffffff'},{to:1,color:'#ff0000'}]}}},{id:'top',transform:t([0,.502,0],[-Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,1,0],up:[0,0,-1]}}];
 const p={pieces:[{id:'corner',transform:t(),geometry:{cellSize:[1,1,1],outerSides:[[false,false],[false,true],[false,true]]},stickers}],appearance:{construction:'stickerless',miterCutFaces:true}};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);const shell=rendered.getObjectByName('corner').children[0];
 const actual=shell.material.map(m=>({color:m.color.getHexString(),texture:m.map?createHash('sha256').update(m.map.image.data).digest('hex'):null}));
 assert.deepEqual(actual,expected);scene.dispose();
});

test('artwork snapshot is isolated while picture assets resolve and cancel keeps committed scene',async()=>{
 let rendered,release;const frames=[];const closed=[];let pending=false;
 const scene=createSceneForTest({resolveAsset:id=>pending?new Promise(r=>{release=()=>r({ok:true,value:{close(){closed.push(id)}}})}):Promise.resolve({ok:true,value:{close(){closed.push(id)}}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const sticker={id:'art',transform:t([0,0,.5]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[0,1,1]}};
 const p={pieces:[{id:'piece',transform:t([-.5,.5,.5]),stickers:[sticker]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],picture:{widths:[1,1],faces:{U:'same',R:'same',F:'same',D:'same',L:'same',B:'same'}}};
 pending=true;const first=scene.setProjection(p);p.picture.widths[0]=2;sticker.picture.layerIndex[0]=1;release();assert.equal((await first).ok,true);frames.shift()(0);
 const before=rendered.getObjectByName('art').material.map;assert.ok(Math.abs(before.offset.x-.0325)<1e-9);
 p.picture.widths[0]=1;sticker.picture.layerIndex[0]=0;const next=scene.setProjection(p);scene.cancel();assert.equal((await next).error.code,'Cancelled');release();await new Promise(r=>setImmediate(r));assert.equal(rendered.getObjectByName('art').material.map,before);
 scene.dispose();assert.deepEqual(closed,[]);
});

test('picture windows on stickers and body faces match the actual Cubistry 2x2 scene',async()=>{
 const THREE=await import('three'),{readFile}=await import('node:fs/promises');const expected=JSON.parse(await readFile(new URL('./fixtures/cubistry-picture-windows.json',import.meta.url)));
 const faces=[['R',[1,0,0],[0,1,0]],['L',[-1,0,0],[0,1,0]],['U',[0,1,0],[0,0,-1]],['D',[0,-1,0],[0,0,1]],['F',[0,0,1],[0,1,0]],['B',[0,0,-1],[0,1,0]]],pieces=[];let id=0;
 for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++){
  const index=[x,y,z],v=index.map(i=>i?1:-1),stickers=[];
  for(const [face,n,up] of faces)if(n.reduce((sum,a,i)=>sum+a*v[i],0)===1){const normal=new THREE.Vector3(...n),u=new THREE.Vector3(...up),right=u.clone().cross(normal),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,u,normal));stickers.push({id:`s${id++}`,transform:t(n.map(a=>a*.508),q.toArray()),size:[.87,.87],color:'#ffffff',sourceFace:{normal:n,up},picture:{face,layerIndex:index}})}
  pieces.push({id:`p${pieces.length}`,transform:t(v.map(a=>a*.506)),geometry:{cellSize:[1.012,1.012,1.012],outerSides:v.map(a=>[a<0,a>0])},stickers});
 }
 const p={pieces,presentation:{size:2,nominalEdge:2},appearance:{construction:'stickerless'},picture:{widths:[1.012,1.012],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}}};
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);
 for(const [i,piece] of pieces.entries()){
  const body=rendered.getObjectByName(piece.id),ref=expected[i],shell=body.children[0];
  const bodyMaps=shell.material.map(m=>m.map?{offset:m.map.offset.toArray(),repeat:m.map.repeat.toArray()}:null);assert.deepEqual(bodyMaps,ref.body);
  for(const [j,sticker] of piece.stickers.entries()){const map=rendered.getObjectByName(sticker.id).material.map,r=ref.stickers[j];assert.deepEqual(map.offset.toArray(),r.offset);assert.deepEqual(map.repeat.toArray(),r.repeat)}
 }
 scene.dispose();
});

test('removing projected picture restores per-sticker tile materials',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const base={id:'art',transform:t([0,0,.5]),size:[.87,.87],color:'#ff0000',imageId:'tile',sourceFace:{normal:[0,0,1],up:[0,1,0]}};
 const picture={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
 const p={pieces:[{id:'piece',transform:t([-.5,.5,.5]),stickers:[{...base,picture:{face:'F',layerIndex:[0,1,1]}}]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],appearance:{construction:'stickerless'},picture};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);const projected=rendered.getObjectByName('piece').children[0].material[4].map;assert.equal(projected.flipY,false);
 const restored={pieces:[{id:'piece',transform:t([-.5,.5,.5]),stickers:[base]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],appearance:{construction:'stickerless'}};assert.equal((await scene.setProjection(restored)).ok,true);frames.shift()(0);
 const bodyMap=rendered.getObjectByName('piece').children[0].material[4].map, tileMap=rendered.getObjectByName('art').material.map;
 assert.notEqual(bodyMap,projected);assert.equal(bodyMap,tileMap);assert.equal(tileMap.flipY,true);scene.dispose();
});

test('frame color changes plastic independently of stickerless cut and core colors',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const p={pieces:[{id:'piece',transform:t(),stickers:[]}],core:{center:[0,0,0],halfExtent:1},appearance:{construction:'stickered',frameColor:'#00aabb',bodyColor:'#abcdef',coreColor:'#ff0000'}};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);assert.equal(rendered.getObjectByName('piece').children[0].material.color.getHexString(),'00aabb');
 assert.equal(coresIn(rendered)[0].material.color.getHexString(),'00aabb');scene.dispose();
});

test('live artwork changes during a turn survive cancel and update next source snapshot',async()=>{
 const THREE=await import('three');let now=0,rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const from=projection;await scene.setProjection(from);frames.shift()(0);const turning=scene.transition(turn(Math.PI));now=50;frames.shift()(now);
 const before=rendered.getObjectByName('a').getWorldPosition(new THREE.Vector3());
 const artwork={appearance:{construction:'stickered',frameColor:'#00aabb'},stickers:[{id:'s',color:'#ffffff',imageId:'live'}]};
 assert.equal((await scene.setArtwork(artwork)).ok,true);frames.shift()(now);
 assert.ok(rendered.getObjectByName('a').getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-9);
 assert.equal(rendered.getObjectByName('a').children[0].material.color.getHexString(),'00aabb');
 scene.cancel();assert.equal((await turning).error.code,'Cancelled');frames.shift()(now);
 const updated={...from,appearance:artwork.appearance,pieces:[{...from.pieces[0],stickers:[{...from.pieces[0].stickers[0],color:'#ffffff',imageId:'live'}]}]};
 assert.equal((await scene.transition({from:updated,to:updated,pieceIds:[],axis:[0,0,1],signedAngleRadians:0,pivot:[0,0,0],durationMs:0})).ok,true);scene.dispose();
});

test('pending live artwork allows active turn to finish and prevents competing operations',async()=>{
 let now=0,release;const frames=[];const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{release=r})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render(){},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const tr=turn(Math.PI);const turning=scene.transition(tr);
 const artwork={stickers:[{id:'s',color:'#fff',imageId:'live'}]};const live=scene.setArtwork(artwork);
 assert.equal((await Promise.race([scene.setArtwork(artwork),Promise.resolve({ok:false,error:{code:'StillPending'}})])).error.code,'Busy');assert.equal((await scene.setProjection(projection)).error.code,'Busy');
 now=100;frames.shift()(now);assert.equal((await turning).ok,true);release({ok:true,value:{}});assert.equal((await live).ok,true);
 const updated={...tr.to,pieces:[{...tr.to.pieces[0],stickers:[{...tr.to.pieces[0].stickers[0],imageId:'live'}]}]};
 assert.equal((await scene.transition({from:updated,to:updated,pieceIds:[],axis:[0,0,1],signedAngleRadians:0,pivot:[0,0,0],durationMs:0})).ok,true);scene.dispose();
});

test('live tile override retains projected surfaces until picture is removed',async()=>{
 let rendered;const frames=[],assets=new Map();const scene=createSceneForTest({resolveAsset:async id=>({ok:true,value:assets.has(id)?assets.get(id):(assets.set(id,{}),assets.get(id))})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const sf={normal:[0,0,1],up:[0,1,0]},sp={face:'F',layerIndex:[0,1,1]},picture={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
 const p={pieces:[{id:'p',transform:t([-.5,.5,.5]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff',imageId:'old',sourceFace:sf,picture:sp}]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],appearance:{construction:'stickerless'},picture};
 await scene.setProjection(p);frames.shift()(0);const stickerMap=rendered.getObjectByName('s').material.map,bodyMap=rendered.getObjectByName('p').children[0].material[4].map;let stickerDisposed=0,bodyDisposed=0;stickerMap.addEventListener('dispose',()=>stickerDisposed++);bodyMap.addEventListener('dispose',()=>bodyDisposed++);
 const replacement={appearance:p.appearance,picture,stickers:[{id:'s',color:'#ffffff',imageId:'new',sourceFace:{...sf,color:'#ff0000',edgeColors:{left:'#ffffff'}},picture:sp}]};assert.equal((await scene.setArtwork(replacement)).ok,true);frames.shift()(0);
 assert.equal(rendered.getObjectByName('s').material.map,stickerMap);assert.equal(rendered.getObjectByName('p').children[0].material[4].map,bodyMap);assert.equal(stickerDisposed,0);assert.equal(bodyDisposed,0);
 assert.equal((await scene.setArtwork({appearance:p.appearance,stickers:[{id:'s',color:'#ffffff',imageId:'new',sourceFace:sf}]})).ok,true);frames.shift()(0);
 assert.notEqual(rendered.getObjectByName('s').material.map,stickerMap);assert.equal(rendered.getObjectByName('p').children[0].material[4].map,rendered.getObjectByName('s').material.map);assert.equal(stickerDisposed,1);assert.equal(bodyDisposed,1);scene.dispose();
});

test('cancel and late live asset resolution leave the source projection and caller asset intact',async()=>{
 let now=0,release,rendered;const frames=[],closed=[];const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{release=r})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const turning=scene.transition(turn(Math.PI));now=25;frames.shift()(now);const live=scene.setArtwork({stickers:[{id:'s',color:'#fff',imageId:'late'}]});
 scene.cancel();assert.equal((await live).error.code,'Cancelled');assert.equal((await turning).error.code,'Cancelled');release({ok:true,value:{close(){closed.push(true)}}});await new Promise(r=>setImmediate(r));frames.shift()(now);
 assert.ok(Math.abs(rendered.getObjectByName('a').position.x-1)<1e-9);assert.equal(rendered.getObjectByName('s').material.map,null);scene.dispose();assert.deepEqual(closed,[]);
});

test('context loss reports ContextLost to a pending live artwork request',async()=>{
 let release;const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{release=r})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
 await scene.setProjection(projection);const pending=scene.setArtwork({stickers:[{id:'s',color:'#fff',imageId:'late'}]});scene.contextLost();
 assert.equal((await pending).error.code,'ContextLost');release({ok:true,value:{}});await new Promise(r=>setImmediate(r));scene.dispose();
});

test('repeated live replacements release superseded viewer resources exactly once',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const observed=new Map();
 const watch=()=>{const body=rendered.getObjectByName('a');for(const child of body.children)if(child.isMesh){for(const r of [child.geometry,child.material,child.material.map].filter(Boolean))if(!observed.has(r)){observed.set(r,0);r.addEventListener('dispose',()=>observed.set(r,observed.get(r)+1));}}};
 for(let i=0;i<4;i++){watch();assert.equal((await scene.setArtwork({stickers:[{id:'s',color:'#fff',imageId:`tile${i}`}]})).ok,true);frames.shift()(0)}
 watch();scene.dispose();for(const count of observed.values())assert.equal(count,1);
});

test('live resolver rejection leaves an active turn running and reports unresolved asset',async()=>{
 let now=0;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>{throw Error('missing')}},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render(){},dispose(){}});
 assert.equal((await scene.setArtwork({stickers:[]})).error.code,'InvalidProjection');await scene.setProjection(projection);frames.shift()(0);const pending=scene.transition(turn(Math.PI));
 const result=await scene.setArtwork({stickers:[{id:'s',color:'#fff',imageId:'missing'}]});assert.equal(result.error.code,'UnresolvedAsset');
 now=100;frames.shift()(now);assert.equal((await pending).ok,true);scene.dispose();
});

test('live artwork rejects sparse and duplicate IDs without interrupting the turn',async()=>{
 let now=0;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render(){},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const turning=scene.transition(turn(Math.PI));
 for(const stickers of [new Array(1),[{id:'s',color:'#fff'},{id:'s',color:'#fff'}],[null]])assert.equal((await scene.setArtwork({stickers})).error.code,'InvalidProjection');
 now=100;frames.shift()(now);assert.equal((await turning).ok,true);scene.dispose();
});

test('a source builder exception does not replace the committed scene or leave Busy',async()=>{
 const THREE=await import('three');let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const old=rendered.getObjectByName('a');
 const sticker={id:'new-s',transform:t([0,0,.5]),size:[.8,.8],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]}};
 const input={pieces:[{id:'new',transform:t(),stickers:[sticker]}],appearance:{construction:'stickerless'}};
 const clone=THREE.Material.prototype.clone;THREE.Material.prototype.clone=function(){throw Error('synthetic builder failure')};
 try {assert.equal((await scene.setProjection(input)).error.code,'Unavailable')} finally {THREE.Material.prototype.clone=clone}
 assert.equal(rendered.getObjectByName('a'),old);assert.equal((await scene.transition({...turn(0,0),to:projection})).ok,true);scene.dispose();
});

test('live artwork replacement is snapshotted before delayed asset resolution',async()=>{
 let release,rendered;const frames=[];const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{release=r})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const artwork={appearance:{construction:'stickered',frameColor:'#00aabb'},stickers:[{id:'s',color:'#ffffff',imageId:'image'}]};
 const pending=scene.setArtwork(artwork);artwork.appearance.frameColor='#ff0000';artwork.stickers[0].color='#ff0000';release({ok:true,value:{}});assert.equal((await pending).ok,true);frames.shift()(0);
 assert.equal(rendered.getObjectByName('a').children[0].material.color.getHexString(),'00aabb');assert.equal(rendered.getObjectByName('s').material.color.getHexString(),'ffffff');scene.dispose();
});

test('live artwork applied before turn end is included in the completed endpoint',async()=>{
 let now=0;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render(){},dispose(){}});
 await scene.setProjection(projection);frames.shift()(0);const t0=turn(Math.PI),turning=scene.transition(t0);now=25;frames.shift()(now);
 const artwork={appearance:{construction:'stickered',frameColor:'#00aabb'},stickers:[{id:'s',color:'#ffffff',imageId:'live'}]};assert.equal((await scene.setArtwork(artwork)).ok,true);
 now=100;frames.shift()(now);assert.equal((await turning).ok,true);
 const endpoint={...t0.to,appearance:artwork.appearance,pieces:[{...t0.to.pieces[0],stickers:[{...t0.to.pieces[0].stickers[0],color:'#ffffff',imageId:'live'}]}]};
 assert.equal((await scene.transition({from:endpoint,to:endpoint,pieceIds:[],axis:[0,0,1],signedAngleRadians:0,pivot:[0,0,0],durationMs:0})).ok,true);scene.dispose();
});

test('identical source miter cut patterns share one material and texture per scene',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const stickers=prefix=>[{id:`${prefix}f`,transform:t([0,0,.502]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0],edgeColors:{left:[{to:.3,color:'#ffffff'},{to:1,color:'#ff0000'}]}}},{id:`${prefix}u`,transform:t([0,.502,0],[-Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,1,0],up:[0,0,-1]}}];
 const p={pieces:[{id:'a',transform:t(),stickers:stickers('a')},{id:'b',transform:t([1,0,0]),stickers:stickers('b')}],appearance:{construction:'stickerless',miterCutFaces:true}};
 await scene.setProjection(p);frames.shift()(0);const a=rendered.getObjectByName('a').children[0].material,b=rendered.getObjectByName('b').children[0].material;
 assert.equal(a[0],b[0]);assert.ok(a[0].map);assert.equal(a[0].map,b[0].map);scene.dispose();
});

test('identical source profile bodies and stickers share geometry and dispose once',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const make=id=>({id,transform:t(),geometry:{cellSize:[1,1,1],outerSides:[[false,false],[false,true],[false,true]]},stickers:[{id:`${id}s`,transform:t([0,0,.502]),size:[.87,.87],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]}}]});
 await scene.setProjection({pieces:[make('a'),make('b')]});frames.shift()(0);const a=rendered.getObjectByName('a'),b=rendered.getObjectByName('b');
 assert.equal(a.children[0].geometry,b.children[0].geometry);assert.equal(a.children[1].geometry,b.children[1].geometry);
 let bodies=0,stickers=0;a.children[0].geometry.addEventListener('dispose',()=>bodies++);a.children[1].geometry.addEventListener('dispose',()=>stickers++);scene.dispose();assert.equal(bodies,1);assert.equal(stickers,1);
});

test('live artwork while hidden waits to render and turn resumes without time jump',async()=>{
 let now=0,hidden=false,listener,rendered;const frames=[];const clock={now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel:()=>{frames.length=0},isHidden:()=>hidden,onVisibility:cb=>{listener=cb;return()=>{}}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});await scene.setProjection(projection);frames.shift()(0);const pending=scene.transition(turn(Math.PI));now=25;frames.shift()(now);
 const before=rendered.getObjectByName('a').getWorldPosition(new (await import('three')).Vector3());hidden=true;listener();assert.equal((await scene.setArtwork({appearance:{construction:'stickered',frameColor:'#00aabb'},stickers:[{id:'s',color:'#fff'}]})).ok,true);assert.equal(frames.length,0);
 now=525;hidden=false;listener();frames.shift()(now);const after=rendered.getObjectByName('a').getWorldPosition(new (await import('three')).Vector3());assert.ok(after.distanceTo(before)<1e-9);assert.equal(rendered.getObjectByName('a').children[0].material.color.getHexString(),'00aabb');
 now=600;frames.shift()(now);assert.equal((await pending).ok,true);scene.dispose();
});

test('live artwork preserves established source frames and picture reference across picture off and on',async()=>{
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
 const frame={normal:[0,0,1],up:[0,1,0]},mapping={face:'F',layerIndex:[0,1,1]},picture={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
 const s={id:'s',transform:t([0,0,.5]),size:[.8,.8],color:'#fff',sourceFace:frame,picture:mapping};await scene.setProjection({pieces:[{id:'p',transform:t([-.5,.5,.5]),stickers:[s]},{id:'opposite',transform:t([.5,-.5,-.5]),stickers:[]}],picture});
 assert.equal((await scene.setArtwork({stickers:[{id:'s',color:'#fff',sourceFace:frame}]})).ok,true);
 for(const invalid of [{stickers:[{id:'s',color:'#fff'}]},{stickers:[{id:'s',color:'#fff',sourceFace:{normal:[0,0,1],up:[1,0,0]}}]},{picture,stickers:[{id:'s',color:'#fff',sourceFace:frame,picture:{face:'F',layerIndex:[1,1,1]}}]},{picture:{...picture,widths:[1,2]},stickers:[{id:'s',color:'#fff',sourceFace:frame,picture:mapping}]}])assert.equal((await scene.setArtwork(invalid)).error.code,'InvalidProjection');
 assert.equal((await scene.setArtwork({picture,stickers:[{id:'s',color:'#fff',sourceFace:{...frame,edgeColors:{left:'#ffffff'}},picture:mapping}]})).ok,true);scene.dispose();
});

test('failed or canceled picture updates do not reserve construction references',async()=>{
 let release,mode='fail';const scene=createSceneForTest({resolveAsset:()=>mode==='fail'?Promise.resolve({ok:false}):mode==='pending'?new Promise(r=>{release=r}):Promise.resolve({ok:true,value:{}})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
 const sticker={id:'s',transform:t([0,0,.5]),size:[.8,.8],color:'#fff'};await scene.setProjection({pieces:[{id:'p',transform:t(),stickers:[sticker]}]});
 const frame={normal:[0,0,1],up:[0,1,0]},faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},entry={id:'s',color:'#fff',sourceFace:frame,picture:{face:'F',layerIndex:[0,0,0]}};
 assert.equal((await scene.setArtwork({picture:{widths:[1],faces},stickers:[entry]})).error.code,'UnresolvedAsset');
 mode='pending';const pending=scene.setArtwork({picture:{widths:[2],faces},stickers:[entry]});scene.cancel();assert.equal((await pending).error.code,'Cancelled');release({ok:true,value:{}});await new Promise(r=>setImmediate(r));
 mode='ok';assert.equal((await scene.setArtwork({picture:{widths:[3],faces},stickers:[entry]})).ok,true);scene.dispose();
});

test('successful setProjection starts new artwork construction references',async()=>{
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
 const frame={normal:[0,0,1],up:[0,1,0]},faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},sticker={id:'s',transform:t([0,0,.5]),size:[.8,.8],color:'#fff',sourceFace:frame};
 const make=width=>({pieces:[{id:'p',transform:t(),stickers:[{...sticker,picture:{face:'F',layerIndex:[0,0,0]}}]}],picture:{widths:[width],faces}});
 assert.equal((await scene.setProjection(make(1))).ok,true);assert.equal((await scene.setProjection(make(2))).ok,true);
 assert.equal((await scene.setArtwork({picture:{widths:[2],faces},stickers:[{id:'s',color:'#fff',sourceFace:frame,picture:{face:'F',layerIndex:[0,0,0]}}]})).ok,true);scene.dispose();
});

test('source face colors preserve frame order, normalize CSS and remain independent of image tint',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const make=(front,top,extra={})=>({pieces:[{id:'p',transform:t(),stickers:[{id:'front',transform:t([0,0,.5]),size:[.8,.8],color:front,sourceFace:{normal:[0,0,1],up:[0,1,0],...extra}},{id:'top',transform:t([0,.5,0],[-Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.8,.8],color:top,sourceFace:{normal:[0,1,0],up:[0,0,-1]}}]}],appearance:{construction:'stickerless'}});
 await scene.setProjection(make('#ff0000','#ffffff'));frames.shift()(0);let mats=rendered.getObjectByName('p').children[0].material;assert.equal(mats[0].color.getHexString(),'ff0000');assert.equal(mats[1].color.getHexString(),'ff0000');
 const independent=make('#ffffff','#ffffff',{color:'#ff0000'});independent.pieces[0].stickers[0].imageId='tile';await scene.setProjection(independent);frames.shift()(0);mats=rendered.getObjectByName('p').children[0].material;assert.equal(mats[0].color.getHexString(),'ff0000');assert.equal(mats[4].color.getHexString(),'ffffff');
 const css=make('#fff','blue');css.appearance.miterCutFaces=true;await scene.setProjection(css);frames.shift()(0);mats=rendered.getObjectByName('p').children[0].material;const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(mats[0].map.image.data).digest('hex'),'b8d26b4e9b55f93e23759d40c8f04b0cfd3f26f8c67549423a70920273f85741');scene.dispose();
});

test('nonprojected planar UV uses the actual unequal body extent',async()=>{
 const THREE=await import('three'),{planarBodyUv}=await import('../dist/body-artwork.js'),{createTwoRadiusBody}=await import('../dist/two-radius-body.js');let rendered;const frames=[];
 const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const sticker={id:'s',transform:t([0,0,.4]),size:[.8,.8],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0]}};
 const p={pieces:[{id:'p',transform:t(),geometry:{cellSize:[1.4,1,.7],outerSides:[[false,true],[false,true],[false,true]]},stickers:[sticker]}],presentation:{size:3,nominalEdge:3},appearance:{construction:'stickerless',planarFaceUv:true}};
 await scene.setProjection(p);frames.shift()(0);const actual=rendered.getObjectByName('p').children[0].geometry;
 const base=createTwoRadiusBody({size:[1.39,.99,.69],outer:[[false,true],[false,true],[false,true]],big:.055,small:.033,segments:3});base.computeBoundingBox();const extent=base.boundingBox.getSize(new THREE.Vector3()).toArray();const expected=planarBodyUv(base,extent,new Set([0,1,2,3,4,5]));
 assert.deepEqual([...actual.attributes.uv.array],[...expected.attributes.uv.array]);expected.dispose();base.dispose();scene.dispose();
});

test('source annotated tile alpha matches source while legacy tile remains transparent',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const s={id:'s',transform:t([0,0,.5]),size:[.8,.8],color:'#ffffff',imageId:'tile'};const p={pieces:[{id:'p',transform:t(),stickers:[s]}]};
 await scene.setProjection(p);frames.shift()(0);assert.equal(rendered.getObjectByName('s').material.transparent,true);
 await scene.setProjection({pieces:[{...p.pieces[0],stickers:[{...s,sourceFace:{normal:[0,0,1],up:[0,1,0]}}]}]});frames.shift()(0);assert.equal(rendered.getObjectByName('s').material.transparent,false);scene.dispose();
});

test('same body geometry with different source up frames retains distinct artwork UVs',async()=>{
 const {createHash}=await import('node:crypto');let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const make=(id,up)=>({id,transform:t(),geometry:{cellSize:[1,1,1],outerSides:[[false,false],[false,true],[false,true]]},stickers:[{id:`${id}s`,transform:t([0,0,.5],up[0]?[0,0,-Math.SQRT1_2,Math.SQRT1_2]:[0,0,0,1]),size:[.8,.8],color:'#ffffff',sourceFace:{normal:[0,0,1],up}}]});
 await scene.setProjection({pieces:[make('a',[0,1,0]),make('b',[1,0,0])]});frames.shift()(0);const a=rendered.getObjectByName('a').children[0].geometry,b=rendered.getObjectByName('b').children[0].geometry;
 const hash=g=>createHash('sha256').update(Buffer.from(g.attributes.uv.array.buffer)).digest('hex');assert.notEqual(hash(a),hash(b));let ad=0,bd=0;a.addEventListener('dispose',()=>ad++);b.addEventListener('dispose',()=>bd++);scene.dispose();assert.equal(ad,1);assert.equal(bd,1);
});

test('source exterior frame order survives transition sticker reordering and live replacement',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const front={id:'z-front',transform:t([0,0,.5]),size:[.8,.8],color:'#ff0000',sourceFace:{normal:[0,0,1],up:[0,1,0]}},top={id:'a-top',transform:t([0,.5,0],[-Math.SQRT1_2,0,0,Math.SQRT1_2]),size:[.8,.8],color:'#ffffff',sourceFace:{normal:[0,1,0],up:[0,0,-1]}};
 const from={pieces:[{id:'piece',transform:t(),stickers:[front,top]}],appearance:{construction:'stickerless'}};await scene.setProjection(from);frames.shift()(0);
 const reordered={...from,pieces:[{...from.pieces[0],stickers:[top,front]}]};assert.equal((await scene.transition({from:reordered,to:reordered,pieceIds:[],axis:[0,0,1],signedAngleRadians:0,pivot:[0,0,0],durationMs:0})).ok,true);frames.shift()(0);
 assert.equal((await scene.setArtwork({appearance:from.appearance,stickers:[{id:top.id,color:top.color,sourceFace:top.sourceFace},{id:front.id,color:front.color,sourceFace:front.sourceFace}]})).ok,true);frames.shift()(0);
 assert.equal(rendered.getObjectByName('piece').children[0].material[0].color.getHexString(),'ff0000');scene.dispose();
});

test('projected planar UV uses source cell-share extent for unequal layers',async()=>{
 const {planarBodyUv}=await import('../dist/body-artwork.js'),{createTwoRadiusBody}=await import('../dist/two-radius-body.js');let rendered;const frames=[];
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const s={id:'s',transform:t([0,0,.4]),size:[.8,.8],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[0,1,2]}};
 const p={pieces:[{id:'p',transform:t([-.85,.35,1.2]),geometry:{cellSize:[1.4,1,.7],outerSides:[[false,true],[false,true],[false,true]]},stickers:[s]},{id:'bare1',transform:t([.35,-.85,-.85]),stickers:[]},{id:'bare2',transform:t([1.2,1.2,.35]),stickers:[]}],presentation:{size:3,nominalEdge:3},appearance:{construction:'stickerless'},picture:{widths:[1.4,1,.7],faces:{U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'}}};
 await scene.setProjection(p);frames.shift()(0);const actual=rendered.getObjectByName('p').children[0].geometry;
 const base=createTwoRadiusBody({size:[1.39,.99,.69],outer:[[false,true],[false,true],[false,true]],big:.055,small:.033,segments:3}),expected=planarBodyUv(base,[1.4*.99,.99,.7*.99],new Set([4]));
 assert.deepEqual([...actual.attributes.uv.array],[...expected.attributes.uv.array]);expected.dispose();base.dispose();scene.dispose();
});

test('live source face color changes cut faces without changing image tint or turn pose',async()=>{
 const THREE=await import('three');let now=0,rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>now,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 const sf={normal:[0,0,1],up:[0,1,0],color:'#ff0000'},front={id:'s',transform:t([0,0,.5]),size:[.8,.8],color:'#ffffff',imageId:'tile',sourceFace:sf};
 const from={pieces:[{id:'p',transform:t([1,0,0]),stickers:[front]}],appearance:{construction:'stickerless'}},to={...from,pieces:[{...from.pieces[0],transform:t([-1,0,0],[0,0,1,0])}]};
 await scene.setProjection(from);frames.shift()(0);const turning=scene.transition({from,to,pieceIds:['p'],axis:[0,0,1],signedAngleRadians:Math.PI,pivot:[0,0,0],durationMs:100});now=50;frames.shift()(now);
 const before=rendered.getObjectByName('p').getWorldPosition(new THREE.Vector3());assert.equal((await scene.setArtwork({appearance:from.appearance,stickers:[{id:'s',color:'#ffffff',imageId:'tile',sourceFace:{...sf,color:'#0000ff'}}]})).ok,true);frames.shift()(now);
 const body=rendered.getObjectByName('p');assert.ok(body.getWorldPosition(new THREE.Vector3()).distanceTo(before)<1e-9);assert.equal(body.children[0].material[0].color.getHexString(),'0000ff');assert.equal(body.children[0].material[4].color.getHexString(),'ffffff');
 scene.cancel();assert.equal((await turning).error.code,'Cancelled');scene.dispose();
});

test('production scene renders canonical sticker IDs using native physical-scene metadata',async()=>{
 let rendered;const clock={now:()=>0,request:cb=>{cb(0);return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const nativeProjection={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(nativeProjection)).ok,true);
 const nodes=[];rendered.traverse(o=>{if(o.userData.stickerId==='s')nodes.push(o)});
 assert.equal(nodes.length,1);scene.dispose();
});

test('native render scene cancels a turn and restores canonical source pose',async()=>{
 let now=0,frame,rendered;const clock={now:()=>now,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const from={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(from)).ok,true);frame(0);
 const to={pieces:[{...from.pieces[0],transform:t([0,1,0],[0,0,Math.SQRT1_2,Math.SQRT1_2])}]};
 const pending=scene.transition({from,to,pieceIds:['a'],axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:100});now=50;frame(now);
 assert.equal(scene.cancel().ok,true);assert.equal((await pending).error.code,'Cancelled');frame(now);rendered.updateMatrixWorld(true);
 const point=rendered.getObjectByName('a').getWorldPosition(new (await import('three')).Vector3());assert.ok(Math.abs(point.x-1)<1e-8 && Math.abs(point.y)<1e-8);const second=scene.transition({from,to,pieceIds:['a'],axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:0});assert.equal((await second).ok,true);scene.dispose();
});

test('production turn uses the extracted native scene turn',async()=>{
 const {PhysicalCubeScene}=await import('../dist/physical-scene.js');const original=PhysicalCubeScene.prototype.beginTurn;let calls=0;
 PhysicalCubeScene.prototype.beginTurn=function(...args){calls++;return original.apply(this,args)};
 try {
  let frame;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render(){},dispose(){}});
  const from={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
  assert.equal((await scene.setProjection(from)).ok,true);frame(0);
  const to={pieces:[{...from.pieces[0],transform:t([0,1,0],[0,0,Math.SQRT1_2,Math.SQRT1_2])}]};
  assert.equal((await scene.transition({from,to,pieceIds:['a'],axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:0})).ok,true);assert.equal(calls,1);scene.dispose();
 } finally {PhysicalCubeScene.prototype.beginTurn=original;}
});

test('unsupported raw mesh profile returns Unavailable and retains the committed native scene',async()=>{
 let frame,rendered;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const valid={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(valid)).ok,true);frame(0);const before=rendered.getObjectByName('s');
 const unsupported={...valid,renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[{pieceId:'a',positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],colors:[1,1,1,1,1,1,1,1,1],occlusion:[1,1,1],indices:[0,1,2],surfaces:[{role:'body',firstIndex:0,indexCount:3}]}]}};
 const result=await scene.setProjection(unsupported);assert.equal(result.ok,false);assert.equal(result.error.code,'Unavailable');assert.equal(rendered.getObjectByName('s'),before);scene.dispose();
});

test('native production body uses the source geometry for explicit cell dimensions',async()=>{
 const {presentationLayerProfile}=await import('../dist/presentation-preset.js');let frame,rendered;
 const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}},scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const geometry={cellSize:[1.012,1.012,1.012],outerSides:[[true,false],[false,true],[false,true]]};
 const p={pieces:[{id:'a',transform:t([-.506,.506,.506]),geometry,stickers:[{id:'s',transform:t([0,0,.508]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(p)).ok,true);frame(0);const body=rendered.getObjectByName('a').children[0].geometry;
 const expected=presentationLayerProfile([1,1],undefined).body(geometry.cellSize,geometry.outerSides);
 assert.deepEqual([...body.getAttribute('position').array],[...expected.getAttribute('position').array]);expected.dispose();scene.dispose();
});

test('production unequal picture grid preserves canonical body centers',async()=>{
 let frame,rendered;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{width:16,height:16}})},clock,{render:s=>{rendered=s},dispose(){}});
 const centers=[-.6,.5],pieces=[];for(const x of centers)for(const y of centers)for(const z of centers){const id=`p${pieces.length}`;pieces.push({id,transform:t([x,y,z]),stickers:[{id:`s${pieces.length}`,transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[centers.indexOf(x),centers.indexOf(y),centers.indexOf(z)]}}]});}
 const faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},result=await scene.setProjection({pieces,picture:{widths:[1,1.2],faces}});assert.equal(result.ok,true);frame(0);
 for(const piece of pieces){const actual=rendered.getObjectByName(piece.id).position.toArray();actual.forEach((value,i)=>assert.ok(Math.abs(value-piece.transform.position[i])<1e-8));}scene.dispose();
});

test('native production core is explicit, static and not a puzzle body',async()=>{
 let frame,rendered;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const p={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(p)).ok,true);frame(0);let cores=[];rendered.traverse(o=>{if(o.userData.plasticCore)cores.push(o)});assert.equal(cores.length,0);
 const explicit={...p,core:{center:[2,3,4],halfExtent:2}};assert.equal((await scene.setProjection(explicit)).ok,true);frame(0);cores=[];rendered.traverse(o=>{if(o.userData.plasticCore)cores.push(o)});assert.equal(cores.length,1);assert.deepEqual(cores[0].position.toArray(),[2,3,4]);assert.equal(cores[0].scale.x,1.6);scene.dispose();
});

test('native default geometry does not silently rescale canonical 3-layer body positions',async()=>{
 let frame,rendered;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s},dispose(){}});
 const pieces=[];for(const x of [-1,0,1])for(const y of [-1,0,1])for(const z of [-1,0,1])pieces.push({id:`${x}/${y}/${z}`,transform:t([x,y,z]),stickers:[]});
 assert.equal((await scene.setProjection({pieces})).ok,true);frame(0);
 for(const piece of pieces)assert.deepEqual(rendered.getObjectByName(piece.id).position.toArray(),piece.transform.position);scene.dispose();
});

test('replacing a live tile releases the superseded viewer texture immediately once',async()=>{
 let frame,rendered;const clock={now:()=>0,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{width:1,height:1}})},clock,{render:s=>{rendered=s},dispose(){}});
 const p={pieces:[{id:'a',transform:t(),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff'}]}]};
 assert.equal((await scene.setProjection(p)).ok,true);frame(0);
 assert.equal((await scene.setArtwork({stickers:[{id:'s',color:'#ffffff',imageId:'one'}]})).ok,true);frame(0);
 const first=rendered.getObjectByName('s').material.map;let disposed=0;first.addEventListener('dispose',()=>disposed++);
 assert.equal((await scene.setArtwork({stickers:[{id:'s',color:'#ffffff',imageId:'two'}]})).ok,true);assert.equal(disposed,1);scene.dispose();assert.equal(disposed,1);
});

test('failed native live artwork preserves the whole committed resource graph and active turn pose',async()=>{
 const {PhysicalCubeScene}=await import('../dist/physical-scene.js');let now=0,frame,rendered;const clock={now:()=>now,request:cb=>{frame=cb;return 1},cancel:()=>{}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{width:1,height:1}})},clock,{render:s=>{rendered=s},dispose(){}});
 const p={pieces:[{id:'a',transform:t([1,0,0]),stickers:[{id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#ff0000',imageId:'old'}]}]};
 assert.equal((await scene.setProjection(p)).ok,true);frame(0);const to={pieces:[{...p.pieces[0],transform:t([0,1,0],[0,0,Math.SQRT1_2,Math.SQRT1_2])}]};
 const pending=scene.transition({from:p,to,pieceIds:['a'],axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:100});now=50;frame(now);rendered.updateMatrixWorld(true);
 const body=rendered.getObjectByName('a'),sticker=rendered.getObjectByName('s'),material=sticker.material,geometry=sticker.geometry,map=material.map,uv=[...geometry.getAttribute('uv').array],position=body.getWorldPosition(new (await import('three')).Vector3());let disposals=0;
 for(const resource of [material,geometry,map])resource.addEventListener('dispose',()=>disposals++);
 const original=PhysicalCubeScene.prototype.syncBodyPoses;PhysicalCubeScene.prototype.syncBodyPoses=function(){throw Error('source failure')};
 try{const result=await scene.setArtwork({stickers:[{id:'s',color:'#00ff00',imageId:'new'}]});assert.equal(result.ok,false);}finally{PhysicalCubeScene.prototype.syncBodyPoses=original;}
 rendered.updateMatrixWorld(true);assert.equal(rendered.getObjectByName('a'),body);assert.equal(sticker.material,material);assert.equal(sticker.geometry,geometry);assert.equal(material.map,map);assert.deepEqual([...geometry.getAttribute('uv').array],uv);assert.equal(material.color.getHexString(),'ff0000');assert.equal(disposals,0);assert.ok(body.getWorldPosition(new (await import('three')).Vector3()).distanceTo(position)<1e-9);
 scene.cancel();assert.equal((await pending).error.code,'Cancelled');scene.dispose();
});

test('failed staged picture update preserves native UV, textures, materials and an active turn',async()=>{
 const THREE=await import('three'),{PhysicalCubeScene}=await import('../dist/physical-scene.js');let now=0,frame,rendered,image={width:16,height:16};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:image})},{now:()=>now,request:cb=>{frame=cb;return 1},cancel:()=>{}},{render:s=>{rendered=s},dispose(){}});
 const faces=[['R',[1,0,0],[0,1,0]],['L',[-1,0,0],[0,1,0]],['U',[0,1,0],[0,0,-1]],['D',[0,-1,0],[0,0,1]],['F',[0,0,1],[0,1,0]],['B',[0,0,-1],[0,1,0]]],pieces=[];let serial=0;
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const v=[x,y,z],index=v.map(c=>c<0?0:1),stickers=[];
  for(const [face,n,up] of faces)if(n.reduce((sum,c,i)=>sum+c*v[i],0)===1){const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...up).cross(new THREE.Vector3(...n)),new THREE.Vector3(...up),new THREE.Vector3(...n)));stickers.push({id:`s${serial++}`,transform:t(n.map(c=>c*.508),q.toArray()),size:[.87,.87],color:'#ffffff',sourceFace:{normal:n,up},picture:{face,layerIndex:index}})}
  pieces.push({id:`p${pieces.length}`,transform:t(v.map(c=>c*.506)),geometry:{cellSize:[1.012,1.012,1.012],outerSides:v.map(c=>[c<0,c>0])},stickers});}
 const picture={widths:[1.012,1.012],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}},from={pieces,presentation:{size:2,nominalEdge:2},appearance:{construction:'stickerless'},picture};
 assert.equal((await scene.setProjection(from)).ok,true);frame(0);const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2),ids=pieces.filter(p=>p.transform.position[0]>0).map(p=>p.id);
 const to={...from,pieces:pieces.map(p=>ids.includes(p.id)?{...p,transform:t(new THREE.Vector3(...p.transform.position).applyQuaternion(q).toArray(),q.toArray())}:p)};
 const pending=scene.transition({from,to,pieceIds:ids,axis:[1,0,0],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:100});now=50;frame(now);rendered.updateMatrixWorld(true);
 const bodies=pieces.map(p=>rendered.getObjectByName(p.id)),poses=bodies.map(body=>body.matrixWorld.clone()),resources=new Map(),graph=[];
 for(const body of bodies)body.traverse(object=>{if(!object.isMesh)return;const materials=Array.isArray(object.material)?[...object.material]:[object.material];graph.push({object,geometry:object.geometry,materials,maps:materials.map(material=>material.map),colors:materials.map(material=>material.color?.getHexString())});for(const item of [object.geometry,...materials])if(item&&!resources.has(item)){resources.set(item,{disposed:0,uv:item.isBufferGeometry&&item.getAttribute('uv')?[...item.getAttribute('uv').array]:null});item.addEventListener('dispose',()=>resources.get(item).disposed++);if(item.map&&!resources.has(item.map)){const texture=item.map;resources.set(texture,{disposed:0,uv:null});texture.addEventListener('dispose',()=>resources.get(texture).disposed++);}}});
 const original=PhysicalCubeScene.prototype.setPictureProjection;let called=false;PhysicalCubeScene.prototype.setPictureProjection=function(...args){called=true;original.apply(this,args);throw Error('after native picture preparation')};
 const artwork={appearance:from.appearance,picture,stickers:pieces.flatMap(p=>p.stickers.map(s=>({id:s.id,color:s.color,sourceFace:s.sourceFace,picture:s.picture})))};
 try{assert.equal((await scene.setArtwork(artwork)).ok,false);}finally{PhysicalCubeScene.prototype.setPictureProjection=original;}
 assert.equal(called,true);rendered.updateMatrixWorld(true);for(let i=0;i<bodies.length;i++){assert.equal(rendered.getObjectByName(pieces[i].id),bodies[i]);assert.ok(bodies[i].matrixWorld.equals(poses[i]));}
 for(const item of graph){assert.equal(item.object.geometry,item.geometry);const materials=Array.isArray(item.object.material)?item.object.material:[item.object.material];assert.deepEqual(materials,item.materials);assert.deepEqual(materials.map(material=>material.map),item.maps);assert.deepEqual(materials.map(material=>material.color?.getHexString()),item.colors);}
 for(const [resource,state] of resources){assert.equal(state.disposed,0);if(state.uv)assert.deepEqual([...resource.getAttribute('uv').array],state.uv);}
 const oldMaps=pieces.flatMap(p=>p.stickers.map(s=>rendered.getObjectByName(s.id).material.map)),version=oldMaps[0].version;
 assert.equal((await scene.setArtwork(artwork)).ok,true);frame(now);
 const mapsAfter=pieces.flatMap(p=>p.stickers.map(s=>rendered.getObjectByName(s.id).material.map));for(let i=0;i<oldMaps.length;i++)assert.equal(mapsAfter[i],oldMaps[i],'unchanged picture retains projected texture identities');
 assert.ok(oldMaps[0].version>version,'same image object may contain updated pixels');
 const reuse=PhysicalCubeScene.prototype.reuseProjectionTextures;PhysicalCubeScene.prototype.reuseProjectionTextures=function(previous){this.projectionTextures[0].flipY=!this.projectionTextures[0].flipY;return reuse.call(this,previous)};
 try{assert.equal((await scene.setArtwork(artwork)).ok,true);}finally{PhysicalCubeScene.prototype.reuseProjectionTextures=reuse;}frame(now);
 const samplerMap=rendered.getObjectByName(pieces[0].stickers[0].id).material.map;assert.notEqual(samplerMap,oldMaps[0],'changed sampler replaces texture');assert.equal(samplerMap.flipY,true);
 assert.equal((await scene.setArtwork(artwork)).ok,true);frame(now);const sourceMap=rendered.getObjectByName(pieces[0].stickers[0].id).material.map;assert.equal(sourceMap.flipY,false);
 let disposed=0;sourceMap.addEventListener('dispose',()=>disposed++);image={width:16,height:16};
 assert.equal((await scene.setArtwork(artwork)).ok,true);frame(now);
 assert.notEqual(rendered.getObjectByName(pieces[0].stickers[0].id).material.map,sourceMap,'changed source image replaces texture');assert.equal(disposed,1);
 scene.cancel();assert.equal((await pending).error.code,'Cancelled');scene.dispose();assert.equal(disposed,1,'transferred texture is disposed exactly once');
});

test('picture windows follow sticker reference through scrambled poses, live artwork and cancel',async()=>{
 const THREE=await import('three');
 for(const widths of [[1,1],[1,1.6]]){
  const centers=[-widths[1]/2,widths[0]/2],sourcePosition=[centers[1],centers[0],centers[1]];let now=0,frame,rendered;const image={width:16,height:16};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:image})},{now:()=>now,request:cb=>{frame=cb;return 1},cancel(){}},{render:s=>{rendered=s},dispose(){}});
  const sf={normal:[0,0,1],up:[0,1,0]},mapping={face:'F',layerIndex:[0,0,1]},sticker={id:'s',transform:t([0,0,.5]),size:[.87,.87],color:'#fff',sourceFace:sf,picture:mapping},picture={widths,faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
  const from={pieces:[{id:'p',transform:t(sourcePosition),stickers:[sticker]},{id:'other',transform:t([centers[0],centers[1],centers[0]]),stickers:[]},{id:'support',transform:t([centers[1],centers[0],centers[0]]),stickers:[]}],picture};
  assert.equal((await scene.setProjection(from)).ok,true);frame(0);const expected=(await import('../dist/projected-uv.js')).stickerWindow(widths,.87,'F',mapping.layerIndex,sticker.size);const check=()=>{const map=rendered.getObjectByName('s').material.map;assert.ok(Math.abs(map.offset.x-expected.offsetU)<1e-10,'reference U');assert.ok(Math.abs(map.offset.y-expected.offsetV)<1e-10,'reference V');};check();
  const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI),end=new THREE.Vector3(...sourcePosition).applyQuaternion(q);const to={...from,pieces:[{...from.pieces[0],transform:t(end.toArray(),q.toArray())},...from.pieces.slice(1)]};
  // A 180-degree turn only maps a nonuniform grid to itself for the equal-width case.
  if(widths[0]===widths[1]){const result=await scene.transition({from,to,pieceIds:['p'],axis:[0,0,1],signedAngleRadians:Math.PI,pivot:[0,0,0],durationMs:0});assert.equal(result.ok,true,JSON.stringify(result));frame(0);const artwork={picture,stickers:[{id:'s',color:'#fff',sourceFace:sf,picture:mapping}]};assert.equal((await scene.setArtwork(artwork)).ok,true);frame(0);check();const turning=scene.transition({from:to,to:from,pieceIds:['p'],axis:[0,0,1],signedAngleRadians:-Math.PI,pivot:[0,0,0],durationMs:100});now=50;frame(now);scene.cancel();assert.equal((await turning).error.code,'Cancelled');frame(now);check();}
  scene.dispose();
 }
});

test('optional source timing holds until its absolute window and finishes on the deadline timer',async()=>{
 let now=0,id=0,rendered;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key),setTimer:(cb,delay)=>{timers.set(++id,{at:now+delay,cb});return id},clearTimer:key=>timers.delete(key)};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>{rendered=s},dispose(){}});assert.equal((await scene.setProjection(projection)).ok,true);
 const step=time=>{now=time;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}for(const [key,cb] of [...frames]){frames.delete(key);cb(now);}};step(0);
 const pending=scene.transition(turn(Math.PI,100),()=>({endAt:200,durationMs:100,revision:1}));step(50);assert.ok(Math.abs(rendered.getObjectByName('a').position.x-1)<1e-9);step(150);assert.ok(Math.abs(rendered.getObjectByName('a').getWorldPosition({setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this}}).y-1)<1e-6);
 now=200;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}assert.equal((await pending).ok,true);assert.equal(timers.size,0);scene.dispose();
});

test('timed turn survives live artwork and cancel removes its pending deadline',async()=>{
 let now=0,id=0,rendered;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key),setTimer:(cb,delay)=>{timers.set(++id,{at:now+delay,cb});return id},clearTimer:key=>timers.delete(key)};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>{rendered=s},dispose(){}}),step=time=>{now=time;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}for(const [key,cb] of [...frames]){frames.delete(key);cb(now);}};
 assert.equal((await scene.setProjection(projection)).ok,true);step(0);const transition=turn(Math.PI,100),pending=scene.transition(transition,()=>({endAt:200,durationMs:100,revision:1}));step(50);
 assert.equal((await scene.setArtwork({stickers:[{id:'s',color:'#ff0000'}]})).ok,true);step(150);assert.ok(Math.abs(rendered.getObjectByName('a').getWorldPosition({setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this}}).y-1)<1e-6);step(200);assert.equal((await pending).ok,true);assert.equal(rendered.getObjectByName('s').material.color.getHexString(),'ff0000');
 const current={...transition.to,pieces:[{...transition.to.pieces[0],stickers:[{...transition.to.pieces[0].stickers[0],color:'#ff0000'}]}]},again=scene.transition({from:current,to:current,pieceIds:[],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:0,durationMs:100},()=>({endAt:400,durationMs:100,revision:2}));assert.ok(timers.size>0);scene.cancel();assert.equal((await again).error.code,'Cancelled');assert.equal(timers.size,0);scene.dispose();
});

test('application deadline finishes while visually hidden and renders on return',async()=>{
 let now=0,id=0,hidden=false,visibility,rendered;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key),setTimer:(cb,delay)=>{timers.set(++id,{at:now+delay,cb});return id},clearTimer:key=>timers.delete(key),isHidden:()=>hidden,onVisibility:cb=>{visibility=cb;return()=>{}}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>{rendered=s},dispose(){}}),step=time=>{now=time;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}for(const [key,cb] of [...frames]){frames.delete(key);cb(now);}};
 assert.equal((await scene.setProjection(projection)).ok,true);step(0);const pending=scene.transition(turn(Math.PI,100),()=>({endAt:200,durationMs:100,revision:1}));step(50);hidden=true;visibility();assert.ok(timers.size>0,'deadline timer remains scheduled while hidden');now=200;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}assert.equal((await pending).ok,true);assert.equal(frames.size,0);hidden=false;visibility();step(200);assert.ok(Math.abs(rendered.getObjectByName('a').position.x+1)<1e-9);scene.dispose();
});

test('application timing revisions rebase an already running native turn',async()=>{
 let now=0,id=0,rendered;const frames=new Map(),timers=new Map(),clock={now:()=>now,request:cb=>{frames.set(++id,cb);return id},cancel:key=>frames.delete(key),setTimer:(cb,delay)=>{timers.set(++id,{at:now+delay,cb});return id},clearTimer:key=>timers.delete(key)},scene=createSceneForTest({resolveAsset:async()=>({ok:false})},clock,{render:s=>{rendered=s},dispose(){}});
 const step=time=>{now=time;for(const [key,timer] of [...timers])if(timer.at<=now){timers.delete(key);timer.cb();}for(const [key,cb] of [...frames]){frames.delete(key);cb(now);}},world=()=>rendered.getObjectByName('a').getWorldPosition({setFromMatrixPosition(m){this.x=m.elements[12];this.y=m.elements[13];this.z=m.elements[14];return this}});
 assert.equal((await scene.setProjection(projection)).ok,true);step(0);let timing={endAt:200,durationMs:100,revision:1};const pending=scene.transition(turn(Math.PI,100),()=>timing);step(150);assert.ok(Math.abs(world().y-1)<1e-6);timing={endAt:350,durationMs:200,revision:2};step(150);step(200);assert.ok(Math.abs(world().y-1)<1e-6);step(300);assert.ok(world().x<-.5);step(350);assert.equal((await pending).ok,true);scene.dispose();
});

test('a failing application timing callback restores the previous core-driven scene',async()=>{
 const h=harness();assert.equal((await h.scene.setProjection(projection)).ok,true);h.step(0);let shouldFail=false;const pending=h.scene.transition(turn(Math.PI,100),()=>{if(shouldFail)throw Error('timing failed');return {endAt:100,durationMs:100,revision:1}});h.step(50);h.step(0);assert.ok(Math.abs(h.draws.at(-1).y-1)<1e-6);shouldFail=true;h.step(1);const result=await pending;assert.equal(result.error.code,'Unavailable');h.step(0);assert.ok(Math.abs(h.draws.at(-1).x-1)<1e-9);assert.equal(h.frames.size,0);h.scene.dispose();
});
