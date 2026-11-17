// SPDX-License-Identifier: AGPL-3.0-or-later
// Routes source Cubistry gesture decisions to the single Core-owned player.
import {beginGesture,moveGesture,releaseGesture,type Gesture} from './play-gesture.js';
import type {Hit,AxisScreen} from './play-gesture-map.js';
import type {PointerRoute} from './presentation-input.js';
type Result<T>={ok:true;value:T}|{ok:false;error:{code:string;message?:string}};
export type PlayPreview={update(angle:number):Result<void>;commit(turns:-1|1|2):Result<void>;cancel():Result<void>};
export type PlayPlayer={beginPreview(axis:'X'|'Y'|'Z',layers:readonly number[]):Result<PlayPreview>};
export type PlayPick={hit:Hit;axes:AxisScreen;n:number;pxPerQuarter:number;player:PlayPlayer};
export function createPlayPointer(options:{pick(event:PointerEvent):PlayPick|undefined;onError?(error:{code:string;message?:string}):void;onCommit?():void;onBegin?():boolean;onEnd?():void}):PointerRoute {
 let gesture:Gesture|undefined,pick:PlayPick|undefined,preview:PlayPreview|undefined,primary:number|undefined,blocked=false,held=false;const ids=new Set<number>();
 const cancel=()=>{if(preview)preview.cancel();preview=undefined;gesture=undefined;pick=undefined;};
 const report=(result:Result<unknown>)=>{if(!result.ok)options.onError?.(result.error);return result.ok;};
 return {
  down(event){if(ids.size){ids.add(event.pointerId);blocked=true;cancel();return true;}const found=options.pick(event);if(!found)return false;pick=found;primary=event.pointerId;ids.add(event.pointerId);held=options.onBegin?.()??true;blocked=!held;if(blocked)return true;gesture=beginGesture({...found,point:[event.clientX,event.clientY],wide:event.shiftKey});return true;},
  move(event){if(blocked||event.pointerId!==primary||!gesture||!pick)return;gesture=moveGesture(gesture,[event.clientX,event.clientY]);if(!gesture.lock)return;if(!preview){const layers=Array.from({length:gesture.lock.to-gesture.lock.from+1},(_,i)=>gesture!.lock!.from+i),started=pick.player.beginPreview(gesture.lock.axis.toUpperCase() as 'X'|'Y'|'Z',layers);if(!report(started)){blocked=true;cancel();return;}if(started.ok)preview=started.value;}if(preview && !report(preview.update(gesture.displayDeg*Math.PI/180))){blocked=true;cancel();}},
  end(event,cancelled){if(!event){ids.clear();cancel();if(held)options.onEnd?.();held=false;primary=undefined;blocked=false;return;}ids.delete(event.pointerId);if(cancelled)blocked=true;if(ids.size)return;if(!blocked && gesture && preview){const released=releaseGesture(gesture);if(released.commit){if(report(preview.commit(released.commit.quarters)))options.onCommit?.();else preview.cancel();}else preview.cancel();preview=undefined;}else cancel();gesture=undefined;pick=undefined;if(held)options.onEnd?.();held=false;primary=undefined;blocked=false;},
 };
}
