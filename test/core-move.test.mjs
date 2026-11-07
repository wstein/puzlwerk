import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";

// T006 / AC08-09: canonical move AST, inverses and pure layer transformations. Expected images are
// derived by hand from the data model: layer i has coordinate 2i-(N-1); positive turns are right-hand
// about the positive axis; a move maps the selected poses (p,O) to (Rp,RO).
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const err = (r) => { assert.equal(r.TAG, "Error", `expected Error, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const slot = (n, x, y, z) => ok(Shell.makeSlot(size(n), { x, y, z }));
const move = (n, axis, layers, turns) => ok(Move.make(size(n), axis, layers, turns));
const pose = (n, name, x, y, z, o = Orientation.identity) => Pose.make(ok(Id.make(name)), slot(n, x, y, z), o);
const where = (p) => Shell.toVec(Pose.position(p));
const fixture = JSON.parse(readFileSync(new URL("./fixtures/conformance/f1-frames.json", import.meta.url), "utf8"));

// Outer faces in the standard outward-clockwise notation, as AST (data model, "Moves"), with the image
// of one corner on the face, written with t = N-1: [axis, layer, turns, from, to].
const faces = (t) => ({
  R: ["X", t, -1, [t, t, t], [t, t, -t]],
  L: ["X", 0, 1, [-t, t, t], [-t, -t, t]],
  U: ["Y", t, -1, [t, t, t], [-t, t, t]],
  D: ["Y", 0, 1, [t, -t, t], [t, -t, -t]],
  F: ["Z", t, -1, [t, t, t], [t, -t, t]],
  B: ["Z", 0, 1, [t, t, -t], [-t, t, -t]],
});

test("each outer face turn sends the hand-derived corner to its hand-derived slot (N=2, 3, 4)", () => {
  for (const n of [2, 3, 4]) {
    const t = n - 1;
    for (const [name, [axis, layer, turns, from, to]] of Object.entries(faces(t))) {
      const m = move(n, axis, [layer], turns);
      const moved = Move.applyToPose(m, pose(n, "p", ...from));
      assert.deepEqual(where(moved), { x: to[0], y: to[1], z: to[2] }, `${name} N=${n}`);
    }
  }
});

test("a face turn leaves every piece outside the selected layer untouched", () => {
  for (const n of [2, 3]) {
    const t = n - 1;
    // R selects x = t only; the opposite corner on the left face stays.
    const r = move(n, "X", [t], -1);
    const left = pose(n, "q", -t, t, t);
    assert.deepEqual(Move.applyToPose(r, left), left);
  }
});

test("orientation follows position: (p,O) becomes (Rp,RO) and centers carry a pose", () => {
  // N=3: the U center (0,2,0) after the all-layer rotation x (X, all layers, -1) lies on B and keeps O=R.
  const x = move(3, "X", [0, 1, 2], -1);
  const u = pose(3, "U-center", 0, 2, 0);
  const moved = Move.applyToPose(x, u);
  assert.deepEqual(where(moved), { x: 0, y: 0, z: -2 });
  assert.deepEqual(Orientation.toArray(Pose.orientation(moved)), [1, 0, 0, 0, 0, 1, 0, -1, 0]);
  // ADR 0008: p = O.h still holds after the move.
  assert.ok(Pose.positionMatchesHome(moved, slot(3, 0, 2, 0)));
});

test("the rotation of an all-layer turn about each axis equals the F1 whole-cube rotation", () => {
  const byTurns = (x, z, y) => fixture.rotations.find((r) => r.turns.x === x && r.turns.z === z && r.turns.y === y).o;
  const rot = (axis) => Orientation.toArray(Move.rotation(move(3, axis, [0, 1, 2], -1)));
  assert.deepEqual(rot("X"), byTurns(1, 0, 0));
  assert.deepEqual(rot("Y"), byTurns(0, 0, 1));
  assert.deepEqual(rot("Z"), byTurns(0, 1, 0));
});

test("a half turn is two quarter turns; a quarter turn to the fourth power is the identity", () => {
  const n = 3;
  const start = [pose(n, "a", 2, 2, 2), pose(n, "b", 0, 2, 2), pose(n, "c", 2, 0, 0)];
  for (const axis of ["X", "Y", "Z"]) {
    for (const turns of [1, -1]) {
      const q = move(n, axis, [2], turns);
      const half = move(n, axis, [2], 2);
      const twice = start.map((p) => Move.applyToPose(q, Move.applyToPose(q, p)));
      assert.deepEqual(start.map((p) => Move.applyToPose(half, p)), twice);
      const fourth = start.map((p) => [1, 2, 3, 4].reduce((acc) => Move.applyToPose(q, acc), p));
      assert.deepEqual(fourth, start);
    }
  }
});

test("the inverse undoes the move and flips the sign; half turns invert to themselves", () => {
  const n = 4;
  const p = pose(n, "a", 3, 1, -3);
  for (const axis of ["X", "Y", "Z"]) {
    for (const turns of [-1, 1, 2]) {
      const m = move(n, axis, [0, 3], turns);
      const inv = Move.inverse(m);
      assert.equal(Move.turns(inv), turns === 2 ? 2 : -turns);
      assert.deepEqual(Move.layers(inv), [0, 3]);
      assert.deepEqual(Move.applyToPose(inv, Move.applyToPose(m, p)), p);
      assert.deepEqual(Move.inverse(inv), m);
    }
  }
});

test("a single inner layer moves only that slice, a wide move equals its constituent layers", () => {
  const n = 3;
  const inner = move(n, "Y", [1], -1);
  assert.deepEqual(where(Move.applyToPose(inner, pose(n, "e", 2, 0, 0))), { x: 0, y: 0, z: 2 });
  assert.deepEqual(where(Move.applyToPose(inner, pose(n, "t", 2, 2, 0))), { x: 2, y: 2, z: 0 });
  const wide = move(5, "X", [3, 4], -1);
  const a = move(5, "X", [3], -1);
  const b = move(5, "X", [4], -1);
  for (const [x, y, z] of [[4, 4, 4], [2, 4, 0], [2, 0, 4], [0, 4, 4], [-4, 2, 4], [2, -4, -2]]) {
    const p = pose(5, "w", x, y, z);
    assert.deepEqual(Move.applyToPose(wide, p), Move.applyToPose(a, Move.applyToPose(b, p)));
    assert.deepEqual(Move.applyToPose(wide, p), Move.applyToPose(b, Move.applyToPose(a, p)));
  }
  // the wide move touches x=2 and x=4 only (layers 3 and 4 of N=5 have coordinates 2 and 4).
  assert.deepEqual(Move.applyToPose(wide, pose(5, "w", 0, 4, 4)), pose(5, "w", 0, 4, 4));
});

test("a quarter turn sends the N=2 piece at (1,-1,1) to (1,1,1) (+Z, +1)", () => {
  const m = move(2, "Z", [0, 1], 1);
  assert.deepEqual(where(Move.applyToPose(m, pose(2, "p", 1, -1, 1))), { x: 1, y: 1, z: 1 });
});

test("the move AST is canonical: layers sorted, unique, in range, nonempty; turns in {-1,1,2}", () => {
  assert.equal(err(Move.make(size(3), "X", [], 1)), "NoLayers");
  assert.equal(err(Move.make(size(3), "X", [3], 1)), "LayerOutOfRange");
  assert.equal(err(Move.make(size(3), "X", [-1], 1)), "LayerOutOfRange");
  assert.equal(err(Move.make(size(3), "X", [1, 0], 1)), "NotSortedUnique");
  assert.equal(err(Move.make(size(3), "X", [1, 1], 1)), "NotSortedUnique");
  for (const bad of [0, 3, -2, 4]) assert.equal(err(Move.make(size(3), "X", [0], bad)), "BadTurns");
  const m = move(3, "Z", [0, 2], -1);
  assert.equal(Move.axis(m), "Z");
  assert.deepEqual(Move.layers(m), [0, 2]);
  assert.equal(Move.turns(m), -1);
});

test("layer coordinates are 2i-(N-1) and selection uses the pre-move position", () => {
  const m = move(4, "Y", [1], 1);
  assert.ok(Move.selects(m, slot(4, 3, -1, 3)));
  assert.ok(!Move.selects(m, slot(4, 3, 1, 3)));
  assert.ok(!Move.selects(m, slot(4, 3, -3, 3)));
});

test("orientations accumulate on the left: Z+1 then X+1 gives Rx.Rz (hand-derived)", () => {
  const z = move(3, "Z", [0, 1, 2], 1);
  const x = move(3, "X", [0, 1, 2], 1);
  const moved = Move.applyToPose(x, Move.applyToPose(z, pose(3, "F-center", 0, 0, 2)));
  assert.deepEqual(where(moved), { x: 0, y: -2, z: 0 });
  assert.deepEqual(Orientation.toArray(Pose.orientation(moved)), [0, -1, 0, 0, 0, -1, 1, 0, 0]);
  assert.ok(Pose.positionMatchesHome(moved, slot(3, 0, 0, 2)));
});
