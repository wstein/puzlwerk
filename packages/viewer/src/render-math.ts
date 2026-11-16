// SPDX-License-Identifier: AGPL-3.0-or-later
// Render-only vector operations; no application or canonical state.
export type Vec3 = readonly [number, number, number];
export const demand: (condition: unknown, message: string) => asserts condition = (condition, message) => { if (!condition) throw new Error(message); };
export const dot = (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
