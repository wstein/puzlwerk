import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Codec from '../core/res/PwCodec.res.mjs';
import * as Move from '../core/res/PwMove.res.mjs';
import * as Shell from '../core/res/PwShell.res.mjs';
import * as Validate from '../core/res/PwValidate.res.mjs';
import { open } from '../packages/core-viewer-bridge/src/index.mjs';
import { cubeStateDocuments, paletteArtwork, faceStickerIds, FACE_KEYS } from '../packages/core-viewer-bridge/src/cube-state.mjs';
import { createSceneForTest } from '../packages/viewer/dist/scene.js';

const COLORS = { u: 'W', r: 'R', f: 'G', d: 'Y', l: 'O', b: 'B' };
const OLD = { W: '#f7f6f1', O: '#ff7a1a', G: '#1e9e57', R: '#cf2a3a', B: '#2459d6', Y: '#f2d21b' };
// A color-blind friendly set, written out.
const NEW = { W: '#ffffff', O: '#e69f00', G: '#009e73', R: '#d55e00', B: '#0072b2', Y: '#f0e442' };
const solved = (n) => Object.fromEntries(FACE_KEYS.map((f) => [f, Array(n * n).fill(COLORS[f])]));
const documents = (n) => cubeStateDocuments(n, solved(n), OLD).value;
const projectionOf = (d, state = d.state, palette = OLD) => open(d.definition, state, d.appearance, { ...d.options, palette }).value.projection;
const colorsOf = (projection) => new Map(projection.pieces.flatMap((p) => p.stickers.map((s) => [s.id, s.color])));

test('a new palette gives every sticker its token color, also after turns, equal to opening with that palette', () => {
  for (const n of [2, 3, 5, 15]) {
    const d = documents(n);
    // Turn the state (outer layer of R) with the Core, as a played cube would be.
    const definition = Codec.decodeDefinition(d.definition)._0;
    const moved = Validate.applyMove(definition, Codec.decodeState(definition, d.state)._0, Move.make(Shell.makeSize(n)._0, 'X', [n - 1], -1)._0)._0;
    const state = Codec.encodeState(moved);
    const art = paletteArtwork(n, d.appearance, NEW, projectionOf(d, state));
    assert.equal(art.ok, true, JSON.stringify(art));
    assert.equal(art.value.stickers.length, 6 * n * n);
    assert.deepEqual(new Map(art.value.stickers.map((s) => [s.id, s.color])), colorsOf(projectionOf(d, state, NEW)), `size ${n}`);
  }
  // Written out: the U stickers of a solved 3x3 are white in the new palette, the R stickers orange-red.
  const d = documents(3), art = paletteArtwork(3, d.appearance, NEW, projectionOf(d)).value, by = new Map(art.stickers.map((s) => [s.id, s.color]));
  assert.ok(faceStickerIds(3, 'u').every((id) => by.get(id) === '#ffffff'));
  assert.ok(faceStickerIds(3, 'r').every((id) => by.get(id) === '#d55e00'));
  assert.equal(art.stickers.length, 54);
});

test('the artwork keeps appearance and source faces of the projection', () => {
  const d = documents(3), projection = projectionOf(d), art = paletteArtwork(3, d.appearance, NEW, projection).value;
  assert.deepEqual(art.appearance, projection.appearance);
  assert.ok(art.appearance !== undefined);
  const faces = new Map(projection.pieces.flatMap((p) => p.stickers.map((s) => [s.id, s.sourceFace])));
  assert.ok(art.stickers.every((s) => JSON.stringify(s.sourceFace) === JSON.stringify(faces.get(s.id))));
});

test('tokens missing from the palette use the default color; errors do not throw', () => {
  const d = documents(3), projection = projectionOf(d), partial = paletteArtwork(3, d.appearance, { W: '#ffffff' }, projection).value;
  const by = new Map(partial.stickers.map((s) => [s.id, s.color]));
  assert.ok(faceStickerIds(3, 'u').every((id) => by.get(id) === '#ffffff'));
  assert.ok(faceStickerIds(3, 'f').every((id) => by.get(id) === '#8a8d93'));
  assert.equal(paletteArtwork(3, d.appearance, { W: 'white' }, projection).error.code, 'InvalidPalette');
  assert.equal(paletteArtwork(65, d.appearance, NEW, projection).error.code, 'InvalidSize');
  assert.equal(paletteArtwork(3, '{', NEW, projection).error.code, 'InvalidAppearance');
  assert.equal(paletteArtwork(4, d.appearance, NEW, projection).error.code, 'DefinitionMismatch');
  assert.equal(paletteArtwork(3, d.appearance, NEW, undefined).error.code, 'InvalidProjection');
  assert.equal(paletteArtwork(3, d.appearance, NEW, projectionOf(documents(4))).error.code, 'DefinitionMismatch');
});

test('the artwork is accepted by a scene and recolors the drawn stickers without reopening', async () => {
  for (const n of [3, 15]) {
    const d = documents(n), projection = projectionOf(d);
    let rendered; const frames = [];
    const scene = createSceneForTest({ resolveAsset: async () => ({ ok: false, error: { code: 'UnresolvedAsset' } }) }, { now: () => 0, request: (cb) => { frames.push(cb); return frames.length; }, cancel() {} }, { render: (s) => { rendered = s; }, dispose() {} });
    assert.equal((await scene.setProjection(projection)).ok, true);
    frames.shift()(0);
    const stickerId = faceStickerIds(n, 'u')[0];
    const colorOf = () => { let hex; rendered.traverse((o) => { if (o.name === stickerId && o.material?.color) hex ??= o.material.color.getHexString(); }); return hex; };
    assert.equal(colorOf(), 'f7f6f1');
    const art = paletteArtwork(n, d.appearance, NEW, projection);
    assert.equal((await scene.setArtwork(art.value)).ok, true, `size ${n}`);
    frames.shift()(0);
    assert.equal(colorOf(), 'ffffff', `size ${n}`);
    scene.dispose();
  }
});
