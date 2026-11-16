// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import {createSceneForTest} from './scene.js';
import {createPresentationStudio} from './studio.js';
import {SmartRotation,rotationModes,type RotationMode} from './smart-rotation.js';
import {installPresentationDrag,type PresentationDragBinding} from './presentation-input.js';
import {copyLighting,lightingSnapshot,type StageLighting,type ExposurePolicy} from './stage-lighting.js';
import {installSoftShoulder,SHOULDER_GLSL} from './soft-shoulder.js';
import {fail,ok} from './contract.js';
import type {CubeScene,Vec3,ViewerOptions,ViewerError} from './contract.js';
export type StageError=ViewerError|{code:'InvalidView'|'InvalidLighting';message:string};
export type StageResult<T>={ok:true;value:T}|{ok:false;error:StageError};
export type StageView=Readonly<{aspect:number;fovDegrees:number;zoom:number;orientation:readonly [number,number,number,number];placements:readonly Readonly<{position:Vec3}>[]}>;
export type ViewPolicy=(view:StageView)=>Readonly<{distance:number;far:number;groupScale:number}>;
type Clock={now():number;request(cb:(time:number)=>void):number;cancel(id:number):void;isHidden?():boolean;onVisibility?(cb:()=>void):()=>void;setTimer?(cb:()=>void,delay:number):number;clearTimer?(id:number):void};
type Backend={render(scene:THREE.Scene):void;setView?(view:Readonly<{aspect:number;distance:number;far:number;exposure:number;toneMapping?:'neutral'|'softShoulder'}>):void;dispose():void};
export type ChildMaterial=Readonly<{specularIntensity:number;roughness:number;clearcoat:number;receiveShadow:boolean}>;
export type StageChild=CubeScene & {setPosition(position:Vec3):StageResult<void>;setMaterial(material:ChildMaterial):StageResult<void>};
/** Internal shared ownership primitive; public stage controls are added separately. */
export function createStageForTest(options:ViewerOptions & {onError?:(error:StageError)=>void;initialOrientation?:readonly [number,number,number,number];mode?:RotationMode;reducedMotion?:boolean;sensitivity?:number;dragThreshold?:number;fovDegrees?:number;onViewChanged?:(view:StageView)=>void;singleCompatibility?:boolean},clock:Clock,backend:Backend){
 const scene=new THREE.Scene(),display=new THREE.Group();scene.add(display);const studio=createPresentationStudio(scene);
 const ambientLight=scene.children.find(o=>o instanceof THREE.AmbientLight) as THREE.AmbientLight,hemisphereLight=scene.children.find(o=>o instanceof THREE.HemisphereLight) as THREE.HemisphereLight,directionals=scene.children.filter((o):o is THREE.DirectionalLight=>o instanceof THREE.DirectionalLight);let extras:THREE.DirectionalLight[]=[],activeLighting:StageLighting|undefined;
 const placements=new Map<StageChild,THREE.Group>(); let aspect=1,zoom=1;const fovDegrees=options.fovDegrees??35;if(!Number.isFinite(fovDegrees)||fovDegrees<=0||fovDegrees>=180)throw Error('Invalid FOV');let envelope={radius:Math.sqrt(3)*1.001,clearance:.08};const sensitivity=options.sensitivity??.004,threshold=options.dragThreshold??0;if(!Number.isFinite(sensitivity)||sensitivity<=0||!Number.isFinite(threshold)||threshold<0)throw Error('Invalid display input');const controller=new SmartRotation(new THREE.Quaternion(...(options.initialOrientation??[0,0,0,1])),options.mode,options.reducedMotion);display.quaternion.copy(controller.quaternion);let drag:PresentationDragBinding|undefined;let previousTouchAction='';let inputElement:HTMLElement|undefined;let canvasHeld=false,blockedOverlap=false;const panelPointers=new Set<number>(),registrations=new Set<()=>void>(); let exposurePolicy:ExposurePolicy=()=>1; let policy:ViewPolicy=()=>({distance:10,far:100,groupScale:1});
 const visibilityListeners=new Set<()=>void>();
 const children=new Set<StageChild>(), callbacks=new Map<number,(time:number)=>void>();let next=0,frame:number|undefined,disposed=false,lost=false,dirty=false,inTick=false,motionBlocked=false;let wake:number|undefined;
 const schedule=()=>{dirty=true;if(!disposed && !lost && !inTick && !clock.isHidden?.() && frame===undefined)frame=clock.request(tick);};
 const tick=(time:number)=>{frame=undefined;if(disposed||lost||clock.isHidden?.())return;inTick=true;const before=controller.quaternion.clone();controller.step(time/1000);if(!before.equals(controller.quaternion))syncRotation(true);const current=[...callbacks.values()];callbacks.clear();for(const cb of current)cb(time);if(dirty){dirty=false;scene.updateMatrixWorld(true);backend.render(scene);}inTick=false;scheduleMotion();if(callbacks.size)schedule();};
 const unsubscribe=clock.onVisibility?.(()=>{if(clock.isHidden?.()){controller.suspend(clock.now()/1000);drag?.();panelPointers.clear();canvasHeld=false;blockedOverlap=false;clearWake();if(frame!==undefined){clock.cancel(frame);frame=undefined;}}else{controller.resume(clock.now()/1000);scheduleMotion();if(dirty||callbacks.size)schedule();}for(const callback of [...visibilityListeners])callback();});
 function applyPolicy(candidate:ViewPolicy, moved?:{parent:THREE.Group;position:Vec3},viewChange?:{aspect?:number;zoom?:number;orientation?:readonly [number,number,number,number]},additional?:THREE.Group,nextExposure:ExposurePolicy=exposurePolicy,nextLighting?:StageLighting,nextEnvelope=envelope):StageResult<void>{
  try {
   const nextAspect=viewChange?.aspect??aspect,nextZoom=viewChange?.zoom??zoom;
   if(!Number.isFinite(nextAspect)||nextAspect<=0||!Number.isFinite(nextZoom)||nextZoom<=0||!nextEnvelope||!Number.isFinite(nextEnvelope.radius)||nextEnvelope.radius<=0||!Number.isFinite(nextEnvelope.clearance)||nextEnvelope.clearance<0)throw Error('Invalid view');
   const orientation=viewChange?.orientation??display.quaternion.toArray() as [number,number,number,number];
   const view=Object.freeze({aspect:nextAspect,fovDegrees,zoom:nextZoom,orientation:Object.freeze([...orientation]) as readonly [number,number,number,number],placements:Object.freeze([...placements.values(),...(additional?[additional]:[])].map(p=>Object.freeze({position:Object.freeze(p===moved?.parent?[...moved.position]:p.position.toArray()) as unknown as Vec3})))});
   const fit=candidate(view);
   if(!fit || ![fit.distance,fit.far,fit.groupScale].every(v=>Number.isFinite(v)&&v>0) || fit.far<=.1)throw Error('Invalid view');
   const candidateQuaternion=new THREE.Quaternion(...view.orientation),candidateRadius=nextEnvelope.radius*fit.groupScale,candidateClearance=nextEnvelope.clearance*fit.groupScale;
   const candidateCenters=view.placements.map(p=>new THREE.Vector3(...p.position).multiplyScalar(fit.groupScale).applyQuaternion(candidateQuaternion));
   if(candidateCenters.length&&(!Number.isFinite(candidateRadius)||candidateRadius<=0||!Number.isFinite(candidateClearance)||candidateCenters.some(c=>![c.x,c.y,c.z].every(Number.isFinite))))throw Error('Invalid caster bounds');
   const luminance=(c:THREE.Color)=>.2126*c.r+.7152*c.g+.0722*c.b;
   const hemi: {up:Vec3;sky:number;ground:number}[]=[],dirs:{to:Vec3;amount:number}[]=[];let ambient=0;scene.updateMatrixWorld(true);
   scene.traverse(o=>{if(!o.visible)return;if(o instanceof THREE.AmbientLight)ambient+=o.intensity*luminance(o.color);else if(o instanceof THREE.HemisphereLight)hemi.push({up:o.getWorldPosition(new THREE.Vector3()).normalize().toArray() as unknown as Vec3,sky:o.intensity*luminance(o.color),ground:o.intensity*luminance(o.groundColor)});else if(o instanceof THREE.DirectionalLight)dirs.push({to:o.getWorldPosition(new THREE.Vector3()).sub(o.target.getWorldPosition(new THREE.Vector3())).normalize().toArray() as unknown as Vec3,amount:o.intensity*luminance(o.color)});});
   const freezeVec=(v:Vec3)=>Object.freeze([...v]) as unknown as Vec3;
   const lights=nextLighting?lightingSnapshot(nextLighting):Object.freeze({ambient,hemispheres:Object.freeze(hemi.map(h=>Object.freeze({...h,up:freezeVec(h.up)}))),directionals:Object.freeze(dirs.map(d=>Object.freeze({...d,to:freezeVec(d.to)})))});
   let exposure:number;try{exposure=nextExposure(Object.freeze({lights,orientation:view.orientation,cameraPosition:Object.freeze([0,0,fit.distance] as const),shadowMapEnabled:true}));if(!Number.isFinite(exposure)||exposure<=0)throw Error('Invalid exposure');}catch{return {ok:false,error:{code:'InvalidLighting',message:'Invalid exposure policy'}};}
   if(nextLighting){
    if(nextLighting.toneMapping==='softShoulder')installSoftShoulder();
    ambientLight.color.set(nextLighting.ambient.color);ambientLight.intensity=nextLighting.ambient.intensity;ambientLight.visible=nextLighting.ambient.visible;
    hemisphereLight.color.set(nextLighting.hemisphere.sky);hemisphereLight.groundColor.set(nextLighting.hemisphere.ground);hemisphereLight.intensity=nextLighting.hemisphere.intensity;hemisphereLight.visible=nextLighting.hemisphere.visible;hemisphereLight.position.set(...nextLighting.hemisphere.position);
    const roles=[nextLighting.key,nextLighting.fill,nextLighting.rim,nextLighting.shadowFill];
    roles.forEach((v,i)=>{const l=directionals[i];l.color.set(v.color);l.intensity=v.intensity;l.visible=v.visible;l.position.set(...v.position);if(i===0||i===3)l.target.position.set(0,0,0);else l.target.position.set(...v.target);l.target.updateMatrixWorld();});
    directionals[0].shadow.intensity=nextLighting.keyShadowStrength;directionals[3].shadow.intensity=nextLighting.shadowFillStrength;
    studio.floor.material.opacity=nextLighting.floorOpacity;studio.setContactShadow(nextLighting.contactShadow);studio.setFineShadowEdges(nextLighting.fineShadowEdges);if(nextLighting.colorTemperature)studio.setColorTemperature(true);
    for(const l of extras){l.target.removeFromParent();l.removeFromParent();}extras=nextLighting.extraDirectionals.map(d=>{const l=new THREE.DirectionalLight(d.color,d.intensity);l.visible=d.visible;l.position.set(...d.position);l.target.position.set(...d.target);scene.add(l);scene.add(l.target);return l;});
    studio.setCasterDirections(new THREE.Vector3(...nextLighting.key.position).sub(new THREE.Vector3(...nextLighting.key.target)),new THREE.Vector3(...nextLighting.shadowFill.position).sub(new THREE.Vector3(...nextLighting.shadowFill.target)));activeLighting=nextLighting;
   }
   backend.setView?.({aspect:nextAspect,distance:fit.distance,far:fit.far,exposure,toneMapping:nextLighting?.toneMapping??activeLighting?.toneMapping??'neutral'});exposurePolicy=nextExposure;policy=candidate;aspect=nextAspect;zoom=nextZoom;envelope={...nextEnvelope};if(moved)moved.parent.position.set(moved.position[0],moved.position[1],moved.position[2]);display.quaternion.set(...view.orientation);display.scale.setScalar(fit.groupScale);
   if(!options.singleCompatibility && candidateCenters.length)studio.fitCasters(candidateCenters,candidateRadius,candidateClearance);
   schedule();try{options.onViewChanged?.(view);}catch{}return ok(undefined);
  } catch {return {ok:false,error:{code:'InvalidView',message:'Invalid view policy'}};}
 }
 const clearWake=()=>{if(wake!==undefined){(clock.clearTimer??clearTimeout)(wake);wake=undefined;}};
 const scheduleMotion=()=>{clearWake();if(disposed||lost||motionBlocked||clock.isHidden?.())return;const phase=controller.phase;if(phase==='coasting'||phase==='returning'||phase==='leveling')schedule();else if(phase==='awaiting-return'&&controller.returnDeadline!==null){const delay=Math.max(0,controller.returnDeadline*1000-clock.now());wake=(clock.setTimer??setTimeout)(()=>{wake=undefined;schedule();},delay) as number;}};
 const syncRotation=(report=false)=>{const result=applyPolicy(policy,undefined,{orientation:controller.quaternion.toArray() as [number,number,number,number]});motionBlocked=!result.ok;if(!result.ok&&report)options.onError?.(result.error);scheduleMotion();return result;};
 return {
  setCasterEnvelope(value:{radius:number;clearance:number}):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,undefined,undefined,exposurePolicy,undefined,value);},
  setLighting(input:StageLighting):StageResult<void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');
   let data:StageLighting;try{data=copyLighting(input);if(data.toneMapping==='softShoulder'&&!THREE.ShaderChunk.tonemapping_pars_fragment.includes(SHOULDER_GLSL)&&!THREE.ShaderChunk.tonemapping_pars_fragment.includes('vec3 CustomToneMapping( vec3 color ) { return color; }'))throw Error('Conflicting tone mapping');}catch{return {ok:false,error:{code:'InvalidLighting',message:'Invalid lighting'}};}
   const exposure=typeof data.exposure==='function'?data.exposure:()=>data.exposure as number;return applyPolicy(policy,undefined,undefined,undefined,exposure,data);
  },
  attachInput(element:HTMLElement):StageResult<void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(drag)return fail('Busy','Input already attached');
   inputElement=element;previousTouchAction=element.style.touchAction;element.style.touchAction='none';
   drag=installPresentationDrag(element,(dx,dy)=>{if(panelPointers.size||blockedOverlap)return;controller.drag(dy*sensitivity,dx*sensitivity,clock.now()/1000);syncRotation(true);},threshold,{down(){canvasHeld=true;if(panelPointers.size)blockedOverlap=true;controller.down(clock.now()/1000);syncRotation(true);},up(_event,cancelled){canvasHeld=false;if(!panelPointers.size){controller.up(clock.now()/1000,cancelled||blockedOverlap);blockedOverlap=false;}syncRotation(true);}});return ok(undefined);
  },
  registerInteractionSurface(element:HTMLElement):StageResult<()=>void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');
   const doc=element.ownerDocument,owned=new Set<number>();
   const down=(event:Event)=>{const id=(event as PointerEvent).pointerId;owned.add(id);panelPointers.add(id);if(canvasHeld)blockedOverlap=true;controller.down(clock.now()/1000);syncRotation(true);};
   const release=(event:Event)=>{const id=(event as PointerEvent).pointerId;if(!owned.delete(id))return;panelPointers.delete(id);if(panelPointers.size)return;if(!canvasHeld){controller.up(clock.now()/1000,true);blockedOverlap=false;syncRotation(true);}};
   const activity=()=>{controller.interact(clock.now()/1000);syncRotation(true);};
   element.addEventListener('pointerdown',down);for(const type of ['keydown','input','change'])element.addEventListener(type,activity);
   for(const type of ['pointerup','pointercancel','lostpointercapture'])doc.addEventListener(type,release,true);
   let active=true;const remove=()=>{if(!active)return;active=false;element.removeEventListener('pointerdown',down);for(const type of ['keydown','input','change'])element.removeEventListener(type,activity);for(const type of ['pointerup','pointercancel','lostpointercapture'])doc.removeEventListener(type,release,true);for(const id of owned)panelPointers.delete(id);owned.clear();if(!disposed&&!panelPointers.size&&!canvasHeld){controller.up(clock.now()/1000,true);blockedOverlap=false;syncRotation(true);}registrations.delete(remove);};registrations.add(remove);return ok(remove);
  },
  setRotationMode(mode:RotationMode):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(!rotationModes.includes(mode))return fail('InvalidProjection','Invalid rotation mode');controller.setMode(mode,clock.now()/1000);return syncRotation();},
  setReducedMotion(value:boolean):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');controller.setReducedMotion(value,clock.now()/1000);return syncRotation();},
  resetDisplayOrientation():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');controller.reset(clock.now()/1000);drag?.();return syncRotation();},
  interact():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');controller.interact(clock.now()/1000);return syncRotation();},
  setViewPolicy(candidate:ViewPolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(candidate);},
  setExposurePolicy(candidate:ExposurePolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,undefined,undefined,candidate);},
  invalidate():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return syncRotation();},
  suspendInput(){if(disposed||lost)return;controller.suspend(clock.now()/1000);drag?.();panelPointers.clear();canvasHeld=false;blockedOverlap=false;clearWake();},
  resumeInput(){if(disposed||lost||clock.isHidden?.())return;controller.resume(clock.now()/1000);syncRotation(true);},
  resize(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{aspect:value});},
  setZoom(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{zoom:value});},
  addCube(placement:{position:Vec3}):StageResult<StageChild>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(!placement || !Array.isArray(placement.position) || placement.position.length!==3 || Array.from(placement.position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');
   const parent=new THREE.Group();parent.position.set(placement.position[0],placement.position[1],placement.position[2]);const view=applyPolicy(policy,undefined,undefined,parent);if(!view.ok)return view;display.add(parent);
   const childClock:Clock={now:()=>clock.now(),request:cb=>{const id=++next;callbacks.set(id,cb);schedule();return id;},cancel:id=>{callbacks.delete(id);},isHidden:()=>clock.isHidden?.()??false,onVisibility:cb=>{visibilityListeners.add(cb);return()=>{visibilityListeners.delete(cb)}}};
   const inner=createSceneForTest(options,childClock,{render(){},dispose(){}},{scene,parent});let gone=false,material:ChildMaterial|undefined;
   const applyMaterial=()=>{if(!material)return;parent.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.receiveShadow=material!.receiveShadow;for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat instanceof THREE.MeshPhysicalMaterial){mat.specularIntensity=material!.specularIntensity;mat.roughness=material!.roughness;mat.clearcoat=material!.clearcoat;}});};
   const child:StageChild={...inner,async setProjection(value){const result=await inner.setProjection(value);if(result.ok&&!gone){applyMaterial();schedule();}return result;},async setArtwork(value){const result=await inner.setArtwork(value);if(result.ok&&!gone){applyMaterial();schedule();}return result;},setMaterial(value){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!value||typeof value.receiveShadow!=='boolean'||![value.specularIntensity,value.roughness,value.clearcoat].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return fail('InvalidProjection','Invalid material');const view=applyPolicy(policy);if(!view.ok)return view;material={...value};applyMaterial();schedule();return ok(undefined);},setPosition(position){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!Array.isArray(position)||position.length!==3||Array.from(position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');return applyPolicy(policy,{parent,position});},dispose(){if(gone)return;gone=true;inner.dispose();parent.removeFromParent();children.delete(child);placements.delete(child);if(!disposed&&!lost){const view=applyPolicy(policy);if(!view.ok)options.onError?.(view.error);}schedule();}};
   children.add(child);placements.set(child,parent);schedule();return ok(child);
  },
  contextLost(){if(disposed||lost)return;lost=true;clearWake();for(const child of children)(child as StageChild & {contextLost():void}).contextLost();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();},
  dispose(){if(disposed)return;disposed=true;for(const child of [...children])child.dispose();clearWake();for(const remove of [...registrations])remove();panelPointers.clear();drag?.dispose();if(inputElement)inputElement.style.touchAction=previousTouchAction;controller.dispose();unsubscribe?.();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();visibilityListeners.clear();for(const l of extras){l.target.removeFromParent();l.removeFromParent();}studio.dispose();backend.dispose();}
 };
}
