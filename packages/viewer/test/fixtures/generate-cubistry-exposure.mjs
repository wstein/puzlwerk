import {createHash} from 'node:crypto';import {readFile,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';import {pathToFileURL} from 'node:url';
const root=process.argv[2];if(!root)throw Error('Pass the pinned Cubistry checkout');const file=resolve(root,'src/apps/calendar7/names-exposure.ts');const hash=createHash('sha256').update(await readFile(file)).digest('hex');if(hash!=='54869044e3d4af158d3973e59c4d3e2fe96b1e1e04a8a1dfc5faccaccd766bc6')throw Error('Source hash mismatch');
const source=await import(pathToFileURL(file));const THREE=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));const cases=[];
for(const [pitch,yaw,lighting] of [[.22,.3,true],[.63,.3,true],[-.4,1.2,true],[0,0,false]]){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(0,0,8);const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0));
 if(lighting){scene.add(new THREE.AmbientLight('#ffffff',.8));const hemi=new THREE.HemisphereLight('#d2e8ff','#302b26',.3);hemi.position.set(0,1,0);scene.add(hemi);const key=new THREE.DirectionalLight('#fff3e3',2.4);key.position.set(1,2.5,6.5);scene.add(key);const rake=new THREE.DirectionalLight('#eaf1ff',.9);rake.position.set(-8,1.5,1.5);scene.add(rake);}
 const data=source.collectLights(scene);const snapshot={ambient:data.ambient,hemispheres:data.hemispheres.map(h=>({up:h.up.toArray(),sky:h.sky,ground:h.ground})),directionals:data.directionals.map(d=>({to:d.to.toArray(),amount:d.amount}))};
 cases.push({lights:snapshot,orientation:q.toArray(),cameraPosition:camera.position.toArray(),exposure:source.namesExposure(scene,q,camera)});
}
await writeFile('packages/viewer/test/fixtures/cubistry-weighted-exposure.json',JSON.stringify({revision:'efafcc1d97687eccea0cde87a230f447ce1b6c66',sourceHash:hash,cases},null,2)+'\n');
