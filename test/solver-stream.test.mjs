import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAIL_REASONS, checkRequest, checkStream } from "./helpers/solver-stream-reference.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";

// Conformance vectors of specs/001-core-foundation/contracts/solver-stream.md. Moves are replayed with the
// ReScript core on the wire-v1 fixtures. Not covered: predicate evaluation (deferred to M2), frame any-rotation,
// method truth of certificates, real solver output.
const wire = new URL("./fixtures/wire/", import.meta.url);
const text = (name) => readFileSync(new URL(name, wire), "utf8");
const vectors = JSON.parse(readFileSync(new URL("./fixtures/solver-stream/vectors.json", import.meta.url), "utf8"));
const def = Codec.decodeDefinition(text(vectors.definition))._0;

function scramble(file, moves) {
  let state = Codec.decodeState(def, text(file))._0;
  for (const m of moves) {
    const made = Move.make(Shell.makeSize(2)._0, m.axis, m.layers, m.turns)._0;
    state = Codec.stateOfPoses(def, Codec.poses(state).map((p) => Move.applyToPose(made, p)))._0;
  }
  return Codec.encodeState(state);
}
const stateText = (s) => (s.file ? text(s.file) : scramble(s.from, s.moves));
const ENVELOPE = { protocol: "puzlwerk.solver", version: { major: 1, minor: 1 }, requestId: "r1" };
// Every event carries protocol, version, requestId and seq (contract section 3). Vectors list seq; the envelope is
// added here, before mutation, so an invalid vector can delete any one of the four fields.
const withEnvelope = (v) => ({ ...v, events: v.events.map((e) => ({ ...structuredClone(ENVELOPE), ...e })) });
function fill(v) {
  const goalOf = (g) => (g.kind === "subgoal" ? { ...g, goal: goalOf(g.goal) } : g.kind === "state" ? { ...g, target: text(g.state.file) } : g);
  return {
    ctx: { definition: text(vectors.definition), initial: stateText(v.initial), goal: goalOf(v.goal), requestId: ENVELOPE.requestId, budget: v.budget, closed: v.closed, cancelRequested: v.cancel === true },
    events: v.events,
  };
}
function mutate(base, ops) {
  const v = structuredClone(base);
  for (const { op, path, value } of ops) {
    const keys = path.split(".");
    const last = keys.pop();
    const holder = keys.reduce((o, k) => o[k], v);
    if (op === "set") holder[last] = value;
    else if (op === "del") (Array.isArray(holder) ? holder.splice(Number(last), 1) : delete holder[last]);
    else if (op === "push") holder[last].push(value);
    else throw new Error(`bad op ${op}`);
  }
  return v;
}
const SECOND_RULE = {
  "committed-is-empty": "CommitGap",
  "committed-layer-out-of-range": "FinalPrefix",
  "final-tail-move-illegal": "GoalNotReached",
  "final-tail-misses-the-goal": "FinalHashMismatch",
  "final-after-final": "GoalNotReached",
};
const valid = vectors.valid.map(withEnvelope);
const byName = Object.fromEntries(valid.map((v) => [v.name, v]));
// With MissingEcho off, a deleted field is still caught by the value check of the same field.
Object.assign(SECOND_RULE, { "missing-protocol": "BadEnvelope", "missing-version": "BadEnvelope", "missing-version-major": "BadEnvelope", "missing-requestId": "BadEnvelope", "missing-seq": "BadSeq" });

test("fixture sanity: R U F' from home equals state-2-scrambled, so F U' R' is its inverse", () => {
  const rufPrime = [vectors.moves.R, { axis: "Y", layers: [1], turns: -1 }, { axis: "Z", layers: [1], turns: 1 }];
  assert.equal(scramble("state-2-home.json", rufPrime), Codec.encodeState(Codec.decodeState(def, text("state-2-scrambled.json"))._0));
});

for (const v of valid) {
  test(`valid stream: ${v.name}`, () => {
    const { ctx, events } = fill(v);
    const result = checkStream(ctx, events);
    assert.deepEqual(result, { ok: true, ...v.expect });
  });
}

for (const v of vectors.invalid) {
  const mutated = mutate(byName[v.base], v.ops);
  test(`invalid stream: ${v.name} fails with ${v.code}`, () => {
    const { ctx, events } = fill(mutated);
    assert.deepEqual(checkStream(ctx, events), { ok: false, code: v.code });
  });
  test(`invalid stream: ${v.name} is accepted or hits its named second rule when check ${v.code} is off`, () => {
    const { ctx, events } = fill(mutated);
    const result = checkStream(ctx, events, { disable: v.code });
    // With its own check off, the vector is accepted, or the one named second rule fires (hand-derived: a skipped
    // illegal or empty step leaves the replayed state or the prefix inconsistent). Never the same code.
    const second = SECOND_RULE[v.name];
    if (second) assert.deepEqual(result, { ok: false, code: second });
    else assert.equal(result.ok, true, JSON.stringify(result));  });
}

test("goal replay covers 6 valid vectors; failed streams and the predicate-goal stream are not goal-evaluated", () => {
  const evaluated = valid.filter((v) => v.expect.evaluated === true).length;
  assert.equal(evaluated, 6);
  const skipped = valid.filter((v) => v.expect.evaluated === null).map((v) => v.name);
  assert.deepEqual(skipped, [
    "cancelled-after-committed-prefix", "timeout-without-commit", "unsupported-goal", "unsatisfiable-names-method-and-scope",
    "node-limit", "memory-limit", "depth-limit", "incomplete-method", "error-backend", "invalid-goal-extra-key",
    "unsupported-predicate-id", "predicate-goal-final",
  ]);
});

// Closed stop reasons (contract section 5): every `failed.reason` value has at least one valid vector (`unsupported` has two: unsupported-goal and unsupported-predicate-id).
test("every failed reason of the closed set has at least one valid vector", () => {
  const seen = new Set(valid.flatMap((v) => v.events.filter((e) => e.event === "failed").map((e) => e.reason)));
  assert.deepEqual([...seen].sort(), [...FAIL_REASONS].sort());
});

for (const r of vectors.requests.valid) {
  test(`valid request: ${r.name}`, () => assert.deepEqual(checkRequest(r), { ok: true }));
}
for (const r of vectors.requests.invalid) {
  test(`invalid request: ${r.name} fails with ${r.code}`, () => {
    assert.deepEqual(checkRequest(r), { ok: false, code: r.code });
    assert.ok(checkRequest(r, { disable: r.code }).ok, `${r.name}: another rule fires when ${r.code} is disabled`);
  });
}
