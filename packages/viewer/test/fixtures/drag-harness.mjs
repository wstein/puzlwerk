export function exerciseDrag(install){
 const handlers=new Map(),captured=new Set(),events=[];
 const element={addEventListener(type,fn){handlers.set(type,fn)},removeEventListener(type,fn){if(handlers.get(type)===fn)handlers.delete(type)},setPointerCapture(id){captured.add(id)},hasPointerCapture(id){return captured.has(id)},releasePointerCapture(id){captured.delete(id)}};
 const drag=install(element,(dx,dy,elapsed)=>events.push(['move',dx,dy,elapsed]),5,{down:e=>events.push(['down',e.pointerId]),up:(e,cancelled)=>events.push(['up',e?.pointerId??null,cancelled])});
 const emit=(type,pointerId,x,y,timeStamp)=>handlers.get(type)?.({type,pointerId,clientX:x,clientY:y,timeStamp});
 emit('pointerdown',1,0,0,0);emit('pointermove',1,2,0,10);emit('pointermove',1,6,0,20);
 emit('pointerdown',2,3,3,21);emit('pointermove',1,20,0,30);emit('pointerup',2,3,3,31);emit('pointerup',1,20,0,32);
 emit('pointerdown',3,0,0,40);emit('pointermove',3,0,8,50);emit('pointercancel',3,0,8,51);
 emit('pointerdown',4,0,0,60);drag();drag.dispose();
 return {events,remainingHandlers:handlers.size,captured:[...captured]};
}
