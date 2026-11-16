// SPDX-License-Identifier: AGPL-3.0-or-later
// Body artwork and cut-face construction adapted from Cubistry physical-scene.ts; see NOTICE.
import * as THREE from 'three';
import { orientBodyArtwork, planarBodyUv, sourceFaceIndex } from './body-artwork.js';
import { cutFaceEdges, cutPatternTexture, flatCutColor, faceUvAxes, type EdgeProfile } from './cut-faces.js';
import { stickerWindow } from './projected-uv.js';
import { cross, dot, type Vec3 } from './render-math.js';
import type { CubeProjection, Piece } from './contract.js';

type Resource = {dispose():void};
export function pictureTexture(base: THREE.Texture, window: {offsetU:number;offsetV:number;scaleU:number;scaleV:number}, resources: Resource[]): THREE.Texture {
  const texture=base.clone(); texture.offset.set(window.offsetU,window.offsetV); texture.repeat.set(window.scaleU,window.scaleV);
  texture.version=Math.max(1,base.version); resources.push(texture); return texture;
}
export function sourceBody(piece: Piece, p: CubeProjection, base: THREE.BufferGeometry, plastic: THREE.MeshPhysicalMaterial,
  pictureTextures: ReadonlyMap<string,THREE.Texture>, tileTextures: ReadonlyMap<string,THREE.Texture>, resources: Resource[]): {geometry:THREE.BufferGeometry; material:THREE.Material|THREE.Material[]} {
  const annotated=piece.stickers.filter(s=>s.sourceFace);
  if (!annotated.length) {
    if (p.appearance?.construction !== 'stickerless') return {geometry:base,material:plastic};
    const material=plastic.clone(); material.color.set(p.appearance.bodyColor ?? '#3a3d42'); resources.push(material);
    return {geometry:base,material};
  }
  const frames=annotated.map(s=>({n:s.sourceFace!.normal,up:s.sourceFace!.up}));
  let geometry=orientBodyArtwork(base,frames); if (geometry!==base) resources.push(geometry);
  if (p.appearance?.construction !== 'stickerless') return {geometry,material:plastic};
  const materials: (THREE.MeshPhysicalMaterial|null)[]=Array(6).fill(null);
  const exterior: (string|null)[]=Array(6).fill(null);
  for (const sticker of annotated) {
    const index=sourceFaceIndex(sticker.sourceFace!.normal); const material=plastic.clone(); resources.push(material);
    material.color.set(sticker.color); exterior[index]=sticker.color;
    const tile=tileTextures.get(sticker.id); if (tile) material.map=tile;
    if (sticker.picture && p.picture) {
      const win=stickerWindow(p.picture.widths,.99,sticker.picture.face,sticker.picture.layerIndex);
      material.map=pictureTexture(pictureTextures.get(sticker.picture.face)!,win,resources); material.color.set('#ffffff');
    }
    materials[index]=material;
  }
  const axes=p.appearance?.miterCutFaces ? faceUvAxes(geometry) : undefined;
  for (let index=0;index<6;index++) {
    if (materials[index]) continue;
    const border=exterior.find((color,k)=>color && (k>>1)!==(index>>1)) ?? exterior.find(Boolean) ?? '#3a3d42';
    let color=p.appearance?.bodyColor ?? border, map:THREE.Texture|undefined;
    if (axes) {
      const edgeColors:(string|null)[]=Array(6).fill(null), profiles:(EdgeProfile|null)[]=Array(6).fill(null);
      const toward: [number,number,number]=[0,0,0]; toward[index>>1]=(index&1)===0?1:-1;
      for (const sticker of annotated) {
        const f=sticker.sourceFace!, k=sourceFaceIndex(f.normal), right=cross(f.up,f.normal), d=(v:Vec3)=>dot(v,toward);
        const edge=d(f.up)===1?'top':d(f.up)===-1?'bottom':d(right)===1?'right':d(right)===-1?'left':null;
        const spec=edge ? f.edgeColors?.[edge] : undefined;
        edgeColors[k]=typeof spec==='string'?spec:Array.isArray(spec)?spec[0].color:sticker.color;
        if (Array.isArray(spec)) profiles[k]={stops:spec,dir:edge==='left'||edge==='right'?f.up:right};
      }
      const edges=cutFaceEdges(index,edgeColors,axes,profiles), flat=flatCutColor(edges);
      if (edges.length) { color=flat ?? '#ffffff'; if (flat===null) {map=cutPatternTexture(edges);resources.push(map);} }
    }
    const material=plastic.clone();material.color.set(color);material.map=map??null;resources.push(material);materials[index]=material;
  }
  if (p.appearance?.planarFaceUv || p.picture) {
    const groups=p.picture?new Set(annotated.filter(s=>s.picture).map(s=>sourceFaceIndex(s.sourceFace!.normal))):new Set([0,1,2,3,4,5]);
    const cell=piece.geometry?.cellSize ?? [1,1,1]; const extent=cell.map(c=>c*.99) as [number,number,number];
    const planar=planarBodyUv(geometry,extent,groups);resources.push(planar);geometry=planar;
  }
  return {geometry,material:materials as THREE.Material[]};
}
