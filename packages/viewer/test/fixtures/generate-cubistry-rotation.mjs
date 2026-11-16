import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2]; if(!root) throw Error('Pass the pinned Cubistry checkout');
const file=resolve(root,'packages/cube-viewer/src/smart-rotation.ts');
const hash=createHash('sha256').update(await readFile(file)).digest('hex');
if(hash!=='4ff65f4bc27917d5682401a54df0ed9f8e343108302b486fd742f3058904cd3f') throw Error('Source hash mismatch');
const {SmartRotation}=await import(pathToFileURL(file));
const {Quaternion}=await import(pathToFileURL(join(root,'node_modules/three/build/three.module.js')));
const sequences=[
 {name:'smart-return',mode:'smart',events:[['down',0],['drag',.4,1.2,.1],['up',.11],['step',.2],['step',.8],['step',1.2],['step',2],['step',4]]},
 {name:'waiting-return',mode:'smart',events:[['down',0],['drag',.3,1.1,.1],['up',.4],['step',.41],['step',.5],['step',1],['step',3]]},
 {name:'free-classic',mode:'free',events:[['down',0],['drag',.3,.7,.1],['up',.11],['step',.3],['setMode','classic',.4],['step',1],['reset',1.1]]},
 {name:'reduced-suspend',mode:'smart',events:[['setReducedMotion',true,0],['down',.1],['drag',.2,.8,.2],['up',.21],['suspend',.3],['resume',1],['interact',1.1],['reset',1.2]]},
];
for(const sequence of sequences){
 const rotation=new SmartRotation(new Quaternion(.079,.099,0,.991));sequence.initial=[.079,.099,0,.991];
 if(sequence.mode!=='smart')rotation.setMode(sequence.mode,0);
 sequence.trace=[];
 for(const [method,...args] of sequence.events){rotation[method](...args);sequence.trace.push({quaternion:rotation.quaternion.toArray(),anchor:rotation.anchor.toArray(),phase:rotation.phase,mode:rotation.mode,reducedMotion:rotation.reducedMotion,returnDeadline:rotation.returnDeadline,angularSpeed:rotation.angularSpeed});}
 rotation.dispose();
}
await writeFile('packages/viewer/test/fixtures/cubistry-smart-rotation.json',JSON.stringify({revision:'efafcc1d97687eccea0cde87a230f447ce1b6c66',sourceHash:hash,sequences},null,2)+'\n');
