// SPDX-License-Identifier: AGPL-3.0-or-later
import { validCubeSize } from "./size-range.js";

/** Shape check of a play target (the stage-host `setPlayTarget` argument, without the child lookup): any cube size of the viewer, no per-size list. */
export function validPlayTargetShape(value: {
  readonly player?: { readonly beginPreview?: unknown } | undefined;
  readonly size?: unknown;
  readonly halfExtent?: unknown;
  readonly pxPerQuarter?: unknown;
  readonly layerWidths?: unknown;
  readonly seamWide?: unknown;
}): boolean {
  const positive = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!value || !validCubeSize(value.size)) return false;
  if (!value.player || typeof value.player.beginPreview !== "function") return false;
  if (value.halfExtent !== undefined && !positive(value.halfExtent)) return false;
  if (value.pxPerQuarter !== undefined && !positive(value.pxPerQuarter)) return false;
  if (value.layerWidths !== undefined && (!Array.isArray(value.layerWidths) || value.layerWidths.length !== value.size || !value.layerWidths.every(positive))) return false;
  if (!validSeamWide(value.seamWide)) return false;
  return true;
}

/** `seamWide` of a play target: `true` (defaults) or `{tolerance 0..0.5, lean 0..1, minPx >= 0}`; absent means off. */
export function validSeamWide(value: unknown): boolean {
  if (value === undefined || value === true) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as { tolerance?: unknown; lean?: unknown; minPx?: unknown };
  const within = (x: unknown, max: number) => x === undefined || (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max);
  return within(v.tolerance, 0.5) && within(v.lean, 1) && within(v.minPx, Number.MAX_VALUE);
}
