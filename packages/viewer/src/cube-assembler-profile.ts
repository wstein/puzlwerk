// SPDX-License-Identifier: MIT
// Geometry attributes and lighting equations adapt CubeAssembler 1b7387b3acd40d817ebff820ae3cfcff8b7b1dc2,
// src/client/view3d/cubeView3DGraphics.ts (SHA-256 0ab9d6f6f787b5e879db4a72620a846e1779fb39b54de5039e2789bb8b22bb29).
import * as THREE from 'three';
import type {SourceMesh,Piece} from './contract.js';
export function createCubeAssemblerGeometry(mesh:SourceMesh,piece:Piece):THREE.BufferGeometry {
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(mesh.positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(mesh.normals,3));
 const colors=[...mesh.colors];
 for(const surface of mesh.surfaces)if(surface.role==='sticker'){
  const color=piece.stickers.find(sticker=>sticker.id===surface.stickerId)!.color;
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255);
  for(let i=surface.firstIndex;i<surface.firstIndex+surface.indexCount;i++)for(let axis=0;axis<3;axis++)colors[mesh.indices[i]*3+axis]=rgb[axis];
 }
 geometry.setAttribute('sourceColor',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('occlusion',new THREE.Float32BufferAttribute(mesh.occlusion,1));
 geometry.setIndex([...mesh.indices]);return geometry;
}
export function createCubeAssemblerMaterial():THREE.ShaderMaterial {
 return new THREE.ShaderMaterial({toneMapped:false,uniforms:{lightDir1:{value:new THREE.Vector3(1.5,2.5,2)},lightDir2:{value:new THREE.Vector3(-2,-1,-2)}},vertexShader:`
attribute vec3 sourceColor;
attribute float occlusion;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_pos;
varying float v_occlusion;
void main(){
 v_color=sourceColor;v_occlusion=occlusion;
 v_normal=normalize(mat3(modelMatrix[0].xyz,modelMatrix[1].xyz,modelMatrix[2].xyz)*normal);
 v_pos=(modelMatrix*vec4(position,1.0)).xyz;
 gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.0);
}`,fragmentShader:`
precision mediump float;
varying vec3 v_normal;
varying vec3 v_color;
varying vec3 v_pos;
varying float v_occlusion;
uniform vec3 lightDir1;
uniform vec3 lightDir2;
void main(){
 vec3 N=normalize(v_normal);vec3 V=normalize(cameraPosition-v_pos);
 vec3 L1=normalize(lightDir1);float diff1=max(dot(N,L1),0.0);vec3 H1=normalize(L1+V);
 float spec1=pow(max(dot(N,H1),0.0),24.0)*0.28;
 vec3 L2=normalize(lightDir2);float diff2=max(dot(N,L2),0.0)*0.35;
 float fresnel=pow(1.0-max(dot(N,V),0.0),4.0);
 vec3 lit=v_color*(0.42+diff1*0.65+diff2)*v_occlusion;
 lit+=vec3(spec1*v_occlusion)+v_color*fresnel*0.10;
 gl_FragColor=vec4(lit,1.0);
}`});
}

// CubeShadow.res, CubeAssembler 1b7387b3acd40d817ebff820ae3cfcff8b7b1dc2: projected
// bounding-cube hull, padded to eight points. The quaternion is the displayed model frame.
export function cubeAssemblerOutline(size:number,orientation:readonly [number,number,number,number]):[number,number][] {
 const q=new THREE.Quaternion(...orientation), h=size/2, points:[number,number][]=[];
 for(const x of [-h,h])for(const y of [-h,h])for(const z of [-h,h]){const p=new THREE.Vector3(x,y,z).applyQuaternion(q);points.push([p.x,p.z]);}
 points.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
 const cross=(o:[number,number],a:[number,number],b:[number,number])=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=(list:[number,number][])=>{const out:[number,number][]=[];for(const p of list){while(out.length>=2 && cross(out[out.length-2],out[out.length-1],p)<=1e-9)out.pop();out.push(p);}out.pop();return out;};
 const hull=[...half(points),...half([...points].reverse())];return Array.from({length:8},(_,i)=>hull[Math.min(i,hull.length-1)]);
}
export function createCubeAssemblerShadow(size:number,root:THREE.Object3D):{mesh:THREE.Mesh;dispose():void} {
 const geometry=new THREE.PlaneGeometry(size*6,size*6);geometry.rotateX(-Math.PI/2);
 const outline=Array.from({length:8},()=>new THREE.Vector2());
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true,premultipliedAlpha:true,toneMapped:false,uniforms:{outline:{value:outline},soft:{value:size*.2},alpha:{value:.3}},vertexShader:`
varying vec2 floorPosition;
void main(){vec4 world=modelMatrix*vec4(position,1.0);floorPosition=world.xz;gl_Position=projectionMatrix*viewMatrix*world;}
`,fragmentShader:`
precision mediump float;
varying vec2 floorPosition;uniform vec2 outline[8];uniform float soft;uniform float alpha;
float outlineDistance(vec2 p){float d=dot(p-outline[0],p-outline[0]);float s=1.0;vec2 prev=outline[7];
 for(int i=0;i<8;i++){vec2 cur=outline[i];vec2 e=prev-cur;vec2 w=p-cur;float ee=dot(e,e);if(ee>1e-6){vec2 b=w-e*clamp(dot(w,e)/ee,0.0,1.0);d=min(d,dot(b,b));bvec3 c=bvec3(p.y>=cur.y,p.y<prev.y,e.x*w.y>e.y*w.x);if(all(c)||all(not(c)))s=-s;}prev=cur;}return s*sqrt(d);}
void main(){float d=outlineDistance(floorPosition);float core=1.0-smoothstep(-soft*0.6,soft,d);float halo=1.0-smoothstep(-soft,soft*3.5,d);gl_FragColor=vec4(0.0,0.0,0.0,alpha*max(core,halo*0.45));}
`});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='cubeAssemblerV1-shadow';mesh.renderOrder=-1;
 mesh.onBeforeRender=()=>{const q=root.getWorldQuaternion(new THREE.Quaternion()),center=root.getWorldPosition(new THREE.Vector3());const points=cubeAssemblerOutline(size,q.toArray() as [number,number,number,number]);for(let i=0;i<8;i++)outline[i].set(points[i][0]+center.x,points[i][1]+center.z);mesh.position.set(center.x,center.y-size*.9,center.z);mesh.updateMatrixWorld();};
 return {mesh,dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
