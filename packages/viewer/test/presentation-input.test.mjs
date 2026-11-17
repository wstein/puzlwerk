import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installPresentationDrag} from '../dist/presentation-input.js';
import {exerciseDrag} from './fixtures/drag-harness.mjs';
test('drag threshold, overlap, cancellation and disposal match pinned source',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-presentation-drag.json',import.meta.url)));
 assert.deepEqual(exerciseDrag(installPresentationDrag),fixture.result);
});

test('one pointer binding routes claimed play contacts and restores fresh orbit',()=>{
 const handlers=new Map(),capture=new Set(),events=[];const element={addEventListener(t,f){handlers.set(t,f)},removeEventListener(t){handlers.delete(t)},setPointerCapture(i){capture.add(i)},hasPointerCapture(i){return capture.has(i)},releasePointerCapture(i){capture.delete(i)}};
 const route={down:e=>{events.push(['pick',e.pointerId]);return e.pointerId===1},move:e=>events.push(['play',e.pointerId]),end:(e,cancelled)=>events.push(['end',e?.pointerId??null,cancelled])};
 const drag=installPresentationDrag(element,()=>events.push(['orbit']),0,{},route),emit=(type,id,x=0)=>handlers.get(type)?.({type,pointerId:id,clientX:x,clientY:0,timeStamp:0});
 emit('pointerdown',1);emit('pointermove',1,20);emit('lostpointercapture',1);emit('pointerdown',2);emit('pointermove',2,20);emit('pointerup',2);drag.dispose();
 assert.deepEqual(events,[['pick',1],['play',1],['end',1,true],['pick',2],['orbit']]);assert.equal(capture.size,0);assert.equal(handlers.size,0);
});
