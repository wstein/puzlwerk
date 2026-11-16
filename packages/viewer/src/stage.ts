// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import {createSceneForTest} from './scene.js';
import {createPresentationStudio} from './studio.js';
import {fail,ok} from './contract.js';
import type {CubeScene,Result,Vec3,ViewerOptions,ViewerError} from './contract.js';
type StageError=ViewerError|{code:'InvalidView'|'InvalidLighting';message:string};
type StageResult<T>={ok:true;value:T}|{ok:false;error:StageError};
type ViewPolicy=(view:Readonly<{aspect:number;fovDegrees:number;zoom:number;orientation:readonly [number,number,number,number];placements:readonly Readonly<{position:Vec3}>[]}>)=>Readonly<{distance:number;far:number;groupScale:number}>;
type Clock={now():number;request(cb:(time:number)=>void):number;cancel(id:number):void;isHidden?():boolean;onVisibility?(cb:()=>void):()=>void};
type Backend={render(scene:THREE.Scene):void;dispose():void};
type Child=CubeScene & {setPosition(position:Vec3):StageResult<void>};
/** Internal shared ownership primitive; public stage controls are added separately. */
export function createStageForTest(options:ViewerOptions,clock:Clock,backend:Backend){
 const scene=new THREE.Scene(),display=new THREE.Group();scene.add(display);const studio=createPresentationStudio(scene);
 const placements=new Map<Child,THREE.Group>(); let policy:ViewPolicy=()=>({distance:10,far:100,groupScale:1});
 const children=new Set<Child>(), callbacks=new Map<number,(time:number)=>void>();let next=0,frame:number|undefined,disposed=false,lost=false,dirty=false;
 const schedule=()=>{dirty=true;if(!disposed && !lost && !clock.isHidden?.() && frame===undefined)frame=clock.request(tick);};
 const tick=(time:number)=>{frame=undefined;if(disposed||lost||clock.isHidden?.())return;const current=[...callbacks.values()];callbacks.clear();for(const cb of current)cb(time);if(dirty){dirty=false;scene.updateMatrixWorld(true);backend.render(scene);}if(callbacks.size)schedule();};
 const unsubscribe=clock.onVisibility?.(()=>{if(clock.isHidden?.()){if(frame!==undefined){clock.cancel(frame);frame=undefined;}}else if(dirty||callbacks.size)schedule();});
 function applyPolicy(candidate:ViewPolicy, moved?:{parent:THREE.Group;position:Vec3}):StageResult<void>{
  try {
   const view=Object.freeze({aspect:1,fovDegrees:35,zoom:1,orientation:Object.freeze([0,0,0,1] as const),placements:Object.freeze([...placements.values()].map(p=>Object.freeze({position:Object.freeze(p===moved?.parent?[...moved.position]:p.position.toArray()) as unknown as Vec3})))});
   const fit=candidate(view);
   if(!fit || ![fit.distance,fit.far,fit.groupScale].every(v=>Number.isFinite(v)&&v>0) || fit.far<=.1)throw Error('Invalid view');
   policy=candidate;if(moved)moved.parent.position.set(moved.position[0],moved.position[1],moved.position[2]);display.scale.setScalar(fit.groupScale);schedule();return ok(undefined);
  } catch {return {ok:false,error:{code:'InvalidView',message:'Invalid view policy'}};}
 }
 return {
  setViewPolicy(candidate:ViewPolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(candidate);},
  addCube(placement:{position:Vec3}):Result<Child>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(!placement || !Array.isArray(placement.position) || placement.position.length!==3 || Array.from(placement.position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');
   const parent=new THREE.Group();parent.position.set(placement.position[0],placement.position[1],placement.position[2]);display.add(parent);
   const childClock:Clock={now:()=>clock.now(),request:cb=>{const id=++next;callbacks.set(id,cb);schedule();return id;},cancel:id=>{callbacks.delete(id);},isHidden:()=>clock.isHidden?.()??false,onVisibility:cb=>clock.onVisibility?.(cb)??(()=>{})};
   const inner=createSceneForTest(options,childClock,{render(){},dispose(){}},{scene,parent});let gone=false;
   const child:Child={...inner,setPosition(position){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!Array.isArray(position)||position.length!==3||Array.from(position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');return applyPolicy(policy,{parent,position});},dispose(){if(gone)return;gone=true;inner.dispose();parent.removeFromParent();children.delete(child);placements.delete(child);schedule();}};
   children.add(child);placements.set(child,parent);schedule();return ok(child);
  },
  contextLost(){if(disposed||lost)return;lost=true;for(const child of children)(child as Child & {contextLost():void}).contextLost();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();},
  dispose(){if(disposed)return;for(const child of [...children])child.dispose();disposed=true;unsubscribe?.();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();studio.dispose();backend.dispose();}
 };
}
