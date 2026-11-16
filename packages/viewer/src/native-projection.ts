// SPDX-License-Identifier: AGPL-3.0-or-later
import {Quaternion,Vector3} from 'three';
import {fail,ok} from './contract.js';
import type {CubeProjection,Result,Vec3} from './contract.js';
import type {PhysicalBodyPose,PhysicalStickerFrame} from './physical-scene.js';

/** Translate canonical presentation data into native render frames, never puzzle state. */
export function nativeFrames(projection:CubeProjection):Result<{frames:PhysicalStickerFrame[];bodies:PhysicalBodyPose[]}> {
 if(projection.renderProfile || projection.geometryProfile) return fail('Unavailable','Independent mesh and body profiles require a shared native capability');
 const frames:PhysicalStickerFrame[]=[],bodies:PhysicalBodyPose[]=[];
 let size:readonly [number,number]|undefined,offset:number|undefined;
 for(const piece of projection.pieces){
  if(piece.geometry)return fail('Unavailable','Independent piece geometry requires a shared native capability');
  bodies.push({id:piece.id,position:piece.transform.position,rotation:piece.transform.rotation});
  if(!piece.stickers.length)continue;
  for(const sticker of piece.stickers){
   if(sticker.geometry)return fail('Unavailable','Independent sticker geometry requires a shared native capability');
   const local=new Quaternion(...sticker.transform.rotation), normal=new Vector3(0,0,1).applyQuaternion(local), up=new Vector3(0,1,0).applyQuaternion(local);
   const axial=(v:Vector3)=>[v.x,v.y,v.z].filter(x=>Math.abs(x)>1e-8).length===1 && Math.abs(v.length()-1)<1e-8;
   if(!axial(normal)||!axial(up))return fail('Unavailable','Sticker orientation requires a native frame');
   const pos=new Vector3(...sticker.transform.position),depth=pos.dot(normal);
   if(pos.clone().addScaledVector(normal,-depth).length()>1e-8 || depth<=0)return fail('Unavailable','Independent sticker transform requires a shared native capability');
   if(size && (Math.abs(size[0]-sticker.size[0])>1e-8||Math.abs(size[1]-sticker.size[1])>1e-8))return fail('Unavailable','Independent sticker dimensions require a shared native capability');
   if(offset!==undefined && Math.abs(offset-depth)>1e-8)return fail('Unavailable','Independent sticker offsets require a shared native capability');
   size=sticker.size;offset=depth;
   const n=normal.toArray() as unknown as Vec3,u=up.toArray() as unknown as Vec3;
   frames.push({id:sticker.id,cubie:piece.id,p:piece.transform.position,n,up:u});
  }
 }
 return ok({frames,bodies});
}
