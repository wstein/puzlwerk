import {test} from 'node:test';import assert from 'node:assert/strict';
import * as Frame from '../core/res/PwColorFrame.res.mjs';import * as Shell from '../core/res/PwShell.res.mjs';import * as Notation from '../core/res/PwNotation.res.mjs';
const initial=['U','R','F','D','L','B'];const move=(n,text)=>Notation.parse(Shell.makeSize(n)._0,text)._0[0];const advance=(n,text,frame=initial)=>Frame.advance(frame,move(n,text));
test('source-backed orientation frame follows whole and odd middle layers',()=>{
 assert.deepEqual(advance(3,'x'),['F','R','D','B','L','U']);assert.deepEqual(advance(3,'M'),['B','R','U','F','L','D']);assert.deepEqual(advance(3,'E'),['U','F','L','D','B','R']);assert.deepEqual(advance(3,'S'),['L','U','F','R','D','B']);assert.deepEqual(advance(3,'R'),initial);assert.deepEqual(advance(2,'x'),advance(3,'x'));
 for(const n of [2,3])for(const name of ['x','y','z']){let f=initial;for(let i=0;i<4;i++)f=advance(n,name,f);assert.deepEqual(f,initial);assert.deepEqual(advance(n,name+"'",advance(n,name)),initial);assert.deepEqual(advance(n,name+'2',advance(n,name+'2')),initial)}
 for(const name of ['M','E','S'])assert.deepEqual(advance(3,name+"'",advance(3,name)),initial);
});
