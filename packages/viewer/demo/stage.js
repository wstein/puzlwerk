import * as THREE from 'three';
import {createCubeStage} from '../dist/index.js';
import {shadowFillPositionFromKey} from '../dist/presentation-preset.js';
import {presentationCameraRadius,cubePresentationRadius} from '../dist/presentation-rotation.js';
import {weightedFaceExposure} from '../dist/weighted-exposure.js';
import {clockCameraRadius,clockPresentationScale,clockCubeRadius,clockCentersFor,clockDefaultQuaternion} from '../dist/clock-framing.js';
const faces=[[[1,0,0],[0,1,0],'#e94538'],[[-1,0,0],[0,1,0],'#ff922e'],[[0,1,0],[0,0,-1],'#f7f6e9'],[[0,-1,0],[0,0,1],'#ffd635'],[[0,0,1],[0,1,0],'#24ab72'],[[0,0,-1],[0,1,0],'#3384e5']];
const qFor=(n,u)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...u).cross(new THREE.Vector3(...n)),new THREE.Vector3(...u),new THREE.Vector3(...n))).toArray();
const pieces=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const v=[x,y,z],id=v.join(',');pieces.push({id,transform:{position:v.map(x=>x*.506),rotation:[0,0,0,1]},geometry:{cellSize:[1.012,1.012,1.012],outerSides:v.map(x=>[x<0,x>0])},stickers:faces.filter(([n])=>n.some((x,i)=>x===v[i])).map(([n,u,color],i)=>({id:`${id}:${i}`,transform:{position:n.map(x=>x*.508),rotation:qFor(n,u)},size:[.87,.87],color}))});}
const from={pieces,presentation:{size:2,nominalEdge:2},core:{center:[0,0,0],halfExtent:1.012}};
const to={...from,pieces:pieces.map(p=>p.transform.position[2]>0?{...p,transform:{position:[-p.transform.position[1],p.transform.position[0],p.transform.position[2]],rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}}:p)};
window.stages=[];
for(const [id,count] of [['two',2],['three',3]]){
 const options={resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'No assets'}}),fovDegrees:28,zoom:1,initialOrientation:clockDefaultQuaternion.toArray(),mode:'smart',sensitivity:.004,dragThreshold:0,reducedMotion:false,casterEnvelope:{radius:clockCubeRadius,clearance:.08},viewPolicy:view=>{const distance=clockCameraRadius(view.aspect,0,0,view.fovDegrees,count)*view.zoom,scale=clockPresentationScale(view.aspect,new THREE.Quaternion(...view.orientation),view.fovDegrees,count);return {distance,far:Math.max(100,distance+Math.max(...clockCentersFor(count))+clockCubeRadius+1),groupScale:scale}}};
 const result=createCubeStage(document.querySelector(`#${id}`),options);if(!result.ok)throw Error(result.error.message);const stage=result.value,children=[];
 for(const center of clockCentersFor(count)){const added=stage.addCube({position:[center,0,0]});if(!added.ok)throw Error(added.error.message);const child=added.value;const set=await child.setProjection(from);if(!set.ok)throw Error(set.error.message);children.push(child)}
 document.querySelector(`#turn-${id}`).onclick=()=>{for(const child of children)void child.transition({from,to,pieceIds:pieces.filter(p=>p.transform.position[2]>0).map(p=>p.id),axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI/2,durationMs:700})};
 window.stages.push({stage,children,from,to});
}

// The application supplies these source-equivalent Names render values.
const widths=[1.6,1,1,1,1,1,1.6],edge=widths.reduce((a,b)=>a+b,0),extent=edge/2,radius=cubePresentationRadius(extent);
const centers=widths.map((w,i)=>widths.slice(0,i).reduce((a,b)=>a+b,0)+w/2-edge/2),model=[];
for(let x=0;x<7;x++)for(let y=0;y<7;y++)for(let z=0;z<7;z++){
 const indices=[x,y,z],id=indices.join(','),cell=indices.map(i=>widths[i]);
 const stickers=faces.filter(([n])=>n.some((v,a)=>v===-1&&indices[a]===0||v===1&&indices[a]===6)).map(([n,u,color],i)=>{const right=new THREE.Vector3(...u).cross(new THREE.Vector3(...n)).toArray(),axis=v=>v.findIndex(x=>x!==0);return {id:`${id}:${i}`,transform:{position:n.map((v,a)=>v*(cell[a]/2+.002)),rotation:qFor(n,u)},size:[.87*cell[axis(right)],.87*cell[axis(u)]],geometry:{referenceSize:[.87,.87],cornerRadius:.055},color,sourceFace:{normal:n,up:u,color}}});
 if(stickers.length)model.push({id,transform:{position:indices.map(i=>centers[i]),rotation:[0,0,0,1]},geometry:{cellSize:cell,outerSides:indices.map(i=>[i===0,i===6])},stickers});
}
const start={pieces:model,presentation:{size:7,nominalEdge:edge},core:{center:[0,0,0],halfExtent:extent},geometryProfile:{body:{kind:'twoRadius',gap:.01/(66.5/edge),bevelSegments:2}},appearance:{construction:'stickerless',miterCutFaces:true,planarFaceUv:true}};
const end={...start,pieces:model.map(p=>p.transform.position[2]===centers[6]?{...p,transform:{position:[-p.transform.position[1],p.transform.position[0],p.transform.position[2]],rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}}:p)};
const dir=(position,intensity)=>({color:'#ffffff',intensity,visible:true,position,target:[0,0,0]}),strength=.6,plasticityGain=1/((1-.07*strength)*(1-.03*.03-.05*.01));
const lighting={ambient:{color:'#ffffff',intensity:.8,visible:true},hemisphere:{sky:'#ffffff',ground:'#77808d',intensity:0,visible:true,position:[0,1,0]},key:dir([1,2.5,6.5],2.4),fill:dir([-4,1,2],.85),rim:dir([1,3,-4],1.3),shadowFill:dir(shadowFillPositionFromKey([1.5,7,3]),1),extraDirectionals:[dir([-8,1.5,1.5],.9)],keyShadowStrength:strength,shadowFillStrength:.55*strength,floorOpacity:.3/strength,contactShadow:true,fineShadowEdges:false,colorTemperature:false,toneMapping:'softShoulder',exposure:s=>weightedFaceExposure(s.lights,s.orientation,s.cameraPosition)*plasticityGain};
const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(.22,-.3,0));
const names=createCubeStage(document.querySelector('#names'),{resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'No assets'}}),fovDegrees:24,zoom:.9,initialOrientation:q.toArray(),mode:'smart',sensitivity:.006,dragThreshold:0,reducedMotion:false,casterEnvelope:{radius,clearance:.08},lighting,viewPolicy:view=>{const distance=presentationCameraRadius(view.aspect,radius,view.fovDegrees)*view.zoom;return {distance,far:Math.max(100,distance+2*radius),groupScale:1}}});
if(!names.ok)throw Error(names.error.message);const added=names.value.addCube({position:[0,0,0]});if(!added.ok)throw Error(added.error.message);const child=added.value;const loaded=await child.setProjection(start);if(!loaded.ok)throw Error(loaded.error.message);child.setMaterial({specularIntensity:.03,roughness:.65,clearcoat:.01,receiveShadow:true});
document.querySelector('#turn-names').onclick=()=>void child.transition({from:start,to:end,pieceIds:model.filter(p=>p.transform.position[2]===centers[6]).map(p=>p.id),axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:Math.PI/2,durationMs:700});
window.stages.push({stage:names.value,children:[child],from:start,to:end});
