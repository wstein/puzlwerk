import { test } from "node:test";
import assert from "node:assert/strict";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Goal from "../core/res/PwGoal.res.mjs";
import { readFileSync } from "node:fs";
import { definitionText } from "./helpers/cube-model.mjs";

// T011 / AC05-07: C1/C2/C4 sticker symmetry, validated piece subgroups and one common global frame.
// Expected values are hand-derived from the data model ("Goals and symmetry"), including its example:
// a front sticker with target normal +Z and up +Y, currently up +X, fails C1 and C2 and passes C4.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const bad = (r, code) => { assert.equal(r.TAG, "Error", "expected Error"); assert.equal(r._0, code); };
const size = (n) => ok(Shell.makeSize(n));
const slot = (n, x, y, z) => ok(Shell.makeSlot(size(n), { x, y, z }));
const id = (s) => ok(Id.make(s));
const orient = (a) => ok(Orientation.make(a));
const I = Orientation.identity;
const defs = {};
const def = (n) => (defs[n] ??= ok(Codec.decodeDefinition(definitionText(n))));
const home = (n) => Codec.homeState(def(n));
const turn = (n, axis, layers, turns, state) => {
  const m = ok(Move.make(size(n), axis, layers, turns));
  return ok(Codec.stateOfPoses(def(n), Codec.poses(state).map((p) => Move.applyToPose(m, p))));
};
const seq = (n, moves, state = home(n)) => moves.reduce((s, [a, l, t]) => turn(n, a, l, t, s), state);

const all = (nodes) => ({ TAG: "All", _0: nodes });
const pieceAt = (pid, s) => ({ TAG: "PieceAt", _0: id(pid), _1: s });
const piecePose = (pid, s, o, h = [I]) => ({ TAG: "PiecePose", _0: id(pid), _1: s, _2: o, _3: h });
const stickerAt = (sid, s, n, u, sym) => ({ TAG: "StickerAt", _0: id(sid), _1: s, _2: n, _3: u, _4: sym });
const v = (x, y, z) => ({ x, y, z });
// Right-hand quarter turns about the axes (row-major, columns are images of e_x, e_y, e_z).
const RX = orient([1, 0, 0, 0, 0, -1, 0, 1, 0]);
const RY = orient([0, 0, 1, 0, 1, 0, -1, 0, 0]);
const RZ = orient([0, -1, 0, 1, 0, 0, 0, 0, 1]);
const pow = (o, k) => Array.from({ length: k }).reduce((a) => Orientation.compose(o, a), I);
const goal = (n, node, { frames = [I], appearance = [] } = {}) => ok(Goal.makeGoal(def(n), appearance.map(([s, c]) => [id(s), c]), frames, node));
const holds = (n, state, node, opts) => Goal.evaluate(def(n), state, goal(n, node, opts));

// ---- sticker symmetry (AC05) -------------------------------------------------------------------
// N=3 front center sticker F.F: home normal +Z, up +Y. F is axis Z, layer 2, turns -1.
const F = [["Z", [2], -1]];
const front = (sym) => stickerAt("F.F", slot(3, 0, 0, 2), v(0, 0, 1), v(0, 1, 0), sym);
const declared = { appearance: [["F.F", "C4"]] };

test("quarter-turn, half-turn and full-turn-only symmetry accept 4, 2 and 1 rotations (AC05)", () => {
  // up after F is +X (R_z(-90) maps +Y to +X), after F2 -Y, after F' -X.
  const cases = [
    [[], { C1: true, C2: true, C4: true }],
    [F, { C1: false, C2: false, C4: true }],
    [[["Z", [2], 2]], { C1: false, C2: true, C4: true }],
    [[["Z", [2], 1]], { C1: false, C2: false, C4: true }],
  ];
  for (const [moves, expected] of cases) {
    for (const sym of ["C1", "C2", "C4"]) {
      assert.equal(holds(3, seq(3, moves), front(sym), declared), expected[sym], `${JSON.stringify(moves)} ${sym}`);
    }
  }
});

test("the conformance fixture F6 cases agree with the core for C1, C2 and C4 (AC05)", () => {
  const f6 = JSON.parse(readFileSync(new URL("./fixtures/conformance/f6-symmetry.json", import.meta.url), "utf8"));
  assert.ok(f6.cases.length >= 5);
  for (const c of f6.cases) {
    const [nx, ny, nz] = c.normal;
    const [ux, uy, uz] = c.up;
    // The rotation that sends the front center sticker (normal +Z, up +Y) to the fixture's normal and up.
    const o = Orientation.all().find((r) => { const a = Orientation.apply(r, v(0, 0, 1)); const b = Orientation.apply(r, v(0, 1, 0)); return a.x === nx && a.y === ny && a.z === nz && b.x === ux && b.y === uy && b.z === uz; });
    assert.ok(o, c.text);
    const state = ok(Codec.stateOfPoses(def(3), Codec.poses(home(3)).map((p) => { const w = Orientation.apply(o, Shell.toVec(Pose.position(p))); return Pose.make(Pose.pieceId(p), slot(3, w.x, w.y, w.z), o); })));
    const at = slot(3, 2 * nx, 2 * ny, 2 * nz);
    for (const sym of ["C1", "C2", "C4"]) {
      const node = stickerAt("F.F", at, v(...c.targetNormal), v(...c.targetUp), sym);
      assert.equal(holds(3, state, node, declared), c.pass[sym], `${c.text} ${sym}`);
    }
  }
});

test("tilting the normal fails every symmetry whatever the up vector (AC05)", () => {
  // Whole-cube turn about X: the F center moves to (0,-2,0)... use the new position as the target position.
  const tilted = seq(3, [["X", [0, 1, 2], 1]]);
  const at = slot(3, 0, -2, 0);
  for (const sym of ["C1", "C2", "C4"]) {
    assert.equal(holds(3, tilted, stickerAt("F.F", at, v(0, 0, 1), v(0, 1, 0), sym), declared), false, sym);
  }
  // Its new world normal is -Y, up is +Z: that is the goal that holds.
  assert.equal(holds(3, tilted, stickerAt("F.F", at, v(0, -1, 0), v(0, 0, 1), "C1"), declared), true);
});

test("a symmetric goal never changes the state or its orientation (AC06)", () => {
  const s = seq(3, F);
  const before = Codec.hashState(s);
  const poseBefore = Codec.poses(s).map((p) => Orientation.toArray(Pose.orientation(p)));
  assert.equal(holds(3, s, front("C4"), declared), true);
  assert.equal(Codec.hashState(s), before);
  assert.deepEqual(Codec.poses(s).map((p) => Orientation.toArray(Pose.orientation(p))), poseBefore);
  // The center is still turned: the exact pose goal does not accept it.
  assert.equal(holds(3, s, piecePose("F", slot(3, 0, 0, 2), I)), false);
});

test("a claimed symmetry may not exceed the declared one", () => {
  bad(Goal.makeGoal(def(3), [], [I], front("C2")), "BadSymmetry");
  bad(Goal.makeGoal(def(3), [], [I], front("C4")), "BadSymmetry");
  assert.equal(Goal.makeGoal(def(3), [], [I], front("C1")).TAG, "Ok");
  bad(Goal.makeGoal(def(3), [[id("F.F"), "C2"]], [I], front("C4")), "BadSymmetry");
  assert.equal(Goal.makeGoal(def(3), [[id("F.F"), "C2"]], [I], front("C2")).TAG, "Ok");
  assert.equal(Goal.makeGoal(def(3), [[id("F.F"), "C4"]], [I], front("C2")).TAG, "Ok");
  bad(Goal.makeGoal(def(3), [[id("no.such"), "C2"]], [I], front("C1")), "UnknownSticker");
});

// ---- half-turn sticker versus whole cubie (AC07) ------------------------------------------------
test("a half-turn symmetric sticker does not make the whole corner half-turn symmetric (AC07)", () => {
  const afterU2 = turn(2, "Y", [1], 2, home(2));
  const at = slot(2, -1, 1, -1);
  const decl = { appearance: [["UFR.U", "C2"]] };
  // UFR.U: normal +Y, up -Z. U2 keeps the normal and reverses the up: C2 accepts it, C1 does not.
  const sticker = (sym) => stickerAt("UFR.U", at, v(0, 1, 0), v(0, 0, -1), sym);
  assert.equal(holds(2, afterU2, sticker("C2"), decl), true);
  assert.equal(holds(2, afterU2, sticker("C1"), decl), false);
  // The corner as a whole: the exact pose goal fails, and the half turn about Y is no valid piece subgroup.
  assert.equal(holds(2, afterU2, piecePose("UFR", at, I)), false);
  const half = pow(RY, 2);
  bad(Goal.makeGoal(def(2), [], [I], piecePose("UFR", at, I, [I, half])), "BadSubgroup");
});

// ---- piece subgroups ----------------------------------------------------------------------------
test("piece subgroups must contain the identity and be closed", () => {
  const at = slot(3, 0, 0, 2);
  bad(Goal.makeGoal(def(3), [], [I], piecePose("F", at, I, [])), "BadSubgroup");
  bad(Goal.makeGoal(def(3), [], [I], piecePose("F", at, I, [pow(RZ, 2)])), "BadSubgroup");
  bad(Goal.makeGoal(def(3), [], [I], piecePose("F", at, I, [I, RZ])), "BadSubgroup");
  bad(Goal.makeGoal(def(3), [], [I], piecePose("F", at, I, [I, pow(RZ, 2), RZ])), "BadSubgroup");
  assert.equal(Goal.makeGoal(def(3), [], [I], piecePose("F", at, I, [I])).TAG, "Ok");
});

test("a subgroup that contradicts the sticker metadata is rejected", () => {
  // The F center has one sticker with a defined up: a quarter-turn group about Z is closed but would claim
  // an appearance equivalence that the definition does not declare.
  bad(Goal.makeGoal(def(3), [], [I], piecePose("F", slot(3, 0, 0, 2), I, [I, RZ, pow(RZ, 2), pow(RZ, 3)])), "BadSubgroup");
});

test("a declared appearance equivalence makes a quarter-turn subgroup of a center legal (data model)", () => {
  const at = slot(3, 0, 0, 2);
  const quarter = [I, RZ, pow(RZ, 2), pow(RZ, 3)];
  const half = [I, pow(RZ, 2)];
  const g = (appearance, sub) => Goal.makeGoal(def(3), appearance.map(([s, c]) => [id(s), c]), [I], piecePose("F", at, I, sub));
  // C4 declared: the whole quarter-turn group is legal and the goal holds for every turn of the center.
  const c4 = ok(g([["F.F", "C4"]], quarter));
  for (let k = 0; k < 4; k++) {
    const twisted = ok(Codec.stateOfPoses(def(3), Codec.poses(home(3)).map((p) => (Id.toString(Pose.pieceId(p)) === "F" ? Pose.make(Pose.pieceId(p), Pose.position(p), pow(RZ, k)) : p))));
    assert.equal(Goal.evaluate(def(3), twisted, c4), true, `k=${k}`);
  }
  // C2 declared: the half-turn group is legal, the quarter-turn group is not.
  ok(g([["F.F", "C2"]], half));
  bad(g([["F.F", "C2"]], quarter), "BadSubgroup");
  // C1 or no declaration: neither; a declaration on another sticker does not help.
  bad(g([["F.F", "C1"]], half), "BadSubgroup");
  bad(g([], half), "BadSubgroup");
  bad(g([["U.U", "C4"]], quarter), "BadSubgroup");
  // The declaration does not widen anything else: the exact pose still rejects a twisted center.
  const twisted = ok(Codec.stateOfPoses(def(3), Codec.poses(home(3)).map((p) => (Id.toString(Pose.pieceId(p)) === "F" ? Pose.make(Pose.pieceId(p), Pose.position(p), RZ) : p))));
  assert.equal(Goal.evaluate(def(3), twisted, ok(g([["F.F", "C4"]], [I]))), false);
});

test("an equivalence between two different stickers needs both declarations; the normal must still map onto a sticker", () => {
  // UFR with one color and ups R=+Y, U=+X, F=+X. The 120 degree turn C3 (x -> y -> z -> x) maps R -> U and
  // U -> F with an up that is a quarter turn off, and F -> R exactly.
  const o = JSON.parse(definitionText(2));
  const piece = o.pieces.find((p) => p.id === "UFR");
  const ups = { "UFR.R": [0, 1, 0], "UFR.U": [1, 0, 0], "UFR.F": [1, 0, 0] };
  for (const s of piece.stickers) { s.color = "white"; s.up = ups[s.id]; }
  const d = ok(Codec.decodeDefinition(JSON.stringify(o)));
  const at = slot(2, 1, 1, 1);
  const group = [I, C3, pow(C3, 2)];
  const make = (decl) => Goal.makeGoal(d, decl.map((s) => [id(s), "C4"]), [I], piecePose("UFR", at, I, group));
  ok(make(["UFR.R", "UFR.U", "UFR.F"]));
  // R -> U needs both declared; U -> F needs both declared.
  bad(make(["UFR.R", "UFR.U"]), "BadSubgroup");
  bad(make(["UFR.U", "UFR.F"]), "BadSubgroup");
  bad(make(["UFR.R", "UFR.F"]), "BadSubgroup");
  bad(make([]), "BadSubgroup");
  // A half turn about X sends the front center normal +Z to -Z, which no sticker of the piece shows; the
  // up of F.F rotated by half turns would match, the normal does not.
  bad(Goal.makeGoal(def(3), [[id("F.F"), "C4"]], [I], piecePose("F", slot(3, 0, 0, 2), I, [I, pow(RX, 2)])), "BadSubgroup");
});

test("two appearance entries for one sticker are rejected as in appearance-v1", () => {
  const node = pieceAt("F", slot(3, 0, 0, 2));
  bad(Goal.makeGoal(def(3), [[id("F.F"), "C1"], [id("F.F"), "C4"]], [I], node), "DuplicateId");
  bad(Goal.makeGoal(def(3), [[id("F.F"), "C4"], [id("F.F"), "C4"]], [I], node), "DuplicateId");
  ok(Goal.makeGoal(def(3), [[id("F.F"), "C4"], [id("U.U"), "C2"]], [I], node));
});

// A 2x2 definition whose UFR corner shows one color on all three stickers with ups chosen so that the
// 120 degree turn about the corner diagonal maps the sticker set onto itself (x -> y -> z -> x).
const symmetricCorner = (sameColor = true) => {
  const o = JSON.parse(definitionText(2));
  const piece = o.pieces.find((p) => p.id === "UFR");
  const ups = { "UFR.R": [0, 1, 0], "UFR.U": [0, 0, 1], "UFR.F": [1, 0, 0] };
  for (const s of piece.stickers) { if (sameColor) s.color = "white"; s.up = ups[s.id]; }
  return ok(Codec.decodeDefinition(JSON.stringify(o)));
};
const C3 = orient([0, 0, 1, 1, 0, 0, 0, 1, 0]);

test("a subgroup that preserves every sticker is accepted and evaluated modulo H", () => {
  const d = symmetricCorner();
  const at = slot(2, 1, 1, 1);
  const h = [I, C3, pow(C3, 2)];
  const g = (sub) => ok(Goal.makeGoal(d, [], [I], piecePose("UFR", at, I, sub)));
  const twisted = ok(Codec.stateOfPoses(d, Codec.poses(Codec.homeState(d)).map((p) => (Id.toString(Pose.pieceId(p)) === "UFR" ? Pose.make(Pose.pieceId(p), Pose.position(p), C3) : p))));
  assert.equal(Goal.evaluate(d, twisted, g(h)), true);
  assert.equal(Goal.evaluate(d, twisted, g([I])), false);
  assert.equal(Goal.evaluate(d, Codec.homeState(d), g(h)), true);
  // Normals and ups map onto each other but the colors differ: the subgroup would claim an undeclared equivalence.
  const d2 = symmetricCorner(false);
  bad(Goal.makeGoal(d2, [], [I], piecePose("UFR", at, I, h)), "BadSubgroup");
  // The same subgroup is invalid for the standard corner: its three stickers have different colors.
  bad(Goal.makeGoal(def(2), [], [I], piecePose("UFR", at, I, h)), "BadSubgroup");
});

const mul = (a, b) => { const x = Orientation.toArray(a); const y = Orientation.toArray(b); return orient(Array.from({ length: 9 }, (_, k) => { const i = Math.floor(k / 3); const j = k % 3; return [0, 1, 2].reduce((s, m) => s + x[3 * i + m] * y[3 * m + j], 0); })); };

test("the exact piece pose is global frame * target * subgroup member, in this order (AC04, AC05)", () => {
  const d = symmetricCorner();
  const g = RZ;
  const target = RY;
  const h = C3;
  // No member of the subgroup turns the other factor orders into the same orientation, so a wrong order of
  // the factors cannot pass by accident.
  const good = mul(g, mul(target, h));
  for (const m of [I, C3, pow(C3, 2)]) {
    assert.notDeepEqual(Orientation.toArray(good), Orientation.toArray(mul(g, mul(m, target))));
    assert.notDeepEqual(Orientation.toArray(good), Orientation.toArray(mul(mul(target, m), g)));
  }
  // The corner UFR at home (1,1,1): target RY puts it at slot RY.(1,1,1) = (1,1,-1); the frame RZ turns that
  // slot and the orientation.
  const at = slot(2, 1, 1, -1);
  // A whole-cube rotation o of every piece is a valid state; UFR then has orientation o at o.(1,1,1).
  const stateWith = (o) => ok(Codec.stateOfPoses(d, Codec.poses(Codec.homeState(d)).map((p) => Pose.make(Pose.pieceId(p), ok(Shell.makeSlot(size(2), Orientation.apply(o, Shell.toVec(Pose.position(p))))), o))));
  const frames = [I, RZ, pow(RZ, 2), pow(RZ, 3)];
  const mk = (sub) => ok(Goal.makeGoal(d, [], frames, piecePose("UFR", at, target, sub)));
  assert.equal(Goal.evaluate(d, stateWith(good), mk([I, C3, pow(C3, 2)])), true);
  assert.equal(Goal.evaluate(d, stateWith(good), mk([I])), false);
  assert.equal(Goal.evaluate(d, stateWith(mul(good, mul(h, h))), mk([I, C3, pow(C3, 2)])), true);
});

// ---- global frames (AC05, spec "one common global frame") ---------------------------------------------
const yGroup = [I, RY, pow(RY, 2), pow(RY, 3)];

test("the allowed frames must be a group containing the identity", () => {
  const node = pieceAt("UFR", slot(2, 1, 1, 1));
  bad(Goal.makeGoal(def(2), [], [], node), "BadFrames");
  bad(Goal.makeGoal(def(2), [], [RY], node), "BadFrames");
  bad(Goal.makeGoal(def(2), [], [I, RY], node), "BadFrames");
  bad(Goal.makeGoal(def(2), [], [I, RY, pow(RY, 2)], node), "BadFrames");
  assert.equal(Goal.makeGoal(def(2), [], yGroup, node).TAG, "Ok");
  assert.equal(Goal.makeGoal(def(2), [], Orientation.all(), node).TAG, "Ok");
});

test("one common global rotation maps the whole target onto the state", () => {
  const rotated = seq(2, [["Y", [0, 1], 1]]); // whole cube about +Y: (x,y,z) -> (z,y,-x)
  const goalNode = all([pieceAt("UFR", slot(2, 1, 1, 1)), pieceAt("UFL", slot(2, -1, 1, 1))]);
  assert.equal(holds(2, home(2), goalNode), true);
  assert.equal(holds(2, rotated, goalNode), false);
  assert.equal(holds(2, rotated, goalNode, { frames: yGroup }), true);
  assert.equal(holds(2, rotated, goalNode, { frames: [I, pow(RX, 2)] }), false);
  const pose = all([piecePose("UFR", slot(2, 1, 1, 1), I), piecePose("UFL", slot(2, -1, 1, 1), I)]);
  assert.equal(holds(2, rotated, pose, { frames: yGroup }), true);
  assert.equal(holds(2, rotated, pose), false);
  // The normal of the target rotates with the frame too: UFR.F has normal +Z and up +Y at home, +X and +Y in the rotated state.
  const sideSticker = stickerAt("UFR.F", slot(2, 1, 1, 1), v(0, 0, 1), v(0, 1, 0), "C1");
  assert.equal(holds(2, rotated, sideSticker, { frames: yGroup }), true);
  assert.equal(holds(2, rotated, sideSticker), false);
  // A sticker goal rotates with the frame: UFR.U keeps normal +Y and up -Z at home; the rotated state shows up -X... (R_y(90): -Z -> -X).
  assert.equal(holds(2, rotated, stickerAt("UFR.U", slot(2, 1, 1, 1), v(0, 1, 0), v(0, 0, -1), "C1"), { frames: yGroup }), true);
  assert.equal(holds(2, rotated, stickerAt("UFR.U", slot(2, 1, 1, 1), v(0, 1, 0), v(0, 0, -1), "C1")), false);
});

test("goal nodes cannot choose different global frames", () => {
  // U turns the top layer only: UFR sits where a y-rotated home would put it, DFR stays at home.
  const mixed = seq(2, [["Y", [1], 1]]);
  const node = all([pieceAt("UFR", slot(2, 1, 1, 1)), pieceAt("DFR", slot(2, 1, -1, 1))]);
  assert.equal(holds(2, mixed, node, { frames: yGroup }), false);
  assert.equal(holds(2, mixed, all([pieceAt("UFR", slot(2, 1, 1, 1))]), { frames: yGroup }), true);
  assert.equal(holds(2, mixed, all([pieceAt("DFR", slot(2, 1, -1, 1))]), { frames: yGroup }), true);
});

// ---- validation of goal nodes ---------------------------------------------------------------------
test("goal nodes are validated against the definition", () => {
  const at = slot(2, 1, 1, 1);
  bad(Goal.makeGoal(def(2), [], [I], pieceAt("nope", at)), "UnknownPiece");
  bad(Goal.makeGoal(def(2), [], [I], stickerAt("nope", at, v(0, 1, 0), v(0, 0, -1), "C1")), "UnknownSticker");
  bad(Goal.makeGoal(def(2), [], [I], pieceAt("UFR", slot(3, 0, 0, 2))), "BadSlot");
  bad(Goal.makeGoal(def(2), [], [I], stickerAt("UFR.U", at, v(0, 2, 0), v(0, 0, -1), "C1")), "BadVector");
  bad(Goal.makeGoal(def(2), [], [I], stickerAt("UFR.U", at, v(0, 1, 0), v(0, 1, 0), "C1")), "BadVector");
  bad(Goal.makeGoal(def(2), [], [I], stickerAt("UFR.U", at, v(1, 1, 0), v(0, 0, -1), "C1")), "BadVector");
  bad(Goal.makeGoal(def(2), [], [I], all([pieceAt("UFR", at), pieceAt("nope", at)])), "UnknownPiece");
});
