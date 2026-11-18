import {test} from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';import {pickPlayFace} from '../dist/play-picking.js';import {standardLayerWidths} from '../dist/index.js';
import {seamAt,seamBlock} from '../dist/play-seam.js';
import {beginGesture,moveGesture,releaseGesture} from '../dist/play-gesture.js';
// Front view: the F face shows x to the right (screen [100,0]) and y downward (screen [0,100]); a horizontal drag turns about y.
const axes={x:[100,0],y:[0,100],z:[0,0]};
const gesture=(y,drag,extra={},n=5,layerWidths)=>{
 const g=beginGesture({n,layerWidths,hit:{face:'F',point:[0,y,1]},point:[0,0],axes,pxPerQuarter:100,...extra});
 return moveGesture(g,drag);
};
const range=g=>[g.lock.from,g.lock.to];
test('seamAt: the outer quarters of a sticker next to a boundary are the seam (written-out 5x5, boundaries at -0.6 -0.2 0.2 0.6)',()=>{
 assert.deepEqual(seamAt(-.18,5),{seam:2,touched:2});
 assert.deepEqual(seamAt(-.22,5),{seam:2,touched:1});
 assert.deepEqual(seamAt(.19,5),{seam:3,touched:2});
 assert.equal(seamAt(0,5),null,'the middle half of a sticker is no seam');
 assert.equal(seamAt(-.09,5),null,'0.11 from the boundary, tolerance 0.1');
 assert.deepEqual(seamAt(-.11,5),{seam:2,touched:2},'0.09 from the boundary');
 assert.equal(seamAt(-.9,5),null,'the outer edge of the cube is no seam');
 assert.equal(seamAt(.9,5),null);
 assert.equal(seamAt(0,2),null);assert.equal(seamAt(.0,2),null,'a 2x2 has no seam block');
 // Unequal widths [2,1,2]: boundaries at -0.2 and 0.2, the middle layer is 0.4 wide, tolerance 0.1.
 assert.deepEqual(seamAt(-.15,3,[2,1,2]),{seam:1,touched:1});
 assert.equal(seamAt(0,3,[2,1,2]),null);
 // A minimum tolerance in local units widens thin layers but never beyond half of the layer.
 assert.equal(seamAt(-.05,5,undefined,.25,0),null,'0.15 from the boundary, tolerance 0.1');
 assert.equal(seamAt(-.05,5,undefined,.05,0),null);
 assert.deepEqual(seamAt(-.05,5,undefined,.25,.16),{seam:2,touched:2},'minimum 0.16 reaches it');
 assert.equal(seamAt(-.95,5,undefined,.9,0),null,'an outer layer: 0.35 from its only boundary, the cap is half a layer (0.2)');
 assert.deepEqual(seamAt(-.75,5,undefined,.9,0),{seam:1,touched:0},'0.15 from it');
 assert.equal(seamAt(-.82,5,undefined,.9,5),null,'0.22 from the boundary of an outer layer: beyond half a layer (0.2) however large tolerance and minimum are');
 assert.deepEqual(seamAt(-.79,5,undefined,.9,5),{seam:1,touched:0},'0.19 from it: within half a layer');
 assert.deepEqual(seamAt(-.05,5,undefined,.25,5),{seam:2,touched:2},'capped at half a layer (0.2), still 0.15 away');
});
test('seamBlock: both layers at the seam and everything on the chosen side; a block of the whole cube switches sides',()=>{
 assert.deepEqual(seamBlock(2,5,true),[1,4]);assert.deepEqual(seamBlock(2,5,false),[0,2]);
 assert.deepEqual(seamBlock(1,3,true),[0,1],'plus side would be the whole cube');
 assert.deepEqual(seamBlock(2,3,false),[1,2],'minus side would be the whole cube');
 assert.deepEqual(seamBlock(1,3,false),[0,1]);assert.deepEqual(seamBlock(2,3,true),[1,2]);
 assert.deepEqual(seamBlock(7,15,true),[6,14]);assert.deepEqual(seamBlock(7,15,false),[0,7]);
});
test('a seam swipe turns the block its lean picks; no clear lean takes the half of the touch',()=>{
 const seam={seamWide:{}};
 assert.deepEqual(range(gesture(-.18,[60,10],seam)),[1,4],'lean down: toward the plus side');
 assert.deepEqual(range(gesture(-.18,[60,-10],seam)),[0,2],'lean up: toward the minus side');
 // Without a clear lean CubeAssembler takes the half of the cube the touch lies in (CubeGesture.res defaultSeamBlock: sign from the coordinate), not the side of the touched layer.
 assert.deepEqual(range(gesture(-.18,[60,0],seam)),[0,2],'no lean, touch in the minus half of a 5x5 at seam 2: minus block (the touched layer 2 lies on the plus side of the seam)');
 assert.deepEqual(range(gesture(-.22,[60,0],seam)),[0,2],'no lean, touched layer 1, minus half');
 assert.deepEqual(range(gesture(.18,[60,0],seam)),[2,4],'no lean, touch in the plus half at seam 3: plus block');
 assert.deepEqual(range(gesture(-.18,[60,5],seam)),[0,2],'lean 5 of 60.2 is below 0.1: the half decides (minus)');
 assert.deepEqual(range(gesture(0,[60,0],seam,4)),[1,3],'4x4, a touch exactly on the seam at coordinate 0 belongs to the plus half (CubeAssembler: coordinate >= 0)');
 assert.deepEqual(range(gesture(.13,[60,0],seam,7)),[3,6],'7x7, seam 4 (0.143), touched layer 3 in the plus half: plus block');
 assert.deepEqual(range(gesture(-.13,[60,0],seam,7)),[0,3],'7x7, seam 3, touched layer 3 in the minus half: minus block');
 assert.deepEqual(range(gesture(-.22,[60,7],seam)),[1,4],'lean 7 of 60.4 reaches 0.1');
 assert.equal(gesture(-.18,[60,10],seam).lock.axis,'y');
});
test('without a seam, without the option, or with Shift the old rules apply',()=>{
 assert.deepEqual(range(gesture(0,[60,10],{seamWide:{}})),[2,2],'middle of a sticker: one layer');
 assert.deepEqual(range(gesture(-.18,[60,10])),[2,2],'option off: one layer');
 assert.deepEqual(range(gesture(-.18,[60,10],{seamWide:{},wide:true})),[0,2],'Shift wins: touched layer to the nearest outer layer');
 assert.deepEqual(range(gesture(-.02,[60,10],{seamWide:{}},2)),[0,0],'a 2x2 has no seam block');
});
test('the seam block is what a release commits, in Core terms',()=>{
 const g=gesture(-.18,[100,20],{seamWide:{}});assert.deepEqual(releaseGesture(g).commit,{axis:'y',from:1,to:4,quarters:1});
});
test('minPx widens the seam of thin layers with the screen size of the layer',()=>{
 const widths=[1.6,...Array(13).fill(1),1.6],edge=widths.reduce((a,b)=>a+b),local=2/edge,b=2*(1.6+6)/edge-1; // boundary between layers 6 and 7 of a 15x15
 assert.ok(Math.abs(local-.1235)<1e-3);
 const y=b-.045; // 0.045 from the boundary: more than 0.25 of a layer (0.031), less than 5 px at 100 px per unit
 assert.equal(range(gesture(y,[60,10],{seamWide:{}},15,widths)).join(),[6,6].join(),'default tolerance misses it: one layer (touched layer 6)');
 assert.equal(range(gesture(y,[60,10],{seamWide:{minPx:5}},15,widths)).join(),[6,14].join(),'with minPx 5 it is the seam, lean toward plus');
});

import {validPlayTargetShape} from '../dist/play-target.js';
test('play target: seamWide is true or an object of finite non-negative numbers, anything else is invalid',()=>{
 const base={player:{beginPreview(){}},size:5};
 for(const ok of [undefined,true,{},{tolerance:.25},{tolerance:.5,lean:.1,minPx:6},{minPx:0}])assert.equal(validPlayTargetShape({...base,seamWide:ok}),true,JSON.stringify(ok));
 for(const bad of [false,'yes',null,[],{tolerance:-1},{tolerance:.6},{tolerance:NaN},{lean:-.1},{lean:1.1},{minPx:-1},{minPx:Infinity},{minPx:'5'},{tolerance:'.2'}])assert.equal(validPlayTargetShape({...base,seamWide:bad}),false,JSON.stringify(bad));
});

import {createPlayPointer} from '../dist/play-pointer.js';
test('the play route passes the target seamWide option to the gesture: a seam swipe previews the wide block',()=>{
 const calls=[],player={beginPreview(axis,layers){calls.push([axis,[...layers]]);return {ok:true,value:{update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}};
 const ev=(type,x,y)=>({type,pointerId:1,clientX:x,clientY:y,shiftKey:false});
 for(const [seamWide,expected] of [[undefined,[['Y',[2]]]],[{},[['Y',[1,2,3,4]]]]]){
  calls.length=0;const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,-.18,1]},axes,n:5,pxPerQuarter:100,player,...(seamWide?{seamWide}:{})})});
  route.down(ev('pointerdown',0,0));route.move(ev('pointermove',60,10));route.end(ev('pointerup',60,10),false);assert.deepEqual(calls,expected,JSON.stringify(seamWide));
 }
});
// Picks made by pickPlayFace on a real 15x15 frame: `axes` are screen px per parent unit and `hit.point` is divided by halfExtent, so minPx must be scaled by both.
const realFrame=()=>{
 const widths=standardLayerWidths(15),half=widths.reduce((a,b)=>a+b,0)/2,rect={left:0,top:0,width:860,height:860};
 const camera=new THREE.PerspectiveCamera(28,1,.1,100);camera.position.set(0,0,half*5);camera.lookAt(0,0,0);camera.updateMatrixWorld();camera.updateProjectionMatrix();
 const parent=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2*half,2*half,2*half),new THREE.MeshBasicMaterial());mesh.userData.stickerId='sticker:s';parent.add(mesh);parent.updateMatrixWorld(true);
 const bound=s=>2*widths.slice(0,s).reduce((a,b)=>a+b,0)/(2*half)-1;
 const rows=[];for(let r=100;r<=760;r++){const p=pickPlayFace(parent,camera,rect,430,r,half);if(p)rows.push({r,p})}
 const pxPerLocal=Math.abs(rows[0].p.axes.y[1])*half;
 const nearest=y=>rows.reduce((best,x)=>Math.abs(x.p.hit.point[1]-y)<Math.abs(best.p.hit.point[1]-y)?x:best);
 const block=(x,minPx)=>{const g=beginGesture({n:15,layerWidths:widths,hit:x.p.hit,point:[430,x.r],axes:x.p.axes,halfExtent:half,pxPerQuarter:100,seamWide:{minPx}});const m=moveGesture(g,[490,x.r+5]);return [m.lock.from,m.lock.to]};
 return {widths,half,bound,nearest,pxPerLocal,block,layerPx:0};
};
test('minPx is a screen length: with real picks the middle of an inner layer is no seam and the seam reaches minPx from the boundary, not minPx times halfExtent',()=>{
 const f=realFrame(),inner=f.pxPerLocal*(2*f.widths[7]/(2*f.half));assert.ok(inner>30&&inner<60,`inner layer ${inner} px`);
 const centre=f.nearest((f.bound(7)+f.bound(8))/2);
 for(const minPx of [0,4,8]){const b=f.block(centre,minPx);assert.equal(b[0],b[1],`layer centre, minPx ${minPx}: one layer ${b}`)}
 const tol=.25*inner;assert.ok(tol>9&&tol<12,`default tolerance ${tol} px`);
 const at=px=>f.nearest(f.bound(7)+px/f.pxPerLocal);
 assert.equal(f.block(at(tol+2),0).join(),'7,7','just outside the default tolerance: one layer');
 assert.equal(f.block(at(tol+2),4).join(),'7,7','minPx 4 is below the default tolerance and changes nothing');
 const wide=f.block(at(tol+2),tol+4);assert.ok(wide[0]<=6&&wide[1]>=7&&wide[1]-wide[0]>=2,`minPx beyond the default tolerance reaches 2 px further out: ${wide}`);
 assert.equal(f.block(at(tol+6),tol+4).join(),'7,7','but not 6 px further out');
});
