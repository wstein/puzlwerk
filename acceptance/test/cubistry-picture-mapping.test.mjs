import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pictureDocuments, comparePictureState} from '../runtime/picture-mapping.mjs';
const source={id:'playground_3_picture_v1',printing:[{id:0,cubie:0,p:[-1,-1,-1],n:[0,0,-1],up:[0,1,0],image:'B_0_0',slot:0}]};
test('maps native positions, source frames and tile identity into wire documents',()=>{
 const {definition,state,appearance}=pictureDocuments(source);
 assert.deepEqual(definition.pieces[0],{id:'c0',home:[-2,-2,-2],stickers:[{id:'s0',normal:[0,0,-1],up:[0,1,0]}]});
 assert.deepEqual(state.poses[0].position,[-2,-2,-2]);
 assert.equal(appearance.stickers[0].image,'tile:0');
 assert.equal(appearance.stickers[0].symmetry,'C1');
 assert.ok(comparePictureState(source.printing,definition,state));
 const changed=structuredClone(state);changed.poses[0].orientation=[-1,0,0,0,1,0,0,0,-1];
 assert.equal(comparePictureState(source.printing,definition,changed),false);
});
