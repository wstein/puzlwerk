// SPDX-License-Identifier: AGPL-3.0-or-later
import {BufferGeometry,EdgesGeometry,Mesh,type Object3D} from 'three';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
/** Transient outlines own their geometry/material; they never alter the source mesh. */
export function createPlayFeedback(invalidate:()=>void){
 const lines:LineSegments2[]=[];let disposed=false;
 const clear=()=>{for(const line of lines){line.removeFromParent();line.geometry.dispose();line.material.dispose();for(const child of line.children)(child as LineSegments2).material.dispose()}lines.length=0;invalidate()};
 const add=(mesh:Mesh,materialIndex?:number)=>{
  const source=mesh.geometry;if(!source?.getAttribute('position'))return;let part:BufferGeometry|undefined;
  if(materialIndex!==undefined){const groups=source.groups.filter(g=>g.materialIndex===materialIndex);if(!groups.length)return;const index=source.index;part=new BufferGeometry();part.setAttribute('position',source.getAttribute('position'));const indices:number[]=[];for(const g of groups)for(let i=g.start;i<g.start+g.count;i++)indices.push(index ? index.getX(i) : i);part.setIndex(indices)}
  const edges=new EdgesGeometry(part??source,15);part?.dispose();const geometry=new LineSegmentsGeometry().fromEdgesGeometry(edges);edges.dispose();
  // Two thin screen-space strokes keep both light and dark artwork readable.
  // Polygon offset applies only to these overlay triangles; normal depth testing remains enabled.
  const make=(color:number,width:number)=>new LineMaterial({color,linewidth:width,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const line=new LineSegments2(geometry,make(0x101010,3)),inner=new LineSegments2(geometry,make(0xffffff,1));line.name='play-feedback-outline';line.raycast=()=>{};inner.raycast=()=>{};line.castShadow=inner.castShadow=false;line.receiveShadow=inner.receiveShadow=false;line.renderOrder=1;inner.renderOrder=2;line.add(inner);mesh.add(line);lines.push(line);
 };
 return {showFace(mesh:Mesh,materialIndex?:number){if(disposed)return;clear();add(mesh,materialIndex);invalidate()},showLayer(parent:Object3D,pieceIds:readonly string[]){if(disposed)return;clear();const wanted=new Set(pieceIds);parent.traverse(object=>{if(!wanted.has(object.name))return;object.traverse(node=>{if(!(node instanceof Mesh)||!node.visible)return;if(typeof node.userData.stickerId==='string'){add(node);return}if(Array.isArray(node.material)&&Array.isArray(node.userData.sourceFaceStickerIds))node.userData.sourceFaceStickerIds.forEach((id:unknown,i:number)=>{if(typeof id==='string')add(node,i)})})});invalidate()},clear,dispose(){if(disposed)return;clear();disposed=true}};
}
