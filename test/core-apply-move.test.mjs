import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Shell from '../core/res/PwShell.res.mjs';
import * as Move from '../core/res/PwMove.res.mjs';
import * as Codec from '../core/res/PwCodec.res.mjs';
import * as Validate from '../core/res/PwValidate.res.mjs';
import { definitionText } from './helpers/cube-model.mjs';

const ok = r => { assert.equal(r.TAG, 'Ok'); return r._0; };
const definition = n => ok(Codec.decodeDefinition(definitionText(n)));
const move = (n, axis, layers, turns) => ok(Move.make(ok(Shell.makeSize(n)), axis, layers, turns));

test('policy-aware moves apply atomically and preserve definition binding', () => {
  const d = definition(3), initial = Codec.homeState(d), before = Codec.encodeState(initial);
  const r = move(3, 'X', [2], -1), u = move(3, 'Y', [2], -1);
  const afterR = ok(Validate.applyMove(d, initial, r));
  assert.notEqual(Codec.encodeState(afterR), before);
  assert.deepEqual(JSON.parse(Codec.encodeState(afterR)).poses.find(p => p.pieceId === 'BR').position, [2, -2, 0]);
  const afterU = ok(Validate.applyMove(d, afterR, u));
  const undoU = ok(Validate.applyMove(d, afterU, Move.inverse(u)));
  assert.equal(Codec.encodeState(undoU), Codec.encodeState(afterR));
  assert.equal(Codec.encodeState(ok(Validate.applyMove(d, undoU, Move.inverse(r)))), before);
  assert.equal(Validate.applyMove(d, initial, move(3, 'X', [1], 1)).TAG, 'Error');
  assert.equal(Validate.applyMove(d, initial, move(2, 'X', [1], 1)).TAG, 'Error');
  assert.equal(Validate.applyMove(d, Codec.homeState(definition(2)), r).TAG, 'Error');
  const other = ok(Codec.decodeDefinition(definitionText(3).replace('cube3', 'other3')));
  assert.equal(Validate.applyMove(other, initial, r).TAG, 'Error');
  assert.equal(Codec.encodeState(initial), before);
});
