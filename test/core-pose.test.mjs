import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";

// T005 / AC10: validated IDs, shell coordinates and proper poses. Expected values are derived
// by hand from the data model and ADR 0008, not from the implementation. Layout: row-major O,
// column j is O.e_j.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const err = (r) => { assert.equal(r.TAG, "Error", `expected Error, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const slot = (n, x, y, z) => ok(Shell.makeSlot(size(n), { x, y, z }));
const o = (a) => ok(Orientation.make(a));
const fixture = JSON.parse(readFileSync(new URL("./fixtures/conformance/f1-frames.json", import.meta.url), "utf8"));

test("IDs accept [A-Za-z0-9._:-]+ and are case-sensitive", () => {
  for (const s of ["R", "a", "piece-01", "UFR:0", "a.b_c", "A9"]) assert.equal(Id.toString(ok(Id.make(s))), s);
  assert.notEqual(Id.toString(ok(Id.make("a"))), Id.toString(ok(Id.make("A"))));
});

test("IDs reject empty and other characters", () => {
  assert.equal(err(Id.make("")), "Empty");
  for (const s of ["a b", "a/b", "é", "a\n", "a+b", "ａ"]) assert.equal(err(Id.make(s)), "BadChar", s);
});

test("size accepts 2 to 64 only", () => {
  for (const n of [2, 3, 7, 64]) assert.equal(Shell.sizeToInt(size(n)), n);
  for (const n of [1, 0, -3]) assert.equal(err(Shell.makeSize(n)), "TooSmall");
  assert.equal(err(Shell.makeSize(65)), "TooLarge");
});

test("slot counts are N^3 - (N-2)^3 for odd and even N", () => {
  const expected = { 2: 8, 3: 26, 4: 56, 5: 98, 6: 152, 7: 218 };
  for (const [n, count] of Object.entries(expected)) {
    assert.equal(Shell.slotCount(size(Number(n))), count, `count N=${n}`);
    assert.equal(Shell.slots(size(Number(n))).length, count, `enumeration N=${n}`);
  }
});

test("even sizes use odd coordinates, odd sizes use even coordinates", () => {
  assert.equal(err(Shell.makeSlot(size(2), { x: 0, y: 1, z: 1 })), "BadParity");
  assert.equal(err(Shell.makeSlot(size(3), { x: 1, y: 1, z: 2 })), "BadParity");
  assert.equal(err(Shell.makeSlot(size(4), { x: 0, y: 3, z: 3 })), "BadParity");
  assert.deepEqual(Shell.toVec(slot(2, 1, -1, 1)), { x: 1, y: -1, z: 1 });
  assert.deepEqual(Shell.toVec(slot(3, 0, 0, 2)), { x: 0, y: 0, z: 2 });
  assert.deepEqual(Shell.toVec(slot(3, 0, 0, -2)), { x: 0, y: 0, z: -2 });
  assert.deepEqual(Shell.toVec(slot(4, 3, 1, -1)), { x: 3, y: 1, z: -1 });
});

test("interior and out-of-range coordinates are rejected", () => {
  assert.equal(err(Shell.makeSlot(size(3), { x: 0, y: 0, z: 0 })), "Interior");
  assert.equal(err(Shell.makeSlot(size(4), { x: 1, y: 1, z: 1 })), "Interior");
  assert.equal(err(Shell.makeSlot(size(5), { x: 2, y: 0, z: -2 })), "Interior");
  assert.equal(err(Shell.makeSlot(size(3), { x: 4, y: 0, z: 0 })), "OutOfRange");
  assert.equal(err(Shell.makeSlot(size(2), { x: 1, y: -3, z: 1 })), "OutOfRange");
});

test("the N=2 shell is exactly the eight (+-1,+-1,+-1) slots, enumerated without duplicates", () => {
  const got = Shell.slots(size(2)).map((s) => JSON.stringify(Shell.toVec(s)));
  const want = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) want.push(JSON.stringify({ x, y, z }));
  assert.deepEqual([...got].sort(), want.sort());
  for (const n of [3, 4, 5]) {
    const all = Shell.slots(size(n)).map((s) => JSON.stringify(Shell.toVec(s)));
    assert.equal(new Set(all).size, all.length);
  }
});

test("orientation accepts the identity and a hand-derived quarter turn", () => {
  assert.deepEqual(Orientation.toArray(o([1, 0, 0, 0, 1, 0, 0, 0, 1])), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  // +Z quarter turn: e_x -> e_y, e_y -> -e_x, e_z -> e_z; the columns are the images.
  const rz = o([0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.deepEqual(Orientation.apply(rz, { x: 1, y: 0, z: 0 }), { x: 0, y: 1, z: 0 });
  assert.deepEqual(Orientation.apply(rz, { x: 0, y: 1, z: 0 }), { x: -1, y: 0, z: 0 });
  // data model: +Z,+1 maps (x,y,z) to (-y,x,z); the N=2 piece at (1,-1,1) reaches (1,1,1).
  assert.deepEqual(Orientation.apply(rz, { x: 1, y: -1, z: 1 }), { x: 1, y: 1, z: 1 });
});

test("reflections are rejected (determinant -1)", () => {
  assert.equal(err(Orientation.make([-1, 0, 0, 0, 1, 0, 0, 0, 1])), "Reflection");
  assert.equal(err(Orientation.make([-1, 0, 0, 0, -1, 0, 0, 0, -1])), "Reflection");
  assert.equal(err(Orientation.make([0, 1, 0, 1, 0, 0, 0, 0, 1])), "Reflection");
});

test("non-orthogonal, out-of-range and wrong-length matrices are rejected", () => {
  assert.equal(err(Orientation.make([1, 1, 0, 0, 1, 0, 0, 0, 1])), "NotOrthogonal");
  assert.equal(err(Orientation.make([0, 0, 0, 0, 1, 0, 0, 0, 1])), "NotOrthogonal");
  assert.equal(err(Orientation.make([2, 0, 0, 0, 1, 0, 0, 0, 1])), "BadEntry");
  assert.equal(err(Orientation.make([1, 0, 0, 0, 1, 0, 0, 0])), "BadLength");
  assert.equal(err(Orientation.make([])), "BadLength");
});

test("all 24 rotations of F1 are accepted, equal the enumerated group and their negations are rejected", () => {
  const f1 = fixture.rotations.map((r) => r.o);
  assert.equal(f1.length, 24);
  for (const a of f1) {
    assert.deepEqual(Orientation.toArray(o(a)), a);
    assert.equal(err(Orientation.make(a.map((v) => (v === 0 ? 0 : -v)))), "Reflection");
  }
  const group = Orientation.all().map(Orientation.toArray);
  assert.equal(group.length, 24);
  assert.deepEqual(group.map((a) => a.join()).sort(), f1.map((a) => a.join()).sort());
});

test("the group is closed, transpose is the inverse and the identity is neutral", () => {
  const group = Orientation.all();
  const id = Orientation.identity;
  const keys = new Set(group.map((g) => Orientation.toArray(g).join()));
  for (const a of group) {
    assert.ok(Orientation.equal(Orientation.compose(a, Orientation.transpose(a)), id));
    assert.ok(Orientation.equal(Orientation.compose(id, a), a));
    for (const b of group) assert.ok(keys.has(Orientation.toArray(Orientation.compose(a, b)).join()));
  }
  // x then z differ: Rx(+1) after Rz(+1) is not Rz(+1) after Rx(+1).
  const rx = o([1, 0, 0, 0, 0, -1, 0, 1, 0]);
  const rz = o([0, -1, 0, 1, 0, 0, 0, 0, 1]);
  assert.ok(!Orientation.equal(Orientation.compose(rx, rz), Orientation.compose(rz, rx)));
  // compose(a,b) applies b first: Rz then Rx sends e_x to e_y to e_z.
  assert.deepEqual(Orientation.apply(Orientation.compose(rx, rz), { x: 1, y: 0, z: 0 }), { x: 0, y: 0, z: 1 });
});

test("a pose keeps its ID, slot and orientation; position equals O.home only when consistent", () => {
  const home = slot(2, 1, -1, 1);
  const rz = o([0, -1, 0, 1, 0, 0, 0, 0, 1]);
  const id = ok(Id.make("UFR"));
  const moved = Pose.make(id, slot(2, 1, 1, 1), rz);
  assert.equal(Id.toString(Pose.pieceId(moved)), "UFR");
  assert.deepEqual(Shell.toVec(Pose.position(moved)), { x: 1, y: 1, z: 1 });
  assert.ok(Pose.positionMatchesHome(moved, home));
  assert.ok(!Pose.positionMatchesHome(Pose.make(id, slot(2, 1, 1, 1), Orientation.identity), home));
  assert.ok(Pose.positionMatchesHome(Pose.make(id, home, Orientation.identity), home));
});

test("the position rule holds for centers of an odd cube", () => {
  const home = slot(3, 0, 0, 2); // front center
  const rx = o([1, 0, 0, 0, 0, -1, 0, 1, 0]); // +X quarter turn: e_z -> -e_y
  const id = ok(Id.make("F-center"));
  assert.ok(Pose.positionMatchesHome(Pose.make(id, slot(3, 0, -2, 0), rx), home));
  assert.ok(!Pose.positionMatchesHome(Pose.make(id, slot(3, 0, 2, 0), rx), home));
});
