import {test} from 'node:test';import assert from 'node:assert/strict';import {groupZoom} from '../dist/zoom-policy.js';
test('native group zoom uses bounded exponential wheel movement',()=>{
 assert.equal(groupZoom(1,120),Math.exp(.12));assert.equal(groupZoom(1,-120),Math.exp(-.12));assert.equal(groupZoom(1,10000),2);assert.equal(groupZoom(1,-10000),.8);assert.throws(()=>groupZoom(NaN,1),/Invalid group zoom/);assert.throws(()=>groupZoom(1,Infinity),/Invalid group zoom/);
});
