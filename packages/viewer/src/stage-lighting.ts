// SPDX-License-Identifier: AGPL-3.0-or-later
// Light luminance and directional snapshots adapt Cubistry names-exposure.ts; see NOTICE.
import * as THREE from 'three';
import type {Vec3} from './contract.js';
export type DirectionalData=Readonly<{color:string;intensity:number;visible:boolean;position:Vec3;target:Vec3}>;
export type LightSnapshot=Readonly<{ambient:number;hemispheres:readonly Readonly<{up:Vec3;sky:number;ground:number}>[];directionals:readonly Readonly<{to:Vec3;amount:number}>[]}>;
export type ExposureSnapshot=Readonly<{lights:LightSnapshot;orientation:readonly [number,number,number,number];cameraPosition:Vec3;shadowMapEnabled:boolean}>;
export type ExposurePolicy=(snapshot:ExposureSnapshot)=>number;
export type StageLighting=Readonly<{ambient:Readonly<{color:string;intensity:number;visible:boolean}>;hemisphere:Readonly<{sky:string;ground:string;intensity:number;visible:boolean;position:Vec3}>;key:DirectionalData;fill:DirectionalData;rim:DirectionalData;shadowFill:DirectionalData;extraDirectionals:readonly DirectionalData[];keyShadowStrength:number;shadowFillStrength:number;floorOpacity:number;contactShadow:boolean;fineShadowEdges:boolean;colorTemperature:boolean;toneMapping:'neutral'|'softShoulder';exposure:number|ExposurePolicy}>;
const hex=(s:unknown):s is string=>typeof s==='string' && /^#[0-9a-f]{6}$/i.test(s);
const vec=(v:unknown):v is Vec3=>Array.isArray(v)&&v.length===3&&Array.from(v).every(n=>typeof n==='number'&&Number.isFinite(n));
const level=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
const unit=(v:unknown):v is number=>level(v)&&v<=1;
const light=(d:DirectionalData)=>d&&hex(d.color)&&level(d.intensity)&&typeof d.visible==='boolean'&&vec(d.position)&&vec(d.target)&&new THREE.Vector3(...d.position).distanceTo(new THREE.Vector3(...d.target))>0;
export function copyLighting(v:StageLighting):StageLighting {
 if(!v||!v.ambient||!hex(v.ambient.color)||!level(v.ambient.intensity)||typeof v.ambient.visible!=='boolean'||!v.hemisphere||!hex(v.hemisphere.sky)||!hex(v.hemisphere.ground)||!level(v.hemisphere.intensity)||typeof v.hemisphere.visible!=='boolean'||!vec(v.hemisphere.position)||!light(v.key)||!light(v.fill)||!light(v.rim)||!light(v.shadowFill)||!Array.isArray(v.extraDirectionals)||!Array.from(v.extraDirectionals).every(light)||![v.keyShadowStrength,v.shadowFillStrength,v.floorOpacity].every(unit)||![v.contactShadow,v.fineShadowEdges,v.colorTemperature].every(x=>typeof x==='boolean')||!['neutral','softShoulder'].includes(v.toneMapping)||(typeof v.exposure!=='function'&&(!level(v.exposure)||v.exposure===0)))throw Error('Invalid lighting');
 for(const d of [v.key,v.shadowFill])if(d.position[1]-d.target[1]<=0)throw Error('Invalid shadow direction');
 const copyDir=(d:DirectionalData)=>({...d,position:[...d.position] as [number,number,number],target:[...d.target] as [number,number,number]});
 return {...v,ambient:{...v.ambient},hemisphere:{...v.hemisphere,position:[...v.hemisphere.position] as [number,number,number]},key:copyDir(v.key),fill:copyDir(v.fill),rim:copyDir(v.rim),shadowFill:copyDir(v.shadowFill),extraDirectionals:v.extraDirectionals.map(copyDir)};
}
export function lightingSnapshot(v:StageLighting):LightSnapshot {
 const luma=(s:string)=>{const c=new THREE.Color(s);return .2126*c.r+.7152*c.g+.0722*c.b};
 const vecFreeze=(v:THREE.Vector3)=>Object.freeze(v.toArray()) as unknown as Vec3;
 const hemi=v.hemisphere.visible?[Object.freeze({up:vecFreeze(new THREE.Vector3(...v.hemisphere.position).normalize()),sky:v.hemisphere.intensity*luma(v.hemisphere.sky),ground:v.hemisphere.intensity*luma(v.hemisphere.ground)})]:[];
 const dirs=[v.key,v.fill,v.rim,v.shadowFill,...v.extraDirectionals].map((d,i)=>({d,color:v.colorTemperature?(i===0?'#fff3e3':i===1||i===3?'#eaf1ff':d.color):d.color})).filter(({d})=>d.visible).map(({d,color})=>Object.freeze({to:vecFreeze(new THREE.Vector3(...d.position).sub(new THREE.Vector3(...d.target)).normalize()),amount:d.intensity*luma(color)}));
 return Object.freeze({ambient:v.ambient.visible?v.ambient.intensity*luma(v.ambient.color):0,hemispheres:Object.freeze(hemi),directionals:Object.freeze(dirs)});
}
