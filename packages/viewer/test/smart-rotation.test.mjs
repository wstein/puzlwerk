import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Quaternion} from 'three';
import {SmartRotation} from '../dist/smart-rotation.js';

test('smart rotation reproduces pinned source phase and pose traces',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-smart-rotation.json',import.meta.url)));
 for(const sequence of fixture.sequences){
  const rotation=new SmartRotation(new Quaternion(...sequence.initial));
  if(sequence.mode!=='smart')rotation.setMode(sequence.mode,0);
  for(const [i,[method,...args]] of sequence.events.entries()){
   rotation[method](...args);
   const actual={quaternion:rotation.quaternion.toArray(),anchor:rotation.anchor.toArray(),phase:rotation.phase,mode:rotation.mode,reducedMotion:rotation.reducedMotion,returnDeadline:rotation.returnDeadline,angularSpeed:rotation.angularSpeed};
   assert.deepEqual(actual,sequence.trace[i],`${sequence.name} step ${i}: ${method}`);
  }
  rotation.dispose();
 }
});
