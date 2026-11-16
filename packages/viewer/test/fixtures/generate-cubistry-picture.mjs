import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
if(!process.argv[2]) throw Error('Pass the pinned Cubistry checkout path');
const root=resolve(process.argv[2]),dir=join(root,'packages/cube-viewer/src');
for(const [name,expected] of Object.entries({'physical-scene.ts':'73c9882b48c107b43513600e3dafbf1c2f9be1b1b44b30fcc1c2ebaf29c7c79f','body-artwork.ts':'ed67b4f913b50e142b3262a4b81ac5ba19748921b424fdda57bf3661c906b5c5','cut-faces.ts':'b77409426386d2409b367350641c5e63fc04a327f26443df433724aff2b89fb1','projected-uv.ts':'f30ca569a5cbe84a3369ecee03134ce67006d755db6d64b93479460af1584397','presentation-preset.ts':'6ae77f5c4579689272106d21de91a1de23ed9dcfa762e30ad9e36944f784466b','two-radius-body.ts':'d0a822c0fbc2e0b84b73944bb17831872f5d2cbfa3ed72e0e83403b2b6220c38','layer-widths.ts':'0977d80f09a4e939d471b74c867c6e7a76a19dbdfc8cc1243cafed4ba7ff7416'})) if(createHash('sha256').update(await readFile(join(dir,name))).digest('hex')!==expected) throw Error(`Source hash mismatch: ${name}`);
const THREE=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
const {PhysicalCubeScene}=await import(pathToFileURL(join(dir,'physical-scene.ts')));
const {createTwoRadiusBody}=await import(pathToFileURL(join(dir,'two-radius-body.ts')));
const {createPresentationGeometry,createPlasticMaterial,createStickerMaterial}=await import(pathToFileURL(join(dir,'presentation-preset.ts')));
const faces=[['R',[1,0,0],[0,1,0]],['L',[-1,0,0],[0,1,0]],['U',[0,1,0],[0,0,-1]],['D',[0,-1,0],[0,0,1]],['F',[0,0,1],[0,1,0]],['B',[0,0,-1],[0,1,0]]],printed=[],materials=new Map();let id=0,cubie=0;
for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){for(const [,n,up] of faces)if(n[0]*x+n[1]*y+n[2]*z===.5){printed.push({id,cubie,p:[x,y,z],n,up});materials.set(id++,createStickerMaterial(null,'#ffffff'))}cubie++}
const parent=new THREE.Group(),scene=new PhysicalCubeScene(parent,printed,materials,createPlasticMaterial('#1b2431'),1,createPresentationGeometry(2));scene.sync(printed);scene.setConstruction('stickerless');
const images=new Map(faces.map(([key])=>[key,new THREE.Texture()]));scene.setPictureProjection({faces:images});
const result=parent.children.filter(x=>x.isGroup).map(group=>({position:group.position.toArray(),stickers:group.children.filter(x=>x.userData.stickerId!==undefined).map(x=>({id:x.userData.stickerId,offset:x.material.map.offset.toArray(),repeat:x.material.map.repeat.toArray()})),body:group.children[0].material.map(m=>m.map?{offset:m.map.offset.toArray(),repeat:m.map.repeat.toArray()}:null)}));
await writeFile(new URL('./cubistry-picture-windows.json',import.meta.url),JSON.stringify(result,null,2)+'\n');scene.dispose();
