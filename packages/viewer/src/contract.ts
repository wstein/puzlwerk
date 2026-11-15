// SPDX-License-Identifier: AGPL-3.0-or-later
import { Quaternion as Q, Vector3 } from 'three';

export type Vec3 = readonly [number, number, number];
export type Quaternion = readonly [number, number, number, number];
export type ViewerError = { readonly code: 'InvalidProjection' | 'InvalidTransition' | 'UnresolvedAsset' | 'Busy' | 'Disposed' | 'Unavailable' | 'ContextLost' | 'Cancelled'; readonly message: string; readonly path?: string };
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ViewerError };
export type Transform = { readonly position: Vec3; readonly rotation: Quaternion };
export type Sticker = { readonly id: string; readonly transform: Transform; readonly size: readonly [number, number]; readonly color: string; readonly imageId?: string };
export type Piece = { readonly id: string; readonly transform: Transform; readonly stickers: readonly Sticker[] };
export type CubeProjection = { readonly pieces: readonly Piece[] };
export type Transition = { readonly from: CubeProjection; readonly to: CubeProjection; readonly pieceIds: readonly string[]; readonly axis: Vec3; readonly signedAngleRadians: number; readonly pivot: Vec3; readonly durationMs: number };
export type AssetResolver = (imageId: string, signal: AbortSignal) => Promise<Result<CanvasImageSource>>;
export type ViewerOptions = { readonly resolveAsset: AssetResolver };
export interface CubeScene { setProjection(projection: CubeProjection): Promise<Result<void>>; transition(transition: Transition): Promise<Result<void>>; cancel(): Result<void>; invalidate(): Result<void>; dispose(): void }
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: ViewerError['code'], message: string, path?: string): Result<never> => ({ ok: false, error: { code, message, ...(path ? { path } : {}) } });
const tol = 1e-6;
const array = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const unit = (v: readonly number[]) => Math.abs(Math.hypot(...v) - 1) <= tol;
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const transform = (v: Transform) => v && array(v.position, 3) && array(v.rotation, 4) && unit(v.rotation);
export function validateProjection(p: CubeProjection): Result<void> {
  if (!p || !Array.isArray(p.pieces)) return fail('InvalidProjection', 'Expected pieces', 'pieces');
  const ids = new Set<string>();
  for (const [i, piece] of p.pieces.entries()) {
    if (!piece || !id(piece.id) || ids.has(piece.id) || !transform(piece.transform) || !Array.isArray(piece.stickers)) return fail('InvalidProjection', 'Invalid piece', `pieces[${i}]`);
    ids.add(piece.id);
    for (const [j, s] of piece.stickers.entries()) {
      if (!s || !id(s.id) || ids.has(s.id) || !transform(s.transform) || !array(s.size, 2) || s.size.some((x: number) => x <= 0) || !id(s.color) || (s.imageId !== undefined && !id(s.imageId))) return fail('InvalidProjection', 'Invalid sticker', `pieces[${i}].stickers[${j}]`);
      ids.add(s.id);
    }
  }
  return ok(undefined);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function validateTransition(t: Transition): Result<void> {
  if (!t) return fail('InvalidTransition', 'Missing transition');
  const fromValidation = validateProjection(t.from); if (!fromValidation.ok) return fromValidation;
  const toValidation = validateProjection(t.to); if (!toValidation.ok) return toValidation;
  if (!array(t.axis, 3) || !unit(t.axis) || !array(t.pivot, 3) || !Number.isFinite(t.signedAngleRadians) || !Number.isFinite(t.durationMs) || t.durationMs < 0 || !Array.isArray(t.pieceIds) || new Set(t.pieceIds).size !== t.pieceIds.length) return fail('InvalidTransition', 'Invalid turn');
  const targets = new Map(t.to.pieces.map(p => [p.id, p]));
  const selected = new Set(t.pieceIds);
  if (targets.size !== t.from.pieces.length || [...selected].some(k => !targets.has(k) || !t.from.pieces.some(p => p.id === k))) return fail('InvalidTransition', 'Piece IDs differ');
  const pivot = new Vector3(...t.pivot);
  const rotation = new Q().setFromAxisAngle(new Vector3(...t.axis), t.signedAngleRadians);
  for (const source of t.from.pieces) {
    const target = targets.get(source.id);
    if (!target || !same(source.stickers, target.stickers)) return fail('InvalidTransition', 'Sticker definitions differ');
    if (!selected.has(source.id)) { if (!same(source.transform, target.transform)) return fail('InvalidTransition', 'Unselected piece changed'); continue; }
    const position = new Vector3(...source.transform.position).sub(pivot).applyQuaternion(rotation).add(pivot);
    const actual = new Vector3(...target.transform.position);
    const expectedQ = rotation.clone().multiply(new Q(...source.transform.rotation));
    const actualQ = new Q(...target.transform.rotation);
    if (position.distanceTo(actual) > tol || 1 - Math.abs(expectedQ.dot(actualQ)) > tol) return fail('InvalidTransition', 'Target does not match rotation');
  }
  return ok(undefined);
}
