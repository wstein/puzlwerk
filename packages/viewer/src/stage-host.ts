// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import {configurePresentationRenderer} from './presentation-preset.js';
import {createStageForTest} from './stage.js';
import type {StageChild,StageError,StageResult,StageView,ViewPolicy} from './stage.js';
import type {StageLighting} from './stage-lighting.js';
import type {RotationMode} from './smart-rotation.js';
import type {AssetResolver,Vec3} from './contract.js';
export type StageOptions=Readonly<{resolveAsset:AssetResolver;fovDegrees:number;zoom:number;initialOrientation:readonly [number,number,number,number];mode:RotationMode;sensitivity:number;dragThreshold:number;reducedMotion:boolean;viewPolicy:ViewPolicy;casterEnvelope:Readonly<{radius:number;clearance:number}>;lighting?:StageLighting;onError?:(error:StageError)=>void;onViewChanged?:(view:StageView)=>void}>;
export interface CubeStage {
 addCube(placement:Readonly<{position:Vec3}>):StageResult<StageChild>;
 setViewPolicy(policy:ViewPolicy):StageResult<void>;setCasterEnvelope(envelope:Readonly<{radius:number;clearance:number}>):StageResult<void>;setZoom(zoom:number):StageResult<void>;setLighting(lighting:StageLighting):StageResult<void>;
 setRotationMode(mode:RotationMode):StageResult<void>;setReducedMotion(enabled:boolean):StageResult<void>;resetDisplayOrientation():StageResult<void>;interact():StageResult<void>;registerInteractionSurface(element:HTMLElement):StageResult<()=>void>;invalidate():StageResult<void>;dispose():void;
}
const failure=(code:'InvalidView'|'Unavailable',message:string):StageResult<never>=>({ok:false,error:{code,message}});
export function createCubeStage(host:HTMLElement,options:StageOptions):StageResult<CubeStage>{
 if(!host||!options||typeof options.resolveAsset!=='function'||!Number.isFinite(options.fovDegrees)||options.fovDegrees<=0||options.fovDegrees>=180||!Number.isFinite(options.zoom)||options.zoom<=0||!Array.isArray(options.initialOrientation)||options.initialOrientation.length!==4||Array.from(options.initialOrientation).some(v=>!Number.isFinite(v))||Math.abs(Math.hypot(...options.initialOrientation)-1)>1e-6||!['smart','free','classic'].includes(options.mode)||!Number.isFinite(options.sensitivity)||options.sensitivity<=0||!Number.isFinite(options.dragThreshold)||options.dragThreshold<0||typeof options.reducedMotion!=='boolean'||typeof options.viewPolicy!=='function'||!options.casterEnvelope)return failure('InvalidView','Invalid stage options');
 let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{return failure('Unavailable','WebGL is unavailable');}
 configurePresentationRenderer(renderer,null);const camera=new THREE.PerspectiveCamera(options.fovDegrees,1,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);host.appendChild(renderer.domElement);
 let observer:ResizeObserver|undefined,disposed=false,zoom=options.zoom;
 const clock={now:()=>performance.now(),request:(cb:(time:number)=>void)=>requestAnimationFrame(cb),cancel:(id:number)=>cancelAnimationFrame(id),isHidden:()=>document.hidden,onVisibility:(cb:()=>void)=>{document.addEventListener('visibilitychange',cb);return()=>document.removeEventListener('visibilitychange',cb)},setTimer:(cb:()=>void,delay:number)=>window.setTimeout(cb,delay),clearTimer:(id:number)=>window.clearTimeout(id)};
 let engine:ReturnType<typeof createStageForTest>;
 const onLost=(event:Event)=>{event.preventDefault();engine.contextLost()};
 const onBlur=()=>engine.suspendInput(),onFocus=()=>engine.resumeInput();
 const onWheel=(event:WheelEvent)=>{event.preventDefault();engine.interact();const next=Math.max(.8,Math.min(2,zoom*Math.exp(Math.max(-1000,Math.min(1000,event.deltaY))*.001)));const result=engine.setZoom(next);if(result.ok)zoom=next;else options.onError?.(result.error);};
 const backend={render(scene:THREE.Scene){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);renderer.render(scene,camera)},setView(view:Readonly<{aspect:number;distance:number;far:number;exposure:number;toneMapping?:'neutral'|'softShoulder'}>){camera.aspect=view.aspect;camera.position.set(0,0,view.distance);camera.lookAt(0,0,0);camera.far=view.far;camera.updateProjectionMatrix();renderer.toneMapping=view.toneMapping==='softShoulder'?THREE.CustomToneMapping:THREE.NeutralToneMapping;renderer.toneMappingExposure=view.exposure;},dispose(){observer?.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);renderer.domElement.removeEventListener('wheel',onWheel);window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onFocus);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}};
 try{engine=createStageForTest(options,clock,backend);}catch{renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();return failure('InvalidView','Invalid stage options');}
 const init=[()=>engine.setCasterEnvelope(options.casterEnvelope),()=>engine.setZoom(options.zoom),()=>engine.setViewPolicy(options.viewPolicy),()=>options.lighting?engine.setLighting(options.lighting):({ok:true,value:undefined} as const),()=>engine.attachInput(renderer.domElement)];
 for(const setup of init){const result=setup();if(!result.ok){engine.dispose();return result;}}
 renderer.domElement.addEventListener('webglcontextlost',onLost);renderer.domElement.addEventListener('wheel',onWheel,{passive:false});window.addEventListener('blur',onBlur);window.addEventListener('focus',onFocus);
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const result=engine.resize(w/h);if(!result.ok)options.onError?.(result.error);};
 if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(host);}resize();
 const api:CubeStage={addCube:p=>engine.addCube(p),setViewPolicy:p=>engine.setViewPolicy(p),setCasterEnvelope:e=>engine.setCasterEnvelope(e),setZoom(value){const r=engine.setZoom(value);if(r.ok)zoom=value;return r;},setLighting:l=>engine.setLighting(l),setRotationMode:m=>engine.setRotationMode(m),setReducedMotion:r=>engine.setReducedMotion(r),resetDisplayOrientation:()=>engine.resetDisplayOrientation(),interact:()=>engine.interact(),registerInteractionSurface:e=>engine.registerInteractionSurface(e),invalidate:()=>engine.invalidate(),dispose(){if(disposed)return;disposed=true;engine.dispose();}};
 return {ok:true,value:api};
}
