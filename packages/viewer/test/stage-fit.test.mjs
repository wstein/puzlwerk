// SPDX-License-Identifier: AGPL-3.0-or-later
// Camera fit of a stage for a cube of any size: the whole legal-turn sphere stays inside the view frustum.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cubeStageFit, cubePresentationRadius, presentationCameraRadius } from '../dist/presentation-rotation.js';
import { standardLayerWidths, layerEdge } from '../dist/layer-widths.js';

const SIZES = [...Array.from({ length: 14 }, (_, i) => i + 2), 16, 64];

test('the fit keeps the turn sphere of every cube size inside the frustum, for several aspects and fields of view', () => {
  for (const n of SIZES) {
    const half = layerEdge(standardLayerWidths(n)) / 2, radius = cubePresentationRadius(half), { viewPolicy, casterEnvelope } = cubeStageFit(half);
    assert.equal(casterEnvelope.radius, radius);
    assert.ok(casterEnvelope.clearance > 0);
    for (const aspect of [0.5, 1, 1.78, 3]) for (const fovDegrees of [18, 28, 35]) for (const zoom of [1, 0.8, 1.7]) {
      const fit = viewPolicy({ aspect, fovDegrees, zoom, orientation: [0, 0, 0, 1], placements: [{ position: [0, 0, 0] }] });
      const vertical = fovDegrees * Math.PI / 360, horizontal = Math.atan(Math.tan(vertical) * aspect), tightest = Math.min(vertical, horizontal);
      if (zoom >= 1) assert.ok(fit.distance * Math.sin(tightest) >= radius, `n=${n} aspect=${aspect} fov=${fovDegrees} zoom=${zoom}`);
      assert.ok(fit.distance > radius, `n=${n}`);
      assert.ok(fit.far > fit.distance + radius, `n=${n}`);
      assert.equal(fit.groupScale, 1);
      assert.equal(fit.distance, presentationCameraRadius(aspect, radius, fovDegrees) * zoom);
    }
  }
});

test('the fit grows with the cube and rejects a bad extent', () => {
  let last = 0;
  for (const n of SIZES) { const d = cubeStageFit(layerEdge(standardLayerWidths(n)) / 2).viewPolicy({ aspect: 1, fovDegrees: 18, zoom: 1, orientation: [0, 0, 0, 1], placements: [] }).distance; assert.ok(d > last, `n=${n}`); last = d; }
  for (const bad of [0, -1, NaN, Infinity, undefined]) assert.throws(() => cubeStageFit(bad), /Invalid cube extent/);
});
