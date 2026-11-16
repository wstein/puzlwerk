// SPDX-License-Identifier: AGPL-3.0-or-later
// Adapted from Cubistry names-exposure.ts; see NOTICE.
import {Quaternion,Vector3} from 'three';
import type {Vec3,Quaternion as Rotation} from './contract.js';
export type ExposureLights = Readonly<{ambient:number; hemispheres:readonly Readonly<{up:Vec3;sky:number;ground:number}>[]; directionals:readonly Readonly<{to:Vec3;amount:number}>[]}>;
const AXES = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]] as const;
/** Source weighted-face exposure from caller-provided numeric effective-light data. */
export function weightedFaceExposure(lights:ExposureLights,orientation:Rotation,cameraPosition:Vec3):number {
 const rotation=new Quaternion(...orientation),toCamera=new Vector3(...cameraPosition).normalize();
 let weights=0,weighted=0;
 for(const [x,y,z] of AXES){
  const normal=new Vector3(x,y,z).applyQuaternion(rotation),weight=Math.max(0,normal.dot(toCamera)) ** 8;
  if(weight<=0)continue;
  let irradiance=lights.ambient;
  for(const h of lights.hemispheres){const w=.5+.5*normal.dot(new Vector3(...h.up));irradiance+=w*h.sky+(1-w)*h.ground;}
  for(const d of lights.directionals)irradiance+=d.amount*Math.max(0,normal.dot(new Vector3(...d.to)));
  weights+=weight;weighted+=weight*irradiance;
 }
 const mean=weights>0?weighted/weights:0;return mean>1e-6?Math.PI/mean:1;
}
