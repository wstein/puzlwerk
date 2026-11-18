// SPDX-License-Identifier: AGPL-3.0-or-later
import { validCubeSize } from "./size-range.js";

/** Shape check of a play target (the stage-host `setPlayTarget` argument, without the child lookup): any cube size of the viewer, no per-size list. */
export function validPlayTargetShape(value: {
  readonly player?: { readonly beginPreview?: unknown } | undefined;
  readonly size?: unknown;
  readonly halfExtent?: unknown;
  readonly pxPerQuarter?: unknown;
  readonly layerWidths?: unknown;
}): boolean {
  const positive = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!value || !validCubeSize(value.size)) return false;
  if (!value.player || typeof value.player.beginPreview !== "function") return false;
  if (value.halfExtent !== undefined && !positive(value.halfExtent)) return false;
  if (value.pxPerQuarter !== undefined && !positive(value.pxPerQuarter)) return false;
  if (value.layerWidths !== undefined && (!Array.isArray(value.layerWidths) || value.layerWidths.length !== value.size || !value.layerWidths.every(positive))) return false;
  return true;
}
