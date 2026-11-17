import {test} from 'node:test';import assert from 'node:assert/strict';import {createPlayPointer} from '../dist/play-pointer.js';
const event=(type,id,x=0,y=0)=>({type,pointerId:id,clientX:x,clientY:y,shiftKey:false});
test('claimed face drag previews then commits once; cancellation permits a fresh contact',()=>{
 const calls=[],player={beginPreview(axis,layers){calls.push(['begin',axis,layers]);return {ok:true,value:{update(a){calls.push(['update',a]);return {ok:true}},commit(q){calls.push(['commit',q]);return {ok:true}},cancel(){calls.push(['cancel']);return {ok:true}}}}}};
 let enabled=true;const route=createPlayPointer({pick:()=>enabled?{hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}:undefined});
 assert.equal(route.down(event('pointerdown',1)),true);route.move(event('pointermove',1,100));route.end(event('pointerup',1,100),false);assert.deepEqual(calls,[['begin','Y',[2]],['update',Math.PI/2],['commit',1]]);
 assert.equal(route.down(event('pointerdown',2)),true);route.move(event('pointermove',2,40));route.end(event('pointercancel',2,40),true);assert.deepEqual(calls.at(-1),['cancel']);enabled=false;assert.equal(route.down(event('pointerdown',3)),false);
});

test('second contact cancels instead of pretending to implement a wide turn',()=>{
 let cancels=0,commits=0;const player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},cancel(){cancels++;return {ok:true}},commit(){commits++;return {ok:true}}}}}};
 const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player})});assert.equal(route.down(event('pointerdown',1)),true);route.move(event('pointermove',1,50));assert.equal(route.down(event('pointerdown',2)),true);route.end(event('pointerup',2),false);route.end(event('pointerup',1),false);assert.equal(cancels,1);assert.equal(commits,0);assert.equal(route.down(event('pointerdown',3)),true);route.move(event('pointermove',3,100));route.end(event('pointerup',3),false);assert.equal(commits,1);
});

test('zero or full rotations do not commit a Core move',()=>{
 let cancels=0,commits=0;const player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},cancel(){cancels++;return {ok:true}},commit(){commits++;return {ok:true}}}}}};const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player})});
 for(const distance of [10,400]){route.down(event('pointerdown',1));route.move(event('pointermove',1,distance));route.end(event('pointerup',1),false)}assert.equal(commits,0);assert.equal(cancels,2);
});

test('a rejected final move cancels preview and allows a fresh gesture',()=>{
 let cancels=0;const player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},commit(){return {ok:false,error:{code:'IllegalMove'}}},cancel(){cancels++;return {ok:true}}}}}};const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player})});route.down(event('pointerdown',1));route.move(event('pointermove',1,100));route.end(event('pointerup',1),false);assert.equal(cancels,1);assert.equal(route.down(event('pointerdown',2)),true);route.end(event('pointercancel',2),true);
});

test('play contact holds the shared view until cancellation or release',()=>{
 const calls=[],player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}},route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onBegin:()=>{calls.push('hold');return true},onEnd:()=>calls.push('release')});route.down(event('pointerdown',1));route.move(event('pointermove',1,50));route.end(undefined,true);assert.deepEqual(calls,['hold','release']);route.down(event('pointerdown',2));route.end(event('pointerup',2),false);assert.deepEqual(calls,['hold','release','hold','release']);
});

test('play feedback follows hover, held contact, accepted Core layer and cancellation',()=>{
 const seen=[],player={beginPreview(){return {ok:true,value:{pieceIds:['piece:opaque'],update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}},hit={stickerId:'sticker:opaque',hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player},route=createPlayPointer({pick:()=>hit,onFeedback:value=>seen.push(value)});
 route.hover(event('pointermove',1));assert.deepEqual(seen.at(-1),{kind:'hover',pick:hit});route.down(event('pointerdown',1));assert.deepEqual(seen.at(-1),{kind:'held',pick:hit});route.move(event('pointermove',1,100));assert.deepEqual(seen.at(-1),{kind:'layer',pick:hit,pieceIds:['piece:opaque']});route.end(event('pointercancel',1),true);assert.equal(seen.at(-1),undefined);
});
test('two touches cancel a layer, lock a whole-cube preview, and leave the remaining contact inert',()=>{const calls=[],player={beginPreview(axis,layers){calls.push(['begin',axis,layers]);return {ok:true,value:{pieceIds:['piece:x'],update(v){calls.push(['update',v]);return {ok:true}},commit(q){calls.push(['commit',q]);return {ok:true}},cancel(){calls.push(['cancel']);return {ok:true}}}}}},pick={stickerId:'x',hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player},route=createPlayPointer({pick:()=>pick,acceptTouch:()=>true});const e=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,shiftKey:false});route.down(e(1,0,0));route.move(e(1,30,0));route.down(e(2,0,20));assert.ok(calls.some(c=>c[0]==='cancel'));for(let d=5;d<=100;d+=5){route.move(e(1,30+d,0));route.move(e(2,d,20))}assert.ok(calls.some(c=>c[0]==='begin'&&c[2].join()==='0,1,2'));route.end(e(1,100,0),false);const count=calls.length;route.move(e(2,180,20));route.end(e(2,180,20),false);assert.equal(calls.length,count)});
test('two touches off cube lock orbit or pinch and never create Core turns',()=>{let orbit=0,zoom=0;const route=createPlayPointer({pick:()=>undefined,acceptTouch:()=>true,onPairOrbit:()=>orbit++,onPairZoom:()=>zoom++});const e=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,shiftKey:false});route.down(e(1,0,0));route.down(e(2,0,100));route.move(e(1,30,0));route.move(e(2,30,100));assert.ok(orbit>0);route.end(e(1,30,0),false);route.end(e(2,30,100),false);route.down(e(1,0,0));route.down(e(2,0,100));route.move(e(2,0,140));assert.ok(zoom>0);route.end(e(2,0,140),false);route.end(e(1,0,0),false)});
