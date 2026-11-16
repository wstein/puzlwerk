import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2];if(!root)throw Error('Pass the pinned Cubistry checkout');
const file=resolve(root,'packages/cube-viewer/src/presentation-rotation.ts');
const hash=createHash('sha256').update(await readFile(file)).digest('hex');
if(hash!=='7fd3eae7d16897b6d8ff2632a861ddfa051e7688994dc30bad7fc1af009f6992')throw Error('Source hash mismatch');
const source=await import(pathToFileURL(file));
const {PerspectiveCamera,Object3D}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
const cases=[];
for(const [aspect,extent,fov,zoom,yaw,pitch] of [[1,1,35,1,.2,.16],[.4,2,28,.7,-.8,.6],[2.4,.5,60,1.4,1.2,-.4],[.08,2,28,2,.1,.2]]){
 const sphere=source.cubePresentationRadius(extent),camera=new PerspectiveCamera(fov,aspect,.1,100),object=new Object3D();
 const distance=source.fitPresentationCamera(camera,sphere,zoom); source.rotatePresentation(object,yaw,pitch);
 cases.push({aspect,extent,fov,zoom,yaw,pitch,sphere,distance,far:camera.far,cameraPosition:camera.position.toArray(),rotation:object.quaternion.toArray()});
}
await writeFile('packages/viewer/test/fixtures/cubistry-presentation-framing.json',JSON.stringify({revision:'efafcc1d97687eccea0cde87a230f447ce1b6c66',sourceHash:hash,cases},null,2)+'\n');
