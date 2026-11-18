// SPDX-License-Identifier: AGPL-3.0-or-later
// Play target, picking and the gesture core for every cube size 2..15 (acceptance) and 16..64 (structure, not accepted).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ACCEPTED_MAX_SIZE } from '../dist/size-range.js';
import { validPlayTargetShape } from '../dist/play-target.js';
import { standardLayerWidths, layerCenters, layerEdge } from '../dist/layer-widths.js';
import { pickPlayFace } from '../dist/play-picking.js';
import { cellIndex, hitCell, mapDrag } from '../dist/play-gesture-map.js';
import { beginGesture, moveGesture, releaseGesture, beginPair } from '../dist/play-gesture.js';

const ACCEPTED = Array.from({ length: ACCEPTED_MAX_SIZE - 1 }, (_, i) => i + 2);
const OPEN_ONLY = [16, 32, 64];
const FRONT = { x: [100, 0], y: [0, 100], z: [0, 0] };
const child = {}, player = { beginPreview() {} };

test('the play target accepts every size 2..15 and does not reject 16..64', () => {
  for (const size of [...ACCEPTED, ...OPEN_ONLY]) {
    assert.equal(validPlayTargetShape({ child, player, size }), true, `${size}`);
    assert.equal(validPlayTargetShape({ child, player, size, layerWidths: standardLayerWidths(size) }), true, `${size} widths`);
  }
  for (const size of [0, 1, 65, 2.5, NaN, '3', undefined]) assert.equal(validPlayTargetShape({ child, player, size }), false, `${String(size)}`);
});

test('the play target rejects a bad player, extent, pixel scale and layer widths', () => {
  const ok = { child, player, size: 5 };
  assert.equal(validPlayTargetShape(ok), true);
  for (const bad of [{ player: undefined }, { player: {} }, { halfExtent: 0 }, { halfExtent: NaN }, { pxPerQuarter: -1 },
    { layerWidths: [1, 1, 1, 1] }, { layerWidths: [1, 1, 0, 1, 1] }, { layerWidths: [1, 1, NaN, 1, 1] }, { layerWidths: 'x' }])
    assert.equal(validPlayTargetShape({ ...ok, ...bad }), false, JSON.stringify(bad));
});

// Normalized coordinate (-1..1 over the cube) of the centre of each layer, for the given widths.
const centres = (widths) => { const e = layerEdge(widths); return layerCenters(widths).map((c) => 2 * c / e); };

test('layer widths shift the layer boundaries of the gesture core (thick outer layers)', () => {
  for (const n of [...ACCEPTED, ...OPEN_ONLY]) {
    const widths = standardLayerWidths(n), c = centres(widths);
    for (let k = 0; k < n; k++) {
      assert.equal(cellIndex(c[k], n, widths), k, `n=${n} k=${k}`);
      const hit = { face: 'F', point: [c[k], c[n - 1 - k], 1] };
      assert.deepEqual(hitCell(hit, n, widths), [k, n - 1 - k, n - 1], `n=${n} k=${k}`);
      const d = mapDrag(hit, n, [50, 0], FRONT, undefined, widths);
      assert.ok(d); assert.equal(d.axis, 'y'); assert.equal(d.layer, n - 1 - k);
    }
  }
  // 7x7, outer layers 1.6, edge 8.2: -0.65 lies in the first layer (it ends at -0.610) and -0.4 in the second (it ends at -0.366); equal division says 1 and 2.
  const w7 = standardLayerWidths(7);
  assert.equal(cellIndex(-0.65, 7, w7), 0); assert.equal(cellIndex(-0.65, 7), 1);
  assert.equal(cellIndex(-0.4, 7, w7), 1); assert.equal(cellIndex(-0.4, 7), 2);
});

// Just inside both edges of every layer (normalized coordinates): where equal division and the widths disagree most.
const nearEdges = (widths) => { const e = layerEdge(widths); let at = 0; return widths.map((w) => { const lo = 2 * at / e - 1, hi = 2 * (at + w) / e - 1; at += w; return [lo + 0.01, hi - 0.01]; }); };

test('a gesture with layer widths locks the layer under the finger, one finger and two', () => {
  const n = 9, widths = standardLayerWidths(n), c = centres(widths), edges = nearEdges(widths);
  let differs = 0;
  for (let k = 0; k < n; k++) for (const y of edges[k]) {
    if (cellIndex(y, n) !== k) differs++;
    const hit = { face: 'F', point: [c[3], y, 1] };
    let g = beginGesture({ n, hit, point: [0, 0], axes: FRONT, pxPerQuarter: 100, layerWidths: widths });
    g = moveGesture(g, [60, 0]);
    assert.equal(g.lock.layer, k, `layer ${k} at ${y}`);
    const done = releaseGesture(g);
    assert.deepEqual([done.commit.from, done.commit.to], [k, k]);
  }
  assert.ok(differs >= 4, 'the test points must separate equal division from the widths');
  const pair = beginPair({ n, a: { hit: { face: 'F', point: [c[3], edges[1][1], 1] }, point: [0, 0] }, b: { hit: { face: 'F', point: [c[3], edges[7][0], 1] }, point: [0, 300] }, axes: FRONT, pxPerQuarter: 100, layerWidths: widths });
  assert.deepEqual([pair.a.highlight.cell[1], pair.b.highlight.cell[1]], [1, 7]);
});

// A cube face of n x n sticker planes at the layer centres, on +Z, in world units of the layer widths.
function frontFace(n) {
  const widths = standardLayerWidths(n), edge = layerEdge(widths), half = edge / 2, mid = layerCenters(widths), parent = new THREE.Group();
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(widths[k] * .9, widths[j] * .9), new THREE.MeshBasicMaterial());
    m.position.set(mid[k], mid[j], half); m.userData.stickerId = `sticker:${k}_${j}`; parent.add(m);
  }
  parent.updateMatrixWorld(true);
  return { widths, half, mid, parent };
}

test('picking returns the sticker and a hit the gesture core maps to the same cell, for every size', () => {
  for (const n of [...ACCEPTED, ...OPEN_ONLY]) {
    const { widths, half, mid, parent } = frontFace(n);
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 1000); camera.position.set(0, 0, half * 6); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const rect = { left: 0, top: 0, width: 800, height: 800 };
    for (const [k, j] of [[0, 0], [n - 1, n - 1], [0, n - 1], [n >> 1, n >> 1], [1 % n, n - 1 - (1 % n)]]) {
      const v = new THREE.Vector3(mid[k], mid[j], half).project(camera), x = (v.x + 1) * 400, y = (1 - v.y) * 400;
      const found = pickPlayFace(parent, camera, rect, x, y, half);
      assert.ok(found, `n=${n} ${k},${j}`);
      assert.equal(found.stickerId, `sticker:${k}_${j}`, `n=${n}`);
      assert.equal(found.hit.face, 'F');
      assert.deepEqual(hitCell(found.hit, n, widths), [k, j, n - 1], `n=${n} ${k},${j}`);
    }
  }
});
