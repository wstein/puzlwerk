import {createHash} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.argv[2];if(!root)throw Error('Pass the pinned Cubistry checkout');
const file=resolve(root,'src/apps/clock/framing.ts');const hash=createHash('sha256').update(await readFile(file)).digest('hex');
if(hash!=='b48ad097d289c213d85f19a46386e8f4cb5a1db94e801b261d61505610ccecf8')throw Error('Source hash mismatch');
const source=await import(pathToFileURL(file));const {Quaternion,Euler,Vector3}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
const cases=[];
for(const [aspect,count,pitch,yaw] of [[1,2,.16,-.2],[.4,2,.8,1.2],[1.8,3,-.5,-1],[.2,3,1,1.4]]){
 const orientation=new Quaternion().setFromEuler(new Euler(pitch,yaw,0));const required=source.clockRequiredDistance(aspect,orientation,28,count),distance=source.clockCameraRadius(aspect,0,0,28,count),scale=source.clockPresentationScale(aspect,orientation,28,count),centers=Array.from({length:count},()=>new Vector3());source.clockWorldCenters(orientation,scale,centers,count);
 cases.push({aspect,count,pitch,yaw,required,distance,scale,centers:centers.map(v=>v.toArray())});
}
await writeFile('packages/viewer/test/fixtures/cubistry-clock-framing.json',JSON.stringify({revision:'efafcc1d97687eccea0cde87a230f447ce1b6c66',sourceHash:hash,cases},null,2)+'\n');
