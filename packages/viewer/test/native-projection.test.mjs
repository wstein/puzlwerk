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

test('native geometry receives exact shared sticker dimensions and offset',()=>{
 const projection={pieces:[{id:'a',transform:{position:[0,0,0],rotation:identity},stickers:[{id:'s',transform:{position:[0,0,.4321],rotation:identity},size:[.71,.83],color:'#ffffff'}]}]};
 const result=nativeFrames(projection);assert.equal(result.ok,true);assert.deepEqual(result.value.stickerSize,[.71,.83]);assert.equal(result.value.stickerOffset,.4321);
});

test('quarter-turn sticker basis emits exact native face axes despite floating point residue',()=>{
 const q=[-.4999999999999999,.5,.5,.5000000000000001];
 const projection={pieces:[{id:'a',transform:{position:[0,0,0],rotation:identity},stickers:[{id:'s',transform:{position:[0,.5,0],rotation:q},size:[.87,.87],color:'#ffffff'}]}]};
 const result=nativeFrames(projection);assert.equal(result.ok,true);assert.deepEqual(result.value.frames[0].n,[0,1,0]);
});

test('source cell geometry is retained for the native source body factory',()=>{
 const geometry={cellSize:[1.012,1.012,1.012],outerSides:[[true,false],[false,true],[false,true]]};
 const p={pieces:[{id:'corner',transform:{position:[-.506,.506,.506],rotation:identity},geometry,stickers:[{id:'s',transform:{position:[0,0,.508],rotation:identity},size:[.87,.87],color:'#ffffff'}]}]};
 const result=nativeFrames(p);assert.equal(result.ok,true);assert.deepEqual(result.value.bodyGeometry.get('corner'),geometry);
});

test('unequal picture layers are not silently treated as uniform',()=>{
 const faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},result=nativeFrames({pieces:[],picture:{widths:[1,1.2],faces}});
 assert.equal(result.ok,false);assert.equal(result.error.code,'Unavailable');
});

test('unequal complete grid maps canonical centers to native indices without double scaling',()=>{
 const centers=[-.6,.5],pieces=[];for(const x of centers)for(const y of centers)for(const z of centers)pieces.push({id:`${x}/${y}/${z}`,transform:{position:[x,y,z],rotation:identity},stickers:[]});
 const faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},result=nativeFrames({pieces,picture:{widths:[1,1.2],faces}});
 assert.equal(result.ok,true);assert.deepEqual(result.value.bodies[0].position,[-.5,-.5,-.5]);assert.deepEqual(result.value.bodies.at(-1).position,[.5,.5,.5]);assert.deepEqual(result.value.layerWidths,[1,1.2]);
});

test('unequal picture grid rejects duplicate occupied positions',()=>{
 const p={pieces:[{id:'a',transform:{position:[-.6,-.6,-.6],rotation:identity},stickers:[]},{id:'b',transform:{position:[-.6,-.6,-.6],rotation:identity},stickers:[]}],picture:{widths:[1,1.2],faces:{U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'}}};
 const result=nativeFrames(p);assert.equal(result.ok,false);assert.equal(result.error.code,'Unavailable');
});

test('equal nonunit picture layers retain their actual native widths',()=>{
 const centers=[-.506,.506],pieces=[];for(const x of centers)for(const y of centers)for(const z of centers)pieces.push({id:`${x}/${y}/${z}`,transform:{position:[x,y,z],rotation:identity},stickers:[]});
 const faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'},result=nativeFrames({pieces,picture:{widths:[1.012,1.012],faces}});
 assert.equal(result.ok,true);assert.deepEqual(result.value.layerWidths,[1.012,1.012]);assert.deepEqual(result.value.bodies[0].position,[-.5,-.5,-.5]);
});

test('uniform source sticker geometry retains its exact corner radius',()=>{
 const sticker={id:'s',transform:{position:[0,0,.5],rotation:identity},size:[.87,.87],geometry:{referenceSize:[.87,.87],cornerRadius:.045},color:'#ffffff'};
 const result=nativeFrames({pieces:[{id:'a',transform:{position:[0,0,0],rotation:identity},stickers:[sticker]}]});
 assert.equal(result.ok,true);assert.equal(result.value.stickerRadius,.045);
});

test('explicit layer widths map a complete source grid without a picture asset',()=>{
 const centers=[-1.3,0,1.3],pieces=[];for(const x of centers)for(const y of centers)for(const z of centers)pieces.push({id:`${x}/${y}/${z}`,transform:{position:[x,y,z],rotation:identity},stickers:[]});
 const result=nativeFrames({pieces,presentation:{size:3,nominalEdge:4.2,layerWidths:[1.6,1,1.6]}});assert.equal(result.ok,true);assert.deepEqual(result.value.layerWidths,[1.6,1,1.6]);assert.deepEqual(result.value.bodies[0].position,[-1,-1,-1]);assert.deepEqual(result.value.bodies.at(-1).position,[1,1,1]);
});

test('conflicting independent layer and picture widths are rejected',async()=>{
 const {validateProjection}=await import('../dist/contract.js'),faces={U:'i',R:'i',F:'i',D:'i',L:'i',B:'i'};
 const p={pieces:[{id:'p',transform:{position:[0,0,1],rotation:identity},stickers:[{id:'s',transform:{position:[0,0,.5],rotation:identity},size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[1,1,2]}}]}],presentation:{size:3,nominalEdge:4.2,layerWidths:[1.6,1,1.6]},picture:{widths:[1,1,1],faces}};
 const error=validateProjection(p).error;assert.equal(error.code,'InvalidProjection');assert.equal(error.path,'presentation');assert.equal(validateProjection({...p,presentation:{...p.presentation,layerWidths:[1,1,1]}}).ok,true);
});
