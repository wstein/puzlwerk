import * as THREE from 'three';
import * as Shell from '/core/res/PwShell.res.mjs';
import * as Orientation from '/core/res/PwOrientation.res.mjs';
import {createCubeScene} from '/packages/viewer/dist/index.js';
const value = r => { if (r.TAG !== 'Ok') throw new Error(JSON.stringify(r)); return r._0; };
const size = value(Shell.makeSize(2));
const slots = Shell.slots(size).map(Shell.toVec);
const rotation = value(Orientation.make([0,-1,0,1,0,0,0,0,1]));
const faces = [
  [[1,0,0],[0,1,0],'#df302b'],[[-1,0,0],[0,1,0],'#e68a19'],
  [[0,1,0],[0,0,-1],'#f7f7f7'],[[0,-1,0],[0,0,1],'#f6e44b'],
  [[0,0,1],[0,1,0],'#238d4d'],[[0,0,-1],[0,1,0],'#2761c3']
];
const qFor = (normal,up) => {
  const n=new THREE.Vector3(...normal), u=new THREE.Vector3(...up), r=u.clone().cross(n);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r,u,n)).toArray();
};
const pieces = slots.map(v => ({
  id:`${v.x},${v.y},${v.z}`,
  transform:{position:[v.x/2,v.y/2,v.z/2],rotation:[0,0,0,1]},
  stickers:faces.filter(([n])=>n[0]*v.x+n[1]*v.y+n[2]*v.z===1).map(([n,up,color],i)=>({id:`${v.x},${v.y},${v.z}:${i}`,transform:{position:n.map(x=>x*.471),rotation:qFor(n,up)},size:[.82,.82],color}))
}));
const from={pieces};
const to={pieces:pieces.map((p,i)=>{
  if(slots[i].z!==1) return p;
  const v=Orientation.apply(rotation,slots[i]);
  return {...p,transform:{position:[v.x/2,v.y/2,v.z/2],rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}};
})};
const sceneResult=createCubeScene(document.querySelector('#scene'),{resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'No assets'}})});
if(!sceneResult.ok) throw new Error(sceneResult.error.message);
const scene=sceneResult.value;
const status=document.querySelector('#status');
const initial=await scene.setProjection(from); if(!initial.ok) throw new Error(initial.error.message);
status.textContent='Ready';
document.querySelector('#turn').addEventListener('click',async()=>{
  const result=await scene.transition({from,to,pieceIds:pieces.filter((_,i)=>slots[i].z===1).map(p=>p.id),axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:700});
  status.textContent=result.ok?'Turn complete':result.error.message;
});
window.pilot={scene,from,to,slots};
