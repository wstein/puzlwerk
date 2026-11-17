// SPDX-License-Identifier: AGPL-3.0-or-later
// CubeAssembler's CubeState (six facelet arrays of color tokens, no piece identity) as wire-v1 documents
// for `open`/`createPlayer`, and back. A facelet-only state carries no piece or sticker identity: the
// documents hold the solved definition at the home state, and the appearance gives every sticker
// the color of the facelet at its slot. Later turns move pieces together with those colors.
import * as Codec from '../../../core/res/PwCodec.res.mjs';
import * as Id from '../../../core/res/PwId.res.mjs';
import * as Json from '../../../core/res/PwJson.res.mjs';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
import * as Pose from '../../../core/res/PwPose.res.mjs';
import * as Shell from '../../../core/res/PwShell.res.mjs';
import { standardLayerWidths } from '../../viewer/dist/layer-widths.js';

/** Facelet arrays of CubeState, in the order of the net: U, R, F, D, L, B. */
export const FACE_KEYS = Object.freeze(['u', 'r', 'f', 'd', 'l', 'b']);
const NORMAL = { u: [0, 1, 0], d: [0, -1, 0], f: [0, 0, 1], b: [0, 0, -1], r: [1, 0, 0], l: [-1, 0, 0] };
const UP = { f: [0, 1, 0], b: [0, 1, 0], r: [0, 1, 0], l: [0, 1, 0], u: [0, 0, -1], d: [0, 0, 1] };
const HEX = /^#[0-9a-f]{6}$/i;
const TOKEN = /^[A-Za-z0-9._:-]+$/;
const DEFAULT_COLOR = '#8a8d93';
const fail = (code, detail) => ({ ok: false, error: detail === undefined ? { code } : { code, detail } });

// Facelet index (row-major, as the net shows the face from outside) of a sticker; a, b, c are the
// layer indices 0..n-1 of its piece along x, y and z.
const FACELET = {
  u: (n, x, y, z) => z * n + x,
  d: (n, x, y, z) => (n - 1 - z) * n + x,
  f: (n, x, y, z) => (n - 1 - y) * n + x,
  b: (n, x, y, z) => (n - 1 - y) * n + (n - 1 - x),
  r: (n, x, y, z) => (n - 1 - y) * n + (n - 1 - z),
  l: (n, x, y, z) => (n - 1 - y) * n + z,
};
const faceOf = (v) => FACE_KEYS.find((f) => NORMAL[f].every((c, i) => c === v[i]));
const slots = (n) => {
  const d = Array.from({ length: n }, (_, i) => -(n - 1) + 2 * i), out = [];
  for (const x of d) for (const y of d) for (const z of d) if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === n - 1) out.push([x, y, z]);
  return out;
};
const facesOf = (slot, n) => FACE_KEYS.filter((f) => NORMAL[f].reduce((s, c, i) => s + c * slot[i], 0) === n - 1);
// Same IDs as the shell test model: face letters, plus the home slot from size 4 on.
const pieceId = (slot, n) => facesOf(slot, n).map((f) => f.toUpperCase()).join('') + (n >= 4 ? ':' + slot.map((c) => (c < 0 ? `m${-c}` : `${c}`)).join('_') : '');
const stickerId = (slot, face, n) => `${pieceId(slot, n)}.${face.toUpperCase()}`;
const layerIndex = (n, v) => (v + n - 1) / 2;
const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
const byId = (a, b) => (a.id < b.id ? -1 : 1);

function definitionText(n) {
  const pieces = slots(n).map((slot) => ({ home: slot, id: pieceId(slot, n), stickers: facesOf(slot, n).map((f) => ({ id: stickerId(slot, f, n), normal: NORMAL[f], up: UP[f] })).sort(byId) })).sort(byId);
  return JSON.stringify(sorted({ convention: 'cube-shell-v1', id: `cube${n}`, movePolicy: 'outer-wide', pieces, revision: 1, schema: 'puzlwerk.definition', size: n }));
}
const definitionOf = (n) => {
  const decoded = Codec.decodeDefinition(definitionText(n));
  return decoded.TAG === 'Ok' ? decoded._0 : undefined;
};
const validSize = (n) => Number.isInteger(n) && n >= 2 && n <= 7;

/** Presentation profile of the shared viewer for an n-cube: standard layer widths, two bevel radii. */
export function cubePresentation(n) {
  const widths = standardLayerWidths(n), edge = widths.reduce((a, b) => a + b, 0), radius = 0.055 * edge / 3;
  return { cellSize: 1, bodyGap: 0.01, bodyRadius: radius, bodyInnerRadius: 0.6 * radius, bodyKind: 'twoRadius', bodyBevelSegments: 2, size: n, nominalEdge: edge, layerWidths: widths, stickerWidth: 0.87, stickerRadius: 0.055, stickerOffset: 0.502 };
}

/**
 * Wire-v1 definition, home state and appearance texts for a CubeState of size n (2 to 7), and the
 * `open`/`createPlayer` options. `palette` maps color tokens to #rrggbb; a facelet whose token is
 * not in it (or not a valid ID) is left uncolored and drawn in `defaultColor`.
 */
export function cubeStateDocuments(n, cube, palette) {
  if (!validSize(n)) return fail('InvalidSize');
  if (!cube || typeof cube !== 'object' || FACE_KEYS.some((f) => !Array.isArray(cube[f]) || cube[f].length !== n * n || cube[f].some((t) => typeof t !== 'string'))) return fail('InvalidCubeState');
  if (!palette || typeof palette !== 'object' || Object.entries(palette).some(([, hex]) => typeof hex !== 'string' || !HEX.test(hex))) return fail('InvalidPalette');
  const definition = definitionOf(n);
  if (!definition) return fail('InvalidCubeState');
  const stickers = [];
  for (const slot of slots(n)) {
    const [x, y, z] = slot.map((v) => layerIndex(n, v));
    for (const face of facesOf(slot, n)) {
      const token = cube[face][FACELET[face](n, x, y, z)];
      stickers.push({ id: stickerId(slot, face, n), ...(TOKEN.test(token) && Object.hasOwn(palette, token) ? { color: token } : {}), symmetry: 'C4' });
    }
  }
  const state = Codec.encodeState(Codec.homeState(definition));
  const appearance = JSON.stringify(sorted({ definitionId: `cube${n}`, id: `cube-state-${n}`, revision: 1, schema: 'puzlwerk.appearance', stickers: stickers.sort(byId) }));
  const edge = cubePresentation(n).nominalEdge;
  return { ok: true, value: { definition: definitionText(n), state, appearance, options: { palette: { ...palette }, defaultColor: DEFAULT_COLOR, presentation: cubePresentation(n), core: { center: [0, 0, 0], halfExtent: edge / 2 } } } };
}

/** Viewer sticker IDs of the n*n stickers of one face ('u','r','f','d','l','b') in the translated documents, in facelet order. */
export function faceStickerIds(n, face) {
  if (!validSize(n) || !FACE_KEYS.includes(face)) throw new Error('Invalid face or size');
  const at = (slot) => FACELET[face](n, ...slot.map((v) => layerIndex(n, v)));
  return slots(n).filter((slot) => facesOf(slot, n).includes(face)).sort((a, b) => at(a) - at(b)).map((slot) => `sticker:${stickerId(slot, face, n)}`);
}

/** The CubeState of a state and appearance in the documents of `cubeStateDocuments`, after any number of turns. */
export function cubeStateFromWire(n, stateText, appearanceText) {
  if (!validSize(n)) return fail('InvalidSize');
  const definition = definitionOf(n), state = definition && Codec.decodeState(definition, stateText);
  if (!state || state.TAG !== 'Ok') return fail('InvalidState', state?._0);
  const parsed = Json.parse(appearanceText);
  if (parsed.TAG !== 'Ok') return fail('InvalidAppearance', parsed._0);
  const colors = new Map(JSON.parse(Json.toCanonical(parsed._0)).stickers.map((s) => [s.id, s.color]));
  const poses = new Map(Codec.poses(state._0).map((p) => [Id.toString(Pose.pieceId(p)), p]));
  const cube = Object.fromEntries(FACE_KEYS.map((f) => [f, Array(n * n).fill('')]));
  const faceByNormal = faceOf;
  for (const piece of Codec.pieces(definition)) {
    const pose = poses.get(Id.toString(piece.id)), at = Shell.toVec(Pose.position(pose));
    const [x, y, z] = [at.x, at.y, at.z].map((v) => layerIndex(n, v));
    for (const sticker of piece.stickers) {
      const world = Orientation.apply(Pose.orientation(pose), sticker.normal), face = faceByNormal([world.x, world.y, world.z]);
      cube[face][FACELET[face](n, x, y, z)] = colors.get(Id.toString(sticker.id)) ?? '';
    }
  }
  return { ok: true, value: cube };
}
