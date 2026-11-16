// SPDX-License-Identifier: AGPL-3.0-or-later
// Source: Cubistry efafcc1d97687eccea0cde87a230f447ce1b6c66 src/apps/clock/orbit.ts#groupZoom.
/** Multiplicative zoom for a shared group, as used by the native multi-cube view. */
export function groupZoom(zoom:number,delta:number):number {
  if(![zoom,delta].every(Number.isFinite))throw Error('Invalid group zoom');
  return Math.max(0.8,Math.min(2,zoom*Math.exp(Math.max(-1000,Math.min(1000,delta))*0.001)));
}
