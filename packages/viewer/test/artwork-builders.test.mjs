import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/cubistry-artwork-builders.json',import.meta.url)));
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
import {sourceFaceIndex,orientBodyArtwork} from '../dist/body-artwork.js';
import {stickerWindow,windowUv} from '../dist/projected-uv.js';
import {cutColorAt,paintCutPattern} from '../dist/cut-faces.js';
import {createTwoRadiusBody} from '../dist/two-radius-body.js';

test('source body artwork rotates face UV without changing physical geometry',()=>{
 const base=createTwoRadiusBody({size:[.99,.99,.99],outer:[[true,false],[true,false],[true,false]],big:.03,small:.018,segments:3});
 const mapped=orientBodyArtwork(base,[{n:[0,0,1],up:[1,0,0]}]);
 assert.equal(sourceFaceIndex([0,0,1]),4); assert.deepEqual(mapped.getAttribute('position').array,base.getAttribute('position').array);
 assert.equal(hash(mapped.getAttribute('uv').array),fixture.uvHash); mapped.dispose();base.dispose();
});
test('source projected window maps asymmetric corner for unequal layers',()=>{
 const win=stickerWindow([1.2,1,1.4],.87,'F',[0,2,2]);
 assert.deepEqual(win,fixture.window); const [u,v]=windowUv(win,0,1); assert.ok(Math.abs(u-(.5+(-1.2-.87*1.2/2)/3.6))<1e-9); assert.ok(Math.abs(v-(.5+(1.1+.87*1.4/2)/3.6))<1e-9);
});
test('source cut patterns preserve directional stops and mix at miter',()=>{
 const edges=[{edge:'u1',color:'#ff0000',stops:[{to:.3,color:'#ffffff'},{to:1,color:'#ff0000'}],reverse:false},{edge:'v1',color:'#0000ff'}];
 assert.equal(cutColorAt(edges,.99,.1),'#ffffff'); assert.equal(cutColorAt(edges,.99,.8),'#ff0000');
 const bytes=paintCutPattern(edges,16), i=(8*16+8)*4; assert.equal(hash(bytes),fixture.patternHash); assert.ok(bytes[i]>0 && bytes[i+2]>0);
});
