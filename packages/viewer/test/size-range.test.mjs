// SPDX-License-Identifier: AGPL-3.0-or-later
// Cube size range of the general viewer (owner decision 2026-11-18): acceptance 2..15, structure open up to Core's maximum 64.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MIN_CUBE_SIZE, MAX_CUBE_SIZE, ACCEPTED_MAX_SIZE, validCubeSize } from '../dist/size-range.js';
import { validateProjection } from '../dist/contract.js';
import { checkSize, cellIndex, hitCell, mapDrag, wideRangeFromOne, MIN_SIZE, MAX_SIZE } from '../dist/play-gesture-map.js';

const ACCEPTED = Array.from({ length: ACCEPTED_MAX_SIZE - MIN_CUBE_SIZE + 1 }, (_, i) => MIN_CUBE_SIZE + i);
const OPEN_ONLY = [16, 32, 64];
const FRONT = { x: [100, 0], y: [0, 100], z: [0, 0] };

test('the size constants: acceptance 2..15, structure up to Core maxSize 64', () => {
  assert.deepEqual([MIN_CUBE_SIZE, ACCEPTED_MAX_SIZE, MAX_CUBE_SIZE], [2, 15, 64]);
  assert.equal(ACCEPTED.length, 14);
  for (const n of [...ACCEPTED, ...OPEN_ONLY]) assert.equal(validCubeSize(n), true, `${n}`);
  for (const n of [0, 1, 65, 100, 2.5, NaN, Infinity, '3', undefined, null]) assert.equal(validCubeSize(n), false, `${String(n)}`);
  assert.equal(MIN_SIZE, MIN_CUBE_SIZE);
  assert.equal(MAX_SIZE, MAX_CUBE_SIZE);
});

test('the projection contract accepts presentation sizes 2..15 and does not reject 16..64', () => {
  for (const n of [...ACCEPTED, ...OPEN_ONLY]) {
    assert.equal(validateProjection({ pieces: [], presentation: { size: n, nominalEdge: n } }).ok, true, `presentation ${n}`);
    assert.equal(validateProjection({ pieces: [], renderProfile: { kind: 'cubeAssemblerV1', size: n, meshes: [] } }).ok, true, `profile ${n}`);
  }
  for (const n of [1, 65, 2.5]) {
    assert.equal(validateProjection({ pieces: [], presentation: { size: n, nominalEdge: n } }).ok, false, `presentation ${n}`);
    assert.equal(validateProjection({ pieces: [], renderProfile: { kind: 'cubeAssemblerV1', size: n, meshes: [] } }).ok, false, `profile ${n}`);
  }
});

test('the gesture core maps every layer of a front hit for sizes 2..15 and 16..64', () => {
  for (const n of [...ACCEPTED, ...OPEN_ONLY]) {
    checkSize(n);
    const centre = k => -1 + (2 * k + 1) / n;
    for (let k = 0; k < n; k++) {
      assert.equal(cellIndex(centre(k), n), k, `n=${n} k=${k}`);
      const j = n - 1 - k, hit = { face: 'F', point: [centre(k), centre(j), 1] };
      assert.deepEqual(hitCell(hit, n), [k, j, n - 1], `n=${n} k=${k}`);
      const d = mapDrag(hit, n, [50, 0], FRONT);
      assert.ok(d, `n=${n} k=${k}`);
      assert.equal(d.axis, 'y'); assert.equal(d.layer, j); assert.deepEqual([...d.cell], [k, j, n - 1]);
      const wide = wideRangeFromOne(k, n);
      assert.deepEqual(wide, k <= n - 1 - k ? [0, k] : [k, n - 1], `n=${n} k=${k}`);
    }
  }
  for (const n of [0, 1, 65, 2.5]) assert.throws(() => checkSize(n), RangeError);
});
