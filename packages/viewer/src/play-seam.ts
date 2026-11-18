// SPDX-License-Identifier: AGPL-3.0-or-later
// Play mode: a swipe that starts on the seam between two layers turns a wide block (CubeAssembler's "wide turns near gaps"),
// expressed in the viewer's gesture model: cube-local coordinates, layer widths and screen vectors of the axes.
// Pure functions, no DOM.
import { AXES, cellIndex, checkSize, type Axis, type AxisScreen, type Hit, type LayerWidths, type Vec2 } from "./play-gesture-map.js";

/** The outer quarter of a sticker next to a boundary counts as the seam (CubeAssembler `seamTolerance`). */
export const SEAM_TOLERANCE = 0.25;
/** A lean below this share of the swipe length does not choose a side (CubeAssembler `seamLean`). */
export const SEAM_LEAN = 0.1;

export interface SeamWide {
  /** Share of the touched layer's width next to a boundary that is the seam; default 0.25. */
  readonly tolerance?: number;
  /** Share of the swipe that must lean along the layer axis to choose a side; default 0.1. */
  readonly lean?: number;
  /** Minimum seam tolerance in screen px, for thin layers on small screens; never more than half a layer. Default 0. */
  readonly minPx?: number;
}

/**
 * The seam under a cube-local coordinate along the layer axis: `seam` s lies between layers s-1 and s (1..n-1), `touched` is the
 * layer of the coordinate. None on a 2x2 (a block there is the whole cube), on the cube's outer edge and in the middle of a sticker.
 * `tolerance` is a share of the touched layer's width, `minLocal` a minimum in cube-local units; the result never exceeds half a layer.
 */
export function seamAt(coordinate: number, n: number, layerWidths?: LayerWidths, tolerance = SEAM_TOLERANCE, minLocal = 0): { readonly seam: number; readonly touched: number } | null {
  checkSize(n);
  if (n < 3 || !Number.isFinite(coordinate)) return null;
  const widths = layerWidths ?? Array.from({ length: n }, () => 1), edge = widths.reduce((a, b) => a + b, 0);
  const c = Math.max(-1, Math.min(1, coordinate)), touched = cellIndex(c, n, layerWidths);
  const boundary = (s: number) => (2 * widths.slice(0, s).reduce((a, b) => a + b, 0)) / edge - 1;
  const local = (2 * widths[touched]) / edge, limit = Math.min(0.5 * local, Math.max(tolerance * local, minLocal));
  const below = touched > 0 ? c - boundary(touched) : Infinity, above = touched < n - 1 ? boundary(touched + 1) - c : Infinity;
  const distance = Math.min(below, above);
  return distance > limit + 1e-12 ? null : { seam: below <= above ? touched : touched + 1, touched };
}

/** The block a seam turns: both layers at the seam and every layer on one side, inclusive [from, to]. A block of the whole cube switches to the other side. */
export function seamBlock(seam: number, n: number, towardPlus: boolean): [number, number] {
  checkSize(n);
  if (!Number.isInteger(seam) || seam < 1 || seam > n - 1) throw RangeError(`Invalid seam ${seam}`);
  const plus: [number, number] = [seam - 1, n - 1], minus: [number, number] = [0, seam], preferred = towardPlus ? plus : minus;
  return n > 2 && preferred[1] - preferred[0] + 1 >= n ? (towardPlus ? minus : plus) : preferred;
}

/**
 * The swipe as motion along the layer axis (lean, positive toward higher layers) and along the turn direction, from the screen
 * vectors of the layer axis and of the other in-face axis. Null when the two axes are collinear on screen.
 */
export function seamSwipe(drag: Vec2, layerAxis: Vec2, turnAxis: Vec2): { readonly lean: number; readonly turn: number } | null {
  const det = layerAxis[0] * turnAxis[1] - layerAxis[1] * turnAxis[0];
  if (Math.abs(det) < 1e-9) return null;
  return { lean: (drag[0] * turnAxis[1] - drag[1] * turnAxis[0]) / det, turn: (layerAxis[0] * drag[1] - layerAxis[1] * drag[0]) / det };
}

const FACE_AXIS_INDEX = { R: 0, L: 0, U: 1, D: 1, F: 2, B: 2 } as const;

/**
 * The block of a seam swipe, or null when the swipe does not start on a seam. `axis` is the layer (turn) axis the drag decided on,
 * `drag` the screen vector since pointer-down. The side is the lean along the layer axis; without a clear lean it is the side of the
 * touched layer.
 */
export function seamWideBlock(o: { readonly n: number; readonly layerWidths?: LayerWidths; readonly hit: Hit; readonly axes: AxisScreen; readonly seamWide: SeamWide }, axis: Axis, drag: Vec2): [number, number] | null {
  const k = AXES.indexOf(axis), a = 3 - FACE_AXIS_INDEX[o.hit.face] - k;
  if (k < 0 || a < 0 || a > 2 || a === k) return null;
  const screens = [o.axes.x, o.axes.y, o.axes.z], u = screens[k], v = screens[a], s = o.seamWide;
  const pxPerUnit = Math.hypot(u[0], u[1]), minLocal = (s.minPx ?? 0) > 0 && pxPerUnit > 1e-9 ? (s.minPx as number) / pxPerUnit : 0;
  const found = seamAt(o.hit.point[k], o.n, o.layerWidths, s.tolerance ?? SEAM_TOLERANCE, minLocal);
  if (!found) return null;
  const swipe = seamSwipe(drag, u, v), clear = swipe !== null && Math.abs(swipe.lean) >= (s.lean ?? SEAM_LEAN) * Math.hypot(swipe.lean, swipe.turn);
  return seamBlock(found.seam, o.n, clear ? (swipe as { lean: number }).lean > 0 : found.touched >= found.seam);
}
