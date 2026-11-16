import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definitionText } from './helpers/cube-model.mjs';
import { open, createPlayer } from '../packages/core-viewer-bridge/src/index.mjs';
import * as Codec from '../core/res/PwCodec.res.mjs';
import { Quaternion, Vector3 } from 'three';
import { validateProjection, validateTransition } from '../packages/viewer/dist/contract.js';

test('wire and appearance produce a viewer projection with stable sticker orientation', () => {
  const definition = definitionText(2), d = Codec.decodeDefinition(definition)._0;
  const appearance = JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'classic',definitionId:'cube2',stickers:[{id:'DBR.R',color:'red',symmetry:'C1',image:'imageR'}]});
  const r = open(definition, Codec.encodeState(Codec.homeState(d)), appearance, { palette:{red:'#ff0000',white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'}, defaultColor:'#ffffff' });
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(validateProjection(r.value.projection).ok,true);
  const sticker = r.value.projection.pieces.flatMap(p => p.stickers).find(s => s.id === 'sticker:DBR.R');
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
  const scene = {transition: t => { assert.equal(validateTransition(t).ok,true); return new Promise(resolve => {finish=resolve;}); }, cancel: () => {finish({ok:false,error:{code:'Cancelled'}});return {ok:true};}, dispose(){}};
  const player = createPlayer(definition,state,appearance,{palette:{white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'},defaultColor:'#ffffff'},scene).value;
  assert.equal((await player.turn('bad',[1],-1,0)).ok,false);
  const illegal = await player.turn('X',[0,1],1,0);
  assert.equal(illegal.ok,false); assert.equal(illegal.error.code,'IllegalMove');
  const turn = player.turn('X',[1],-1,0);
  assert.equal(player.state(),state);
  assert.equal((await player.turn('Y',[1],1,0)).ok,false);
  finish({ok:true});
  assert.equal((await turn).ok,true);
  assert.notEqual(player.state(),state);
  const after = player.state(), cancelled = player.turn('Y',[1],1,10);
  player.cancel();
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

test('completed synchronous transition remains committed when cancel or dispose races its promise', async()=>{
 const definition=definitionText(2), d=Codec.decodeDefinition(definition)._0, state=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 for(const action of ['cancel','dispose']){
  let displayed;
  const scene={transition(t){displayed=t.to;return Promise.resolve({ok:true});},cancel(){return {ok:true};},dispose(){}};
  const player=createPlayer(definition,state,appearance,{palette,defaultColor:'#ffffff'},scene).value;
  const pending=player.turn('X',[1],-1,0); player[action]();
  assert.equal((await pending).ok,true); assert.notEqual(player.state(),state); assert.deepEqual(player.projection(),displayed);
  if(action==='cancel'){const next=player.turn('Y',[1],-1,0);assert.equal((await next).ok,true);assert.deepEqual(player.projection(),displayed);}
 }
});

test('real viewer completion and cancellation keep canonical state synchronized',async()=>{
 const {createSceneForTest}=await import('../packages/viewer/dist/scene.js');
 const definition=definitionText(2), d=Codec.decodeDefinition(definition)._0, initial=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 let time=0,id=0;const frames=new Map();const clock={now:()=>time,request:cb=>{frames.set(++id,cb);return id;},cancel:i=>frames.delete(i)};
 const step=ms=>{time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb(time));};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render(){},dispose(){}});
 const player=createPlayer(definition,initial,appearance,{palette,defaultColor:'#ffffff'},scene).value;
 assert.equal((await scene.setProjection(player.projection())).ok,true);step(0);
 const zero=player.turn('X',[1],-1,0);player.cancel();assert.equal((await zero).ok,true);
 const afterZero=player.state(); assert.notEqual(afterZero,initial);
 const animation=player.turn('Y',[1],-1,100);step(100);player.cancel();assert.equal((await animation).ok,true);
 const afterAnimation=player.state();assert.notEqual(afterAnimation,afterZero);
 const pending=player.turn('X',[1],1,100);step(50);player.cancel();assert.equal((await pending).error.code,'Cancelled');assert.equal(player.state(),afterAnimation);
 assert.equal((await player.turn('Y',[1],1,0)).ok,true);player.dispose();
});

test('overlapping wire piece and sticker IDs have distinct reversible viewer IDs',()=>{
 const wire=JSON.parse(definitionText(2));wire.pieces[0].stickers[0].id=wire.pieces[0].id;
 const definition=JSON.stringify(wire), d=Codec.decodeDefinition(definition)._0;
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 const result=open(definition,Codec.encodeState(Codec.homeState(d)),appearance,{palette,defaultColor:'#ffffff'});
 assert.equal(result.ok,true);assert.equal(validateProjection(result.value.projection).ok,true);
 const piece=result.value.projection.pieces.find(p=>p.id===`piece:${wire.pieces[0].id}`);
 assert.ok(piece.stickers.some(s=>s.id===`sticker:${wire.pieces[0].id}`));
 assert.equal(result.value.ids.pieces.find(p=>p.wire===wire.pieces[0].id).viewer,piece.id);
 assert.equal(result.value.ids.stickers.find(s=>s.wire===wire.pieces[0].id).viewer,`sticker:${wire.pieces[0].id}`);
});

test('explicit presentation dimensions map to viewer geometry without changing wire state',()=>{
 const definition=definitionText(2),d=Codec.decodeDefinition(definition)._0,state=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 const presentation={cellSize:1,bodyGap:.01,bodyRadius:.058,stickerWidth:.86,stickerRadius:.045,stickerOffset:.5};
 const result=open(definition,state,appearance,{palette,defaultColor:'#ffffff',presentation});
 assert.equal(result.ok,true);assert.equal(validateProjection(result.value.projection).ok,true);
 assert.deepEqual(result.value.projection.geometryProfile.body,{kind:'roundedBox',gap:.01,radius:.058,bevelSegments:3});
 const piece=result.value.projection.pieces[0], sticker=piece.stickers[0];
 assert.deepEqual(piece.geometry.cellSize,[1,1,1]);assert.deepEqual(sticker.size,[.86,.86]);assert.equal(sticker.geometry.cornerRadius,.045);
 assert.equal(Math.hypot(...sticker.transform.position),.5);assert.equal(Codec.encodeState(result.value.state),state);
 assert.equal(open(definition,state,appearance,{palette,defaultColor:'#ffffff',presentation:{...presentation,stickerWidth:-1}}).ok,false);
});

test('explicit source profile survives a real Core move and validates its viewer transition',async()=>{
 const definition=definitionText(2),d=Codec.decodeDefinition(definition)._0,state=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 const presentation={cellSize:1,bodyGap:.01,bodyRadius:.058,stickerWidth:.86,stickerRadius:.045,stickerOffset:.5};
 let count=0;const scene={transition(t){count++;assert.equal(validateTransition(t).ok,true);return Promise.resolve({ok:true});},cancel(){return {ok:true};},dispose(){}};
 const player=createPlayer(definition,state,appearance,{palette,defaultColor:'#ffffff',presentation},scene).value;
 assert.equal((await player.turn('X',[1],-1,0)).ok,true);assert.equal(count,1);assert.notEqual(player.state(),state);
});

test('application render profile remains attached across Core transitions',async()=>{
 const definition=definitionText(2),d=Codec.decodeDefinition(definition)._0,state=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'a',definitionId:'cube2',stickers:[]});
 const palette={white:'#ffffff',yellow:'#ffffff',green:'#ffffff',blue:'#ffffff',red:'#ff0000',orange:'#ffffff'};
 const profile={kind:'cubeAssemblerV1',size:2,meshes:JSON.parse(definition).pieces.map(p=>({pieceId:`piece:${p.id}`,positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],colors:Array(9).fill(.5),occlusion:[1,1,1],indices:[0,1,2],surfaces:[{role:'body',firstIndex:0,indexCount:3}]}))};let transition;
 const player=createPlayer(definition,state,appearance,{palette,defaultColor:'#ffffff',renderProfile:profile},{transition(t){transition=t;return Promise.resolve({ok:true});},cancel(){},dispose(){}}).value;
 assert.deepEqual(player.projection().renderProfile,profile);assert.equal(validateProjection(player.projection()).ok,true);await player.turn('X',[1],-1,0);assert.deepEqual(transition.to.renderProfile,profile);assert.equal(validateTransition(transition).ok,true);
});

test('explicit decorative core remains a scene setting, not a Core piece',()=>{
 const definition=definitionText(2),d=Codec.decodeDefinition(definition)._0,state=Codec.encodeState(Codec.homeState(d));
 const appearance=JSON.stringify({schema:'puzlwerk.appearance',revision:1,id:'classic',definitionId:'cube2',stickers:[]});
 const options={palette:{red:'#ff0000',white:'#ffffff',green:'#00ff00',blue:'#0000ff',orange:'#ff8800',yellow:'#ffff00'},defaultColor:'#ffffff',core:{center:[0,0,0],halfExtent:1}};
 const result=open(definition,state,appearance,options);assert.equal(result.ok,true);assert.deepEqual(result.value.projection.core,options.core);assert.equal(result.value.projection.pieces.some(piece=>piece.id==='core'),false);
});
