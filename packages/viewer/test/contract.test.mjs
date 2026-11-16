import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProjection, validateTransition } from '../dist/contract.js';

const t = (position = [0, 0, 0], rotation = [0, 0, 0, 1]) => ({ position, rotation });
const piece = (id, position) => ({ id, transform: t(position), stickers: [{ id: `${id}-s`, transform: t(), size: [1, 1], color: '#fff' }] });
const from = { pieces: [piece('a', [1, 0, 0]), piece('b', [-1, 0, 0])] };
const to = { pieces: [piece('a', [0, 1, 0]), piece('b', [-1, 0, 0])] };
to.pieces[0].transform.rotation = [0, 0, Math.SQRT1_2, Math.SQRT1_2];
const turn = { from, to, pieceIds: ['a'], axis: [0, 0, 1], signedAngleRadians: Math.PI / 2, pivot: [0, 0, 0], durationMs: 100 };

test('projection rejects duplicate IDs, invalid transforms, and sticker sizes', () => {
  assert.equal(validateProjection(from).ok, true);
  for (const invalid of [
    { pieces: [from.pieces[0], from.pieces[0]] },
    { pieces: [piece('a', [NaN, 0, 0])] },
    { pieces: [{ ...piece('a', [0, 0, 0]), stickers: [{ ...piece('a', [0, 0, 0]).stickers[0], size: [0, 1] }] }] },
  ]) assert.equal(validateProjection(invalid).error.code, 'InvalidProjection');
});

test('transition checks signed target and retains unselected definitions', () => {
  assert.equal(validateTransition(turn).ok, true);
  for (const invalid of [
    { ...turn, signedAngleRadians: -Math.PI / 2 },
    { ...turn, durationMs: -1 },
    { ...turn, axis: [0, 0, 2] },
    { ...turn, pieceIds: ['a', 'a'] },
    { ...turn, to: { pieces: [to.pieces[0], piece('b', [-2, 0, 0])] } },
  ]) assert.equal(validateTransition(invalid).error.code, 'InvalidTransition');
});
test('equivalent sticker field and array order does not change transition identity', () => {
  const reordered={pieces:to.pieces.map(p=>({stickers:p.stickers.map(s=>({color:s.color,size:s.size,transform:s.transform,id:s.id})).reverse(),transform:p.transform,id:p.id})).reverse()};
  assert.equal(validateTransition({...turn,to:reordered}).ok,true);
});

test('sparse geometry arrays are rejected before rendering', () => {
  const base={pieces:[{id:'p',transform:{position:[0,0,0],rotation:[0,0,0,1]},stickers:[],geometry:{cellSize:[1,1,1],outerSides:[[true,false],[true,false],[true,false]]}}]};
  for(const geometry of [{cellSize:[1,,1],outerSides:base.pieces[0].geometry.outerSides},{cellSize:[1,1,1],outerSides:new Array(3)},{cellSize:[1,1,1],outerSides:[[true,,],[true,false],[true,false]]}]) {
    assert.equal(validateProjection({pieces:[{...base.pieces[0],geometry}]}).error.code,'InvalidProjection');
  }
});

test('presentation and independent core metadata are validated and invariant', () => {
  const metadata={presentation:{size:7,nominalEdge:7},core:{center:[1,2,3],halfExtent:3.5}};
  const withMeta={...from,...metadata};
  assert.equal(validateProjection(withMeta).ok,true);
  for (const invalid of [
    {presentation:{size:1,nominalEdge:2}}, {presentation:{size:7.1,nominalEdge:7}},
    {presentation:{size:8,nominalEdge:7}}, {presentation:{size:3,nominalEdge:0}},
    {presentation:{size:3,nominalEdge:Infinity}}, {core:{center:[1,,3],halfExtent:1}},
    {core:{center:[1,2,NaN],halfExtent:1}}, {core:{center:[1,2,3],halfExtent:0}},
  ]) assert.equal(validateProjection({...from,...invalid}).error.code,'InvalidProjection');
  assert.equal(validateProjection({pieces:[],core:metadata.core}).ok,true);
  assert.equal(validateTransition({...turn,from:withMeta,to:{...to,...metadata}}).ok,true);
  assert.equal(validateTransition({...turn,from:withMeta,to:{...to,...metadata,core:{...metadata.core,halfExtent:4}}}).error.code,'InvalidTransition');
  assert.equal(validateTransition({...turn,from:withMeta,to:{...to,...metadata,presentation:{size:7,nominalEdge:7.1}}}).error.code,'InvalidTransition');
});

test('explicit artwork metadata validates source frames, edge stops and picture associations',()=>{
 const sticker={id:'art',transform:t([0,0,.5]),size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0],edgeColors:{left:[{to:.3,color:'#ffffff'},{to:1,color:'#ff0000'}]}},picture:{face:'F',layerIndex:[0,1,1]}};
 const picture={widths:[1,1],faces:{U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'}};
 const p={pieces:[{id:'p',transform:t(),stickers:[sticker]}],appearance:{construction:'stickerless',miterCutFaces:true},picture};
 assert.equal(validateProjection(p).ok,true);
 for(const patch of [{sourceFace:{normal:[0,0,1],up:[0,0,1]}},{sourceFace:{normal:[0,0,1],up:[0,1,0],edgeColors:{left:[]}}},{picture:{face:'F',layerIndex:[0,,1]}},{picture:{face:'R',layerIndex:[0,1,1]}}]) {
  const changed={...p,pieces:[{...p.pieces[0],stickers:[{...sticker,...patch}]}]};assert.equal(validateProjection(changed).error.code,'InvalidProjection');
 }
 assert.equal(validateProjection({...p,picture:undefined}).error.code,'InvalidProjection');
 assert.equal(validateProjection({...p,picture:{...picture,faces:{...picture.faces,B:''}}}).error.code,'InvalidProjection');
 assert.equal(validateProjection({...p,appearance:{construction:'invalid'}}).error.code,'InvalidProjection');
 assert.equal(validateProjection({pieces:[]}).ok,true);
});

test('artwork and picture metadata cannot change during a transition',()=>{
 const s={...piece('a',[1,0,0]),stickers:[{...piece('a',[1,0,0]).stickers[0],sourceFace:{normal:[0,0,1],up:[0,1,0]}}]};
 const src={pieces:[s],appearance:{construction:'stickered'}};
 const dst={pieces:[{...s,transform:t([-1,0,0],[0,0,1,0])}],appearance:{construction:'stickerless'}};
 assert.equal(validateTransition({from:src,to:dst,pieceIds:['a'],axis:[0,0,1],signedAngleRadians:Math.PI,pivot:[0,0,0],durationMs:100}).error.code,'InvalidTransition');
});

test('source-face-only annotations require perpendicular axes and dense nonempty stops',()=>{
 const valid={id:'s',transform:t(),size:[.8,.8],color:'#fff',sourceFace:{normal:[0,0,1],up:[0,1,0]}};
 const make=sourceFace=>({pieces:[{id:'p',transform:t(),stickers:[{...valid,sourceFace}]}]});
 assert.equal(validateProjection(make(valid.sourceFace)).ok,true);
 assert.equal(validateProjection(make({normal:[0,0,1],up:[0,0,1]})).error.code,'InvalidProjection');
 assert.equal(validateProjection(make({normal:[0,0,1],up:[0,1,0],edgeColors:{left:[]}})).error.code,'InvalidProjection');
 assert.equal(validateProjection(make({normal:[0,0,1],up:[0,1,0],edgeColors:{left:[,{to:1,color:'#ffffff'}]}})).error.code,'InvalidProjection');
});

test('picture faces must be six explicit own IDs',()=>{
 const faces=Object.assign(Object.create({B:'b'}),{U:'u',R:'r',F:'f',D:'d',L:'l',other:'x'});
 const s={id:'s',transform:t(),size:[.8,.8],color:'#fff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[0,0,0]}};
 assert.equal(validateProjection({pieces:[{id:'p',transform:t(),stickers:[s]}],picture:{widths:[1],faces}}).error.code,'InvalidProjection');
});

test('source null body color requests the default while malformed color is rejected',()=>{
 assert.equal(validateProjection({pieces:[],appearance:{construction:'stickerless',bodyColor:null}}).ok,true);
 assert.equal(validateProjection({pieces:[],appearance:{construction:'stickerless',bodyColor:'red'}}).error.code,'InvalidProjection');
});

test('source edge colors must be a record of source edge values',()=>{
 const s={id:'s',transform:t(),size:[.8,.8],color:'#fff',sourceFace:{normal:[0,0,1],up:[0,1,0],edgeColors:7}};
 assert.equal(validateProjection({pieces:[{id:'p',transform:t(),stickers:[s]}]}).error.code,'InvalidProjection');
});
