import { test } from "node:test";
import assert from "node:assert/strict";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Goal from "../core/res/PwGoal.res.mjs";
import { definitionText, pieceId, slots } from "./helpers/cube-model.mjs";

// T010 / AC02, AC04: identity, position and exact-pose predicates. Expected values are derived by hand
// from the data model ("Goals and symmetry") and ADR 0008, not from the implementation.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const slot = (n, x, y, z) => ok(Shell.makeSlot(size(n), { x, y, z }));
const id = (s) => ok(Id.make(s));
const orient = (a) => ok(Orientation.make(a));
const defs = {};
const def = (n) => (defs[n] ??= ok(Codec.decodeDefinition(definitionText(n))));
const home = (n) => Codec.homeState(def(n));
const withPoses = (n, edit) => ok(Codec.stateOfPoses(def(n), Codec.poses(home(n)).map(edit)));
const turn = (n, axis, layers, turns, state) => {
  const m = ok(Move.make(size(n), axis, layers, turns));
  return ok(Codec.stateOfPoses(def(n), Codec.poses(state).map((p) => Move.applyToPose(m, p))));
};

const sizeOfState = { 8: 2, 26: 3, 56: 4 };
// Fixed frame, no appearance declarations: the T010 predicates only.
const check = (state, node) => {
  const d = def(sizeOfState[Codec.poses(state).length]);
  return Goal.evaluate(d, state, ok(Goal.makeGoal(d, [], [Orientation.identity], node)));
};
const pieceAt = (pid, s) => ({ TAG: "PieceAt", _0: id(pid), _1: s });
const piecePose = (pid, s, o) => ({ TAG: "PiecePose", _0: id(pid), _1: s, _2: o, _3: [Orientation.identity] });
const all = (nodes) => ({ TAG: "All", _0: nodes });
const any = (nodes) => ({ TAG: "Any", _0: nodes });
const I = Orientation.identity;
// 120 degree turn about (1,1,1): x -> y -> z -> x; columns are the images of e_x, e_y, e_z.
const C3 = orient([0, 0, 1, 1, 0, 0, 0, 1, 0]);

test("pieceAt checks identity and destination only", () => {
  const h = home(2);
  assert.equal(check(h, pieceAt("UFR", slot(2, 1, 1, 1))), true);
  assert.equal(check(h, pieceAt("UFR", slot(2, -1, 1, 1))), false);
  assert.equal(check(h, pieceAt("UFL", slot(2, -1, 1, 1))), true);
});

test("pieceAt ignores orientation, piecePose does not (AC04)", () => {
  // The UFR corner twisted in place: still at (1,1,1), O is a 120 degree turn, O.h = h.
  const twisted = withPoses(2, (p) => (Id.toString(Pose.pieceId(p)) === "UFR" ? Pose.make(Pose.pieceId(p), Pose.position(p), C3) : p));
  const at = slot(2, 1, 1, 1);
  assert.equal(check(twisted, pieceAt("UFR", at)), true);
  assert.equal(check(twisted, piecePose("UFR", at, I)), false);
  assert.equal(check(twisted, piecePose("UFR", at, C3)), true);
  assert.equal(check(home(2), piecePose("UFR", at, I)), true);
  assert.equal(check(home(2), piecePose("UFR", at, C3)), false);
});

test("piecePose needs the destination as well as the orientation", () => {
  assert.equal(check(home(2), piecePose("UFR", slot(2, -1, 1, 1), I)), false);
  // After U (layer 1 of Y, -1 turn) the UFR corner sits at (-1,1,1) with O = R_y(-90) = [0,0,-1; 0,1,0; 1,0,0].
  const afterU = turn(2, "Y", [1], -1, home(2));
  const rotY = orient([0, 0, -1, 0, 1, 0, 1, 0, 0]);
  assert.equal(check(afterU, piecePose("UFR", slot(2, -1, 1, 1), rotY)), true);
  assert.equal(check(afterU, piecePose("UFR", slot(2, -1, 1, 1), I)), false);
  assert.equal(check(afterU, pieceAt("UFR", slot(2, -1, 1, 1))), true);
});

test("same-colored pieces are distinct for identity goals (AC02)", () => {
  // N=4: the four U centers carry the same color (white). After U they permute among their four slots.
  const centers = slots(4).filter((s) => s[1] === 3 && Math.abs(s[0]) === 1 && Math.abs(s[2]) === 1);
  assert.equal(centers.length, 4);
  const ids = centers.map((s) => pieceId(s, 4));
  const pieces = Codec.pieces(def(4));
  const colorOf = (pid) => pieces.filter((p) => Id.toString(p.id) === pid).flatMap((p) => p.stickers.map((s) => Id.toString(s.color)));
  for (const pid of ids) assert.deepEqual(colorOf(pid), ["white"]);
  const afterU = turn(4, "Y", [3], -1, home(4));
  const [a, b] = [centers[0], ids[0]];
  const here = slot(4, a[0], a[1], a[2]);
  assert.equal(check(home(4), pieceAt(b, here)), true);
  assert.equal(check(afterU, pieceAt(b, here)), false);
  // Some other center now occupies that slot: a color-only view would not see the difference.
  const occupants = ids.filter((pid) => check(afterU, pieceAt(pid, here)));
  assert.equal(occupants.length, 1);
  assert.notEqual(occupants[0], b);
  assert.deepEqual(colorOf(occupants[0]), colorOf(b));
});

test("all is a conjunction and any a disjunction; empty all is true, empty any false", () => {
  const h = home(2);
  const yes = pieceAt("UFR", slot(2, 1, 1, 1));
  const no = pieceAt("UFR", slot(2, -1, 1, 1));
  assert.equal(check(h, all([])), true);
  assert.equal(check(h, any([])), false);
  assert.equal(check(h, all([yes, yes])), true);
  assert.equal(check(h, all([yes, no])), false);
  assert.equal(check(h, any([no, yes])), true);
  assert.equal(check(h, any([no, no])), false);
  assert.equal(check(h, all([any([no, yes]), all([yes])])), true);
});

test("a goal naming a piece outside the definition is rejected before evaluation", () => {
  const d = def(2);
  for (const node of [pieceAt("nope", slot(2, 1, 1, 1)), piecePose("nope", slot(2, 1, 1, 1), I)]) {
    assert.equal(Goal.makeGoal(d, [], [I], node)._0, "UnknownPiece");
  }
});
