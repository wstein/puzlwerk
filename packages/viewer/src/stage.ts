// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import {createSceneForTest} from './scene.js';
import {createPresentationStudio} from './studio.js';
import {fail,ok} from './contract.js';
import type {CubeScene,Vec3,ViewerOptions,ViewerError} from './contract.js';
type StageError=ViewerError|{code:'InvalidView'|'InvalidLighting';message:string};
type StageResult<T>={ok:true;value:T}|{ok:false;error:StageError};
type ViewPolicy=(view:Readonly<{aspect:number;fovDegrees:number;zoom:number;orientation:readonly [number,number,number,number];placements:readonly Readonly<{position:Vec3}>[]}>)=>Readonly<{distance:number;far:number;groupScale:number}>;
type ExposurePolicy=(snapshot:Readonly<{lights:Readonly<{ambient:number;hemispheres:readonly Readonly<{up:Vec3;sky:number;ground:number}>[];directionals:readonly Readonly<{to:Vec3;amount:number}>[]}>;orientation:readonly [number,number,number,number];cameraPosition:Vec3;shadowMapEnabled:boolean}>)=>number;
type Clock={now():number;request(cb:(time:number)=>void):number;cancel(id:number):void;isHidden?():boolean;onVisibility?(cb:()=>void):()=>void};
type Backend={render(scene:THREE.Scene):void;setView?(view:Readonly<{aspect:number;distance:number;far:number;exposure:number}>):void;dispose():void};
type Child=CubeScene & {setPosition(position:Vec3):StageResult<void>};
/** Internal shared ownership primitive; public stage controls are added separately. */
export function createStageForTest(options:ViewerOptions,clock:Clock,backend:Backend){
 const scene=new THREE.Scene(),display=new THREE.Group();scene.add(display);const studio=createPresentationStudio(scene);
 const placements=new Map<Child,THREE.Group>(); let aspect=1,zoom=1; let exposurePolicy:ExposurePolicy=()=>1; let policy:ViewPolicy=()=>({distance:10,far:100,groupScale:1});
 const children=new Set<Child>(), callbacks=new Map<number,(time:number)=>void>();let next=0,frame:number|undefined,disposed=false,lost=false,dirty=false;
 const schedule=()=>{dirty=true;if(!disposed && !lost && !clock.isHidden?.() && frame===undefined)frame=clock.request(tick);};
 const tick=(time:number)=>{frame=undefined;if(disposed||lost||clock.isHidden?.())return;const current=[...callbacks.values()];callbacks.clear();for(const cb of current)cb(time);if(dirty){dirty=false;scene.updateMatrixWorld(true);backend.render(scene);}if(callbacks.size)schedule();};
 const unsubscribe=clock.onVisibility?.(()=>{if(clock.isHidden?.()){if(frame!==undefined){clock.cancel(frame);frame=undefined;}}else if(dirty||callbacks.size)schedule();});
 function applyPolicy(candidate:ViewPolicy, moved?:{parent:THREE.Group;position:Vec3},viewChange?:{aspect?:number;zoom?:number},additional?:THREE.Group,nextExposure:ExposurePolicy=exposurePolicy):StageResult<void>{
  try {
   const nextAspect=viewChange?.aspect??aspect,nextZoom=viewChange?.zoom??zoom;
   if(!Number.isFinite(nextAspect)||nextAspect<=0||!Number.isFinite(nextZoom)||nextZoom<=0)throw Error('Invalid view');
   const view=Object.freeze({aspect:nextAspect,fovDegrees:35,zoom:nextZoom,orientation:Object.freeze([0,0,0,1] as const),placements:Object.freeze([...placements.values(),...(additional?[additional]:[])].map(p=>Object.freeze({position:Object.freeze(p===moved?.parent?[...moved.position]:p.position.toArray()) as unknown as Vec3})))});
   const fit=candidate(view);
   if(!fit || ![fit.distance,fit.far,fit.groupScale].every(v=>Number.isFinite(v)&&v>0) || fit.far<=.1)throw Error('Invalid view');
   const luminance=(c:THREE.Color)=>.2126*c.r+.7152*c.g+.0722*c.b;
   const hemi: {up:Vec3;sky:number;ground:number}[]=[],dirs:{to:Vec3;amount:number}[]=[];let ambient=0;scene.updateMatrixWorld(true);
   scene.traverse(o=>{if(!o.visible)return;if(o instanceof THREE.AmbientLight)ambient+=o.intensity*luminance(o.color);else if(o instanceof THREE.HemisphereLight)hemi.push({up:o.getWorldPosition(new THREE.Vector3()).normalize().toArray() as unknown as Vec3,sky:o.intensity*luminance(o.color),ground:o.intensity*luminance(o.groundColor)});else if(o instanceof THREE.DirectionalLight)dirs.push({to:o.getWorldPosition(new THREE.Vector3()).sub(o.target.getWorldPosition(new THREE.Vector3())).normalize().toArray() as unknown as Vec3,amount:o.intensity*luminance(o.color)});});
   const freezeVec=(v:Vec3)=>Object.freeze([...v]) as unknown as Vec3;
   const lights=Object.freeze({ambient,hemispheres:Object.freeze(hemi.map(h=>Object.freeze({...h,up:freezeVec(h.up)}))),directionals:Object.freeze(dirs.map(d=>Object.freeze({...d,to:freezeVec(d.to)})))});
   let exposure:number;try{exposure=nextExposure(Object.freeze({lights,orientation:view.orientation,cameraPosition:Object.freeze([0,0,fit.distance] as const),shadowMapEnabled:true}));if(!Number.isFinite(exposure)||exposure<=0)throw Error('Invalid exposure');}catch{return {ok:false,error:{code:'InvalidLighting',message:'Invalid exposure policy'}};}
   backend.setView?.({aspect:nextAspect,distance:fit.distance,far:fit.far,exposure});exposurePolicy=nextExposure;policy=candidate;aspect=nextAspect;zoom=nextZoom;if(moved)moved.parent.position.set(moved.position[0],moved.position[1],moved.position[2]);display.scale.setScalar(fit.groupScale);schedule();return ok(undefined);
  } catch {return {ok:false,error:{code:'InvalidView',message:'Invalid view policy'}};}
 }
 return {
  setViewPolicy(candidate:ViewPolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(candidate);},
  setExposurePolicy(candidate:ExposurePolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,undefined,undefined,candidate);},
  resize(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{aspect:value});},
  setZoom(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{zoom:value});},
  addCube(placement:{position:Vec3}):StageResult<Child>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(!placement || !Array.isArray(placement.position) || placement.position.length!==3 || Array.from(placement.position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');
   const parent=new THREE.Group();parent.position.set(placement.position[0],placement.position[1],placement.position[2]);const view=applyPolicy(policy,undefined,undefined,parent);if(!view.ok)return view;display.add(parent);
   const childClock:Clock={now:()=>clock.now(),request:cb=>{const id=++next;callbacks.set(id,cb);schedule();return id;},cancel:id=>{callbacks.delete(id);},isHidden:()=>clock.isHidden?.()??false,onVisibility:cb=>clock.onVisibility?.(cb)??(()=>{})};
   const inner=createSceneForTest(options,childClock,{render(){},dispose(){}},{scene,parent});let gone=false;
   const child:Child={...inner,setPosition(position){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!Array.isArray(position)||position.length!==3||Array.from(position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');return applyPolicy(policy,{parent,position});},dispose(){if(gone)return;gone=true;inner.dispose();parent.removeFromParent();children.delete(child);placements.delete(child);schedule();}};
   children.add(child);placements.set(child,parent);schedule();return ok(child);
  },
  contextLost(){if(disposed||lost)return;lost=true;for(const child of children)(child as Child & {contextLost():void}).contextLost();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();},
  dispose(){if(disposed)return;for(const child of [...children])child.dispose();disposed=true;unsubscribe?.();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();studio.dispose();backend.dispose();}
 };
}
