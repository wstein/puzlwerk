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
