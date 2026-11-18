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

const eventsHarness=(commitResult={ok:true})=>{
 const events=[],player={beginPreview(){return {ok:true,value:{pieceIds:['piece:a','piece:b'],update(){return {ok:true}},commit(){return commitResult},cancel(){return {ok:true}}}}}},
 hit={stickerId:'sticker:s1',hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player};
 let current=hit;const route=createPlayPointer({pick:()=>current,onEvent:e=>events.push(e)});return {events,route,set:value=>{current=value},hit};
};
test('events: a committed drag reports selection and then the committed turn',()=>{
 const h=eventsHarness();h.route.down(event('pointerdown',1));assert.deepEqual(h.events,[]);h.route.move(event('pointermove',1,100));
 assert.deepEqual(h.events,[{type:'turn-begin',axis:'Y',layers:[2],pieceIds:['piece:a','piece:b'],source:'drag'}]);
 h.route.end(event('pointerup',1,100),false);assert.deepEqual(h.events.slice(1),[{type:'turn-end',outcome:'committed',turns:1}]);
});
test('events: cancellation and a second contact report a cancelled end once',()=>{
 const h=eventsHarness();h.route.down(event('pointerdown',1));h.route.move(event('pointermove',1,40));h.route.end(event('pointercancel',1,40),true);
 assert.deepEqual(h.events.map(e=>e.type+':'+(e.outcome??'')),['turn-begin:','turn-end:cancelled']);
 const g=eventsHarness();g.route.down(event('pointerdown',1));g.route.move(event('pointermove',1,40));g.route.down(event('pointerdown',2));g.route.end(event('pointerup',2),false);g.route.end(event('pointerup',1),false);
 assert.deepEqual(g.events.map(e=>e.type+':'+(e.outcome??'')),['turn-begin:','turn-end:cancelled']);
 const z=eventsHarness();z.route.down(event('pointerdown',1));z.route.move(event('pointermove',1,10));z.route.end(event('pointerup',1,10),false);assert.deepEqual(z.events.map(e=>e.type+':'+(e.outcome??'')),['turn-begin:','turn-end:cancelled'],'a zero turn is cancelled');
});
test('events: a rejected final move reports the error and then a cancelled end',()=>{
 const h=eventsHarness({ok:false,error:{code:'IllegalMove'}});h.route.down(event('pointerdown',1));h.route.move(event('pointermove',1,100));h.route.end(event('pointerup',1,100),false);
 assert.deepEqual(h.events.slice(1),[{type:'error',error:{code:'IllegalMove'}},{type:'turn-end',outcome:'cancelled'}]);
});
test('events: hover reports changes of the sticker only, and leaving',()=>{
 const h=eventsHarness();h.route.hover(event('pointermove',1));h.route.hover(event('pointermove',1,1));assert.deepEqual(h.events,[{type:'hover',stickerId:'sticker:s1'}]);
 h.set({...h.hit,stickerId:'sticker:s2'});h.route.hover(event('pointermove',1,2));h.set(undefined);h.route.hover(event('pointermove',1,3));h.route.leave();
 assert.deepEqual(h.events,[{type:'hover',stickerId:'sticker:s1'},{type:'hover',stickerId:'sticker:s2'},{type:'hover'}]);
});
test('events: a throwing listener does not disturb the turn',()=>{
 let commits=0;const player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},commit(){commits++;return {ok:true}},cancel(){return {ok:true}}}}}};
 const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onEvent(){throw Error('listener')}});
 route.down(event('pointerdown',1));route.move(event('pointermove',1,100));route.end(event('pointerup',1,100),false);assert.equal(commits,1);
});

test('events: the target onCommit runs before turn-end, so a turn-end handler cannot redirect it',()=>{
 const log=[],player={beginPreview(){return {ok:true,value:{pieceIds:[],update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}};
 const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onCommit:()=>log.push('commit'),onEvent:e=>log.push(e.type)});
 route.down(event('pointerdown',1));route.move(event('pointermove',1,100));route.end(event('pointerup',1,100),false);assert.deepEqual(log,['turn-begin','commit','turn-end']);
 const throwing=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onCommit(){throw Error('commit')},onEvent:e=>log.push('t:'+e.type)});
 log.length=0;throwing.down(event('pointerdown',1));throwing.move(event('pointermove',1,100));assert.throws(()=>throwing.end(event('pointerup',1,100),false));assert.deepEqual(log,['t:turn-begin','t:turn-end'],'turn-end follows even when onCommit throws');
});
test('events: end() without an event (dispose, new target, mode change, blur) cancels the open turn exactly once and stays silent otherwise',()=>{
 const player={beginPreview(){return {ok:true,value:{pieceIds:['p'],update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}},events=[];
 const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onEvent:e=>events.push(e.type+':'+(e.outcome??''))});
 route.end();assert.deepEqual(events,[],'nothing open: no event');
 route.down(event('pointerdown',1));route.end();assert.deepEqual(events,[],'a contact without a turn: no event');
 route.down(event('pointerdown',1));route.move(event('pointermove',1,40));route.end();assert.deepEqual(events,['turn-begin:','turn-end:cancelled']);
 route.end();route.end(event('pointerup',1,40),false);assert.equal(events.length,2,'later ends add nothing');
 events.length=0;route.down(event('pointerdown',2));route.move(event('pointermove',2,100));route.end(event('pointerup',2,100),false);route.end();assert.deepEqual(events,['turn-begin:','turn-end:committed'],'after a commit end() adds no second turn-end');
});
test('events: the committed turns are -1, 1 or 2 and a touch pair reports source pair',()=>{
 const player={beginPreview(){return {ok:true,value:{pieceIds:['p'],update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}},ends=[],begins=[];
 const route=createPlayPointer({pick:()=>({hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}),onEvent:e=>{if(e.type==='turn-end')ends.push(e.turns);if(e.type==='turn-begin')begins.push(e.source)}});
 for(const dx of [100,-100,200]){route.down(event('pointerdown',1));route.move(event('pointermove',1,dx));route.end(event('pointerup',1,dx),false)}
 assert.deepEqual(ends,[1,-1,2]);assert.deepEqual(begins,['drag','drag','drag']);
 const pairEvents=[],pick={stickerId:'x',hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player};
 const touch=createPlayPointer({pick:()=>pick,acceptTouch:()=>true,onEvent:e=>pairEvents.push(e)});const e=(id,x,y)=>({pointerId:id,pointerType:'touch',clientX:x,clientY:y,shiftKey:false});
 touch.down(e(1,0,0));touch.move(e(1,30,0));touch.down(e(2,0,20));for(let d=5;d<=100;d+=5){touch.move(e(1,30+d,0));touch.move(e(2,d,20))}
 const begin=pairEvents.find(x=>x.type==='turn-begin'&&x.source==='pair');assert.ok(begin,JSON.stringify(pairEvents));assert.deepEqual(begin.layers,[0,1,2]);
 touch.end(e(1,100,0),false);touch.end(e(2,100,20),false);const turnEnds=pairEvents.filter(x=>x.type==='turn-end');assert.equal(turnEnds.length,pairEvents.filter(x=>x.type==='turn-begin').length,'one turn-end per turn-begin');
});
test('events: leave() reports the end of a hover only when a sticker was hovered, and not during a contact',()=>{
 const events=[];let hovered=true;const player={beginPreview(){return {ok:true,value:{update(){return {ok:true}},commit(){return {ok:true}},cancel(){return {ok:true}}}}}};
 const route=createPlayPointer({pick:()=>hovered?{stickerId:'s',hit:{face:'F',point:[0,.9,1]},axes:{x:[100,0],y:[0,100],z:[0,0]},n:3,pxPerQuarter:100,player}:undefined,onEvent:e=>events.push(e)});
 route.leave();assert.deepEqual(events,[],'nothing hovered');
 route.hover(event('pointermove',1));route.down(event('pointerdown',1));route.leave();assert.deepEqual(events,[{type:'hover',stickerId:'s'}],'no leave event during a contact');
 route.end(event('pointerup',1),false);route.leave();assert.deepEqual(events.at(-1),{type:'hover'});assert.equal(events.length,2);route.leave();assert.equal(events.length,2,'once');
});
