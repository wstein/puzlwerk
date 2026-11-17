// SPDX-License-Identifier: AGPL-3.0-or-later
// Geometry adapted from Regrip orientationIndicator.ts, revision ebe7d32d0fd1f0b74c528cd38618afda3f5a991e.
// MIT License: Copyright (c) Andy Fedotov, https://github.com/afedotov
// Copyright (c) 2026 Werner Stein, https://github.com/wstein
// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following
// conditions: The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS",
// WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
// WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import * as THREE from 'three';
type Quaternion = readonly [number,number,number,number];
export type OrientationIndicatorInput=Readonly<{physicalOrientation:Quaternion;solverFrame:Quaternion;presentationOrientation:Quaternion;colors:Readonly<{x:number;y:number;z:number}>}>;
export type OrientationIndicatorOptions=Readonly<{anchor:readonly [number,number];scale?:number;invalidate?:()=>void}>;
const identity:Quaternion=[0,0,0,1];
const defaults:OrientationIndicatorInput={physicalOrientation:identity,solverFrame:identity,presentationOrientation:identity,colors:{x:0xd9493f,y:0xf4f4f4,z:0x4caf67}};
/** Scene-local rotations: display × physical cube × virtual frame. Scene transforms apply once as parent transforms. Anchor uses top-left normalized viewport coordinates. Reset restores display identity while retaining physical and frame inputs. */
export function createOrientationIndicator(scene:THREE.Scene,camera:THREE.PerspectiveCamera,options:OrientationIndicatorOptions){
 const {scale=.38,invalidate=()=>{}}=options;const rawAnchor=options.anchor;
 if(!rawAnchor || rawAnchor.length!==2 || !Array.from(rawAnchor).every(v=>Number.isFinite(v)&&v>=0&&v<=1)||!Number.isFinite(scale)||scale<=0)throw Error('Invalid indicator options');
 const anchor=[...rawAnchor] as [number,number];
 const group=new THREE.Group();group.name='orientation-indicator';group.scale.setScalar(scale);scene.add(group);
 const materials:THREE.MeshBasicMaterial[]=[];const geometries:THREE.BufferGeometry[]=[];const labels:Partial<Record<'x'|'y'|'z',THREE.Sprite>>={};
 const axes=[['x',new THREE.Vector3(1,0,0)],['y',new THREE.Vector3(0,1,0)],['z',new THREE.Vector3(0,0,1)]] as const;
 for(const [index,[name,direction]] of axes.entries()){
  const arrow=new THREE.Group();arrow.name=`orientation-axis-${name}`;
  const material=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false});materials.push(material);
  const shaftGeometry=new THREE.CylinderGeometry(.032,.032,.62,10),tipGeometry=new THREE.ConeGeometry(.1,.2,10);geometries.push(shaftGeometry,tipGeometry);
  const shaft=new THREE.Mesh(shaftGeometry,material),tip=new THREE.Mesh(tipGeometry,material),rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  shaft.quaternion.copy(rotation);tip.quaternion.copy(rotation);shaft.position.copy(direction).multiplyScalar(.31);tip.position.copy(direction).multiplyScalar(.69);shaft.renderOrder=1000;tip.renderOrder=1000;arrow.add(shaft,tip);group.add(arrow);
  if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');if(ctx){ctx.strokeStyle='#10192c';ctx.lineWidth=8;ctx.fillStyle='#ffffff';ctx.font='bold 54px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeText(name.toUpperCase(),48,50);ctx.fillText(name.toUpperCase(),48,50);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:false,depthWrite:false}));sprite.name=`orientation-label-${name}`;const offsets=[new THREE.Vector3(0,.13,-.1),new THREE.Vector3(.13,0,-.1),new THREE.Vector3(-.2,.14,0)];sprite.position.copy(direction).multiplyScalar(.98).add(offsets[index]);sprite.scale.setScalar(.34);sprite.renderOrder=1001;labels[name]=sprite;group.add(sprite);}}
 }
 let disposed=false;let current:OrientationIndicatorInput=defaults;
 const place=()=>{camera.updateMatrixWorld();const position=new THREE.Vector3(anchor[0]*2-1,1-anchor[1]*2,.5).unproject(camera);const origin=camera.getWorldPosition(new THREE.Vector3());position.sub(origin).normalize().multiplyScalar(3).add(origin);scene.updateMatrixWorld();scene.worldToLocal(position);group.position.copy(position);};
 const update=(input:OrientationIndicatorInput)=>{if(disposed)return;const qs=[input.presentationOrientation,input.physicalOrientation,input.solverFrame];if(qs.some(q=>!q||q.length!==4||!Array.from(q).every(Number.isFinite)||Math.abs(Math.hypot(...q)-1)>1e-6)||!input.colors||[input.colors.x,input.colors.y,input.colors.z].some(c=>!Number.isInteger(c)||c<0||c>0xffffff))throw Error('Invalid indicator input');current={presentationOrientation:[...input.presentationOrientation],physicalOrientation:[...input.physicalOrientation],solverFrame:[...input.solverFrame],colors:{...input.colors}};group.quaternion.set(...qs[0]).multiply(new THREE.Quaternion(...qs[1])).multiply(new THREE.Quaternion(...qs[2]));axes.forEach(([name],i)=>(materials[i].color.setHex(input.colors[name]),labels[name]?.material.color.setHex(input.colors[name])));place();invalidate();};
 const resize=(viewport:Readonly<{width:number;height:number}>)=>{if(disposed)return;if(!viewport||![viewport.width,viewport.height].every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid viewport');place();invalidate();};
 update(defaults);
 return {update,resize,reset(){update({...current,presentationOrientation:identity});},dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());Object.values(labels).forEach(l=>{l.material.map?.dispose();l.material.dispose();});invalidate();}};
}
