import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparePoses} from '../acceptance/runtime/compare.mjs';
test('pose comparison checks identity, position, and full orientation',()=>{
 const n={cubies:[{id:7,position:[1,1,-1],orientation:[[1,0,0],[0,0,-1],[0,1,0]]}]};
 const p={pieceId:'c7',position:[1,1,-1],orientation:[1,0,0,0,0,1,0,-1,0]};
 assert.equal(comparePoses(n,{poses:[p]}),true);
 assert.equal(comparePoses(n,{poses:[{...p,pieceId:'c6'}]}),false);
 assert.equal(comparePoses(n,{poses:[{...p,position:[1,-1,-1]}]}),false);
 assert.equal(comparePoses(n,{poses:[{...p,orientation:[1,0,0,0,1,0,0,0,1]}]}),false);
 assert.equal(comparePoses(n,{poses:[]}),false);
 const n2={cubies:[...n.cubies,{...n.cubies[0],id:8}]};
 assert.equal(comparePoses(n2,{poses:[p,p]}),false);
});

test('visible facelet comparison checks all six arrays and every position',async()=>{
 const {visibleColorsMatch}=await import('../acceptance/runtime/facelet-compare.mjs');
 const value=Object.fromEntries(['u','r','f','d','l','b'].map((k,i)=>[k,Array(4).fill(i)]));
 assert.equal(visibleColorsMatch(value,structuredClone(value)),true);
 for(const face of Object.keys(value)){const changed=structuredClone(value);changed[face][3]=99;assert.equal(visibleColorsMatch(value,changed),false);}
 assert.equal(visibleColorsMatch(value,{...value,b:[1]}),false);
});

test('native primitive ranges map by explicit home slots and preserve every vertex',async()=>{
 const {sourceMeshProfile}=await import('../acceptance/runtime/source-mesh-profile.mjs');
 const definition={size:2,pieces:[{id:'a',home:[-1,-1,-1]},{id:'b',home:[1,-1,-1]}]};
 const raw={positions:[-.5,-.5,-.5,-.4,-.5,-.5,-.5,-.4,-.5,.5,-.5,-.5,.6,-.5,-.5,.5,-.4,-.5],normals:Array(18).fill(0),colors:Array(18).fill(.5),occlusion:Array(6).fill(1),indices:[0,1,2,3,4,5],ranges:[{owner:[0,0,0],role:'body',firstIndex:0,indexCount:3},{owner:[1,0,0],role:'cap',firstIndex:3,indexCount:3}]};
 const p=sourceMeshProfile(raw,definition);assert.equal(p.kind,'cubeAssemblerV1');assert.deepEqual(p.meshes.map(m=>m.pieceId),['piece:a','piece:b']);
 assert.deepEqual(p.meshes[0].positions.slice(0,3),[0,0,0]);assert.deepEqual(p.meshes[1].positions.slice(0,3),[0,0,0]);
 assert.throws(()=>sourceMeshProfile({...raw,ranges:[raw.ranges[0],{...raw.ranges[1],firstIndex:0}]},definition));
 assert.throws(()=>sourceMeshProfile({...raw,ranges:[raw.ranges[0],{...raw.ranges[1],owner:null}]},definition));
});
