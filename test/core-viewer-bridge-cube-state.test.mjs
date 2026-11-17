import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Codec from '../core/res/PwCodec.res.mjs';
import * as Move from '../core/res/PwMove.res.mjs';
import * as Shell from '../core/res/PwShell.res.mjs';
import * as Validate from '../core/res/PwValidate.res.mjs';
import { open } from '../packages/core-viewer-bridge/src/index.mjs';
import { cubeStateDocuments, cubeStateFromWire, faceStickerIds, FACE_KEYS } from '../packages/core-viewer-bridge/src/cube-state.mjs';
import { validateProjection } from '../packages/viewer/dist/contract.js';
import { standardLayerWidths } from '../packages/viewer/dist/layer-widths.js';
import { mulberry32 } from './helpers/cube-model.mjs';

const PALETTE = { W: '#f7f6f1', O: '#ff7a1a', G: '#1e9e57', R: '#cf2a3a', B: '#2459d6', Y: '#f2d21b' };
const TOKENS = Object.keys(PALETTE);
const solved = (n) => Object.fromEntries(FACE_KEYS.map((f, i) => [f, Array(n * n).fill('URFDLB'[i] === 'U' ? 'W' : { R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' }['URFDLB'[i]])]));
// Each facelet gets its own number as token: a mix-up of any two positions becomes visible.
const numbered = (n) => Object.fromEntries(FACE_KEYS.map((f, i) => [f, Array.from({ length: n * n }, (_, k) => `t${i * n * n + k}`)]));
const numberedPalette = (n) => Object.fromEntries(Array.from({ length: 6 * n * n }, (_, k) => [`t${k}`, '#123456']));
const random = (n, seed) => {
  const rand = mulberry32(seed);
  return Object.fromEntries(FACE_KEYS.map((f) => [f, Array.from({ length: n * n }, () => TOKENS[Math.floor(rand() * 6)])]));
};
const documents = (n, cube, palette = PALETTE) => {
  const made = cubeStateDocuments(n, cube, palette);
  assert.equal(made.ok, true, JSON.stringify(made));
  return made.value;
};

test('facelets of a CubeState survive the wire translation for sizes 2 to 7', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    for (const [name, cube, palette] of [['numbered', numbered(n), numberedPalette(n)], ['random', random(n, 1000 + n), PALETTE]]) {
      const d = documents(n, cube, palette);
      const back = cubeStateFromWire(n, d.state, d.appearance);
      assert.equal(back.ok, true, `${n} ${name} ${JSON.stringify(back)}`);
      assert.deepEqual(back.value, cube, `${n} ${name}`);
    }
  }
});

test('definition is canonical wire v1 with every surface slot once', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const d = documents(n, solved(n));
    const definition = Codec.decodeDefinition(d.definition);
    assert.equal(definition.TAG, 'Ok', `${n} ${JSON.stringify(definition)}`);
    assert.equal(Codec.encodeDefinition(definition._0), d.definition);
    assert.equal(Codec.pieces(definition._0).length, Shell.slotCount(Shell.makeSize(n)._0));
    assert.equal(Codec.decodeState(definition._0, d.state).TAG, 'Ok');
    assert.equal(Codec.encodeState(Codec.decodeState(definition._0, d.state)._0), d.state);
  }
});

test('an outer turn of the translated state rotates the facelet rings like a real cube', () => {
  for (const n of [3, 4, 5, 7]) {
    const cube = numbered(n), d = documents(n, cube, numberedPalette(n));
    const definition = Codec.decodeDefinition(d.definition)._0, state = Codec.decodeState(definition, d.state)._0;
    const move = Move.make(Shell.makeSize(n)._0, 'Y', [n - 1], -1)._0;
    const turned = Validate.applyMove(definition, state, move)._0;
    const after = cubeStateFromWire(n, Codec.encodeState(turned), d.appearance).value;
    // U (clockwise from above): the top row of R goes to F, F to L, L to B, B to R; U turns a quarter clockwise.
    assert.deepEqual(after.f.slice(0, n), cube.r.slice(0, n), `${n} F top`);
    assert.deepEqual(after.l.slice(0, n), cube.f.slice(0, n), `${n} L top`);
    assert.deepEqual(after.b.slice(0, n), cube.l.slice(0, n), `${n} B top`);
    assert.deepEqual(after.r.slice(0, n), cube.b.slice(0, n), `${n} R top`);
    assert.deepEqual(after.u, Array.from({ length: n * n }, (_, k) => cube.u[(n - 1 - (k % n)) * n + Math.floor(k / n)]), `${n} U turned`);
    assert.deepEqual(after.d, cube.d);
    assert.deepEqual(after.f.slice(n), cube.f.slice(n));
  }
});

test('translated documents open as a viewer projection with the palette colors', () => {
  for (const n of [2, 5, 7]) {
    const cube = random(n, n), d = documents(n, cube);
    const opened = open(d.definition, d.state, d.appearance, d.options);
    assert.equal(opened.ok, true, JSON.stringify(opened));
    assert.equal(validateProjection(opened.value.projection).ok, true);
    assert.deepEqual(opened.value.projection.presentation.layerWidths.length, n);
    const colors = new Map(opened.value.projection.pieces.flatMap((p) => p.stickers).map((s) => [s.id, s.color]));
    assert.equal(colors.size, 6 * n * n);
    for (const id of faceStickerIds(n, 'u')) assert.ok(colors.has(id), id);
    const up = opened.value.projection.pieces.flatMap((p) => p.stickers).find((s) => s.id === faceStickerIds(n, 'u')[0]);
    assert.deepEqual(up.sourceFace, { normal: [0, 1, 0], up: [0, 0, -1] });
    assert.deepEqual(new Set(colors.values()), new Set(cube.u.concat(cube.r, cube.f, cube.d, cube.l, cube.b).map((t) => PALETTE[t])));
  }
});

test('colors outside the palette stay uncolored instead of failing', () => {
  const cube = solved(3);
  cube.f[4] = '?';
  cube.f[3] = 'X';
  const d = documents(3, cube);
  const opened = open(d.definition, d.state, d.appearance, d.options);
  assert.equal(opened.ok, true, JSON.stringify(opened));
  const [id] = faceStickerIds(3, 'f').slice(4, 5);
  const sticker = opened.value.projection.pieces.flatMap((p) => p.stickers).find((s) => s.id === id);
  assert.equal(sticker.color, d.options.defaultColor);
  const other = open(d.definition, d.state, d.appearance, d.options).value.projection.pieces.flatMap((p) => p.stickers).find((s) => s.id === faceStickerIds(3, 'f')[3]);
  assert.equal(other.color, d.options.defaultColor);
});

test('faceStickerIds names the n*n stickers of one face, once', () => {
  for (const n of [2, 3, 7]) {
    const d = documents(n, solved(n)), opened = open(d.definition, d.state, d.appearance, d.options);
    const viewer = new Set(opened.value.projection.pieces.flatMap((p) => p.stickers).map((s) => s.id));
    const seen = new Set();
    for (const face of FACE_KEYS) {
      const ids = faceStickerIds(n, face);
      assert.equal(ids.length, n * n);
      for (const id of ids) { assert.ok(viewer.has(id), id); assert.ok(!seen.has(id), id); seen.add(id); }
    }
    assert.equal(seen.size, 6 * n * n);
  }
});

test('invalid input is rejected with a code', () => {
  assert.equal(cubeStateDocuments(1, solved(2), PALETTE).error.code, 'InvalidSize');
  assert.equal(cubeStateDocuments(8, solved(2), PALETTE).error.code, 'InvalidSize');
  assert.equal(cubeStateDocuments(3, solved(2), PALETTE).error.code, 'InvalidCubeState');
  assert.equal(cubeStateDocuments(3, { ...solved(3), u: 'x' }, PALETTE).error.code, 'InvalidCubeState');
  assert.equal(cubeStateDocuments(3, solved(3), { W: 'white' }).error.code, 'InvalidPalette');
});

test('presentation uses the standard layer widths and their sum as the nominal edge', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const { options } = documents(n, solved(n));
    assert.deepEqual(options.presentation.layerWidths, standardLayerWidths(n));
    assert.ok(Math.abs(options.presentation.nominalEdge - standardLayerWidths(n).reduce((a, b) => a + b, 0)) < 1e-12);
    assert.equal(options.presentation.size, n);
    assert.equal(options.core.halfExtent, options.presentation.nominalEdge / 2);
  }
});

test('R and L turns move the outer columns like a real cube (row direction and the D and B nets)', () => {
  const column = (face, c, n) => Array.from({ length: n }, (_, r) => face[r * n + c]);
  const turned = (n, cube, palette, axis, layer, turns) => {
    const d = documents(n, cube, palette), definition = Codec.decodeDefinition(d.definition)._0, state = Codec.decodeState(definition, d.state)._0;
    const next = Validate.applyMove(definition, state, Move.make(Shell.makeSize(n)._0, axis, [layer], turns)._0)._0;
    return cubeStateFromWire(n, Codec.encodeState(next), d.appearance).value;
  };
  for (const n of [3, 5, 7]) {
    const cube = numbered(n), palette = numberedPalette(n), last = n - 1;
    // R: F goes up to U, U to B, B to D, D to F; B is seen from behind, so its column and row order are reversed.
    const r = turned(n, cube, palette, 'X', n - 1, -1);
    assert.deepEqual(column(r.u, last, n), column(cube.f, last, n), `${n} R: U from F`);
    assert.deepEqual(column(r.f, last, n), column(cube.d, last, n), `${n} R: F from D`);
    assert.deepEqual(column(r.d, last, n), column(cube.b, 0, n).reverse(), `${n} R: D from B`);
    assert.deepEqual(column(r.b, 0, n), column(cube.u, last, n).reverse(), `${n} R: B from U`);
    // L: F goes down to D, D to B, B to U, U to F.
    const l = turned(n, cube, palette, 'X', 0, 1);
    assert.deepEqual(column(l.d, 0, n), column(cube.f, 0, n), `${n} L: D from F`);
    assert.deepEqual(column(l.f, 0, n), column(cube.u, 0, n), `${n} L: F from U`);
    assert.deepEqual(column(l.u, 0, n), column(cube.b, last, n).reverse(), `${n} L: U from B`);
    assert.deepEqual(column(l.b, last, n), column(cube.d, 0, n).reverse(), `${n} L: B from D`);
  }
});
