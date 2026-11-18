// SPDX-License-Identifier: AGPL-3.0-or-later
// Presentation informed by CubeLab cube-gl.ts (b2dfee380bc5060da036940addf07c8d8aa8bbe7)
// and CubeAssembler axisGizmo.tsx / web/cube3d.css (91fc2144cbcf2734f84ee3a93c70b8ed503a5151).
import * as THREE from 'three';
import {fail,ok,type Result} from './contract.js';
type Quaternion=readonly [number,number,number,number];
export type OrientationIndicatorInput=Readonly<{physicalOrientation:Quaternion;solverFrame:Quaternion;presentationOrientation:Quaternion;colors:Readonly<{x:number;y:number;z:number}>}>;
export type OrientationIndicatorOptions=Readonly<{anchor?:readonly [number,number];scale?:number;invalidate?:()=>void}>;
const identity:Quaternion=[0,0,0,1];
const defaults:OrientationIndicatorInput={physicalOrientation:identity,solverFrame:identity,presentationOrientation:identity,colors:{x:0xd9493f,y:0xf4f4f4,z:0x4caf67}};
const ns='http://www.w3.org/2000/svg';
/** Scene-local display × physical × solver rotations; the overlay is informational. */
export function createOrientationIndicator(host:HTMLElement,options:OrientationIndicatorOptions={}){
 const {scale=.38,invalidate=()=>{}}=options,rawAnchor=options.anchor;
 if(!host?.ownerDocument||!Number.isFinite(scale)||scale<=0||(rawAnchor!==undefined&&(!rawAnchor||rawAnchor.length!==2||!Array.from(rawAnchor).every(v=>Number.isFinite(v)&&v>=0&&v<=1))))throw Error('Invalid indicator options');
 const anchor=rawAnchor&&[...rawAnchor],size=64*scale/.38,doc=host.ownerDocument;
 const element=(tag:string)=>doc.createElementNS(ns,tag);
 const svg=element('svg');svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('role','img');svg.setAttribute('aria-label','Cube orientation axes X, Y and Z');
 Object.assign(svg.style,{position:'absolute',width:`${size}px`,height:`${size}px`,maxWidth:'calc(100% - 16px)',maxHeight:'calc(100% - 16px)',pointerEvents:'none',overflow:'hidden',...(anchor?{left:`calc(${anchor[0]*100}% - ${size/2}px)`,top:`calc(${anchor[1]*100}% - ${size/2}px)`}:{right:'8px',bottom:'8px'})});
 const axes=([['x',new THREE.Vector3(1,0,0)],['y',new THREE.Vector3(0,1,0)],['z',new THREE.Vector3(0,0,1)]] as const).map(([name,direction])=>{
  const group=element('g');group.setAttribute('data-axis',name);
  const outline=element('line'),line=element('line'),tip=element('polygon'),text=element('text');
  for(const l of [outline,line]){l.setAttribute('x1','0');l.setAttribute('y1','0');l.setAttribute('y2','0');l.setAttribute('stroke-linecap','round');}
  outline.setAttribute('stroke','#10192c');outline.setAttribute('stroke-width','4.8');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','2.2');
  tip.setAttribute('fill','currentColor');tip.setAttribute('stroke','#10192c');tip.setAttribute('stroke-width','.8');
  text.textContent=name.toUpperCase();text.setAttribute('fill','currentColor');text.setAttribute('stroke','#10192c');text.setAttribute('stroke-width','2');text.setAttribute('paint-order','stroke');text.setAttribute('font-family','sans-serif');text.setAttribute('font-weight','700');text.setAttribute('font-size','10');text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');
  group.append(outline,line,tip,text);return {name,direction,group,outline,line,tip,text};
 });
 let disposed=false,current:OrientationIndicatorInput=defaults;
 const update=(input:OrientationIndicatorInput)=>{if(disposed)return;const qs=[input?.presentationOrientation,input?.physicalOrientation,input?.solverFrame];if(qs.some(q=>!q||q.length!==4||!Array.from(q).every(Number.isFinite)||Math.abs(Math.hypot(...q)-1)>1e-6)||!input?.colors||[input.colors.x,input.colors.y,input.colors.z].some(c=>!Number.isInteger(c)||c<0||c>0xffffff))throw Error('Invalid indicator input');
  current={presentationOrientation:[...input.presentationOrientation],physicalOrientation:[...input.physicalOrientation],solverFrame:[...input.solverFrame],colors:{...input.colors}};
  const rotation=new THREE.Quaternion(...qs[0]).multiply(new THREE.Quaternion(...qs[1])).multiply(new THREE.Quaternion(...qs[2]));
  const ordered=axes.map(axis=>{const vector=axis.direction.clone().applyQuaternion(rotation),length=Math.hypot(vector.x,vector.y),angle=length<1e-9?0:Math.atan2(-vector.y,vector.x)*180/Math.PI,endpoint=21*length;return {...axis,depth:vector.z,angle,endpoint};}).sort((a,b)=>a.depth-b.depth);
  for(const a of ordered){const {group,outline,line,tip,text}=a;group.setAttribute('transform',`translate(32 32) rotate(${a.angle})`);group.setAttribute('opacity',a.depth<0?'0.45':'1');group.setAttribute('color',`#${input.colors[a.name].toString(16).padStart(6,'0')}`);outline.setAttribute('x2',String(a.endpoint));line.setAttribute('x2',String(a.endpoint));tip.setAttribute('points',`${a.endpoint+1},0 ${a.endpoint-5},-3 ${a.endpoint-5},3`);text.setAttribute('x',String(Math.min(27,a.endpoint+7)));text.setAttribute('y','0');text.setAttribute('transform',`rotate(${-a.angle} ${Math.min(27,a.endpoint+7)} 0)`);svg.append(group);}
  invalidate();
 };
 const resize=(viewport:Readonly<{width:number;height:number}>)=>{if(disposed)return;if(!viewport||![viewport.width,viewport.height].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid viewport');invalidate();};
 update(defaults);host.append(svg);
 return {update,resize,reset(){update({...current,presentationOrientation:identity});},dispose(){if(disposed)return;disposed=true;svg.remove();invalidate();}};
}

/** X, Y and Z colors of the indicator from a color frame in U, R, F, D, L, B order (`Player.colorFrame()`): X is the R entry, Y the U entry, Z the F entry. */
export function indicatorColorsFromFrame(frame:readonly string[]):Result<{x:number;y:number;z:number}>{
 if(!Array.isArray(frame)||frame.length!==6||!Array.from(frame).every(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)))return fail('InvalidProjection','Invalid color frame');
 const number=(c:string)=>parseInt(c.slice(1),16);
 return ok({x:number(frame[1]),y:number(frame[0]),z:number(frame[2])});
}
