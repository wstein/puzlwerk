// SPDX-License-Identifier: AGPL-3.0-or-later
// Display orientation setter and the CubeAssembler view presets (Up, Right, Front, Down, Left, Back, Isometric, Iso-back).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VIEW_PRESETS, viewPresetOrientation, viewPresetAngles } from '../dist/view-presets.js';
import { SmartRotation } from '../dist/smart-rotation.js';
import { createStageForTest } from '../dist/stage.js';

// Expected values are written out from wstein/cube-assembler origin/main 18ecf8b, src/core/view/CubeViewState.res (facePreset,
// isometricAngles: pitch 0.52, yaw -0.74) and src/client/view3d/useCubeRenderer.ts (model = mat4RotateX(pitch) then mat4RotateY(yaw) on the identity).
const QUARTER = Math.PI / 2, LIMIT = QUARTER - 0.05;
const EXPECTED = {
  up: { pitch: LIMIT, yaw: 0 }, down: { pitch: -LIMIT, yaw: 0 }, front: { pitch: 0, yaw: 0 }, back: { pitch: 0, yaw: Math.PI },
  right: { pitch: 0, yaw: -QUARTER }, left: { pitch: 0, yaw: QUARTER },
  isometric: { pitch: 0.52, yaw: -0.74 }, 'iso-back': { pitch: -0.52, yaw: -0.74 + Math.PI },
};
// gl-matrix mat4RotateX / mat4RotateY applied in this order to the identity, as plain 3x3 row-major matrices: model = Rx(pitch) * Ry(yaw).
const rx = (t) => [[1, 0, 0], [0, Math.cos(t), -Math.sin(t)], [0, Math.sin(t), Math.cos(t)]];
const ry = (t) => [[Math.cos(t), 0, Math.sin(t)], [0, 1, 0], [-Math.sin(t), 0, Math.cos(t)]];
const mul = (a, b) => a.map((r) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
const applyQ = (q, v) => new THREE.Vector3(...v).applyQuaternion(new THREE.Quaternion(...q)).toArray();
const sameRotation = (a, b) => Math.abs(new THREE.Quaternion(...a).dot(new THREE.Quaternion(...b))) > 1 - 1e-9;

test('the presets are exactly the eight CubeAssembler views', () => {
  assert.deepEqual([...VIEW_PRESETS], ['up', 'right', 'front', 'down', 'left', 'back', 'isometric', 'iso-back']);
  for (const name of VIEW_PRESETS) {
    const { pitch, yaw } = viewPresetAngles(name);
    assert.ok(Math.abs(pitch - EXPECTED[name].pitch) < 1e-12 && Math.abs(yaw - EXPECTED[name].yaw) < 1e-12, name);
    const q = viewPresetOrientation(name), model = mul(rx(EXPECTED[name].pitch), ry(EXPECTED[name].yaw));
    for (const [i, axis] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]].entries()) {
      const want = model.map((row) => row[i]), got = applyQ(q, axis);
      for (let k = 0; k < 3; k++) assert.ok(Math.abs(want[k] - got[k]) < 1e-12, `${name} axis ${i} component ${k}`);
    }
  }
  assert.throws(() => viewPresetOrientation('top'), /Unknown view preset/);
});

test('a face preset turns that face toward the observer on +Z; Up and Down stop short of the pole', () => {
  const toward = { front: [0, 0, 1], back: [0, 0, -1], right: [1, 0, 0], left: [-1, 0, 0] };
  for (const [name, normal] of Object.entries(toward)) {
    const seen = applyQ(viewPresetOrientation(name), normal);
    assert.ok(Math.abs(seen[2] - 1) < 1e-12, `${name} ${seen}`);
  }
  assert.ok(Math.abs(applyQ(viewPresetOrientation('up'), [0, 1, 0])[2] - Math.sin(LIMIT)) < 1e-12);
  assert.ok(Math.abs(applyQ(viewPresetOrientation('down'), [0, -1, 0])[2] - Math.sin(LIMIT)) < 1e-12);
  // The isometric views show three faces: the corner (1,1,1) direction after the preset looks toward +Z.
  const iso = applyQ(viewPresetOrientation('isometric'), [1, 1, 1]), back = applyQ(viewPresetOrientation('iso-back'), [-1, -1, -1]);
  assert.ok(iso[2] > 0.5 && back[2] > 0.5, `${iso} ${back}`);
});

test('SmartRotation.setOrientation sets the pose, keeps it, and makes it the return target', () => {
  for (const mode of ['smart', 'free', 'classic']) for (const name of VIEW_PRESETS) {
    const c = new SmartRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.2, 0)), mode, false);
    c.setOrientation(new THREE.Quaternion(...viewPresetOrientation(name)), 1);
    assert.ok(sameRotation(c.quaternion.toArray(), viewPresetOrientation(name)), `${mode} ${name}`);
    c.step(60);
    assert.equal(c.phase, 'idle', `${mode} ${name}`);
    assert.ok(sameRotation(c.quaternion.toArray(), viewPresetOrientation(name)), `${mode} ${name} after 60 s`);
  }
  const c = new SmartRotation(new THREE.Quaternion(), 'smart', false);
  assert.throws(() => c.setOrientation(new THREE.Quaternion(0, 0, 0, 2), 0), /Invalid presentation orientation/);
  assert.throws(() => c.setOrientation(new THREE.Quaternion(NaN, 0, 0, 1), 0), /Invalid presentation orientation/);
  assert.throws(() => c.setOrientation(new THREE.Quaternion(), -1), /Invalid rotation time/);
});

test('after a drag, smart mode returns to the preset, not to the initial view', () => {
  for (const name of ['right', 'back', 'isometric', 'down']) {
    const c = new SmartRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, -0.2, 0)), 'smart', false);
    c.setOrientation(new THREE.Quaternion(...viewPresetOrientation(name)), 1);
    c.down(2); c.drag(0.2, 0.3, 2.01); c.up(2.02, true);
    assert.ok(!sameRotation(c.quaternion.toArray(), viewPresetOrientation(name)), `${name} moved`);
    c.step(2.03); c.step(60);
    assert.equal(c.phase, 'idle', name);
    assert.ok(sameRotation(c.quaternion.toArray(), viewPresetOrientation(name)), `${name} returned to the preset`);
  }
});

test('a rolled orientation is kept in free mode and projected to upright pitch/yaw otherwise', () => {
  const rolled = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, 0.5, 'XYZ'));
  const free = new SmartRotation(new THREE.Quaternion(), 'free', false); free.setOrientation(rolled, 0);
  assert.ok(sameRotation(free.quaternion.toArray(), rolled.toArray()));
  const smart = new SmartRotation(new THREE.Quaternion(), 'smart', false); smart.setOrientation(rolled, 0);
  assert.ok(!sameRotation(smart.quaternion.toArray(), rolled.toArray()));
  assert.ok(Math.abs(smart.quaternion.length() - 1) < 1e-12);
});

function stage(mode = 'smart') {
  let now = 0, id = 0; const frames = new Map(), views = [], errors = [];
  const clock = { now: () => now, request: (cb) => { frames.set(++id, cb); return id; }, cancel: (key) => frames.delete(key) };
  const engine = createStageForTest({ resolveAsset: async () => ({ ok: false }), initialOrientation: [0, 0, 0, 1], mode, fovDegrees: 35, sensitivity: .004, dragThreshold: 0,
    onError: (e) => errors.push(e), onViewChanged: (v) => views.push(v) }, clock, { render() {}, setView() {}, dispose() {} });
  return { engine, views, errors, step(ms) { now += ms; const p = [...frames.values()]; frames.clear(); for (const f of p) f(now); } };
}

test('the stage setter reports the pose through onViewChanged for every preset and every mode', () => {
  for (const mode of ['smart', 'free', 'classic']) {
    const s = stage(mode);
    for (const name of VIEW_PRESETS) {
      const before = s.views.length, q = viewPresetOrientation(name), result = s.engine.setDisplayOrientation(q);
      assert.equal(result.ok, true, `${mode} ${name}`);
      assert.equal(s.views.length, before + 1, `${mode} ${name}`);
      assert.ok(sameRotation(s.views.at(-1).orientation, q), `${mode} ${name}`);
      s.step(30000);
      assert.ok(sameRotation(s.views.at(-1).orientation, q), `${mode} ${name} stays`);
    }
  }
});

test('the stage setter rejects an invalid pose and leaves the view alone; dispose and context loss are reported', () => {
  const s = stage(), start = s.views.length;
  for (const bad of [[0, 0, 0, 2], [NaN, 0, 0, 1], [0, 0, 0], 'x', undefined, [0, 0, 0, 0]]) {
    assert.equal(s.engine.setDisplayOrientation(bad).error.code, 'InvalidProjection', String(bad));
  }
  assert.equal(s.views.length, start);
  s.engine.contextLost();
  assert.equal(s.engine.setDisplayOrientation([0, 0, 0, 1]).error.code, 'ContextLost');
  const d = stage(); d.engine.dispose();
  assert.equal(d.engine.setDisplayOrientation([0, 0, 0, 1]).error.code, 'Disposed');
});
