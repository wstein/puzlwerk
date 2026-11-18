import {test} from 'node:test';import assert from 'node:assert/strict';
import {indicatorColorsFromFrame} from '../dist/orientation-indicator.js';
// The CubeAssembler gizmo colors its X, Y and Z arrows with the colors of the frame's R, U and F centers (frame order U,R,F,D,L,B).
test('indicator colors take the R, U and F entries of a color frame as X, Y and Z',()=>{
 const frame=['#111111','#222222','#333333','#444444','#555555','#666666'];
 assert.deepEqual(indicatorColorsFromFrame(frame),{ok:true,value:{x:0x222222,y:0x111111,z:0x333333}});
 assert.deepEqual(indicatorColorsFromFrame(['#F7F6F1','#CF2A3A','#1E9E57','#F2D21B','#FF7A1A','#2459D6']).value,{x:0xcf2a3a,y:0xf7f6f1,z:0x1e9e57});
});
test('indicator colors reject frames that are not six #rrggbb colors',()=>{
 for(const bad of [undefined,null,[],['#111111'],['#111111','#222222','#333333','#444444','#555555'],['#111111','#222222','#333333','#444444','#555555','red'],['#111111','#222222','#333333','#444444','#555555','#66666'],'#111111#222222']){
  assert.equal(indicatorColorsFromFrame(bad).error.code,'InvalidProjection');
 }
});
