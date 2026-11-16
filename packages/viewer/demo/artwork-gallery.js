import * as THREE from 'three';
import {createSceneForTest} from '../dist/scene.js';
import {presentationWidths,innerRadiusFor,stickerSideFor,configurePresentationRenderer} from '../dist/presentation-preset.js';
const mode=new URL(location.href).searchParams.get('mode')??'tile';
const faces=[['R',[1,0,0],[0,1,0],'#e94538'],['L',[-1,0,0],[0,1,0],'#ff922e'],['U',[0,1,0],[0,0,-1],'#f7f6e9'],['D',[0,-1,0],[0,0,1],'#ffd635'],['F',[0,0,1],[0,1,0],'#24ab72'],['B',[0,0,-1],[0,1,0],'#3384e5']];
const assets=new Map();
for(const [key,,,color] of faces){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,128,128);c.fillStyle='#153b61';c.fillRect(8,12,28,18);c.fillStyle='#fffdf6';c.fillRect(78,84,40,30);c.fillStyle='#153b61';c.font='bold 38px sans-serif';c.fillText(key,50,70);assets.set(`tile-${key}`,canvas);assets.set(`face-${key}`,await createImageBitmap(canvas,{imageOrientation:'flipY'}));}
const qFor=(n,u)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...u).cross(new THREE.Vector3(...n)),new THREE.Vector3(...u),new THREE.Vector3(...n))).toArray();
const profiles=[{name:'2×2',size:2},{name:'3×3',size:3},{name:'7×7',size:7},{name:'Unequal 0.7 / 1 / 1.4',size:3,widths:[.7,1,1.4]}];window.gallery=[];
for(const item of profiles){
 const widths=item.widths??presentationWidths(item.size),edge=widths.reduce((a,b)=>a+b,0),nominalEdge=item.widths?edge:item.size,centers=widths.map((_,i)=>widths.slice(0,i).reduce((a,b)=>a+b,0)+widths[i]/2-edge/2),side=stickerSideFor(1,innerRadiusFor(item.size,nominalEdge)),pieces=[];
 for(let x=0;x<item.size;x++)for(let y=0;y<item.size;y++)for(let z=0;z<item.size;z++){
  const indices=[x,y,z],id=indices.join(','),cell=indices.map(i=>widths[i]);
  const stickers=faces.filter(([,n])=>n.some((v,a)=>v===-1&&indices[a]===0||v===1&&indices[a]===item.size-1)).map(([face,n,up,color],i)=>({id:`${id}:${i}`,transform:{position:n.map((v,a)=>v*(cell[a]/2+.002)),rotation:qFor(n,up)},size:[side,side],color,...(mode==='plain'?{}:{imageId:`tile-${face}`}),sourceFace:{normal:n,up,...(face==='F'?{edgeColors:{left:[{to:.3,color:'#fffdf6'},{to:1,color}]}}:{})},...(mode.startsWith('picture')?{picture:{face,layerIndex:indices}}:{})}));
  if(stickers.length)pieces.push({id,transform:{position:indices.map(i=>centers[i]),rotation:[0,0,0,1]},geometry:{cellSize:cell,outerSides:indices.map(i=>[i===0,i===item.size-1])},stickers});
 }
 const appearance={construction:mode==='plain'||mode==='miter'||mode==='picture-body'?'stickerless':'stickered',miterCutFaces:mode==='miter'};
 const picture=mode.startsWith('picture')?{widths,faces:Object.fromEntries(faces.map(([face])=>[face,`face-${face}`]))}:undefined;
 const from={pieces,presentation:{size:item.size,nominalEdge},core:{center:[0,0,0],halfExtent:edge/2},appearance,...(picture?{picture}:{})};
 const selected=pieces.filter(p=>p.transform.position[2]===centers.at(-1)).map(p=>p.id),to={...from,pieces:pieces.map(p=>selected.includes(p.id)?{...p,transform:{position:[-p.transform.position[1],p.transform.position[0],p.transform.position[2]],rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}}:p)};
 const section=document.createElement('section');section.innerHTML=`<h2>${item.name}</h2><div class="pair"><figure><figcaption>Rest</figcaption></figure><figure><figcaption>Mid-turn</figcaption></figure></div>`;document.querySelector('#gallery').append(section);
 for(const [index,figure] of [...section.querySelectorAll('figure')].entries()){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});configurePresentationRenderer(renderer,null);renderer.setSize(300,300,false);const snapshot=document.createElement('canvas');snapshot.width=snapshot.height=300;figure.prepend(snapshot);
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(4,3,5).multiplyScalar(Math.max(1,edge/2));camera.lookAt(0,0,0);
  let now=0,next=0;const frames=new Map(),clock={now:()=>now,request:cb=>{frames.set(++next,cb);return next},cancel:id=>frames.delete(id)};
  const scene=createSceneForTest({resolveAsset:async id=>assets.has(id)?{ok:true,value:assets.get(id)}:{ok:false}},clock,{render:s=>renderer.render(s,camera),dispose:()=>renderer.dispose()});
  const step=ms=>{now+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(now));};
  const result=await scene.setProjection(from);if(!result.ok)throw Error(result.error.message);step(0);
  if(index){scene.transition({from,to,pieceIds:selected,axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:100});step(50)}
  const lost=renderer.getContext().isContextLost(),calls=renderer.info.render.calls; snapshot.getContext('2d').drawImage(renderer.domElement,0,0);scene.dispose();window.gallery.push({item,rendered:calls>0,lost});
 }
}
