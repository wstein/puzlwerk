// SPDX-License-Identifier: AGPL-3.0-or-later
import {Quaternion,Vector3} from 'three';
import {fail,ok} from './contract.js';
import type {CubeProjection,Result,Vec3,PieceGeometry} from './contract.js';
import type {PhysicalBodyPose,PhysicalStickerFrame} from './physical-scene.js';
import {layerCenters} from './layer-widths.js';

/** Translate canonical presentation data into native render frames, never puzzle state. */
export function nativeFrames(projection:CubeProjection):Result<{frames:PhysicalStickerFrame[];bodies:PhysicalBodyPose[];stickerSize:readonly [number,number]|undefined;stickerOffset:number|undefined;stickerRadius:number|undefined;bodyGeometry:ReadonlyMap<string,PieceGeometry>;layerWidths:readonly number[]|undefined}> {
 if(projection.renderProfile) return fail('Unavailable','Independent mesh profiles require a shared native capability');
 const widths=projection.picture?.widths;
 const centers=widths ? layerCenters(widths) : undefined;
 if(centers){
  const occupied=new Set<string>();
  for(const piece of projection.pieces){const indices=piece.transform.position.map(value=>centers.findIndex(center=>Math.abs(center-value)<1e-8));if(indices.some(index=>index<0))return fail('Unavailable','Body position does not match the native layer grid');occupied.add(indices.join(','));}
  if(projection.pieces.length!==occupied.size || [0,1,2].some(axis=>centers.some((_,index)=>![...occupied].some(key=>Number(key.split(',')[axis])===index))))return fail('Unavailable','Unequal picture layers require unique coordinates and all layer axes');
 }
 const frames:PhysicalStickerFrame[]=[],bodies:PhysicalBodyPose[]=[],bodyGeometry=new Map<string,PieceGeometry>();
 let size:readonly [number,number]|undefined,offset:number|undefined,radius:number|undefined; let explicitGeometry:boolean|undefined;
 for(const piece of projection.pieces){
  if(piece.geometry)bodyGeometry.set(piece.id,piece.geometry);
  let position=piece.transform.position;
  if(centers){const indices=position.map(value=>centers.findIndex(center=>Math.abs(center-value)<1e-8));if(indices.some(index=>index<0))return fail('Unavailable','Body position does not match the native layer grid');position=indices.map(index=>index-(centers.length-1)/2) as unknown as Vec3;}
  bodies.push({id:piece.id,position,rotation:piece.transform.rotation});
  if(!piece.stickers.length)continue;
  for(const sticker of piece.stickers){
   const explicit=sticker.geometry!==undefined;
   if(explicitGeometry!==undefined && explicitGeometry!==explicit)return fail('Unavailable','Mixed sticker geometry requires a shared native capability');
   explicitGeometry=explicit;
   if(sticker.geometry){
    radius=sticker.geometry.cornerRadius;
   }
   const local=new Quaternion(...sticker.transform.rotation), normal=new Vector3(0,0,1).applyQuaternion(local), up=new Vector3(0,1,0).applyQuaternion(local);
   const axial=(v:Vector3)=>[v.x,v.y,v.z].filter(x=>Math.abs(x)>1e-8).length===1 && Math.abs(v.length()-1)<1e-8;
   if(!axial(normal)||!axial(up))return fail('Unavailable','Sticker orientation requires a native frame');
   const pos=new Vector3(...sticker.transform.position),depth=pos.dot(normal);
   if(pos.clone().addScaledVector(normal,-depth).length()>1e-8 || depth<=0)return fail('Unavailable','Independent sticker transform requires a shared native capability');
   if(!sticker.geometry && size && (Math.abs(size[0]-sticker.size[0])>1e-8||Math.abs(size[1]-sticker.size[1])>1e-8))return fail('Unavailable','Independent sticker dimensions require a shared native capability');
   if(!sticker.geometry && offset!==undefined && Math.abs(offset-depth)>1e-8)return fail('Unavailable','Independent sticker offsets require a shared native capability');
   size=sticker.geometry?.referenceSize ?? sticker.size;offset=depth;
   // The native face index requires exact axes; only already-validated cardinal frames enter here.
   const exact=(v:Vector3)=>v.toArray().map(x=>Math.abs(x)<1e-8?0:Math.sign(x)) as unknown as Vec3;
   const n=exact(normal),u=exact(up);
   frames.push({id:sticker.id,cubie:piece.id,p:position,n,up:u,...(sticker.picture?{pictureIndex:sticker.picture.layerIndex}:{}),...(sticker.geometry?{offset:depth,scale:[sticker.size[0]/sticker.geometry.referenceSize[0],sticker.size[1]/sticker.geometry.referenceSize[1]] as const}:{})});
  }
 }
 return ok({frames,bodies,stickerSize:size,stickerOffset:offset,stickerRadius:radius,bodyGeometry,layerWidths:widths});
}
