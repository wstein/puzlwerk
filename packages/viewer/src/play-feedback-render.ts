// SPDX-License-Identifier: AGPL-3.0-or-later
import {BufferGeometry,EdgesGeometry,LineBasicMaterial,LineSegments,Mesh,type Object3D} from 'three';
/** Transient outlines own their geometry/material; they never alter the source mesh. */
export function createPlayFeedback(invalidate:()=>void){
 const lines:LineSegments[]=[];let disposed=false;
 const clear=()=>{for(const line of lines){line.removeFromParent();line.geometry.dispose();(line.material as LineBasicMaterial).dispose()}lines.length=0;invalidate()};
 const add=(mesh:Mesh,materialIndex?:number)=>{
  const source=mesh.geometry;if(!source?.getAttribute('position'))return;let part:BufferGeometry|undefined;
  if(materialIndex!==undefined){const groups=source.groups.filter(g=>g.materialIndex===materialIndex);if(!groups.length)return;const index=source.index;if(!index)return;part=new BufferGeometry();part.setAttribute('position',source.getAttribute('position'));const indices:number[]=[];for(const g of groups)for(let i=g.start;i<g.start+g.count;i++)indices.push(index.getX(i));part.setIndex(indices)}
  const geometry=new EdgesGeometry(part??source,15);part?.dispose();const mat=Array.isArray(mesh.material)?mesh.material[materialIndex??0]:mesh.material;const color=(mat as {color?:{getHex():number}})?.color?.getHex()??0xffffff;const r=(color>>16)&255,g=(color>>8)&255,b=color&255;const luminance=.2126*r+.7152*g+.0722*b;
  const material=new LineBasicMaterial({color:luminance>140?0x101010:0xffffff,depthTest:true,depthWrite:false});const line=new LineSegments(geometry,material);line.name='play-feedback-outline';line.raycast=()=>{};line.castShadow=false;line.receiveShadow=false;line.renderOrder=1;mesh.add(line);lines.push(line);
 };
 return {showFace(mesh:Mesh,materialIndex?:number){if(disposed)return;clear();add(mesh,materialIndex);invalidate()},showLayer(parent:Object3D,pieceIds:readonly string[]){if(disposed)return;clear();const wanted=new Set(pieceIds);parent.traverse(object=>{if(!wanted.has(object.name))return;object.traverse(node=>{if(!(node instanceof Mesh)||!node.visible)return;if(typeof node.userData.stickerId==='string'){add(node);return}if(Array.isArray(node.material)&&Array.isArray(node.userData.sourceFaceStickerIds))node.userData.sourceFaceStickerIds.forEach((id:unknown,i:number)=>{if(typeof id==='string')add(node,i)})})});invalidate()},clear,dispose(){if(disposed)return;clear();disposed=true}};
}
