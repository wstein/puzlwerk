import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { standardLayerWidths, isEstimatedStandardFactor, LARGE_CUBE_OUTER_FACTOR_ESTIMATE, LARGE_CUBE_FIRST_SIZE, STANDARD_CUBE_MEASUREMENTS, uniformLayerWidths, thickOuterLayerWidths, layerEdge, layerPlanes, layerCenters } from '../dist/layer-widths.js';
import * as viewer from '../dist/index.js';

const TABLE = { 2: 1, 3: 1, 4: 1.1, 5: 1.2, 6: 1.4, 7: 1.6 };

test('standard widths per size are [f, 1, ..., 1, f]', () => {
  for (const [n, f] of Object.entries(TABLE)) {
    const widths = standardLayerWidths(Number(n));
    assert.equal(widths.length, Number(n));
    assert.equal(widths[0], f, `N=${n} outer`);
    assert.equal(widths[widths.length - 1], f, `N=${n} outer`);
    for (const w of widths.slice(1, -1)) assert.equal(w, 1, `N=${n} inner`);
  }
  assert.deepEqual(standardLayerWidths(7), [1.6, 1, 1, 1, 1, 1, 1.6]);
});

test('4x4, 5x5, 6x6 and 7x7 values derive from the measurements with the owner scaling', () => {
  const m = STANDARD_CUBE_MEASUREMENTS;
  assert.equal(m.length, 5);
  for (const x of m) assert.ok(x.date === '2026-11-17' && x.unit === 'mm (assumed)');
  const overhang = n => { const rows = m.filter(x => x.cube === `${n}x${n}`); assert.ok(rows.length > 0); return rows.reduce((s, x) => s + (x.outer / x.inner - 1), 0) / rows.length; };
  const o4 = overhang(4), o5 = overhang(5), o7 = overhang(7);
  assert.ok(Math.abs(o4 - 0.118) < 0.001 && Math.abs(o5 - 0.240) < 0.001 && Math.abs(o7 - 0.736) < 0.001);
  const s = 0.6 / o7;
  assert.ok(Math.abs(s - 0.8152) < 0.0005);
  const outer = n => standardLayerWidths(n)[0];
  assert.ok(Math.abs(outer(7) - (1 + s * o7)) < 0.005);
  assert.ok(Math.abs(outer(4) - (1 + s * o4)) < 0.005, `4x4 ${outer(4)}`);
  assert.ok(Math.abs(outer(5) - (1 + s * o5)) < 0.005, `5x5 ${outer(5)}`);
  assert.ok(Math.abs(outer(6) - (1 + s * (o5 + o7) / 2)) < 0.005, `6x6 ${outer(6)}`);
});

test('the measurement data is frozen and the table is not shared', () => {
  assert.ok(Object.isFrozen(STANDARD_CUBE_MEASUREMENTS));
  STANDARD_CUBE_MEASUREMENTS.forEach(row => assert.ok(Object.isFrozen(row), `${row.cube} ${row.label}`));
  const a = standardLayerWidths(5); a[0] = 99;
  assert.equal(standardLayerWidths(5)[0], 1.2);
  assert.notEqual(standardLayerWidths(5), standardLayerWidths(5));
});

test('outer overrides the table for one call only', () => {
  assert.deepEqual(standardLayerWidths(7, { outer: 1.8 }), thickOuterLayerWidths(7, 1.8));
  assert.deepEqual(standardLayerWidths(3, { outer: 1.5 }), [1.5, 1, 1.5]);
  assert.equal(standardLayerWidths(7)[0], 1.6);
  for (const bad of [0.99, NaN, Infinity, -1]) assert.throws(() => standardLayerWidths(7, { outer: bad }), /Invalid outer layer width/);
});

test('without outer, sizes outside 2..64 and non integers are errors', () => {
  for (const n of [0, 1, 65, 2.5, NaN, -3, Infinity]) assert.throws(() => standardLayerWidths(n), /No standard layer widths for N = .*pass options\.outer/);
});

test('with outer any integer N >= 2 works, invalid N still fails', () => {
  const w = standardLayerWidths(8, { outer: 2 });
  assert.deepEqual(w, [2, 1, 1, 1, 1, 1, 1, 2]);
  assert.equal(layerEdge(w), 10);
  const planes = layerPlanes(w); assert.equal(planes.length, 9); assert.equal(planes[0], -5); assert.equal(planes[8], 5);
  const c = layerCenters(w); c.forEach((v, i) => assert.ok(Math.abs(v + c[7 - i]) < 1e-12));
  assert.equal(standardLayerWidths(9, { outer: 1.5 }).length, 9);
  for (const n of [0, 1, 2.5, NaN, Infinity, -4]) assert.throws(() => standardLayerWidths(n, { outer: 2 }), /No standard layer widths for N = /);
  assert.throws(() => standardLayerWidths(8, { outer: 0.5 }), /Invalid outer layer width/);
});

test('only the standard variant exists', () => {
  assert.deepEqual(standardLayerWidths(4, { variant: 'standard' }), [1.1, 1, 1, 1.1]);
  assert.throws(() => standardLayerWidths(4, { variant: 'maker-x' }), /Unknown cube variant/);
});

test('edge and planes stay consistent', () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const w = standardLayerWidths(n);
    assert.ok(Math.abs(layerEdge(w) - (n - 2 + 2 * TABLE[n])) < 1e-12);
    const planes = layerPlanes(w);
    assert.equal(planes.length, n + 1);
    assert.ok(Math.abs(planes[0] + planes[n]) < 1e-12);
    const c = layerCenters(w);
    c.forEach((v, i) => assert.ok(Math.abs(v + c[n - 1 - i]) < 1e-12));
  }
});

test('the viewer default stays uniform and the helper is exported', () => {
  assert.deepEqual(uniformLayerWidths(7), [1, 1, 1, 1, 1, 1, 1]);
  assert.equal(viewer.standardLayerWidths, standardLayerWidths);
  assert.equal(viewer.STANDARD_CUBE_MEASUREMENTS, STANDARD_CUBE_MEASUREMENTS);
});

test('calendar acceptance routes keep their explicit outer=1.8', async () => {
  const text = await readFile(new URL('../../../specs/009-viewer-consolidation/acceptance-routes.json', import.meta.url), 'utf8');
  assert.ok(text.includes('outer=1.8'));
  assert.deepEqual(standardLayerWidths(7, { outer: 1.8 }), [1.8, 1, 1, 1, 1, 1, 1.8]);
});

// Owner decision 2026-11-18 (E): 8..15 keep the 7x7 outer factor 1.6, an estimate; up to 7 the table stays as it was.
test('sizes up to 7 keep the previous widths byte for byte', () => {
  const previous = { 2: [1, 1], 3: [1, 1, 1], 4: [1.1, 1, 1, 1.1], 5: [1.2, 1, 1, 1, 1.2], 6: [1.4, 1, 1, 1, 1, 1.4], 7: [1.6, 1, 1, 1, 1, 1, 1.6] };
  for (const [n, widths] of Object.entries(previous)) assert.equal(JSON.stringify(standardLayerWidths(Number(n))), JSON.stringify(widths), `N=${n}`);
});

test('8..15 hold the outer factor 1.6 of the 7x7 and name it an estimate', () => {
  assert.equal(LARGE_CUBE_OUTER_FACTOR_ESTIMATE, 1.6);
  assert.equal(LARGE_CUBE_FIRST_SIZE, 8);
  for (let n = 8; n <= 15; n++) {
    const w = standardLayerWidths(n);
    assert.equal(w.length, n);
    assert.equal(w[0], 1.6, `N=${n}`); assert.equal(w[n - 1], 1.6, `N=${n}`);
    for (const inner of w.slice(1, -1)) assert.equal(inner, 1, `N=${n}`);
    assert.ok(Math.abs(layerEdge(w) - (n - 2 + 3.2)) < 1e-12, `N=${n}`);
    assert.equal(isEstimatedStandardFactor(n), true, `N=${n}`);
  }
  assert.deepEqual([2, 3, 4, 5, 6, 7].map(isEstimatedStandardFactor), [false, true, false, false, true, false]);
});

test('outer factor is monotone and bounded over 2..15; the structure is open to 64', () => {
  let previous = 1;
  for (let n = 2; n <= 15; n++) {
    const f = standardLayerWidths(n)[0];
    assert.ok(f >= previous, `N=${n} ${f} < ${previous}`);
    assert.ok(f >= 1 && f <= 1.6, `N=${n} ${f}`);
    previous = f;
  }
  for (const n of [16, 32, 64]) { const w = standardLayerWidths(n); assert.equal(w.length, n); assert.equal(w[0], 1.6); assert.equal(w[n - 1], 1.6); }
  assert.throws(() => standardLayerWidths(65), /No standard layer widths for N = 65/);
});
