import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitionText } from './helpers/cube-model.mjs';
import { open } from '../packages/core-viewer-bridge/src/index.mjs';
import * as Codec from '../core/res/PwCodec.res.mjs';
import { Quaternion, Vector3 } from 'three';
import { validateProjection, validateTransition } from '../packages/viewer/dist/contract.js';

test('wire and appearance produce a viewer projection with stable sticker orientation', () => {
  const definition = definitionText(2), d = Codec.decodeDefinition(definition)._0;
  const appearance = JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'classic',definitionId:'cube2',stickers:[{id:'DBR.R',color:'red',symmetry:'C1',image:'imageR'}]});
  const r = open(definition, Codec.encodeState(Codec.homeState(d)), appearance, { palette:{red:'#ff0000',white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'}, defaultColor:'#ffffff' });
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(validateProjection(r.value.projection).ok,true);
  const sticker = r.value.projection.pieces.flatMap(p => p.stickers).find(s => s.id === 'DBR.R');
  assert.equal(sticker.imageId,'imageR');
  assert.equal(r.value.appearance.stickers.find(s => s.id === 'DBR.R').symmetry,'C1');
  assert.deepEqual(sticker.sourceFace,{normal:[1,0,0],up:[0,1,0]});
  const q=new Quaternion(...sticker.transform.rotation);
  assert.ok(new Vector3(0,0,1).applyQuaternion(q).distanceTo(new Vector3(1,0,0)) < 1e-9);
  assert.ok(new Vector3(0,1,0).applyQuaternion(q).distanceTo(new Vector3(0,1,0)) < 1e-9);
  assert.equal(r.value.projection.pieces.length,8);
});

test('appearance errors and invalid wire never reach projection', () => {
  const definition = definitionText(2), d = Codec.decodeDefinition(definition)._0;
  const state = Codec.encodeState(Codec.homeState(d)), options = {palette:{white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'},defaultColor:'#ffffff'};
  const doc = {schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]};
  assert.equal(open(definition,state,JSON.stringify({...doc,extra:1}),options).error.code,'UnknownField');
  assert.equal(open(definition,state,JSON.stringify({...doc,definitionId:'other'}),options).error.code,'DefinitionMismatch');
  assert.equal(open(definition,state,JSON.stringify({...doc,stickers:[{id:'missing',color:'red'}]}),options).error.code,'StickerMismatch');
  assert.equal(open(definition,state,'{"schema":"x","schema":"x"}',options).error.code,'DuplicateKey');
  assert.equal(open('{}',state,JSON.stringify(doc),options).ok,false);
});

test('player commits only completed turns and rejects overlap', async () => {
  const {createPlayer} = await import('../packages/core-viewer-bridge/src/index.mjs');
  const definition = definitionText(2), d = Codec.decodeDefinition(definition)._0;
  const state = Codec.encodeState(Codec.homeState(d)), appearance = JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
  let finish;
  const scene = {transition: t => { assert.equal(validateTransition(t).ok,true); return new Promise(resolve => {finish=resolve;}); }, cancel: () => ({ok:true}), dispose(){}};
  const player = createPlayer(definition,state,appearance,{palette:{white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'},defaultColor:'#ffffff'},scene).value;
  assert.equal((await player.turn('bad',[1],-1,0)).ok,false);
  const turn = player.turn('X',[1],-1,0);
  assert.equal(player.state(),state);
  assert.equal((await player.turn('Y',[1],1,0)).ok,false);
  finish({ok:true});
  assert.equal((await turn).ok,true);
  assert.notEqual(player.state(),state);
  const after = player.state(), cancelled = player.turn('Y',[1],1,10);
  player.cancel(); finish({ok:true});
  assert.equal((await cancelled).ok,false);
  assert.equal(player.state(),after);
});

test('a missing palette mapping is an error instead of invented color',()=>{
 const definition=definitionText(2), d=Codec.decodeDefinition(definition)._0;
 const doc={schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[{id:'DBR.R',color:'unmapped'}]};
 const result=open(definition,Codec.encodeState(Codec.homeState(d)),JSON.stringify(doc),{palette:{white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'},defaultColor:'#ffffff'});
 assert.equal(result.ok,false); assert.equal(result.error.code,'UnresolvedColor');
});

test('production appearance reader rejects all contract invalid vectors', async()=>{
 const {readFileSync}=await import('node:fs');
 const {checkAppearance}=await import('../packages/core-viewer-bridge/src/appearance.mjs');
 const load=(folder,name)=>JSON.parse(readFileSync(new URL(`./fixtures/${folder}/${name}`,import.meta.url),'utf8'));
 const defs={'definition-2.json':load('wire','definition-2.json'),'definition-3.json':load('wire','definition-3.json')};
 const invalid=load('appearance','invalid.json');
 for(const vector of invalid){const result=checkAppearance(defs[vector.definition],vector.document);assert.deepEqual([result.ok,result.code,result.path],[false,vector.code,vector.path],vector.name);}
 assert.equal(invalid.length,20);
});
