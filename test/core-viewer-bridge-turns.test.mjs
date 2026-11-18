import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Codec from '../core/res/PwCodec.res.mjs';
import * as Move from '../core/res/PwMove.res.mjs';
import * as Shell from '../core/res/PwShell.res.mjs';
import * as Validate from '../core/res/PwValidate.res.mjs';
import { open } from '../packages/core-viewer-bridge/src/index.mjs';
import { cubeStateDocuments, cubeStateFromWire, cubeTurnToMove, moveToCubeTurn, FACE_KEYS } from '../packages/core-viewer-bridge/src/cube-state.mjs';
import { ACCEPTED_MAX_SIZE } from '../packages/viewer/dist/size-range.js';

// Colors of the solved cube, written out: U white, R red, F green, D yellow, L orange, B blue.
const COLORS = { u: 'W', r: 'R', f: 'G', d: 'Y', l: 'O', b: 'B' };
const PALETTE = { W: '#f7f6f1', O: '#ff7a1a', G: '#1e9e57', R: '#cf2a3a', B: '#2459d6', Y: '#f2d21b' };
const solved = (n) => Object.fromEntries(FACE_KEYS.map((f) => [f, Array(n * n).fill(COLORS[f])]));
const cache = new Map();
const docs = (n, policy) => {
  const key = `${n}/${policy}`;
  if (!cache.has(key)) {
    const made = cubeStateDocuments(n, solved(n), PALETTE, policy === undefined ? undefined : { movePolicy: policy });
    assert.equal(made.ok, true, JSON.stringify(made));
    cache.set(key, made.value);
  }
  return cache.get(key);
};
// Applies a Core move to the documents' home state with the Core's own move rules and reads the facelets back.
const turned = (n, move, policy) => {
  const d = docs(n, policy);
  const definition = Codec.decodeDefinition(d.definition)._0, state = Codec.decodeState(definition, d.state)._0;
  const made = Move.make(Shell.makeSize(n)._0, move.axis, move.layers, move.turns);
  assert.equal(made.TAG, 'Ok');
  const next = Validate.applyMove(definition, state, made._0);
  if (next.TAG !== 'Ok') return { rejected: next._0 };
  const back = cubeStateFromWire(n, Codec.encodeState(next._0), d.appearance);
  assert.equal(back.ok, true);
  return back.value;
};
const changed = (cube, n) => FACE_KEYS.flatMap((f) => cube[f].flatMap((c, i) => (c !== COLORS[f] ? [`${f}${i}=${c}`] : []))).sort();
const cells = (f, list, c) => list.map((i) => `${f}${i}=${c}`);

test('CubeAssembler turns of the outer layers move the facelets like the standard notation (written-out 3x3 oracle)', () => {
  const turn = (face, turns = 1, depth = 1, width) => cubeTurnToMove(3, { face, depth, turns, ...(width ? { width } : {}) });
  const expectFacelets = (t, expected) => {
    const made = t; assert.equal(made.ok, true, JSON.stringify(made));
    assert.deepEqual(changed(turned(3, made.value), 3), expected.sort());
  };
  // R: the F column on the right goes up to U, U to B, B to D, D to F.
  expectFacelets(turn('R'), [...cells('u', [2, 5, 8], 'G'), ...cells('b', [0, 3, 6], 'W'), ...cells('d', [2, 5, 8], 'B'), ...cells('f', [2, 5, 8], 'Y')]);
  // L: U goes to F, F to D, D to B, B to U.
  expectFacelets(turn('L'), [...cells('f', [0, 3, 6], 'W'), ...cells('d', [0, 3, 6], 'G'), ...cells('b', [2, 5, 8], 'Y'), ...cells('u', [0, 3, 6], 'B')]);
  // U: the rows move F to L, L to B, B to R, R to F.
  expectFacelets(turn('U'), [...cells('l', [0, 1, 2], 'G'), ...cells('b', [0, 1, 2], 'O'), ...cells('r', [0, 1, 2], 'B'), ...cells('f', [0, 1, 2], 'R')]);
  // R' is the inverse of R, R2 equals two R.
  expectFacelets(turn('R', -1), [...cells('u', [2, 5, 8], 'B'), ...cells('b', [0, 3, 6], 'Y'), ...cells('d', [2, 5, 8], 'G'), ...cells('f', [2, 5, 8], 'W')]);
  expectFacelets(turn('R', 2), [...cells('u', [2, 5, 8], 'Y'), ...cells('b', [0, 3, 6], 'G'), ...cells('d', [2, 5, 8], 'W'), ...cells('f', [2, 5, 8], 'B')]);
  // Turns count modulo four, as in CubeAssembler's history: 3 is R', -2 is R2.
  assert.deepEqual(turn('R', 3).value, turn('R', -1).value);
  assert.deepEqual(turn('R', -2).value, turn('R', 2).value);
});

test('inner slices, blocks and whole-cube turns of CubeAssembler need the policy any', () => {
  const slice = cubeTurnToMove(3, { face: 'R', depth: 2, turns: 1 }); // "2R": the middle slice, same direction as R
  assert.deepEqual(slice.value, { axis: 'X', layers: [1], turns: -1 });
  assert.deepEqual(turned(3, slice.value), { rejected: 'IllegalMove' }, 'outer-wide rejects an inner single layer');
  const any = turned(3, slice.value, 'any');
  assert.deepEqual(changed(any, 3), [...cells('u', [1, 4, 7], 'G'), ...cells('b', [1, 4, 7], 'W'), ...cells('d', [1, 4, 7], 'B'), ...cells('f', [1, 4, 7], 'Y')].sort());
  // "Rw" is allowed by both policies; "x" (the whole cube) only by any.
  const wide = cubeTurnToMove(3, { face: 'R', depth: 2, width: 2, turns: 1 });
  assert.deepEqual(wide.value, { axis: 'X', layers: [1, 2], turns: -1 });
  assert.equal(turned(3, wide.value).rejected, undefined);
  const whole = cubeTurnToMove(3, { face: 'R', depth: 3, width: 3, turns: 1 });
  assert.deepEqual(whole.value, { axis: 'X', layers: [0, 1, 2], turns: -1 });
  assert.deepEqual(turned(3, whole.value), { rejected: 'IllegalMove' });
  const x = turned(3, whole.value, 'any');
  assert.deepEqual(x.u, Array(9).fill('G'));
  assert.deepEqual(x.f, Array(9).fill('Y'));
  assert.deepEqual(x.d, Array(9).fill('B'));
  assert.deepEqual(x.b, Array(9).fill('W'));
});

test('the policy any applies to every size 2..15: all inner single layers are accepted, outer-wide rejects n-2 of them', () => {
  for (let n = 2; n <= ACCEPTED_MAX_SIZE; n++) {
    let rejected = 0;
    for (let depth = 1; depth <= n; depth++) {
      const made = cubeTurnToMove(n, { face: 'F', depth, turns: 1 });
      assert.equal(made.ok, true);
      assert.equal(turned(n, made.value, 'any').rejected, undefined, `any ${n} depth ${depth}`);
      if (turned(n, made.value).rejected) rejected++;
    }
    assert.equal(rejected, n - 2, `outer-wide rejects the inner single layers of ${n}`);
  }
});

test('the move policy option has two values; the default stays outer-wide', () => {
  assert.equal(JSON.parse(docs(3).definition).movePolicy, 'outer-wide');
  assert.equal(JSON.parse(docs(3, 'outer-wide').definition).movePolicy, 'outer-wide');
  assert.equal(JSON.parse(docs(3, 'any').definition).movePolicy, 'any');
  assert.deepEqual(cubeStateDocuments(3, solved(3), PALETTE, { movePolicy: 'inner' }), { ok: false, error: { code: 'InvalidPolicy' } });
});

test('turn mapping rejects what is no turn of the cube', () => {
  const bad = (n, turn) => cubeTurnToMove(n, turn).error?.code;
  assert.equal(bad(3, { face: 'R', depth: 1, turns: 0 }), 'InvalidTurn');
  assert.equal(bad(3, { face: 'R', depth: 1, turns: 4 }), 'InvalidTurn');
  assert.equal(bad(3, { face: 'R', depth: 0, turns: 1 }), 'InvalidTurn');
  assert.equal(bad(3, { face: 'R', depth: 4, turns: 1 }), 'InvalidTurn');
  assert.equal(bad(3, { face: 'R', depth: 1, width: 2, turns: 1 }), 'InvalidTurn');
  assert.equal(bad(3, { face: 'X', depth: 1, turns: 1 }), 'InvalidTurn');
  assert.equal(bad(1, { face: 'R', depth: 1, turns: 1 }), 'InvalidSize');
  assert.equal(bad(3, { face: 'R', depth: 1.5, turns: 1 }), 'InvalidTurn');
});

test('a Core move maps back to a CubeAssembler turn that maps to the same move, for all sizes 2..15', () => {
  for (let n = 2; n <= ACCEPTED_MAX_SIZE; n++) {
    for (const axis of ['X', 'Y', 'Z']) for (const turns of [-1, 1, 2]) {
      for (const [first, last] of [[0, 0], [n - 1, n - 1], [0, n - 1], [Math.floor(n / 2), Math.floor(n / 2)], [1, Math.min(2, n - 1)]]) {
        const layers = Array.from({ length: last - first + 1 }, (_, i) => first + i);
        const turn = moveToCubeTurn(n, { axis, layers, turns });
        assert.equal(turn.ok, true, JSON.stringify([n, axis, layers, turns, turn]));
        assert.deepEqual(cubeTurnToMove(n, turn.value).value, { axis, layers, turns }, JSON.stringify([n, axis, layers, turns, turn.value]));
      }
    }
  }
  // The face is the nearer one; on a tie the positive one (U, R, F).
  assert.deepEqual(moveToCubeTurn(3, { axis: 'X', layers: [1], turns: -1 }).value, { face: 'R', depth: 2, turns: 1 });
  assert.deepEqual(moveToCubeTurn(5, { axis: 'Y', layers: [1], turns: 1 }).value, { face: 'D', depth: 2, turns: 1 });
  assert.deepEqual(moveToCubeTurn(5, { axis: 'Z', layers: [3, 4], turns: 2 }).value, { face: 'F', depth: 2, width: 2, turns: 2 });
  assert.equal(moveToCubeTurn(5, { axis: 'Z', layers: [0, 2], turns: 1 }).error.code, 'InvalidMove');
  assert.equal(moveToCubeTurn(5, { axis: 'Z', layers: [], turns: 1 }).error.code, 'InvalidMove');
  assert.equal(moveToCubeTurn(5, { axis: 'Z', layers: [5], turns: 1 }).error.code, 'InvalidMove');
  assert.equal(moveToCubeTurn(5, { axis: 'Z', layers: [0], turns: 3 }).error.code, 'InvalidMove');
});

test('both policies share the definition id cube<n>; only text and hash differ, and state, appearance and open work with either', () => {
  for (const n of [2, 3, 7, 15]) {
    const a = docs(n, 'outer-wide'), b = docs(n, 'any');
    assert.equal(JSON.parse(a.definition).id, `cube${n}`);
    assert.equal(JSON.parse(b.definition).id, `cube${n}`);
    assert.notEqual(a.definition, b.definition);
    assert.equal(a.definition.replace('"outer-wide"', '"any"'), b.definition, 'only the policy differs');
    assert.equal(a.state, b.state);
    assert.equal(a.appearance, b.appearance);
    for (const d of [a, b]) {
      assert.deepEqual(cubeStateFromWire(n, d.state, d.appearance).value, solved(n));
      assert.equal(open(d.definition, d.state, d.appearance, d.options).ok, true);
    }
    // The appearance of one policy is accepted by the other definition.
    assert.equal(open(b.definition, a.state, a.appearance, a.options).ok, true);
    assert.equal(open(a.definition, b.state, b.appearance, b.options).ok, true);
  }
});

// Written-out 3x3 tables for all six faces, the inner slices, blocks and the whole cube, with the policy any (solved colors above).
// Each entry: [CubeAssembler turn, expected changed facelets as [face, indices, color]].
const TABLES = [
  ['F', { face: 'F', depth: 1, turns: 1 }, [['r', [0, 3, 6], 'W'], ['d', [0, 1, 2], 'R'], ['l', [2, 5, 8], 'Y'], ['u', [6, 7, 8], 'O']]],
  ["F'", { face: 'F', depth: 1, turns: -1 }, [['u', [6, 7, 8], 'R'], ['r', [0, 3, 6], 'Y'], ['d', [0, 1, 2], 'O'], ['l', [2, 5, 8], 'W']]],
  ['F2', { face: 'F', depth: 1, turns: 2 }, [['u', [6, 7, 8], 'Y'], ['d', [0, 1, 2], 'W'], ['l', [2, 5, 8], 'R'], ['r', [0, 3, 6], 'O']]],
  ['B', { face: 'B', depth: 1, turns: 1 }, [['l', [0, 3, 6], 'W'], ['d', [6, 7, 8], 'O'], ['r', [2, 5, 8], 'Y'], ['u', [0, 1, 2], 'R']]],
  ["B'", { face: 'B', depth: 1, turns: -1 }, [['u', [0, 1, 2], 'O'], ['l', [0, 3, 6], 'Y'], ['d', [6, 7, 8], 'R'], ['r', [2, 5, 8], 'W']]],
  ['D', { face: 'D', depth: 1, turns: 1 }, [['r', [6, 7, 8], 'G'], ['b', [6, 7, 8], 'R'], ['l', [6, 7, 8], 'B'], ['f', [6, 7, 8], 'O']]],
  ["D'", { face: 'D', depth: 1, turns: -1 }, [['f', [6, 7, 8], 'R'], ['r', [6, 7, 8], 'B'], ['b', [6, 7, 8], 'O'], ['l', [6, 7, 8], 'G']]],
  ['2F (slice like F)', { face: 'F', depth: 2, turns: 1 }, [['r', [1, 4, 7], 'W'], ['d', [3, 4, 5], 'R'], ['l', [1, 4, 7], 'Y'], ['u', [3, 4, 5], 'O']]],
  ['2B (slice like B)', { face: 'B', depth: 2, turns: 1 }, [['l', [1, 4, 7], 'W'], ['d', [3, 4, 5], 'O'], ['r', [1, 4, 7], 'Y'], ['u', [3, 4, 5], 'R']]],
  ['2U (slice like U)', { face: 'U', depth: 2, turns: 1 }, [['l', [3, 4, 5], 'G'], ['b', [3, 4, 5], 'O'], ['r', [3, 4, 5], 'B'], ['f', [3, 4, 5], 'R']]],
  ['2D (slice like D)', { face: 'D', depth: 2, turns: 1 }, [['r', [3, 4, 5], 'G'], ['b', [3, 4, 5], 'R'], ['l', [3, 4, 5], 'B'], ['f', [3, 4, 5], 'O']]],
  ['2L (slice like L)', { face: 'L', depth: 2, turns: 1 }, [['f', [1, 4, 7], 'W'], ['d', [1, 4, 7], 'G'], ['b', [1, 4, 7], 'Y'], ['u', [1, 4, 7], 'B']]],
  ['Fw (F and the slice)', { face: 'F', depth: 2, width: 2, turns: 1 }, [['r', [0, 3, 6, 1, 4, 7], 'W'], ['d', [0, 1, 2, 3, 4, 5], 'R'], ['l', [2, 5, 8, 1, 4, 7], 'Y'], ['u', [6, 7, 8, 3, 4, 5], 'O']]],
  ['Bw (B and the slice)', { face: 'B', depth: 2, width: 2, turns: 1 }, [['l', [0, 3, 6, 1, 4, 7], 'W'], ['d', [6, 7, 8, 3, 4, 5], 'O'], ['r', [2, 5, 8, 1, 4, 7], 'Y'], ['u', [0, 1, 2, 3, 4, 5], 'R']]],
  ['Uw (U and the slice)', { face: 'U', depth: 2, width: 2, turns: 1 }, [['l', [0, 1, 2, 3, 4, 5], 'G'], ['b', [0, 1, 2, 3, 4, 5], 'O'], ['r', [0, 1, 2, 3, 4, 5], 'B'], ['f', [0, 1, 2, 3, 4, 5], 'R']]],
];
const WHOLE = [
  ['x (like R)', { face: 'R', depth: 3, width: 3, turns: 1 }, { u: 'G', f: 'Y', d: 'B', b: 'W' }],
  ["x' (like R')", { face: 'R', depth: 3, width: 3, turns: -1 }, { u: 'B', f: 'W', d: 'G', b: 'Y' }],
  ['y (like U)', { face: 'U', depth: 3, width: 3, turns: 1 }, { l: 'G', b: 'O', r: 'B', f: 'R' }],
  ['z (like F)', { face: 'F', depth: 3, width: 3, turns: 1 }, { r: 'W', d: 'R', l: 'Y', u: 'O' }],
  ['whole like L', { face: 'L', depth: 3, width: 3, turns: 1 }, { f: 'W', d: 'G', b: 'Y', u: 'B' }],
  ['whole like D', { face: 'D', depth: 3, width: 3, turns: 1 }, { r: 'G', b: 'R', l: 'B', f: 'O' }],
  ['whole like B', { face: 'B', depth: 3, width: 3, turns: 1 }, { l: 'W', d: 'O', r: 'Y', u: 'R' }],
];
test('written-out 3x3 tables for D, F, B, inner slices of every axis and blocks, with the policy any', () => {
  for (const [name, turn, expected] of TABLES) {
    const move = cubeTurnToMove(3, turn);
    assert.equal(move.ok, true, name);
    const want = expected.flatMap(([f, list, c]) => cells(f, list, c)).sort();
    assert.deepEqual(changed(turned(3, move.value, 'any'), 3), want, name);
    // The same move comes back as the same turn's move.
    assert.deepEqual(cubeTurnToMove(3, moveToCubeTurn(3, move.value).value).value, move.value, `${name} round trip`);
  }
});
test('written-out 3x3 whole-cube rotations for all faces', () => {
  for (const [name, turn, faces] of WHOLE) {
    const move = cubeTurnToMove(3, turn);
    assert.equal(move.ok, true, name);
    const cube = turned(3, move.value, 'any');
    for (const f of FACE_KEYS) assert.deepEqual(cube[f], Array(9).fill(faces[f] ?? COLORS[f]), `${name} ${f}`);
  }
});

test('face letters are the capitals U R F D L B; options must be an object and the policy one of the two values', () => {
  for (const face of ['r', 'u', 'f', 'd', 'l', 'b', 'Rw', '', 'X', undefined, null, 1]) assert.equal(cubeTurnToMove(3, { face, depth: 1, turns: 1 }).error?.code, 'InvalidTurn', String(face));
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) assert.equal(cubeTurnToMove(3, { face, depth: 1, turns: 1 }).ok, true, face);
  for (const options of ['any', null, 5, true, [], ['any']]) assert.deepEqual(cubeStateDocuments(3, solved(3), PALETTE, options), { ok: false, error: { code: 'InvalidPolicy' } }, JSON.stringify(options));
  for (const movePolicy of [null, 1, 'Any', '']) assert.deepEqual(cubeStateDocuments(3, solved(3), PALETTE, { movePolicy }), { ok: false, error: { code: 'InvalidPolicy' } }, JSON.stringify(movePolicy));
  for (const options of [undefined, {}, { movePolicy: undefined }, { movePolicy: 'any' }]) assert.equal(cubeStateDocuments(3, solved(3), PALETTE, options).ok, true);
});
