import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFrames} from '../dist/native-projection.js';
const identity=[0,0,0,1];
test('canonical projection produces source frames and explicit unprinted body poses',()=>{
 const projection={pieces:[{id:'a',transform:{position:[1,0,0],rotation:identity},stickers:[{id:'s',transform:{position:[0,0,.5],rotation:identity},size:[.87,.87],color:'#ffffff'}]},{id:'inner',transform:{position:[0,0,0],rotation:identity},stickers:[]}]};
 const result=nativeFrames(projection);assert.equal(result.ok,true);assert.deepEqual(result.value.frames,[{id:'s',cubie:'a',p:[1,0,0],n:[0,0,1],up:[0,1,0]}]);assert.deepEqual(result.value.bodies.map(body=>body.id),['a','inner']);
});
test('unsupported independent mesh profile is rejected explicitly',()=>{
 const result=nativeFrames({pieces:[],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[]}});assert.equal(result.ok,false);assert.equal(result.error.code,'Unavailable');
});

test('free body orientation remains separate from native local sticker axes',()=>{
 const rotation=[0,Math.sin(.2),0,Math.cos(.2)];
 const projection={pieces:[{id:'a',transform:{position:[1,0,0],rotation},stickers:[{id:'s',transform:{position:[0,0,.5],rotation:identity},size:[.87,.87],color:'#ffffff'}]}]};
 const result=nativeFrames(projection);assert.equal(result.ok,true);assert.deepEqual(result.value.frames[0].n,[0,0,1]);assert.deepEqual(result.value.bodies[0].rotation,rotation);
});
