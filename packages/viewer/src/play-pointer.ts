// SPDX-License-Identifier: AGPL-3.0-or-later
// One routed input stream; puzzle transitions remain Core-owned.
import type {SeamWide} from './play-seam.js';import {beginGesture,moveGesture,releaseGesture,type Gesture} from './play-gesture.js';
import {midpoint,spread,twoFingerLock,twoFingerMotion,type Pair,type TwoFingerLock} from './two-finger.js';
import type {Mesh} from 'three';import type {Hit,AxisScreen} from './play-gesture-map.js';import type {PointerRoute} from './presentation-input.js';
type Result<T>={ok:true;value:T}|{ok:false;error:{code:string;message?:string}};
export type PlayPreview={readonly pieceIds?:readonly string[];update(angle:number):Result<void>;commit(turns:-1|1|2):Result<void>;cancel():Result<void>};
export type PlayPlayer={beginPreview(axis:'X'|'Y'|'Z',layers:readonly number[]):Result<PlayPreview>};
export type PlayPick={hit:Hit;axes:AxisScreen;n:number;layerWidths?:readonly number[];seamWide?:SeamWide;halfExtent?:number;pxPerQuarter:number;player:PlayPlayer;stickerId?:string;surface?:Mesh;materialIndex?:number};
type Feedback={kind:'hover'|'held';pick:PlayPick}|{kind:'layer';pick:PlayPick;pieceIds:readonly string[]}|undefined;
/** Typed events of the play route. `turn-begin` is the selection: the layers and piece IDs about to turn. `turn-end` follows every `turn-begin` exactly once. */
export type PlayEvent=
 |{type:'hover';stickerId?:string}
 |{type:'turn-begin';axis:'X'|'Y'|'Z';layers:readonly number[];pieceIds:readonly string[];source:'drag'|'pair'}
 |{type:'turn-end';outcome:'committed';turns:-1|1|2}
 |{type:'turn-end';outcome:'cancelled'}
 |{type:'error';error:{code:string;message?:string}};
export function createPlayPointer(options:{onEvent?(event:PlayEvent):void;pick(event:PointerEvent):PlayPick|undefined;pickPair?(event:PointerEvent):PlayPick|undefined;onError?(error:{code:string;message?:string}):void;onCommit?():void;onBegin?():boolean;onEnd?():void;onFeedback?(value:Feedback):void;acceptTouch?():boolean;onPairOrbit?(dx:number,dy:number):void;onPairZoom?(scale:number):void}):PointerRoute {
 let gesture:Gesture|undefined,pick:PlayPick|undefined,preview:PlayPreview|undefined,primary:number|undefined,blocked=false,held=false,pairLock:TwoFingerLock='undecided',pairStart:Pair|undefined,pairLast:Pair|undefined,pairPick:PlayPick|undefined,pairGesture:Gesture|undefined,pairEnded=false;const ids=new Set<number>(),touches=new Map<number,readonly [number,number]>();
 const emit=(event:PlayEvent)=>{try{options.onEvent?.(event)}catch{}};let lastHover:string|undefined;
 const cancelPreview=()=>{if(!preview)return;preview.cancel();preview=undefined;emit({type:'turn-end',outcome:'cancelled'})};
 const clearGesture=()=>{cancelPreview();gesture=undefined;pick=undefined;options.onFeedback?.(undefined)};
 const report=(result:Result<unknown>)=>{if(!result.ok){emit({type:'error',error:result.error});options.onError?.(result.error)}return result.ok};
 const pair=():Pair|undefined=>{const p=[...touches.values()];return p.length===2?[p[0],p[1]]:undefined};
 const beginPreview=(g:Gesture,p:PlayPick,whole:boolean)=>{if(!g.lock)return false;const layers=whole?Array.from({length:p.n},(_,i)=>i):Array.from({length:g.lock.to-g.lock.from+1},(_,i)=>g.lock!.from+i),started=p.player.beginPreview(g.lock.axis.toUpperCase() as 'X'|'Y'|'Z',layers);if(!report(started))return false;if(started.ok){preview=started.value;options.onFeedback?.({kind:'layer',pick:p,pieceIds:preview.pieceIds??[]});emit({type:'turn-begin',axis:g.lock.axis.toUpperCase() as 'X'|'Y'|'Z',layers,pieceIds:preview.pieceIds??[],source:whole?'pair':'drag'});return true}return false};
 const finishPreview=(g:Gesture|undefined,cancelled:boolean)=>{if(!preview)return;if(!cancelled&&g){const released=releaseGesture(g);if(released.commit){const turns=released.commit.quarters;if(report(preview.commit(turns))){preview=undefined;try{options.onCommit?.()}finally{emit({type:'turn-end',outcome:'committed',turns})}}else cancelPreview()}else cancelPreview()}else cancelPreview()};
 return {
  hover(event){if(ids.size)return;const found=options.pick(event);options.onFeedback?.(found?{kind:'hover',pick:found}:undefined);if(found?.stickerId!==lastHover){lastHover=found?.stickerId;emit(lastHover===undefined?{type:'hover'}:{type:'hover',stickerId:lastHover})}},
  leave(){if(!ids.size){options.onFeedback?.(undefined);if(lastHover!==undefined){lastHover=undefined;emit({type:'hover'})}}},
  down(event){
   if(event.pointerType==='touch' && options.acceptTouch?.()){touches.set(event.pointerId,[event.clientX,event.clientY]);if(ids.size){ids.add(event.pointerId);if(touches.size!==2){blocked=true;clearGesture();return true}clearGesture();pairStart=pair();pairLast=pairStart;pairLock='undecided';pairEnded=false;const m=midpoint(pairStart!);const midpointEvent={clientX:m[0],clientY:m[1]} as PointerEvent;pairPick=options.pickPair?options.pickPair(midpointEvent):options.pick(midpointEvent);pairGesture=pairPick?beginGesture({...pairPick,point:m,wide:false}):undefined;return true}}
   if(ids.size){ids.add(event.pointerId);blocked=true;clearGesture();return true}const found=options.pick(event);if(!found && !(event.pointerType==='touch'&&options.acceptTouch?.()))return false;pick=found;primary=event.pointerId;ids.add(event.pointerId);held=options.onBegin?.()??true;blocked=!held;if(blocked)return true;if(found){options.onFeedback?.({kind:'held',pick:found});gesture=beginGesture({...found,point:[event.clientX,event.clientY],wide:event.shiftKey})}return true;
  },
  move(event){
   if(touches.has(event.pointerId))touches.set(event.pointerId,[event.clientX,event.clientY]);
   if(pairStart && !pairEnded && !blocked){const now=pair();if(!now||!pairLast)return;const m=midpoint(now),start=midpoint(pairStart),motion=twoFingerMotion(pairLast,now);pairLock=twoFingerLock(spread(pairStart),spread(now),Math.hypot(m[0]-start[0],m[1]-start[1]),pairLock);pairLast=now;
    if(pairLock==='pinch'){if(motion.scale!==1)options.onPairZoom?.(motion.scale);return}if(pairLock!=='tilt')return;
    if(!pairPick){options.onPairOrbit?.(motion.dx,motion.dy);return}if(!pairGesture)return;pairGesture=moveGesture(pairGesture,m);if(!pairGesture.lock)return;if(!preview&&!beginPreview(pairGesture,pairPick,true)){blocked=true;clearGesture();return}if(preview&&!report(preview.update(pairGesture.displayDeg*Math.PI/180))){blocked=true;clearGesture()}return;
   }
   if(blocked||event.pointerId!==primary||!gesture||!pick)return;gesture=moveGesture(gesture,[event.clientX,event.clientY]);if(!gesture.lock)return;if(!preview&&!beginPreview(gesture,pick,false)){blocked=true;clearGesture();return}if(preview&&!report(preview.update(gesture.displayDeg*Math.PI/180))){blocked=true;clearGesture()}
  },
  end(event,cancelled){
   if(!event){ids.clear();touches.clear();clearGesture();if(held)options.onEnd?.();held=false;primary=undefined;blocked=false;pairStart=pairLast=undefined;pairGesture=undefined;pairPick=undefined;pairEnded=false;return}
   ids.delete(event.pointerId);touches.delete(event.pointerId);if(cancelled)blocked=true;
   if(pairStart&&!pairEnded){finishPreview(pairGesture,cancelled||blocked);pairEnded=true;options.onFeedback?.(undefined)}
   if(ids.size)return;if(!pairStart)finishPreview(gesture,cancelled||blocked);gesture=undefined;pick=undefined;options.onFeedback?.(undefined);if(held)options.onEnd?.();held=false;primary=undefined;blocked=false;pairStart=pairLast=undefined;pairGesture=undefined;pairPick=undefined;pairEnded=false;
  },
 };
}
