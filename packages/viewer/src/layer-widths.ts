// SPDX-License-Identifier: AGPL-3.0-or-later
import { validCubeSize } from "./size-range.js";
const demand = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

/**
 * Layer-width profile of an N-cube: the width of each of the N layers, in scene units, the same in every axis. The default
 * profile of the viewer is `uniformLayerWidths` (every layer 1), which is the historical unit pitch.
 *
 * Real big cubes have thicker outer layers (the corners must keep contact at 45 degree turns). A profile
 * `[f, 1, ..., 1, f]` gives corners f x f x f, outer-ring pieces on a face 1 x f and inner pieces 1 x 1.
 */
export type LayerWidths = readonly number[];

export const uniformLayerWidths = (n: number): number[] => {
  demand(Number.isInteger(n) && n >= 1, "Invalid layer count");
  return Array<number>(n).fill(1);
};

/** Widths `[outer, 1, ..., 1, outer]`; for n = 1 the single layer is 1, for n = 2 both layers are `outer`. */
export function thickOuterLayerWidths(n: number, outer: number): number[] {
  demand(Number.isFinite(outer) && outer >= 1, "Invalid outer layer width");
  const widths = uniformLayerWidths(n);
  if (n >= 2) { widths[0] = outer; widths[n - 1] = outer; }
  return widths;
}

export function validateLayerWidths(widths: LayerWidths): void {
  demand(widths.length >= 1 && widths.every(w => Number.isFinite(w) && w > 0), "Invalid layer widths");
}

/** Edge length of the whole cube: the sum of the widths. */
export const layerEdge = (widths: LayerWidths): number => widths.reduce((sum, w) => sum + w, 0);

/** The N + 1 cut planes along an axis (cube centered at 0): plane k lies between layer k - 1 and layer k. */
export function layerPlanes(widths: LayerWidths): number[] {
  validateLayerWidths(widths);
  const planes = [-layerEdge(widths) / 2];
  for (const w of widths) planes.push(planes[planes.length - 1] + w);
  return planes;
}

/** Center of every layer along an axis (cube centered at 0). */
export function layerCenters(widths: LayerWidths): number[] {
  const planes = layerPlanes(widths);
  return widths.map((_, i) => (planes[i] + planes[i + 1]) / 2);
}

/**
 * Layer index 0..N-1 of the layer coordinate `p` of the mechanics (unit steps, centered: -3..3 for N = 7, half integers
 * -2.5..2.5 for N = 6). Anything else is an error.
 */
export function layerIndexOf(n: number, p: number): number {
  const index = p + (n - 1) / 2;
  demand(Math.abs(index - Math.round(index)) < 1e-9 && Math.round(index) >= 0 && Math.round(index) < n, "Layer coordinate outside the cube");
  return Math.round(index);
}

/**
 * Owner measurements of real cubes, 2026-11-17. Unit assumed to be mm, not confirmed. `inner` is the width of an inner
 * layer, `outer` the width of an outer layer. Added in PuzlWerk, not part of the adapted Cubistry source.
 */
export const STANDARD_CUBE_MEASUREMENTS = Object.freeze([
  Object.freeze({ cube: "4x4", label: "A", inner: 14.5, outer: 15.6, date: "2026-11-17", unit: "mm (assumed)" }),
  Object.freeze({ cube: "4x4", label: "B", inner: 13.1, outer: 15.2, date: "2026-11-17", unit: "mm (assumed)" }),
  Object.freeze({ cube: "5x5", label: "A", inner: 10.6, outer: 13.5, date: "2026-11-17", unit: "mm (assumed)" }),
  Object.freeze({ cube: "5x5", label: "B", inner: 11.1, outer: 13.4, date: "2026-11-17", unit: "mm (assumed)" }),
  Object.freeze({ cube: "7x7", label: "", inner: 7.2, outer: 12.5, date: "2026-11-17", unit: "mm (assumed)" }),
]);

/**
 * Outer-layer factor (inner layer = 1) per cube size. The measured overhangs (factor - 1, mean per size: 4x4 0.118, 5x5
 * 0.240, 7x7 0.736) are scaled by 0.6 / 0.736 so that 7x7 is 1.6 (owner balance decision); 6x6 uses the overhang interpolated
 * linearly between 5x5 and 7x7. 3x3 (1) and 6x6 are estimates, to be replaced when measured; 2x2 has no inner layer. From 8x8 on the 7x7 factor is held (estimate, `LARGE_CUBE_OUTER_FACTOR_ESTIMATE`).
 */
const STANDARD_OUTER_FACTORS: Readonly<Record<number, number>> = Object.freeze({ 2: 1, 3: 1, 4: 1.1, 5: 1.2, 6: 1.4, 7: 1.6 });

/** First size without a table entry. Owner decision 2026-11-18 (E): from here on the outer factor of the 7x7 is held. */
export const LARGE_CUBE_FIRST_SIZE = 8;
/** ESTIMATE, not a measurement: the outer factor of the 7x7 (1.6) held for 8x8 and larger (up to the structural maximum). Replace when larger cubes are measured. */
export const LARGE_CUBE_OUTER_FACTOR_ESTIMATE = STANDARD_OUTER_FACTORS[7];

/** True when the standard outer factor of size n is an estimate: 3x3 and 6x6 (not measured) and every size from `LARGE_CUBE_FIRST_SIZE`. */
export const isEstimatedStandardFactor = (n: number): boolean => n === 3 || n === 6 || n >= LARGE_CUBE_FIRST_SIZE;

const standardOuterFactor = (n: number): number | undefined =>
  Object.hasOwn(STANDARD_OUTER_FACTORS, n) ? STANDARD_OUTER_FACTORS[n] : validCubeSize(n) && n >= LARGE_CUBE_FIRST_SIZE ? LARGE_CUBE_OUTER_FACTOR_ESTIMATE : undefined;

export interface StandardLayerWidthsOptions {
  /** Outer factor for this call (finite, >= 1); replaces the table and allows any integer N >= 2. */
  outer?: number;
  /** Reserved for manufacturer profiles; only "standard" exists. */
  variant?: string;
}

/**
 * Standard layer widths `[f, 1, ..., 1, f]` of a real N-cube, 2 <= N <= 64 (8..64 hold the estimated factor of the 7x7; any integer N >= 2 with `options.outer`). A helper only: the viewer default stays
 * `uniformLayerWidths`. Apps override the factor with `options.outer` or pass their own widths as `profile.layerWidths`.
 */
export function standardLayerWidths(n: number, options: StandardLayerWidthsOptions = {}): number[] {
  demand((options.variant ?? "standard") === "standard", `Unknown cube variant: ${String(options.variant)}`);
  if (options.outer !== undefined) {
    demand(Number.isInteger(n) && n >= 2, `No standard layer widths for N = ${String(n)}`);
    return thickOuterLayerWidths(n, options.outer);
  }
  const factor = standardOuterFactor(n);
  demand(factor !== undefined, `No standard layer widths for N = ${String(n)} (pass options.outer)`);
  return thickOuterLayerWidths(n, factor as number);
}
