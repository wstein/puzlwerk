import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Codec from '../core/res/PwCodec.res.mjs';
import * as Move from '../core/res/PwMove.res.mjs';
import * as Shell from '../core/res/PwShell.res.mjs';
import * as Validate from '../core/res/PwValidate.res.mjs';
import { open } from '../packages/core-viewer-bridge/src/index.mjs';
import { cubeStateDocuments, cubeStateFromWire, cubePresentation as cubeStatePresentationFor, faceStickerIds, FACE_KEYS } from '../packages/core-viewer-bridge/src/cube-state.mjs';
import { MAX_CUBE_SIZE } from '../packages/viewer/dist/size-range.js';
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
  assert.equal(cubeStateDocuments(65, solved(2), PALETTE).error.code, 'InvalidSize');
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

test('cubeStateFromWire reports errors as results and never throws', () => {
  const n = 3, d = documents(n, solved(n)), other = documents(4, solved(4));
  const code = (...args) => { const r = cubeStateFromWire(...args); assert.equal(r.ok, false, JSON.stringify(args)); return r.error.code; };
  assert.equal(code(1, d.state, d.appearance), 'InvalidSize');
  assert.equal(code(65, d.state, d.appearance), 'InvalidSize');
  assert.equal(code(n, 'not json', d.appearance), 'InvalidState');
  assert.equal(code(n, other.state, d.appearance), 'InvalidState');
  assert.equal(code(n, d.state, 'not json'), 'InvalidAppearance');
  assert.equal(code(n, d.state, '{}'), 'InvalidAppearance');
  assert.equal(code(n, d.state, '[]'), 'InvalidAppearance');
  assert.equal(code(n, d.state, JSON.stringify({ ...JSON.parse(d.appearance), stickers: [null] })), 'InvalidAppearance');
  assert.equal(code(n, d.state, JSON.stringify({ ...JSON.parse(d.appearance), schema: 'other' })), 'InvalidAppearance');
  assert.equal(code(n, d.state, JSON.stringify({ ...JSON.parse(d.appearance), stickers: undefined })), 'InvalidAppearance');
  assert.equal(code(n, d.state, other.appearance), 'DefinitionMismatch');
});

test('uncolored stickers read back as an empty token and every sticker has symmetry C4', () => {
  const cube = solved(3);
  cube.r[0] = '?';
  const d = documents(3, cube);
  assert.equal(cubeStateFromWire(3, d.state, d.appearance).value.r[0], '');
  assert.deepEqual(new Set(JSON.parse(d.appearance).stickers.map((s) => s.symmetry)), new Set(['C4']));
});

// Independent description of the net: a facelet (row, col) of a face sits at normal*(n-1) + right*(2*col-(n-1)) + down*(2*row-(n-1)).
const NET = {
  u: { normal: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1] },
  d: { normal: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1] },
  f: { normal: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0] },
  b: { normal: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0] },
  r: { normal: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0] },
  l: { normal: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0] },
};
const pieceName = (slot, n) => {
  const letters = [['u', [0, 1, 0]], ['r', [1, 0, 0]], ['f', [0, 0, 1]], ['d', [0, -1, 0]], ['l', [-1, 0, 0]], ['b', [0, 0, -1]]]
    .filter(([, v]) => v.reduce((s, c, i) => s + c * slot[i], 0) === n - 1).map(([f]) => f.toUpperCase()).join('');
  return letters + (n >= 4 ? ':' + slot.map((c) => (c < 0 ? `m${-c}` : `${c}`)).join('_') : '');
};
test('faceStickerIds lists every position of every face in row-major net order, for sizes 2 to 7', () => {
  for (let n = 2; n <= 7; n++) for (const face of FACE_KEYS) {
    const { normal, right, down } = NET[face], expected = [];
    for (let row = 0; row < n; row++) for (let col = 0; col < n; col++)
      expected.push(`sticker:${pieceName(normal.map((c, i) => c * (n - 1) + right[i] * (2 * col - (n - 1)) + down[i] * (2 * row - (n - 1))), n)}.${face.toUpperCase()}`);
    assert.deepEqual(faceStickerIds(n, face), expected, `${n} ${face}`);
  }
});

test('faceStickerIds literal anchors: 2x2 U face, 3x3 centers, 4x4 and 7x7 corner suffixes', () => {
  assert.deepEqual(faceStickerIds(2, 'u'), ['sticker:ULB.U', 'sticker:URB.U', 'sticker:UFL.U', 'sticker:URF.U']);
  assert.equal(faceStickerIds(3, 'f')[4], 'sticker:F.F');
  assert.equal(faceStickerIds(3, 'f')[0], 'sticker:UFL.F');
  assert.equal(faceStickerIds(4, 'u')[15], 'sticker:URF:3_3_3.U');
  assert.equal(faceStickerIds(4, 'u')[0], 'sticker:ULB:m3_3_m3.U');
  assert.equal(faceStickerIds(7, 'd')[0], 'sticker:FDL:m6_m6_6.D');
});

// Owner decision 2026-11-18: sizes 2..15 are accepted; the structure stays open up to Core's maximum 64 (16..64 are not rejected, not accepted).
const ACCEPTED = Array.from({ length: 14 }, (_, i) => i + 2);

test('every size 2..15 translates there and back, turns an inner layer and opens as a valid projection', () => {
  for (const n of ACCEPTED) {
    const cube = numbered(n), d = documents(n, cube, numberedPalette(n));
    assert.deepEqual(cubeStateFromWire(n, d.state, d.appearance).value, cube, `${n} round trip`);
    const definition = Codec.decodeDefinition(d.definition)._0, state = Codec.decodeState(definition, d.state)._0;
    // The definition's move policy is outer-wide: a wide turn of the layers layer..n-1 moves the rows 0..n-1-layer.
    for (const layer of new Set([n - 1, Math.max(1, Math.floor(n / 2)), 1])) {
      const turned = Validate.applyMove(definition, state, Move.make(Shell.makeSize(n)._0, 'Y', Array.from({ length: n - layer }, (_, i) => layer + i), -1)._0);
      assert.equal(turned.TAG, 'Ok', `${n} layer ${layer} ${JSON.stringify(turned)}`);
      const after = cubeStateFromWire(n, Codec.encodeState(turned._0), d.appearance).value, row = (face, r) => face.slice(r * n, r * n + n);
      for (let r = 0; r <= n - 1 - layer; r++) {
        assert.deepEqual(row(after.f, r), row(cube.r, r), `${n} layer ${layer}: F row ${r} from R`);
        assert.deepEqual(row(after.l, r), row(cube.f, r), `${n} layer ${layer}: L row ${r} from F`);
        assert.deepEqual(row(after.b, r), row(cube.l, r), `${n} layer ${layer}: B row ${r} from L`);
        assert.deepEqual(row(after.r, r), row(cube.b, r), `${n} layer ${layer}: R row ${r} from B`);
      }
      for (let r = n - layer; r < n; r++) assert.deepEqual(row(after.f, r), row(cube.f, r), `${n} layer ${layer}: F row ${r} unchanged`);
    }
    const opened = open(d.definition, d.state, d.appearance, d.options);
    assert.equal(opened.ok, true, `${n} ${JSON.stringify(opened.error)}`);
    assert.equal(validateProjection(opened.value.projection).ok, true, `${n} projection`);
    assert.equal(opened.value.projection.pieces.length, Shell.slotCount(Shell.makeSize(n)._0));
    assert.equal(opened.value.projection.pieces.flatMap((p) => p.stickers).length, 6 * n * n);
    assert.deepEqual(opened.value.projection.presentation.layerWidths, standardLayerWidths(n));
    for (const face of FACE_KEYS) assert.equal(faceStickerIds(n, face).length, n * n);
  }
});

test('the viewer maximum is Core maxSize, and the body radius stays inside the profile limit up to it', () => {
  assert.equal(MAX_CUBE_SIZE, Shell.maxSize);
  for (const n of [2, 15, 16, 25, 26, 40, 64]) { const p = cubeStatePresentationFor(n); assert.ok(p.bodyRadius <= (p.cellSize - p.bodyGap) / 2, `${n}`); assert.ok(p.bodyInnerRadius <= p.bodyRadius); }
  // Up to 15 the radius is the unchanged rule 0.055 * edge / 3.
  for (const n of ACCEPTED) { const p = cubeStatePresentationFor(n), edge = standardLayerWidths(n).reduce((a, b) => a + b, 0); assert.ok(Math.abs(p.bodyRadius - 0.055 * edge / 3) < 1e-12, `${n}`); }
});

test('sizes 16 and 64 are not rejected (structure only, not accepted)', () => {
  for (const n of [16, 64]) {
    const cube = solved(n), made = cubeStateDocuments(n, cube, PALETTE);
    assert.equal(made.ok, true, `${n} ${JSON.stringify(made.error)}`);
    assert.deepEqual(cubeStateFromWire(n, made.value.state, made.value.appearance).value, cube, `${n}`);
    assert.equal(faceStickerIds(n, 'u').length, n * n);
    const opened = open(made.value.definition, made.value.state, made.value.appearance, made.value.options);
    assert.equal(opened.ok, true, `${n} ${JSON.stringify(opened.error)}`);
    assert.equal(validateProjection(opened.value.projection).ok, true);
  }
  assert.equal(cubeStateDocuments(65, solved(2), PALETTE).error.code, 'InvalidSize');
});
