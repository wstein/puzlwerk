import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Shell from '../../../core/res/PwShell.res.mjs';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
import {createSceneForTest} from '../dist/scene.js';
test('viewer consumes core projections without changing the canonical inputs', async () => {
  const size=Shell.makeSize(2)._0;
  const slots=Shell.slots(size).map(Shell.toVec);
  const before=structuredClone(slots);
  const orientation=Orientation.make([0,-1,0,1,0,0,0,0,1])._0;
  const from={pieces:slots.map((p,i)=>({id:String(i),transform:{position:[p.x/2,p.y/2,p.z/2],rotation:[0,0,0,1]},stickers:[]}))};
  const to={pieces:from.pieces.map((piece,i)=>{if(slots[i].z!==1)return piece;const p=Orientation.apply(orientation,slots[i]);return {...piece,transform:{position:[p.x/2,p.y/2,p.z/2],rotation:[0,0,Math.SQRT1_2,Math.SQRT1_2]}};})};
  const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});
  assert.equal((await scene.setProjection(from)).ok,true);
  assert.equal((await scene.transition({from,to,pieceIds:slots.flatMap((p,i)=>p.z===1?[String(i)]:[]),axis:[0,0,1],signedAngleRadians:Math.PI/2,pivot:[0,0,0],durationMs:0})).ok,true);
  assert.deepEqual(slots,before); assert.deepEqual(Orientation.toArray(orientation),[0,-1,0,1,0,0,0,0,1]); scene.dispose();
});
