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
