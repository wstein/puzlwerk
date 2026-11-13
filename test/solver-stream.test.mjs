import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkRequest, checkStream } from "./helpers/solver-stream-reference.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";

// Conformance vectors of specs/001-core-foundation/contracts/solver-stream.md. Moves are replayed with the
// ReScript core on the wire-v1 fixtures. Not covered: goal kind predicate (no registry), frame any-rotation,
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
function fill(v) {
  const goalOf = (g) => (g.kind === "subgoal" ? { ...g, goal: goalOf(g.goal) } : g.kind === "state" ? { ...g, target: text(g.state.file) } : g);
  const requestId = "r1";
  return {
    ctx: { definition: text(vectors.definition), initial: stateText(v.initial), goal: goalOf(v.goal), requestId, budget: v.budget, closed: v.closed },
    events: v.events.map((e) => ({ protocol: "puzlwerk.solver", version: { major: 1, minor: 1 }, requestId, ...e })),
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
const byName = Object.fromEntries(vectors.valid.map((v) => [v.name, v]));

test("fixture sanity: R U F' from home equals state-2-scrambled, so F U' R' is its inverse", () => {
  const rufPrime = [vectors.moves.R, { axis: "Y", layers: [1], turns: -1 }, { axis: "Z", layers: [1], turns: 1 }];
  assert.equal(scramble("state-2-home.json", rufPrime), Codec.encodeState(Codec.decodeState(def, text("state-2-scrambled.json"))._0));
});

for (const v of vectors.valid) {
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
  test(`invalid stream: ${v.name} is caught only by its own check (${v.code} disabled: no longer reported)`, () => {
    const { ctx, events } = fill(mutated);
    const result = checkStream(ctx, events, { disable: v.code });
    assert.ok(result.ok || result.code !== v.code, JSON.stringify(result));  });
}

test("goal replay covers 5 valid vectors; the 4 failed-stream vectors are not goal-evaluated", () => {
  const evaluated = vectors.valid.filter((v) => v.expect.evaluated === true).length;
  assert.equal(evaluated, 5);
  const skipped = vectors.valid.filter((v) => v.expect.evaluated === null).map((v) => v.name);
  assert.deepEqual(skipped, ["cancelled-after-committed-prefix", "timeout-without-commit", "unsupported-goal", "unsatisfiable-names-method-and-scope"]);
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
