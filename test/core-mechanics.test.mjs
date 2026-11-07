import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import { definitionText, homeReference, applyReference, mulberry32, randomMove, slots, facesOf, pieceId, NORMAL, FACES } from "./helpers/cube-model.mjs";

// T009 / AC08, AC16: seeded mechanics properties for N=2..7 against an independent reference model.
// Every size gets 1000 sequences of length 0..100 (plan.md). N=2 and N=3 are certified (ADR 0008); N=4..7 are
// representable and run as an uncertified smoke test. Seeds are fixed; a failure reports the seed,
// the sequence index and a greedily minimized move list so that it can be replayed.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const RUNS = { 2: 1000, 3: 1000, 4: 1000, 5: 1000, 6: 1000, 7: 1000 };
const SEED = { 2: 0x2002, 3: 0x3003, 4: 0x4004, 5: 0x5005, 6: 0x6006, 7: 0x7007 };
const MAX_LEN = 100;

const sizeOf = (n) => ok(Shell.makeSize(n));
const toMove = (n, m) => ok(Move.make(sizeOf(n), m.axis, m.layers, m.turns));
const step = (n, poses, m) => { const mv = toMove(n, m); return poses.map((p) => Move.applyToPose(mv, p)); };
// The inverse comes from the core (Move.inverse), not from the reference helper.
const stepInverse = (n, poses, m) => { const mv = Move.inverse(toMove(n, m)); return poses.map((p) => Move.applyToPose(mv, p)); };
const run = (n, poses, moves) => moves.reduce((acc, m) => step(n, acc, m), poses);
const snapshot = (poses) => poses.map((p) => [Id.toString(Pose.pieceId(p)), Object.values(Shell.toVec(Pose.position(p))), Orientation.toArray(Pose.orientation(p))]);

const defs = {};
const definition = (n) => (defs[n] ??= ok(Codec.decodeDefinition(definitionText(n))));

// Greedy minimization: drop single moves while the property still fails.
const minimize = (moves, fails) => {
  let cur = moves;
  for (let changed = true; changed;) {
    changed = false;
    for (let i = 0; i < cur.length; i++) {
      const trial = [...cur.slice(0, i), ...cur.slice(i + 1)];
      if (fails(trial)) { cur = trial; changed = true; break; }
    }
  }
  return cur;
};

const property = (name, n, check) => test(`${name} (N=${n}${n > 3 ? ", uncertified" : ""}, ${RUNS[n]} seeded sequences)`, () => {
  const rand = mulberry32(SEED[n] ^ name.length);
  const home = Codec.poses(Codec.homeState(definition(n)));
  for (let i = 0; i < RUNS[n]; i++) {
    const length = Math.floor(rand() * (MAX_LEN + 1));
    const moves = Array.from({ length }, () => randomMove(rand, n));
    const failure = (ms) => { try { check(n, home, ms, rand); return null; } catch (e) { return e; } };
    if (failure(moves)) {
      const small = minimize(moves, (ms) => failure(ms) !== null);
      assert.fail(`${name}: N=${n} seed=0x${(SEED[n] ^ name.length).toString(16)} sequence=${i} minimized=${JSON.stringify(small)}: ${failure(small).message}`);
    }
  }
});

const expectedPoses = (n, moves) => {
  let ref = homeReference(n);
  for (const m of moves) ref = applyReference(ref, n, m);
  return [...ref].map(([id, { p, o }]) => [id, p, o]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

for (const n of [2, 3, 4, 5, 6, 7]) {
  property("the core agrees with the reference model, move by move", n, (size, home, moves) => {
    const got = snapshot(run(size, home, moves)).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    assert.deepEqual(got, expectedPoses(size, moves));
  });

  property("a sequence followed by its inverse restores the byte-identical canonical state", n, (size, home, moves) => {
    const there = run(size, home, moves);
    const back = [...moves].reverse().reduce((acc, m) => stepInverse(size, acc, m), there);
    const state = ok(Codec.stateOfPoses(definition(size), back));
    assert.equal(Codec.encodeState(state), Codec.encodeState(Codec.homeState(definition(size))));
  });

  property("quarter turns to the fourth power, half turns squared and move plus inverse are the identity", n, (size, home, moves, rand) => {
    const start = run(size, home, moves);
    const m = randomMove(rand, size);
    const q = { ...m, turns: m.turns === 2 ? 1 : m.turns };
    assert.deepEqual(snapshot([1, 2, 3, 4].reduce((acc) => step(size, acc, q), start)), snapshot(start));
    assert.deepEqual(snapshot(step(size, step(size, start, { ...m, turns: 2 }), { ...m, turns: 2 })), snapshot(start));
    assert.deepEqual(snapshot(stepInverse(size, step(size, start, m), m)), snapshot(start));
    assert.deepEqual(snapshot(step(size, stepInverse(size, start, m), m)), snapshot(start));
    assert.deepEqual(snapshot(step(size, step(size, start, q), q)), snapshot(step(size, start, { ...q, turns: 2 })));
  });

  property("moves keep identity, occupancy, orthogonality, position rule and outward stickers", n, (size, home, moves) => {
    const end = run(size, home, moves);
    const all = new Set(slots(size).map((s) => s.join()));
    const seen = new Set();
    const ids = new Set();
    const t = size - 1;
    for (const p of end) {
      const pos = Object.values(Shell.toVec(Pose.position(p)));
      assert.ok(all.has(pos.join()), `position ${pos} is a shell slot`);
      assert.ok(!seen.has(pos.join()), `position ${pos} occupied once`);
      seen.add(pos.join());
      ids.add(Id.toString(Pose.pieceId(p)));
      const o = Orientation.toArray(Pose.orientation(p));
      assert.equal(Orientation.make(o).TAG, "Ok", "orientation stays in SO(3,Z)");
      const h = slots(size).find((s) => pieceId(s, size) === Id.toString(Pose.pieceId(p)));
      for (const f of facesOf(h, size)) {
        const n0 = NORMAL[f];
        const w = [0, 1, 2].map((i) => o[3 * i] * n0[0] + o[3 * i + 1] * n0[1] + o[3 * i + 2] * n0[2]);
        const axis = w.findIndex((c) => c !== 0);
        assert.equal(pos[axis], w[axis] * t, `sticker ${f} of ${Id.toString(Pose.pieceId(p))} faces outward`);
      }
      assert.ok(Pose.positionMatchesHome(p, ok(Shell.makeSlot(sizeOf(size), { x: h[0], y: h[1], z: h[2] }))));
    }
    assert.equal(seen.size, all.size);
    assert.equal(ids.size, all.size);
  });

  property("the canonical codec round-trips every reached state", n, (size, home, moves) => {
    const state = ok(Codec.stateOfPoses(definition(size), run(size, home, moves)));
    const bytes = Codec.encodeState(state);
    assert.equal(Codec.encodeState(ok(Codec.decodeState(definition(size), bytes))), bytes);
    assert.match(Codec.hashState(state), /^sha256:[0-9a-f]{64}$/);
  });

  property("a wide move equals its constituent layer moves in either order", n, (size, home, moves, rand) => {
    const start = run(size, home, moves);
    const width = 1 + Math.floor(rand() * size);
    const side = rand() < 0.5;
    const layers = Array.from({ length: width }, (_, i) => (side ? size - width + i : i));
    const m = { axis: "XYZ"[Math.floor(rand() * 3)], layers, turns: [-1, 1, 2][Math.floor(rand() * 3)] };
    const parts = layers.map((l) => ({ ...m, layers: [l] }));
    assert.deepEqual(snapshot(step(size, start, m)), snapshot(run(size, start, parts)));
    assert.deepEqual(snapshot(step(size, start, m)), snapshot(run(size, start, [...parts].reverse())));
  });
}
