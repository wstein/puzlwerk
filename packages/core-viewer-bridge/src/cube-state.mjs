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
import { validCubeSize } from '../../viewer/dist/size-range.js';

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

const MOVE_POLICIES = Object.freeze(['outer-wide', 'any']);
function definitionText(n, movePolicy = 'outer-wide') {
  const pieces = slots(n).map((slot) => ({ home: slot, id: pieceId(slot, n), stickers: facesOf(slot, n).map((f) => ({ id: stickerId(slot, f, n), normal: NORMAL[f], up: UP[f] })).sort(byId) })).sort(byId);
  return JSON.stringify(sorted({ convention: 'cube-shell-v1', id: `cube${n}`, movePolicy, pieces, revision: 1, schema: 'puzlwerk.definition', size: n }));
}
const definitionOf = (n, movePolicy) => {
  const decoded = Codec.decodeDefinition(definitionText(n, movePolicy));
  return decoded.TAG === 'Ok' ? decoded._0 : undefined;
};
const validSize = validCubeSize; // 2..64 (Core PwShell.maxSize); the viewer accepts 2..15, see size-range.js

// The radius rule (the 3x3 millimeter radius at the same edge) grows with the cube; the profile allows at most half of cell minus gap. Only reached beyond the accepted sizes (from about 25).
const MAX_BODY_RADIUS = (1 - 0.01) / 2;

/** Presentation profile of the shared viewer for an n-cube: standard layer widths, two bevel radii. */
export function cubePresentation(n) {
  const widths = standardLayerWidths(n), edge = widths.reduce((a, b) => a + b, 0), radius = Math.min(0.055 * edge / 3, MAX_BODY_RADIUS);
  return { cellSize: 1, bodyGap: 0.01, bodyRadius: radius, bodyInnerRadius: 0.6 * radius, bodyKind: 'twoRadius', bodyBevelSegments: 2, size: n, nominalEdge: edge, layerWidths: widths, stickerWidth: 0.87, stickerRadius: 0.055, stickerOffset: 0.502 };
}

/**
 * Wire-v1 definition, home state and appearance texts for a CubeState of size n (2 to 64; 2 to 15 accepted, larger ones only structurally open), and the
 * `open`/`createPlayer` options. `palette` maps color tokens to #rrggbb; a facelet whose token is
 * not in it (or not a valid ID) is left uncolored: it is drawn in `defaultColor` and `cubeStateFromWire` returns '' for it.
 * IDs: piece `<faces of the piece in U,R,F,D,L,B order>` (`URF`, `UR`, `U`), from size 4 on followed by `:<x>_<y>_<z>` of its
 * home slot (`m` marks a minus sign, `URF:3_3_3`); sticker `<piece>.<face>`; the viewer prefixes `piece:` / `sticker:`.
 * Every sticker has symmetry C4: a color-only cube has no orientation to preserve.
 * Not covered: `options.colorFrame` (no ColorFrame translation in either direction).
 */
export function cubeStateDocuments(n, cube, palette, options = {}) {
  if (!validSize(n)) return fail('InvalidSize');
  const movePolicy = options?.movePolicy ?? 'outer-wide';
  if (!MOVE_POLICIES.includes(movePolicy)) return fail('InvalidPolicy');
  if (!cube || typeof cube !== 'object' || FACE_KEYS.some((f) => !Array.isArray(cube[f]) || cube[f].length !== n * n || cube[f].some((t) => typeof t !== 'string'))) return fail('InvalidCubeState');
  if (!palette || typeof palette !== 'object' || Object.entries(palette).some(([, hex]) => typeof hex !== 'string' || !HEX.test(hex))) return fail('InvalidPalette');
  const definition = definitionOf(n, movePolicy);
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
  return { ok: true, value: { definition: definitionText(n, movePolicy), state, appearance, options: { palette: { ...palette }, defaultColor: DEFAULT_COLOR, presentation: cubePresentation(n), core: { center: [0, 0, 0], halfExtent: edge / 2 } } } };
}

/** Viewer sticker IDs of the n*n stickers of one face ('u','r','f','d','l','b') in the translated documents, in facelet order. */
export function faceStickerIds(n, face) {
  if (!validSize(n) || !FACE_KEYS.includes(face)) throw new Error('Invalid face or size');
  const at = (slot) => FACELET[face](n, ...slot.map((v) => layerIndex(n, v)));
  return slots(n).filter((slot) => facesOf(slot, n).includes(face)).sort((a, b) => at(a) - at(b)).map((slot) => `sticker:${stickerId(slot, face, n)}`);
}

/**
 * The CubeState of a state and appearance in the documents of `cubeStateDocuments`, after any number of turns.
 * Errors (never thrown): InvalidSize, InvalidState (not a valid state of the size-n definition), InvalidAppearance (not JSON or not
 * an appearance document with a sticker list), DefinitionMismatch (appearance of another definition, e.g. another size).
 * A sticker without a color entry reads back as '' (see cubeStateDocuments).
 */
export function cubeStateFromWire(n, stateText, appearanceText) {
  if (!validSize(n)) return fail('InvalidSize');
  const definition = definitionOf(n), state = definition && Codec.decodeState(definition, stateText);
  if (!state || state.TAG !== 'Ok') return fail('InvalidState', state?._0);
  const parsed = Json.parse(appearanceText);
  if (parsed.TAG !== 'Ok') return fail('InvalidAppearance', parsed._0);
  const doc = JSON.parse(Json.toCanonical(parsed._0));
  if (!doc || doc.schema !== 'puzlwerk.appearance' || !Array.isArray(doc.stickers) || doc.stickers.some((s) => !s || typeof s.id !== 'string')) return fail('InvalidAppearance');
  if (doc.definitionId !== `cube${n}`) return fail('DefinitionMismatch', doc.definitionId);
  const colors = new Map(doc.stickers.map((s) => [s.id, s.color]));
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

const TURN_AXIS = { u: 'Y', d: 'Y', r: 'X', l: 'X', f: 'Z', b: 'Z' };
const POSITIVE_FACE = { X: 'R', Y: 'U', Z: 'F' };
const NEGATIVE_FACE = { X: 'L', Y: 'D', Z: 'B' };
const invalidTurn = () => fail('InvalidTurn');

/**
 * The Core move of a CubeAssembler turn `{face: 'U'|'R'|'F'|'D'|'L'|'B', depth, width?, turns}`: `depth` is the innermost layer
 * turned, counted from `face` (1 = outer layer); `width` (default 1) layers turn together, ending at `depth`; `turns` are quarter
 * turns, clockwise seen from `face`, counted modulo four (3 is a counter-clockwise quarter, -2 a half turn). A turn of zero
 * quarter turns, of layers outside 1..n, or of an unknown face is `InvalidTurn`.
 * Result `{axis, layers, turns}` as `Player.turn` takes it: layers ascending 0..n-1, turns -1, 1 or 2 about the positive axis.
 * The definition of `cubeStateDocuments` accepts an inner single layer (`2R`) or the whole cube only with `{movePolicy: 'any'}`.
 */
export function cubeTurnToMove(n, turn) {
  if (!validSize(n)) return fail('InvalidSize');
  const face = typeof turn?.face === 'string' ? turn.face.toLowerCase() : undefined;
  const width = turn?.width ?? 1;
  if (!Object.hasOwn(TURN_AXIS, face) || !Number.isInteger(turn.depth) || !Number.isInteger(width) || !Number.isInteger(turn.turns)) return invalidTurn();
  const outer = turn.depth - width + 1, quarter = ((turn.turns % 4) + 4) % 4;
  if (width < 1 || outer < 1 || turn.depth > n || quarter === 0) return invalidTurn();
  const axis = TURN_AXIS[face], positive = POSITIVE_FACE[axis] === face.toUpperCase();
  const layers = Array.from({ length: width }, (_, i) => (positive ? n - turn.depth + i : outer - 1 + i));
  const clockwise = quarter === 1 ? 1 : -1;
  return { ok: true, value: { axis, layers, turns: quarter === 2 ? 2 : positive ? -clockwise : clockwise } };
}

/**
 * The CubeAssembler turn of a Core move `{axis, layers, turns}`: layers must be a contiguous ascending run inside 0..n-1, turns
 * -1, 1 or 2. The face is the one nearer to the layers (the positive face U, R or F on a tie, also for the whole cube); `width`
 * is omitted for one layer. `cubeTurnToMove` maps the result back to the same move.
 */
export function moveToCubeTurn(n, move) {
  if (!validSize(n)) return fail('InvalidSize');
  const layers = move?.layers;
  if (!Object.hasOwn(POSITIVE_FACE, move?.axis) || ![-1, 1, 2].includes(move?.turns) || !Array.isArray(layers) || layers.length === 0
    || !layers.every((l, i) => Number.isInteger(l) && l >= 0 && l < n && l === layers[0] + i)) return fail('InvalidMove');
  const first = layers[0], last = layers[layers.length - 1], positive = n - 1 - last <= first;
  const face = positive ? POSITIVE_FACE[move.axis] : NEGATIVE_FACE[move.axis];
  const turns = move.turns === 2 ? 2 : positive ? -move.turns : move.turns;
  return { ok: true, value: { face, depth: positive ? n - first : last + 1, ...(layers.length > 1 ? { width: layers.length } : {}), turns } };
}

/**
 * Sticker colors of a new palette for the scene's current `projection` (from `open` on the documents of `cubeStateDocuments`), as the
 * `ArtworkReplacement` of `CubeScene.setArtwork`: every sticker gets `palette[token]` of the token in `appearanceText`,
 * `defaultColor` for a sticker without a token or one the palette lacks (as `cubeStateDocuments`). Appearance, picture and the
 * per-sticker source face, picture and image of the projection are carried over, because `setArtwork` replaces them by what it gets.
 * The scene is not reopened and a turn in progress is not disturbed.
 * Errors: InvalidSize, InvalidPalette, InvalidAppearance, DefinitionMismatch (appearance of another definition or a sticker of the
 * projection it does not list), InvalidProjection.
 */
export function paletteArtwork(n, appearanceText, palette, projection) {
  if (!validSize(n)) return fail('InvalidSize');
  if (!palette || typeof palette !== 'object' || Object.entries(palette).some(([, hex]) => typeof hex !== 'string' || !HEX.test(hex))) return fail('InvalidPalette');
  if (!projection || !Array.isArray(projection.pieces)) return fail('InvalidProjection');
  const parsed = Json.parse(appearanceText);
  if (parsed.TAG !== 'Ok') return fail('InvalidAppearance', parsed._0);
  const doc = JSON.parse(Json.toCanonical(parsed._0));
  if (!doc || doc.schema !== 'puzlwerk.appearance' || !Array.isArray(doc.stickers) || doc.stickers.some((s) => !s || typeof s.id !== 'string')) return fail('InvalidAppearance');
  if (doc.definitionId !== `cube${n}`) return fail('DefinitionMismatch', doc.definitionId);
  const tokens = new Map(doc.stickers.map((s) => [`sticker:${s.id}`, s.color]));
  const stickers = [];
  for (const piece of projection.pieces) for (const s of piece.stickers) {
    if (!tokens.has(s.id)) return fail('DefinitionMismatch', s.id);
    const token = tokens.get(s.id);
    stickers.push({ id: s.id, color: typeof token === 'string' && TOKEN.test(token) && Object.hasOwn(palette, token) ? palette[token] : DEFAULT_COLOR,
      ...(s.imageId === undefined ? {} : { imageId: s.imageId }), ...(s.sourceFace === undefined ? {} : { sourceFace: s.sourceFace }), ...(s.picture === undefined ? {} : { picture: s.picture }) });
  }
  return { ok: true, value: { ...(projection.appearance === undefined ? {} : { appearance: projection.appearance }), ...(projection.picture === undefined ? {} : { picture: projection.picture }), stickers } };
}
