// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Cube sizes of the general viewer (owner decision 2026-11-18). The structure is open from 2 up to Core's `PwShell.maxSize`;
 * what is tested, photographed and measured (acceptance) is 2..15. Sizes above `ACCEPTED_MAX_SIZE` are not rejected, only not accepted.
 * `ACCEPTED_MAX_SIZE` is the one named acceptance constant: no other place may hard-wire 2|3, 7 or 15.
 */
export const MIN_CUBE_SIZE = 2;
/** Equal to Core `PwShell.maxSize`. */
export const MAX_CUBE_SIZE = 64;
/** Largest size covered by tests, screenshots and the performance budget. */
export const ACCEPTED_MAX_SIZE = 15;
export const validCubeSize = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= MIN_CUBE_SIZE && n <= MAX_CUBE_SIZE;
