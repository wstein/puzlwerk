import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
if (!process.argv[2]) throw new Error('Pass the pinned Cubistry checkout path');
const root=resolve(process.argv[2]), dir=join(root,'packages/cube-viewer/src');
for(const [name,expected] of Object.entries({'body-artwork.ts':'ed67b4f913b50e142b3262a4b81ac5ba19748921b424fdda57bf3661c906b5c5','cut-faces.ts':'b77409426386d2409b367350641c5e63fc04a327f26443df433724aff2b89fb1','projected-uv.ts':'f30ca569a5cbe84a3369ecee03134ce67006d755db6d64b93479460af1584397','physical-scene.ts':'73c9882b48c107b43513600e3dafbf1c2f9be1b1b44b30fcc1c2ebaf29c7c79f','presentation-preset.ts':'6ae77f5c4579689272106d21de91a1de23ed9dcfa762e30ad9e36944f784466b','two-radius-body.ts':'d0a822c0fbc2e0b84b73944bb17831872f5d2cbfa3ed72e0e83403b2b6220c38','layer-widths.ts':'0977d80f09a4e939d471b74c867c6e7a76a19dbdfc8cc1243cafed4ba7ff7416'})) {
  const actual=createHash('sha256').update(await readFile(join(dir,name))).digest('hex');
  if(actual!==expected) throw new Error(`Source hash mismatch: ${name}`);
}
const THREE=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
const {PhysicalCubeScene}=await import(pathToFileURL(join(dir,'physical-scene.ts')));
const {createPresentationGeometry,createPlasticMaterial,createStickerMaterial}=await import(pathToFileURL(join(dir,'presentation-preset.ts')));
const faces=[[[1,0,0],[0,1,0]], [[-1,0,0],[0,1,0]],[[0,1,0],[0,0,-1]],[[0,-1,0],[0,0,1]],[[0,0,1],[0,1,0]],[[0,0,-1],[0,1,0]]];const printed=[],materials=new Map();let id=0,cubie=0;for(const x of[-.5,.5])for(const y of[-.5,.5])for(const z of[-.5,.5]){for(const[n,up]of faces)if(n[0]*x+n[1]*y+n[2]*z===.5){printed.push({id,cubie,p:[x,y,z],n,up});materials.set(id++,createStickerMaterial(null,'#fff'))}cubie++}const scene=new THREE.Scene(),physical=new PhysicalCubeScene(scene,printed,materials,createPlasticMaterial(),1,createPresentationGeometry(2));physical.sync(printed);await writeFile(new URL("./cubistry-2x2-poses.json",import.meta.url),JSON.stringify(scene.children.filter(o=>o.type==='Group').map(o=>({position:o.position.toArray(),stickers:o.children.filter(c=>c.userData.stickerId!==undefined).map(c=>({position:c.position.toArray(),quaternion:c.quaternion.toArray()}))})),null,2)+"\n");physical.dispose();
