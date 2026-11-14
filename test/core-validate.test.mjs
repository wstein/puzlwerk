import { test } from "node:test";
import assert from "node:assert/strict";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Validate from "../core/res/PwValidate.res.mjs";
import { definitionText, slots, pieceId, mulberry32, randomMove, homeReference, applyReference } from "./helpers/cube-model.mjs";
import { rotations24, groupOrder } from "./helpers/group-order.mjs";

// T013 / AC11: structural, invariant and reachability evidence are separate; reachability is verified by
// a replay certificate or by an approved complete method, disproved by an applicable invariant, and
// otherwise unknown (Q4: complete only for N=2 and N=3 under the face-turn profile; N=4..7 replay
// certificates and invariants only). Expected values come from the data model and the cube group orders.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const defs = {};
const def = (n) => (defs[n] ??= ok(Codec.decodeDefinition(definitionText(n))));
const home = (n) => Codec.homeState(def(n));
const move = (n, m) => ok(Move.make(size(n), m.axis, m.layers, m.turns));
const apply = (n, state, m) => ok(Codec.stateOfPoses(def(n), Codec.poses(state).map((p) => Move.applyToPose(move(n, m), p))));
const run = (n, moves, state = home(n)) => moves.reduce((s, m) => apply(n, s, m), state);
const FACE = "FaceTurns";
// assume: the caller asserts that the actual moves are the profile's (assessAssuming); without it assess
// checks the definition policy against the profile first.
const assess = (n, state, { profile, certificate, assume } = {}) => (assume ? Validate.assessAssuming : Validate.assess)(def(n), state, profile, certificate?.map((m) => move(n, m)));
const ASSUME = { profile: FACE, assume: true };
const holdsOf = (report) => Object.fromEntries(report.invariants.map((i) => [i.name, i.holds]));
const faceTurns = (n) => { const out = []; for (const axis of "XYZ") for (const layer of [0, n - 1]) for (const turns of [-1, 1, 2]) out.push({ axis, layers: [layer], turns }); return out; };

// Poses with edits: replace the pose of the listed pieces. A rotation is one of the 24 matrices.
const orient = (a) => ok(Orientation.make(a));
const stabilizers = (n, pid) => {
  const piece = Codec.pieces(def(n)).find((p) => Id.toString(p.id) === pid);
  const h = Shell.toVec(piece.home);
  return Orientation.all().filter((o) => { const w = Orientation.apply(o, h); return w.x === h.x && w.y === h.y && w.z === h.z; });
};
const edit = (n, changes, state = home(n)) => ok(Codec.stateOfPoses(def(n), Codec.poses(state).map((p) => {
  const c = changes[Id.toString(Pose.pieceId(p))];
  return c ? Pose.make(Pose.pieceId(p), c.slot ?? Pose.position(p), c.o ?? Pose.orientation(p)) : p;
})));
const slotOf = (n, s) => ok(Shell.makeSlot(size(n), { x: s[0], y: s[1], z: s[2] }));
const kind = (n, s) => s.filter((c) => Math.abs(c) === n - 1).length;
const piecesOfKind = (n, k) => slots(n).filter((s) => kind(n, s) === k).map((s) => pieceId(s, n));

// ---- structural evidence is separate ---------------------------------------------------------------------
test("the structural result is reported on its own and does not imply reachability", () => {
  const r = assess(3, home(3));
  assert.equal(r.structural.TAG, "Ok");
  // A structurally valid state with one twisted corner: structural passes, reachability is disproved.
  const corner = piecesOfKind(3, 3)[0];
  const twist = stabilizers(3, corner).find((o) => !Orientation.equal(o, Orientation.identity));
  const bad = assess(3, edit(3, { [corner]: { o: twist } }), ASSUME);
  assert.equal(bad.structural.TAG, "Ok");
  assert.equal(bad.reachability.TAG, "Disproved");
  // A state of another definition is reported as structurally invalid and never as reachable.
  const other = assess(2, home(3));
  assert.equal(other.structural.TAG, "Error");
  assert.deepEqual(other.reachability, { TAG: "Unknown", _0: "StructurallyInvalid" });
});

// ---- replay certificates -----------------------------------------------------------------------------------
test("a replay certificate from the home state verifies reachability for every size 2..7", () => {
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const rand = mulberry32(0x7013 + n);
    const walk = Array.from({ length: 40 }, () => { for (;;) { const m = randomMove(rand, n); const w = m.layers.length; const outerWide = (m.layers.length === 1 && (m.layers[0] === 0 || m.layers[0] === n - 1)) || (w >= 2 && w < n && (m.layers[0] === 0 || m.layers[w - 1] === n - 1) && m.layers.every((l, i) => i === 0 || l === m.layers[i - 1] + 1)); if (outerWide) return m; } });
    const r = assess(n, run(n, walk), { certificate: walk });
    assert.equal(r.reachability.TAG, "VerifiedByReplay", `N=${n}`);
    assert.equal(r.reachability._0.length, 40);
  }
});

test("a certificate that does not reproduce the state is rejected and proves nothing", () => {
  const walk = [{ axis: "X", layers: [2], turns: -1 }, { axis: "Y", layers: [0], turns: 1 }];
  const s = run(3, walk);
  assert.deepEqual(assess(3, s, { certificate: walk.slice(0, 1) }).reachability, { TAG: "Unknown", _0: "CertificateMismatch" });
  assert.deepEqual(assess(3, s, { certificate: [] }).reachability, { TAG: "Unknown", _0: "CertificateMismatch" });
});

test("certificate moves must be legal for the definition policy and size", () => {
  // outer-wide: a single inner layer and an all-layer rotation are not permitted; N=3 layer 1 is inner.
  const inner = [{ axis: "X", layers: [1], turns: 1 }];
  assert.deepEqual(assess(3, run(3, inner), { certificate: inner }).reachability, { TAG: "Unknown", _0: "CertificateIllegalMove" });
  const whole = [{ axis: "X", layers: [0, 1, 2], turns: 1 }];
  assert.deepEqual(assess(3, run(3, whole), { certificate: whole }).reachability, { TAG: "Unknown", _0: "CertificateIllegalMove" });
  // The same moves are legal under the policy "any".
  const anyDef = ok(Codec.decodeDefinition(JSON.stringify({ ...JSON.parse(definitionText(3)), movePolicy: "any" })));
  const anyHome = Codec.homeState(anyDef);
  const m = move(3, inner[0]);
  const after = ok(Codec.stateOfPoses(anyDef, Codec.poses(anyHome).map((p) => Move.applyToPose(m, p))));
  assert.equal(Validate.assess(anyDef, after, undefined, [m]).reachability.TAG, "VerifiedByReplay");
  // A move of another size is never legal.
  const wrongSize = move(4, { axis: "X", layers: [3], turns: 1 });
  assert.deepEqual(Validate.assess(def(3), home(3), undefined, [wrongSize]).reachability, { TAG: "Unknown", _0: "CertificateIllegalMove" });
});

// ---- invariants ------------------------------------------------------------------------------------------------
test("invariants hold along every random walk (face turns for N=2,3; any layer moves for the corner twist)", () => {
  for (const n of [2, 3]) {
    const rand = mulberry32(0x1117 + n);
    const turns = faceTurns(n);
    let s = home(n);
    for (let i = 0; i < 300; i++) {
      s = apply(n, s, turns[Math.floor(rand() * turns.length)]);
      const r = assess(n, s, ASSUME);
      assert.ok(r.invariants.every((x) => x.holds), `N=${n} step ${i} ${JSON.stringify(r.invariants)}`);
      assert.deepEqual(r.reachability, { TAG: "VerifiedComplete", _0: "face-turn-invariants-v1" });
    }
  }
  for (const n of [4, 5, 6, 7]) {
    const rand = mulberry32(0x2227 + n);
    let s = home(n);
    for (let i = 0; i < 60; i++) {
      s = apply(n, s, randomMove(rand, n));
      const r = assess(n, s);
      assert.deepEqual(r.invariants, [{ name: "corner-twist-sum", holds: true }], `N=${n}`);
    }
  }
});

test("the corner twist sum disproves reachability for every size and every move policy", () => {
  for (const n of [2, 3, 4, 7]) {
    const corner = piecesOfKind(n, 3)[0];
    const twist = stabilizers(n, corner).find((o) => !Orientation.equal(o, Orientation.identity));
    for (const options of [{}, { profile: FACE }, ASSUME]) {
      const r = assess(n, edit(n, { [corner]: { o: twist } }), options);
      assert.deepEqual(r.reachability, { TAG: "Disproved", _0: "corner-twist-sum" }, `N=${n}`);
    }
  }
});

test("N=4..7 with invariants that hold and no certificate: unknown, never reachable or impossible", () => {
  for (const n of [4, 5, 6, 7]) {
    for (const options of [{}, ASSUME]) {
      const r = assess(n, home(n), options);
      assert.deepEqual(r.reachability, { TAG: "Unknown", _0: "NoMethod" }, `N=${n}`);
      assert.deepEqual(r.invariants, [{ name: "corner-twist-sum", holds: true }]);
    }
  }
});

test("the face-turn invariants are claimed only under the face-turn profile (the policy decides)", () => {
  // N=3 with one flipped edge: disproved under the face-turn profile, unknown without it (slice moves are
  // not covered by those invariants).
  const edge = piecesOfKind(3, 2)[0];
  const flip = stabilizers(3, edge).find((o) => !Orientation.equal(o, Orientation.identity));
  const s = edit(3, { [edge]: { o: flip } });
  assert.deepEqual(assess(3, s, ASSUME).reachability, { TAG: "Disproved", _0: "edge-flip-sum" });
  const free = assess(3, s);
  assert.deepEqual(free.reachability, { TAG: "Unknown", _0: "NoMethod" });
  assert.deepEqual(free.invariants.map((i) => i.name), ["corner-twist-sum"]);
  // N=2 and N=3 without the profile are unknown, never verified by the complete method.
  assert.deepEqual(assess(2, home(2)).reachability, { TAG: "Unknown", _0: "NoMethod" });
  assert.deepEqual(assess(3, home(3)).reachability, { TAG: "Unknown", _0: "NoMethod" });
  // A valid certificate still verifies without the profile.
  assert.equal(assess(3, home(3), { certificate: [] }).reachability.TAG, "VerifiedByReplay");
});

test("each N=3 face-turn invariant fails for exactly one hand-built state (AC11)", () => {
  const nonId = (n, pid) => stabilizers(n, pid).filter((o) => !Orientation.equal(o, Orientation.identity));
  const fails = (s) => Object.entries(holdsOf(assess(3, s, ASSUME))).filter(([, h]) => !h).map(([k]) => k);
  // one twisted corner
  const c = piecesOfKind(3, 3)[0];
  assert.deepEqual(fails(edit(3, { [c]: { o: nonId(3, c)[0] } })), ["corner-twist-sum"]);
  // one flipped edge
  const e = piecesOfKind(3, 2)[0];
  assert.deepEqual(fails(edit(3, { [e]: { o: nonId(3, e)[0] } })), ["edge-flip-sum"]);
  // two corners exchanged: a half turn about the axis through the midpoint of their edge keeps p = O.h and swaps them.
  // UFR <-> UFL: O maps (2,2,2) to (-2,2,2) and (-2,2,2) to (2,2,2): the half turn about Z followed by... use the matrix search.
  const swapped = (a, b) => {
    const ha = Shell.toVec(Codec.pieces(def(3)).find((p) => Id.toString(p.id) === a).home);
    const hb = Shell.toVec(Codec.pieces(def(3)).find((p) => Id.toString(p.id) === b).home);
    const o = Orientation.all().find((m) => { const w = Orientation.apply(m, ha); return w.x === hb.x && w.y === hb.y && w.z === hb.z && (() => { const v = Orientation.apply(m, hb); return v.x === ha.x && v.y === ha.y && v.z === ha.z; })(); });
    return edit(3, { [a]: { slot: slotOf(3, [hb.x, hb.y, hb.z]), o }, [b]: { slot: slotOf(3, [ha.x, ha.y, ha.z]), o } });
  };
  const [ca, cb] = ["UFR", "UFL"];
  assert.deepEqual(fails(swapped(ca, cb)), ["corner-edge-parity", "center-twist-parity"]);
  // Two edges exchanged as well restore the corner-edge parity; the center parity stays violated until a center is turned.
  const swapEdges = (s, a, b, o) => {
    const slotOfPiece = (pid) => Shell.toVec(Codec.pieces(def(3)).find((p) => Id.toString(p.id) === pid).home);
    const ha = slotOfPiece(a); const hb = slotOfPiece(b);
    return edit(3, { [a]: { slot: slotOf(3, [hb.x, hb.y, hb.z]), o }, [b]: { slot: slotOf(3, [ha.x, ha.y, ha.z]), o } }, s);
  };
  // UF <-> UB with the half turn about Y: x -> -x, z -> -z.
  const rotY2 = orient([-1, 0, 0, 0, 1, 0, 0, 0, -1]);
  const corners2edges2 = swapEdges(swapped(ca, cb), "UF", "UB", rotY2);
  assert.deepEqual(fails(corners2edges2), ["center-twist-parity"]);
  // Turning the F center by a quarter as well gives a state that satisfies every invariant (as after one F turn).
  const quarter = nonId(3, "F").find((o) => Orientation.toArray(o).join() === "0,-1,0,1,0,0,0,0,1");
  const allHold = edit(3, { F: { o: quarter } }, corners2edges2);
  assert.deepEqual(fails(allHold), []);
  assert.deepEqual(assess(3, allHold, ASSUME).reachability, { TAG: "VerifiedComplete", _0: "face-turn-invariants-v1" });
  // one center turned a quarter: odd twist sum with even permutation parity
  const center = "F";
  assert.deepEqual(fails(edit(3, { [center]: { o: nonId(3, center).find((o) => Orientation.toArray(o).join() === "0,-1,0,1,0,0,0,0,1") } })), ["center-twist-parity"]);
  // a center away from its home slot: the face-turn profile never moves centers
  const f = "F"; const b = "B";
  const swapCenters = edit(3, {
    [f]: { slot: slotOf(3, [0, 0, -2]), o: orient([-1, 0, 0, 0, 1, 0, 0, 0, -1]) },
    [b]: { slot: slotOf(3, [0, 0, 2]), o: orient([-1, 0, 0, 0, 1, 0, 0, 0, -1]) },
  });
  assert.ok(fails(swapCenters).includes("center-positions-fixed"));
});

// ---- the invariants are exactly the reachable set (Q4: complete for N=2 and N=3) --------------------------------
// Sufficiency: the group generated by the six outer face turns acts faithfully on the (slot, rotation) flags;
// its order is computed by Schreier-Sims and must equal the number of states that satisfy the invariants
// (counted by formula: permutations times twists, flips and center twists, divided by the parity relations).
// Necessity: every step of the walks above keeps the invariants. Together they make the invariants an exact
// characterization. The core's own acceptance set is then counted against the same numbers.
const factorial = (k) => (k <= 1 ? 1n : BigInt(k) * factorial(k - 1));
const faceTurnGroupOrder = (n) => {
  const pts = [];
  for (const s of slots(n)) for (const o of rotations24) pts.push({ s, o });
  const index = new Map(pts.map((p, i) => [`${p.s}|${p.o}`, i]));
  const generators = [];
  for (const axis of "XYZ") for (const layer of [0, n - 1]) {
    const st = new Map(pts.map((p, i) => [i, { p: p.s, home: p.s, o: p.o }]));
    const next = applyReference(st, n, { axis, layers: [layer], turns: -1 });
    generators.push(Int32Array.from(pts.map((_, i) => { const r = next.get(i); return index.get(`${r.p}|${r.o}`); })));
  }
  return groupOrder(generators, pts.length);
};

test("the face-turn group has exactly as many elements as there are states satisfying the invariants", () => {
  assert.equal(faceTurnGroupOrder(2), factorial(8) * 3n ** 7n);
  assert.equal(faceTurnGroupOrder(3), (factorial(8) * factorial(12) * 3n ** 7n * 2n ** 11n * 4n ** 6n) / 4n);
});

// Product of orientation choices at the home slots of the listed pieces; counts states accepted by the core.
const countAccepted = (n, pieceIds) => {
  const choices = pieceIds.map((pid) => stabilizers(n, pid));
  let accepted = 0;
  let total = 0;
  const pick = new Array(pieceIds.length).fill(0);
  for (;;) {
    const changes = {};
    pieceIds.forEach((pid, i) => { changes[pid] = { o: choices[i][pick[i]] }; });
    total++;
    if (assess(n, edit(n, changes), ASSUME).reachability.TAG === "VerifiedComplete") accepted++;
    let i = 0;
    while (i < pick.length && ++pick[i] === choices[i].length) { pick[i] = 0; i++; }
    if (i === pick.length) break;
  }
  return { accepted, total };
};

test("at home positions the core accepts exactly 3^(k-1) twist, 2^(k-1) flip and half of the center states", () => {
  assert.deepEqual(countAccepted(2, piecesOfKind(2, 3)), { accepted: 3 ** 7, total: 3 ** 8 });
  assert.deepEqual(countAccepted(3, piecesOfKind(3, 3).slice(0, 6)), { accepted: 3 ** 5, total: 3 ** 6 });
  assert.deepEqual(countAccepted(3, piecesOfKind(3, 2).slice(0, 10)), { accepted: 2 ** 9, total: 2 ** 10 });
  assert.deepEqual(countAccepted(3, piecesOfKind(3, 1)), { accepted: 4 ** 6 / 2, total: 4 ** 6 });
});

test("random structurally valid states: the acceptance rate is 1/3 for N=2 and 1/24 for N=3", () => {
  const randomState = (n, rand, movableKinds) => {
    const changes = {};
    for (const k of movableKinds) {
      const ids = piecesOfKind(n, k);
      const homes = slots(n).filter((s) => kind(n, s) === k);
      const order = ids.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      ids.forEach((pid, i) => {
        const h = homes[i]; const p = homes[order[i]];
        const options = rotations24.filter((m) => [0, 1, 2].every((r) => m[3 * r] * h[0] + m[3 * r + 1] * h[1] + m[3 * r + 2] * h[2] === p[r]));
        changes[pid] = { slot: slotOf(n, p), o: orient(options[Math.floor(rand() * options.length)]) };
      });
    }
    for (const pid of piecesOfKind(n, 1)) if (n === 3 && !changes[pid]) changes[pid] = { o: stabilizers(n, pid)[Math.floor(rand() * 4)] };
    return edit(n, changes);
  };
  for (const [n, kinds, samples, low, high] of [[2, [3], 1500, 440, 560], [3, [3, 2], 2400, 70, 135]]) {
    const rand = mulberry32(0xacc + n);
    let accepted = 0;
    for (let i = 0; i < samples; i++) {
      const r = assess(n, randomState(n, rand, kinds), ASSUME);
      assert.equal(r.structural.TAG, "Ok");
      if (r.reachability.TAG === "VerifiedComplete") accepted++;
      else assert.equal(r.reachability.TAG, "Disproved");
    }
    assert.ok(accepted >= low && accepted <= high, `N=${n}: ${accepted} of ${samples} accepted, expected between ${low} and ${high}`);
  }
});

// ---- the profile is bound to the move policy (review round 1, finding 1; owner decision A) ----------------
const rw = { axis: "X", layers: [1, 2], turns: -1 };
test("N=3 outer-wide with a legal wide move: unknown with and without a certificate, the profile is carried", () => {
  const s = run(3, [rw]);
  // Without the policy check the face-turn invariants would wrongly disprove a state a legal move reaches.
  assert.equal(assess(3, s, ASSUME).reachability.TAG, "Disproved");
  // Without a certificate: unknown. With a replay certificate that is legal under the policy: verified by
  // replay (reachability under the policy), the profile invariants stay suppressed.
  for (const [certificate, expected] of [[undefined, { TAG: "Unknown", _0: "ProfileOutsidePolicy" }], [[rw], { TAG: "VerifiedByReplay", _0: [move(3, rw)] }], [[], { TAG: "Unknown", _0: "ProfileOutsidePolicy" }]]) {
    const r = assess(3, s, { profile: FACE, certificate });
    assert.deepEqual(r.reachability, expected);
    assert.equal(r.profile, FACE);
    assert.deepEqual(r.invariants.map((i) => i.name), ["corner-twist-sum"]);
  }
  // A certificate that is illegal under the policy does not verify.
  const inner = { axis: "X", layers: [1], turns: 1 };
  assert.deepEqual(assess(3, run(3, [inner]), { profile: FACE, certificate: [inner] }).reachability, { TAG: "Unknown", _0: "ProfileOutsidePolicy" });
  // Without a profile the certificate verifies and the report carries no profile.
  const free = assess(3, s, { certificate: [rw] });
  assert.equal(free.reachability.TAG, "VerifiedByReplay");
  assert.equal(free.profile, undefined);
});

test("the profile is within the policy only for N=2 outer-wide; the policy any is outside it", () => {
  const r2 = assess(2, home(2), { profile: FACE });
  assert.deepEqual(r2.reachability, { TAG: "VerifiedComplete", _0: "face-turn-invariants-v1" });
  assert.equal(r2.profile, FACE);
  assert.equal(r2.invariants.length, 1);
  for (const n of [3, 4]) assert.deepEqual(assess(n, home(n), { profile: FACE }).reachability, { TAG: "Unknown", _0: "ProfileOutsidePolicy" }, `N=${n}`);
  const anyDef = ok(Codec.decodeDefinition(JSON.stringify({ ...JSON.parse(definitionText(2)), movePolicy: "any" })));
  assert.deepEqual(Validate.assess(anyDef, Codec.homeState(anyDef), FACE, undefined).reachability, { TAG: "Unknown", _0: "ProfileOutsidePolicy" });
  // The corner twist sum still disproves under a mismatch: it holds for every layer selection.
  const corner = piecesOfKind(3, 3)[0];
  const twist = stabilizers(3, corner).find((o) => !Orientation.equal(o, Orientation.identity));
  assert.deepEqual(assess(3, edit(3, { [corner]: { o: twist } }), { profile: FACE }).reachability, { TAG: "Disproved", _0: "corner-twist-sum" });
  // The report of an invalid state carries the profile as well.
  assert.equal(assess(2, home(3), { profile: FACE }).profile, FACE);
});

// ---- certificate legality and verdict precedence (review round 1, finding 2) -----------------------------
test("outer-wide certificates need contiguous layers: N=4 layers [0,2] and [1,3] are illegal", () => {
  for (const layers of [[0, 2], [1, 3], [0, 1, 3]]) {
    const m = { axis: "X", layers, turns: 1 };
    assert.deepEqual(assess(4, run(4, [m]), { certificate: [m] }).reachability, { TAG: "Unknown", _0: "CertificateIllegalMove" }, JSON.stringify(layers));
  }
  for (const layers of [[0, 1], [2, 3], [0, 1, 2], [1, 2, 3]]) {
    const m = { axis: "X", layers, turns: 1 };
    assert.equal(assess(4, run(4, [m]), { certificate: [m] }).reachability.TAG, "VerifiedByReplay", JSON.stringify(layers));
  }
});

test("a verifying certificate wins over the invariant verdict; a rejected one leaves the verdict to the invariants", () => {
  const u = { axis: "Y", layers: [1], turns: 1 };
  const s = run(2, [u]);
  const r = assess(2, s, { profile: FACE, certificate: [u] });
  assert.equal(r.reachability.TAG, "VerifiedByReplay");
  assert.equal(r.profile, FACE);
  // Wrong certificate on a reachable state: the complete method decides.
  assert.deepEqual(assess(2, s, { profile: FACE, certificate: [] }).reachability, { TAG: "VerifiedComplete", _0: "face-turn-invariants-v1" });
  // Mismatching or illegal certificate: the invariants decide (the whole-cube X move is illegal for N=2).
  const corner = piecesOfKind(2, 3)[0];
  const twist = stabilizers(2, corner).find((o) => !Orientation.equal(o, Orientation.identity));
  const bad = edit(2, { [corner]: { o: twist } });
  assert.deepEqual(assess(2, bad, { profile: FACE, certificate: [] }).reachability, { TAG: "Disproved", _0: "corner-twist-sum" });
  assert.deepEqual(assess(2, bad, { profile: FACE, certificate: [{ axis: "X", layers: [0, 1], turns: 1 }] }).reachability, { TAG: "Disproved", _0: "corner-twist-sum" });
  const whole = { axis: "X", layers: [0, 1], turns: 1 };
  assert.deepEqual(assess(2, home(2), { profile: FACE, certificate: [whole] }).reachability, { TAG: "VerifiedComplete", _0: "face-turn-invariants-v1" });
  assert.deepEqual(assess(3, home(3), { ...ASSUME, certificate: [whole] }).reachability.TAG, "Unknown");
});

test("assessAssuming: every certificate move must be in the claimed profile", () => {
  const s = run(3, [rw]);
  // The reviewer's case: Rw is legal for the policy but outside FaceTurns; the profile invariants are violated.
  const r = assess(3, s, { ...ASSUME, certificate: [rw] });
  assert.deepEqual(r.reachability, { TAG: "Unknown", _0: "CertificateOutsideProfile" });
  assert.equal(r.invariants.some((i) => !i.holds), true);
  // Face turns only: the certificate verifies by replay.
  const walk = [{ axis: "X", layers: [2], turns: -1 }, { axis: "Z", layers: [0], turns: 2 }];
  assert.equal(assess(3, run(3, walk), { ...ASSUME, certificate: walk }).reachability.TAG, "VerifiedByReplay");
  // One outside move anywhere in the sequence is enough; an inner slice and a two-layer wide move are outside.
  for (const bad of [{ axis: "Y", layers: [1], turns: 1 }, { axis: "Y", layers: [0, 1], turns: 1 }]) {
    const seq = [...walk, bad];
    assert.deepEqual(assess(3, run(3, seq), { ...ASSUME, certificate: seq }).reachability, { TAG: "Unknown", _0: "CertificateOutsideProfile" });
  }
  // Without the profile the same certificate is not restricted.
  assert.equal(assess(3, s, { assume: true, certificate: [rw] }).reachability.TAG, "VerifiedByReplay");
});

test("assessAssuming: a violated corner twist sum stays disproved, whatever the certificate", () => {
  const corner = piecesOfKind(3, 3)[0];
  const twist = stabilizers(3, corner).find((o) => !Orientation.equal(o, Orientation.identity));
  const bad = edit(3, { [corner]: { o: twist } });
  assert.deepEqual(assess(3, bad, { ...ASSUME, certificate: [rw] }).reachability, { TAG: "Disproved", _0: "corner-twist-sum" });
  // Other violated invariants do not disprove when the certificate leaves the profile.
  assert.deepEqual(assess(3, run(3, [rw]), { ...ASSUME, certificate: [rw] }).reachability, { TAG: "Unknown", _0: "CertificateOutsideProfile" });
});
