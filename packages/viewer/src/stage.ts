// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import {createSceneForTest} from './scene.js';
import {createPresentationStudio} from './studio.js';
import {SmartRotation,rotationModes,type RotationMode} from './smart-rotation.js';
import {bindSmartRotation,type SmartRotationBinding,type RotationEnvironment} from './native-rotation-binding.js';
import type {PointerRoute} from './presentation-input.js';
import {copyLighting,lightingSnapshot,type StageLighting,type ExposurePolicy} from './stage-lighting.js';
import {installSoftShoulder,SHOULDER_GLSL} from './soft-shoulder.js';
import {fail,ok} from './contract.js';
import {validateAppearance,type ViewerAppearance} from './native-appearance.js';
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
export function createStageForTest(options:ViewerOptions & {onError?:(error:StageError)=>void;initialOrientation?:readonly [number,number,number,number];mode?:RotationMode;reducedMotion?:boolean;sensitivity?:number;dragThreshold?:number;fovDegrees?:number;onViewChanged?:(view:StageView)=>void;singleCompatibility?:boolean;studioHost?:HTMLElement},clock:Clock,backend:Backend){
 const scene=new THREE.Scene(),display=new THREE.Group();scene.add(display);const studio=createPresentationStudio(scene,1,1,options.studioHost);
 const ambientLight=scene.children.find(o=>o instanceof THREE.AmbientLight) as THREE.AmbientLight,hemisphereLight=scene.children.find(o=>o instanceof THREE.HemisphereLight) as THREE.HemisphereLight,directionals=scene.children.filter((o):o is THREE.DirectionalLight=>o instanceof THREE.DirectionalLight);let extras:THREE.DirectionalLight[]=[],activeLighting:StageLighting|undefined;
 const placements=new Map<StageChild,THREE.Group>(); let aspect=1,zoom=1;const fovDegrees=options.fovDegrees??18;if(!Number.isFinite(fovDegrees)||fovDegrees<=0||fovDegrees>=180)throw Error('Invalid FOV');let envelope={radius:Math.sqrt(3)*1.001,clearance:.08};const sensitivity=options.sensitivity??.008,threshold=options.dragThreshold??4;if(!Number.isFinite(sensitivity)||sensitivity<=0||!Number.isFinite(threshold)||threshold<0)throw Error('Invalid display input');let controller=new SmartRotation((options.initialOrientation ? new THREE.Quaternion(...options.initialOrientation) : new THREE.Quaternion().setFromEuler(new THREE.Euler(7*Math.PI/180,-Math.PI/18,0,"XYZ"))),options.mode,options.reducedMotion);display.quaternion.copy(controller.quaternion);let acceptedController=controller.clone();let nativeBinding:SmartRotationBinding|undefined; let exposurePolicy:ExposurePolicy=()=>1; let policy:ViewPolicy=()=>({distance:10,far:100,groupScale:1});
 const visibilityListeners=new Set<()=>void>();
 const children=new Set<StageChild>(),materialReapply=new Map<StageChild,()=>void>(), callbacks=new Map<number,(time:number)=>void>();let next=0,frame:number|undefined,disposed=false,lost=false,dirty=false,inTick=false,motionBlocked=false,focused=true;let wake:number|undefined;let stageAppearance:ViewerAppearance|undefined,appearancePending=false;
 const schedule=()=>{dirty=true;if(!disposed && !lost && !inTick && !clock.isHidden?.() && frame===undefined)frame=clock.request(tick);};
 const tick=(time:number)=>{frame=undefined;if(disposed||lost||clock.isHidden?.())return;inTick=true;const before=controller.quaternion.clone();controller.step(time/1000);if(!before.equals(controller.quaternion))syncRotation(true);else acceptedController=controller.clone();const current=[...callbacks.values()];callbacks.clear();for(const cb of current)cb(time);if(dirty){dirty=false;scene.updateMatrixWorld(true);backend.render(scene);}inTick=false;scheduleMotion();if(callbacks.size)schedule();};
 const unsubscribe=clock.onVisibility?.(()=>{if(clock.isHidden?.()){controller.suspend(clock.now()/1000);nativeBinding?.cancelContacts();clearWake();if(frame!==undefined){clock.cancel(frame);frame=undefined;}}else{if(focused){controller.resume(clock.now()/1000);scheduleMotion();}if(dirty||callbacks.size)schedule();}for(const callback of [...visibilityListeners])callback();});
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
 const transactController=(change:(candidate:SmartRotation)=>void)=>{const candidate=controller.clone();change(candidate);const result=applyPolicy(policy,undefined,{orientation:candidate.quaternion.toArray() as [number,number,number,number]});if(result.ok){controller.adopt(candidate);acceptedController=controller.clone();nativeBinding?.refresh();motionBlocked=false;scheduleMotion();}return result;};
 const syncRotation=(report=false)=>{const result=applyPolicy(policy,undefined,{orientation:controller.quaternion.toArray() as [number,number,number,number]});motionBlocked=!result.ok;if(result.ok)acceptedController=controller.clone();else {controller.adopt(acceptedController);nativeBinding?.refresh();if(report)options.onError?.(result.error);}scheduleMotion();return result;};
 return {
  renderIndicator(){schedule();},
  playParent(child:StageChild){return placements.get(child);},
  cancelInput(){nativeBinding?.cancelContacts();},
  beginPlay(){if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Stage lost context');return transactController(c=>c.down(clock.now()/1000));},
  endPlay(){if(disposed||lost)return;transactController(c=>c.up(clock.now()/1000,true));},
  async setViewerAppearance(input:ViewerAppearance):Promise<StageResult<void>>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Stage lost context');if(appearancePending)return fail('Busy','Appearance operation in progress');
   let value:ViewerAppearance;try{value=validateAppearance(input);}catch{return fail('InvalidProjection','Invalid viewer appearance');}
   if(children.size===0){stageAppearance=value;return ok(undefined);}
   appearancePending=true;
   try{
    const participants=[...children] as (StageChild & Pick<ReturnType<typeof createSceneForTest>,'prepareViewerAppearance'|'cancelViewerAppearancePreparation'>)[];let firstFailure:StageResult<never>|undefined;
    const results=await Promise.all(participants.map(async child=>{const result=await child.prepareViewerAppearance(value);if(!result.ok && !firstFailure){firstFailure=result;for(const other of participants)other.cancelViewerAppearancePreparation();}return result;}));
    const prepared=results.flatMap(result=>result.ok?[result.value]:[]);
    if(firstFailure){for(const item of prepared)item.discard();return firstFailure;}
    if(disposed||lost){for(const item of prepared)item.discard();return fail(disposed?'Disposed':'ContextLost','Stage no longer available');}
    if(participants.some(child=>!children.has(child))){for(const item of prepared)item.discard();return fail('Disposed','Stage child no longer available');}
    for(const item of prepared){const ready=item.seal();if(!ready.ok){for(const candidate of prepared)candidate.discard();return ready;}}
    for(const item of prepared)item.commit();for(const child of participants)materialReapply.get(child)?.();stageAppearance=value;schedule();return ok(undefined);
   }finally{appearancePending=false;}
  },
  setCasterEnvelope(value:{radius:number;clearance:number}):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,undefined,undefined,exposurePolicy,undefined,value);},
  setLighting(input:StageLighting):StageResult<void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');
   let data:StageLighting;try{data=copyLighting(input);if(data.toneMapping==='softShoulder'&&!THREE.ShaderChunk.tonemapping_pars_fragment.includes(SHOULDER_GLSL)&&!THREE.ShaderChunk.tonemapping_pars_fragment.includes('vec3 CustomToneMapping( vec3 color ) { return color; }'))throw Error('Conflicting tone mapping');}catch{return {ok:false,error:{code:'InvalidLighting',message:'Invalid lighting'}};}
   const exposure=typeof data.exposure==='function'?data.exposure:()=>data.exposure as number;return applyPolicy(policy,undefined,undefined,undefined,exposure,data);
  },
  attachInput(element:HTMLElement,panel:HTMLElement,storageKey?:string,environment?:RotationEnvironment,route?:PointerRoute):StageResult<void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Stage lost context');if(nativeBinding)return fail('Busy','Input already attached');
   try {const inputPose=new THREE.Group();inputPose.quaternion.copy(controller.quaternion);
    nativeBinding=bindSmartRotation(element,inputPose,{controller,panel,storageKey,environment,sensitivity,threshold,route,changed:()=>{if(!disposed&&!lost)syncRotation(true);},requestMode:mode=>!disposed&&!lost&&transactController(c=>c.setMode(mode,clock.now()/1000)).ok,requestReducedMotion:value=>!disposed&&!lost&&transactController(c=>c.setReducedMotion(value,clock.now()/1000)).ok});return ok(undefined);}
   catch{return fail('Unavailable','Unable to attach native rotation input');}
  },
  registerInteractionSurface(element:HTMLElement):StageResult<()=>void>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');
   if(!nativeBinding)return fail('Unavailable','Input is not attached');return ok(nativeBinding.registerInteractionSurface(element));
  },
  setRotationMode(mode:RotationMode):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(!rotationModes.includes(mode))return fail('InvalidProjection','Invalid rotation mode');return transactController(c=>c.setMode(mode,clock.now()/1000));},
  setReducedMotion(value:boolean):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return transactController(c=>c.setReducedMotion(value,clock.now()/1000));},
  resetDisplayOrientation():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');const result=transactController(c=>c.reset(clock.now()/1000));if(result.ok)nativeBinding?.reset();return result;},
  interact():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return transactController(c=>c.interact(clock.now()/1000));},
  setViewPolicy(candidate:ViewPolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(candidate);},
  setExposurePolicy(candidate:ExposurePolicy):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,undefined,undefined,candidate);},
  invalidate():StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return syncRotation();},
  suspendInput(){if(disposed||lost)return;focused=false;controller.suspend(clock.now()/1000);nativeBinding?.cancelContacts();clearWake();},
  resumeInput(){if(disposed||lost)return;focused=true;if(clock.isHidden?.())return;controller.resume(clock.now()/1000);syncRotation(true);},
  resize(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{aspect:value});},
  setZoom(value:number):StageResult<void>{if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');return applyPolicy(policy,undefined,{zoom:value});},
  addCube(placement:{position:Vec3}):StageResult<StageChild>{
   if(disposed)return fail('Disposed','Stage disposed');if(lost)return fail('ContextLost','Context lost');if(appearancePending)return fail('Busy','Appearance operation in progress');if(!placement || !Array.isArray(placement.position) || placement.position.length!==3 || Array.from(placement.position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');
   const parent=new THREE.Group();parent.position.set(placement.position[0],placement.position[1],placement.position[2]);const view=applyPolicy(policy,undefined,undefined,parent);if(!view.ok)return view;display.add(parent);
   const childClock:Clock={now:()=>clock.now(),request:cb=>{const id=++next;callbacks.set(id,cb);schedule();return id;},cancel:id=>{callbacks.delete(id);},setTimer:(cb,delay)=>(clock.setTimer??setTimeout)(cb,delay) as number,clearTimer:id=>(clock.clearTimer??clearTimeout)(id),isHidden:()=>clock.isHidden?.()??false,onVisibility:cb=>{visibilityListeners.add(cb);return()=>{visibilityListeners.delete(cb)}}};
   const inner=createSceneForTest(options,childClock,{render(){},dispose(){}},{scene,parent});if(stageAppearance)inner.setInitialViewerAppearance(stageAppearance);let gone=false,material:ChildMaterial|undefined;
   const applyMaterial=()=>{if(!material)return;parent.traverse(o=>{if(!(o instanceof THREE.Mesh))return;o.receiveShadow=material!.receiveShadow;for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat instanceof THREE.MeshPhysicalMaterial){mat.specularIntensity=material!.specularIntensity;mat.roughness=material!.roughness;mat.clearcoat=material!.clearcoat;}});};
   const child:StageChild={...inner,async setProjection(value){if(appearancePending)return fail('Busy','Appearance operation in progress');const result=await inner.setProjection(value);if(result.ok&&!gone){applyMaterial();schedule();}return result;},async setArtwork(value){if(appearancePending)return fail('Busy','Appearance operation in progress');const result=await inner.setArtwork(value);if(result.ok&&!gone){applyMaterial();schedule();}return result;},setMaterial(value){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!value||typeof value.receiveShadow!=='boolean'||![value.specularIntensity,value.roughness,value.clearcoat].every(n=>Number.isFinite(n)&&n>=0&&n<=1))return fail('InvalidProjection','Invalid material');const view=applyPolicy(policy);if(!view.ok)return view;material={...value};applyMaterial();schedule();return ok(undefined);},setPosition(position){if(gone||disposed)return fail('Disposed','Child disposed');if(lost)return fail('ContextLost','Context lost');if(!Array.isArray(position)||position.length!==3||Array.from(position).some(v=>!Number.isFinite(v)))return fail('InvalidProjection','Invalid placement');return applyPolicy(policy,{parent,position});},dispose(){if(gone)return;gone=true;inner.dispose();parent.removeFromParent();children.delete(child);materialReapply.delete(child);placements.delete(child);if(!disposed&&!lost){const view=applyPolicy(policy);if(!view.ok)options.onError?.(view.error);}schedule();}};
   children.add(child);materialReapply.set(child,applyMaterial);placements.set(child,parent);schedule();return ok(child);
  },
  contextLost(){if(disposed||lost)return;controller.suspend(clock.now()/1000);nativeBinding?.cancelContacts();lost=true;clearWake();for(const child of children)(child as StageChild & {contextLost():void}).contextLost();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();},
  dispose(){if(disposed)return;disposed=true;for(const child of [...children])child.dispose();clearWake();nativeBinding?.dispose();nativeBinding=undefined;controller.dispose();unsubscribe?.();if(frame!==undefined)clock.cancel(frame);frame=undefined;callbacks.clear();visibilityListeners.clear();for(const l of extras){l.target.removeFromParent();l.removeFromParent();}studio.dispose();backend.dispose();}
 };
}
