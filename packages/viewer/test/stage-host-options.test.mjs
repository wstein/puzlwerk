import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCubeStage} from '../dist/index.js';
const base={resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'none'}})};
test('appearanceControls accepts floating and hidden only; the guard runs before any WebGL work',()=>{
  const host={};
  for(const bad of ['none',true,1,null]){const result=createCubeStage(host,{...base,appearanceControls:bad});assert.equal(result.ok,false);assert.equal(result.error.code,'InvalidView')}
  // Without WebGL (Node) a valid option passes the guard and reports the missing context instead.
  for(const good of [undefined,'floating','hidden']){const result=createCubeStage(host,{...base,appearanceControls:good});assert.equal(result.ok,false);assert.equal(result.error.code,'Unavailable')}
});
