import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSceneForTest } from '../dist/scene.js';
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
