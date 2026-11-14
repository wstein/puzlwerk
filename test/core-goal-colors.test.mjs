import { test } from "node:test";
import assert from "node:assert/strict";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Goal from "../core/res/PwGoal.res.mjs";
import { definitionText, homeReference, applyReference, mulberry32, randomMove, inverseMove, pieceId, slots } from "./helpers/cube-model.mjs";

// T012 / AC02, AC03: color and partial goals, and the two legacy solved profiles. Hand cases are derived from
// the data model; the differential test compares the core with a facelet reference that is written
// independently (reference model states, plain arithmetic on signed permutation matrices). AC01 (old Cubacle
// solved results as fixtures) is not covered: the legacy fixtures of T002 and T003 do not exist in the
// repository yet, and no mapping from a legacy face/color/frame encoding is used here.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const bad = (r, code) => { assert.equal(r.TAG, "Error", "expected Error"); assert.equal(r._0, code); };
const size = (n) => ok(Shell.makeSize(n));
const slot = (n, x, y, z) => ok(Shell.makeSlot(size(n), { x, y, z }));
const id = (s) => ok(Id.make(s));
const I = Orientation.identity;
const defs = {};
const def = (n) => (defs[n] ??= ok(Codec.decodeDefinition(definitionText(n))));
const home = (n) => Codec.homeState(def(n));
const turn = (n, axis, layers, turns, state) => {
  const m = ok(Move.make(size(n), axis, layers, turns));
  return ok(Codec.stateOfPoses(def(n), Codec.poses(state).map((p) => Move.applyToPose(m, p))));
};
const seq = (n, moves, state = home(n)) => moves.reduce((s, [a, l, t]) => turn(n, a, l, t, s), state);
const v = (x, y, z) => ({ x, y, z });
const colors = (n, node) => ok(Goal.makeGoal(def(n), [], [I], node));
const sample = (n, x, y, z, normal, color) => [slot(n, x, y, z), normal, id(color)];
const faceColors = (samples) => ({ TAG: "FaceColors", _0: samples });
const holds = (n, state, node) => Goal.evaluate(def(n), state, colors(n, node));
const U = v(0, 1, 0);

test("a color goal compares colors at slots and ignores piece identity (AC02)", () => {
  // N=4: the four U centers are white and permute under U; the identity goal fails, the color goal holds.
  const afterU = seq(4, [["Y", [3], -1]]);
  const centers = slots(4).filter((s) => s[1] === 3 && Math.abs(s[0]) === 1 && Math.abs(s[2]) === 1);
  const white = faceColors(centers.map((s) => sample(4, s[0], s[1], s[2], U, "white")));
  assert.equal(holds(4, home(4), white), true);
  assert.equal(holds(4, afterU, white), true);
  const [c] = centers;
  assert.equal(holds(4, afterU, { TAG: "PieceAt", _0: id(pieceId(c, 4)), _1: slot(4, c[0], c[1], c[2]) }), false);
});

test("a color goal fails when another color shows", () => {
  // N=2 after F: the U face shows orange (the L color) at both front slots. F is Z, layer 1, turns -1.
  const afterF = seq(2, [["Z", [1], -1]]);
  for (const x of [-1, 1]) {
    assert.equal(holds(2, afterF, faceColors([sample(2, x, 1, 1, U, "orange")])), true);
    assert.equal(holds(2, afterF, faceColors([sample(2, x, 1, 1, U, "white")])), false);
  }
  // The back slots of U are untouched.
  assert.equal(holds(2, afterF, faceColors([sample(2, 1, 1, -1, U, "white")])), true);
});

test("a partial goal checks only its samples; the empty goal holds", () => {
  const afterF = seq(2, [["Z", [1], -1]]);
  assert.equal(holds(2, afterF, faceColors([])), true);
  const partial = faceColors([sample(2, -1, 1, -1, U, "white"), sample(2, 1, 1, -1, U, "white")]);
  assert.equal(holds(2, afterF, partial), true);
  assert.equal(holds(2, home(2), faceColors([sample(2, -1, 1, -1, U, "white"), sample(2, 1, 1, 1, U, "red")])), false);
});

test("samples must name an outward face of a shell slot once", () => {
  const at = slot(2, 1, 1, 1);
  bad(Goal.makeGoal(def(2), [], [I], faceColors([[at, v(0, -1, 0), id("white")]])), "BadSample");
  bad(Goal.makeGoal(def(2), [], [I], faceColors([[at, v(1, 1, 0), id("white")]])), "BadVector");
  bad(Goal.makeGoal(def(2), [], [I], faceColors([[slot(3, 0, 0, 2), v(0, 0, 1), id("white")]])), "BadSlot");
  bad(Goal.makeGoal(def(2), [], [I], faceColors([[at, U, id("white")], [at, U, id("white")]])), "BadSample");
});

// ---- legacy solved profiles (AC03) ----------------------------------------------------------------------
const solved = (n, profile) => ok(Goal.solvedGoal(def(n), profile));
const fixed = (n, state) => Goal.evaluate(def(n), state, solved(n, "FixedFrameSolved"));
const upToRotation = (n, state) => Goal.evaluate(def(n), state, solved(n, "SolvedUpToRotation"));
const ALL = (n) => Array.from({ length: n }, (_, i) => i);

test("the full solved goal has one sample per outward sticker, 6N^2 (data model)", () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    assert.equal(Goal.sampleCount(solved(n, "FixedFrameSolved")), 6 * n * n, `N=${n}`);
    assert.equal(Goal.sampleCount(solved(n, "SolvedUpToRotation")), 6 * n * n, `N=${n}`);
  }
});

test("fixed-frame solved and solved-up-to-global-rotation are distinct profiles (AC03)", () => {
  for (const n of [2, 3, 4]) {
    assert.equal(fixed(n, home(n)), true);
    assert.equal(upToRotation(n, home(n)), true);
    // A whole-cube turn about each axis: solved only up to a global rotation.
    for (const axis of ["X", "Y", "Z"]) {
      for (const turns of [-1, 1, 2]) {
        const rotated = seq(n, [[axis, ALL(n), turns]]);
        assert.equal(fixed(n, rotated), false, `N=${n} ${axis}${turns}`);
        assert.equal(upToRotation(n, rotated), true, `N=${n} ${axis}${turns}`);
      }
    }
    // One face turn: neither.
    const r = seq(n, [["X", [n - 1], -1]]);
    assert.equal(fixed(n, r), false);
    assert.equal(upToRotation(n, r), false);
    // A move and its inverse: solved again in the fixed frame.
    const back = seq(n, [["X", [n - 1], 1]], r);
    assert.equal(fixed(n, back), true);
    // The rotation does not hide an unsolved layer.
    assert.equal(upToRotation(n, seq(n, [["Y", ALL(n), 1], ["X", [n - 1], -1]])), false);
  }
});

test("a middle slice turn is solved in neither profile", () => {
  const m = seq(3, [["X", [1], -1]]);
  assert.equal(fixed(3, m), false);
  assert.equal(upToRotation(3, m), false);
});

test("the profile needs a color on every sticker", () => {
  const o = JSON.parse(definitionText(2));
  delete o.pieces[0].stickers[0].color;
  const d = ok(Codec.decodeDefinition(JSON.stringify(o)));
  bad(Goal.solvedGoal(d, "FixedFrameSolved"), "MissingColor");
  bad(Goal.solvedGoal(d, "SolvedUpToRotation"), "MissingColor");
});

// ---- differential check against an independent facelet reference ------------------------------------------
// Facelet reference: every (slot, outward normal) shows the color of the sticker whose world normal it
// is, computed from the reference model state by plain matrix arithmetic.
const refDef = (n) => JSON.parse(definitionText(n));
const matVec = (o, p) => [0, 1, 2].map((i) => o[3 * i] * p[0] + o[3 * i + 1] * p[1] + o[3 * i + 2] * p[2]);
const facelets = (n, ref) => {
  const colorOf = new Map();
  for (const piece of refDef(n).pieces) for (const s of piece.stickers) colorOf.set(`${piece.id}|${s.normal}`, s.color);
  const map = new Map();
  for (const [pid, { p, o }] of ref) {
    for (const piece of refDef(n).pieces.filter((x) => x.id === pid)) {
      for (const s of piece.stickers) map.set(`${p}|${matVec(o, s.normal)}`, colorOf.get(`${pid}|${s.normal}`));
    }
  }
  return map;
};
const rotations = (() => {
  const out = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const perm of perms) for (let signs = 0; signs < 8; signs++) {
    const m = new Array(9).fill(0);
    for (let col = 0; col < 3; col++) m[3 * perm[col] + col] = signs & (1 << col) ? -1 : 1;
    const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    if (det === 1) out.push(m);
  }
  return out;
})();
assert.equal(rotations.length, 24);
const refSolved = (n, ref) => {
  const homeFacelets = facelets(n, homeReference(n));
  const now = facelets(n, ref);
  const matches = (g) => [...homeFacelets].every(([key, color]) => {
    const [p, nrm] = key.split("|").map((t) => t.split(",").map(Number));
    return now.get(`${matVec(g, p)}|${matVec(g, nrm)}`) === color;
  });
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return { fixed: matches(identity), upToRotation: rotations.some(matches) };
};

for (const n of [2, 3, 4]) {
  test(`legacy solved profiles agree with the facelet reference (N=${n}, 300 seeded cases)`, () => {
    const rand = mulberry32(0x5eed0000 + n);
    const counts = { fixed: 0, rotationOnly: 0, neither: 0 };
    for (let i = 0; i < 300; i++) {
      const base = Array.from({ length: Math.floor(rand() * 8) }, () => randomMove(rand, n));
      const kind = i % 3;
      let moves = base;
      if (kind === 0) moves = [...base, ...[...base].reverse().map(inverseMove)];
      if (kind === 1) {
        const whole = { axis: "XYZ"[Math.floor(rand() * 3)], layers: ALL(n), turns: [-1, 1, 2][Math.floor(rand() * 3)] };
        moves = [whole, ...base, ...[...base].reverse().map(inverseMove)];
      }
      let ref = homeReference(n);
      for (const m of moves) ref = applyReference(ref, n, m);
      const state = moves.reduce((s, m) => turn(n, m.axis, m.layers, m.turns, s), home(n));
      const expected = refSolved(n, ref);
      assert.equal(fixed(n, state), expected.fixed, `case ${i} fixed ${JSON.stringify(moves)}`);
      assert.equal(upToRotation(n, state), expected.upToRotation, `case ${i} rotation ${JSON.stringify(moves)}`);
      if (expected.fixed) counts.fixed++; else if (expected.upToRotation) counts.rotationOnly++; else counts.neither++;
    }
    // The generator must exercise all three outcomes, or the comparison proves little.
    assert.ok(counts.fixed > 30 && counts.rotationOnly > 30 && counts.neither > 30, JSON.stringify(counts));
  });
}
