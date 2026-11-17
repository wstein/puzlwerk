// SPDX-License-Identifier: AGPL-3.0-or-later
import {Box3,Matrix3,Mesh,Quaternion,Raycaster,Vector2,Vector3,type Object3D,type PerspectiveCamera} from 'three';
import type {AxisScreen,Face,Hit} from './play-gesture-map.js';
type Viewport={left:number;top:number;width:number;height:number};
export function pickPlayFace(parent:Object3D,camera:PerspectiveCamera,rect:Viewport,x:number,y:number,halfExtent:number,allowBody=false):{hit:Hit;axes:AxisScreen;stickerId:string;surface:Mesh;materialIndex?:number}|undefined {
 if(![rect.left,rect.top,rect.width,rect.height,x,y,halfExtent].every(Number.isFinite)||rect.width<=0||rect.height<=0||halfExtent<=0)return;
 parent.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);const ray=new Raycaster();ray.setFromCamera(new Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
 for(const match of ray.intersectObject(parent,true)){
  let visible=true;for(let o:Object3D|null=match.object;o;o=o.parent){if(!o.visible){visible=false;break}if(o===parent)break}if(!visible||!match.face)continue;
  if(!(match.object instanceof Mesh))continue;const ids=(allowBody||Array.isArray(match.object.material))?match.object.userData.sourceFaceStickerIds as unknown:undefined,faceIndex=match.face.materialIndex,stickerId=match.object.userData.stickerId ?? (Array.isArray(ids)?ids[faceIndex]:undefined);if(typeof stickerId!=='string')continue;
  const normal=match.face.normal.clone().applyMatrix3(new Matrix3().getNormalMatrix(match.object.matrixWorld)).normalize().applyQuaternion(parent.getWorldQuaternion(new Quaternion()).invert()),values=normal.toArray(),axis=values.reduce((best,v,i)=>Math.abs(v)>Math.abs(values[best])?i:best,0),sign=values[axis]>=0?1:-1,faces:Face[][]=[['L','R'],['D','U'],['B','F']];
  const local=parent.worldToLocal(match.point.clone()).divideScalar(halfExtent).toArray() as [number,number,number];local[axis]=sign;
  const screen=(point:Vector3)=>{const v=parent.localToWorld(point).project(camera);return [v.x*rect.width/2,-v.y*rect.height/2] as const},origin=screen(new Vector3());
  const axisScreen=(v:Vector3)=>{const p=screen(v);return [p[0]-origin[0],p[1]-origin[1]] as const};
  return {hit:{face:faces[axis][sign>0?1:0],point:local},axes:{x:axisScreen(new Vector3(1,0,0)),y:axisScreen(new Vector3(0,1,0)),z:axisScreen(new Vector3(0,0,1))},stickerId,surface:match.object,...(Array.isArray(ids)?{materialIndex:faceIndex}: {})};
 }
}
/** Surface hit for a two-finger midpoint, including seams between cubies. */
export function pickPlayCube(parent:Object3D,camera:PerspectiveCamera,rect:Viewport,x:number,y:number,halfExtent:number):{hit:Hit;axes:AxisScreen}|undefined {
 if(![rect.left,rect.top,rect.width,rect.height,x,y,halfExtent].every(Number.isFinite)||rect.width<=0||rect.height<=0||halfExtent<=0)return;
 parent.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);const ray=new Raycaster();ray.setFromCamera(new Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
 const localRay=ray.ray.clone().applyMatrix4(parent.matrixWorld.clone().invert()),p=localRay.intersectBox(new Box3(new Vector3(-halfExtent,-halfExtent,-halfExtent),new Vector3(halfExtent,halfExtent,halfExtent)),new Vector3());if(!p)return;
 const values=p.toArray(),axis=values.reduce((best,v,i)=>Math.abs(v)>Math.abs(values[best])?i:best,0),sign=values[axis]>=0?1:-1,faces:Face[][]=[['L','R'],['D','U'],['B','F']],local=values.map(v=>v/halfExtent) as [number,number,number];local[axis]=sign;
 const screen=(point:Vector3)=>{const v=parent.localToWorld(point).project(camera);return [v.x*rect.width/2,-v.y*rect.height/2] as const},origin=screen(new Vector3());const axisScreen=(v:Vector3)=>{const p=screen(v);return [p[0]-origin[0],p[1]-origin[1]] as const};
 return {hit:{face:faces[axis][sign>0?1:0],point:local},axes:{x:axisScreen(new Vector3(1,0,0)),y:axisScreen(new Vector3(0,1,0)),z:axisScreen(new Vector3(0,0,1))}};
}
