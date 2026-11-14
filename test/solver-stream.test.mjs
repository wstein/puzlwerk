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
// A vector may name another protocol minor (`minor`, default 1) and another definition (`definition`, default the 2x2x2).
const withEnvelope = (v) => ({ ...v, events: v.events.map((e) => ({ ...structuredClone(ENVELOPE), version: { major: 1, minor: v.minor ?? 1 }, ...e })) });
function fill(v) {
  const goalOf = (g) => (g.kind === "subgoal" ? { ...g, goal: goalOf(g.goal) } : g.kind === "state" ? { ...g, target: text(g.state.file) } : g);
  return {
    ctx: { definition: text(v.definition ?? vectors.definition), initial: stateText(v.initial), goal: goalOf(v.goal), requestId: ENVELOPE.requestId, budget: v.budget, closed: v.closed, cancelRequested: v.cancel === true },
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
    "unsupported-predicate-id", "predicate-goal-final", "front-image-classes-final-with-rotation", "front-image-classes-in-a-subgoal-final-with-rotation", "any-rotation-final-with-rotation",
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

// Predicate registry of protocol minor 1.2 (contract section 2.3): parameter schema of `front-image-classes`. The sticker IDs
// are those of definition-3.json; an invalid vector fails with its code and path, and with that code off another rule or none fires.
const registry = vectors.registry["front-image-classes"];
const definitionOf = (r) => JSON.parse(text(r.definition ?? registry.definition));
const stickers = new Set(definitionOf({}).pieces.flatMap((p) => p.stickers.map((st) => st.id)));
const asRequest = (r) => ({ ...r, version: { major: 1, minor: registry.since.minor } });
// The definition of a vector gives the sticker IDs and the size (default: the 3x3x3 of the entry).
const optOf = (r, more = {}) => { const d = definitionOf(r); return { stickers: new Set(d.pieces.flatMap((p) => p.stickers.map((st) => st.id))), size: d.size, ...more }; };
test("registry vectors: the 3x3 definition has 54 sticker IDs and the entry has a closed key set", () => {
  assert.equal(stickers.size, 54);
  assert.deepEqual(registry.keys, ["cells", "centerUp"]);
  assert.equal(registry.since.minor, 2);
});
for (const r of registry.valid) {
  test(`registry valid request: ${r.name}`, () => assert.deepEqual(checkRequest(asRequest(r), { stickers }), { ok: true }));
}
for (const r of registry.invalid) {
  test(`registry invalid request: ${r.name} fails with ${r.code} at ${r.path}`, () => {
    assert.deepEqual(checkRequest(asRequest(r), optOf(r)), { ok: false, code: r.code, path: r.path });
    const without = checkRequest(asRequest(r), optOf(r, { disable: r.code }));
    assert.ok(without.ok || without.code !== r.code, `${r.name}: ${JSON.stringify(without)}`);
  });
}
test("registry codes: every code of the entry has an invalid vector", () => {
  assert.deepEqual([...new Set(registry.invalid.map((r) => r.code))].sort(), ["BadCell", "BadCellCount", "BadCenterUp", "BadParamKeys", "BadStickerId", "UnknownSticker", "UnsupportedSize"]);
});
test("at protocol minor 1 the registry does not exist: every predicate id is opaque", () => {
  for (const r of registry.invalid) assert.deepEqual(checkRequest({ ...r, version: { major: 1, minor: 1 } }, { stickers }), { ok: true }, r.name);
});

// Doc-level expectations: the contract, the task list and the research register name the registry entry, its closed key set, the
// version, the slot order, the replay and every code the reference check reports for it.
// Order of the detail path (contract section 2.3): the first violation in a depth-first walk keys, centerUp, cells, then cell 0..8 each
// with its own shape before its IDs 0..n-1, each ID with its format before its range. The two-violation vectors name the earlier one.
test("registry order: every two-violation vector reports the earlier violation", () => {
  assert.equal(registry.invalid.filter((r) => r.name.startsWith("two-violations-")).length, 6);
});
const spec = (name) => readFileSync(new URL(`../specs/001-core-foundation/${name}`, import.meta.url), "utf8");
const section = (md, heading) => {
  const start = md.indexOf(heading);
  assert.ok(start >= 0, `heading ${heading} missing`);
  const next = md.slice(start + heading.length).search(/\n#{2,3} /);
  return next < 0 ? md.slice(start) : md.slice(start, start + heading.length + next);
};
const contract = spec("contracts/solver-stream.md");
test("contract section 2.3 specifies the entry front-image-classes", () => {
  const s = section(contract, "### 2.3 Predicate registry");
  for (const needle of [
    "protocol minor 2", "version 1.2", "`front-image-classes`", ...registry.keys.map((k) => `\`${k}\``), "exactly 9", "nonempty", "wire-v1",
    "row-major as seen from the front with +Y up", "24 global rotations", "C1", "applies to the centre only", "depth-first", "ascending index", "`UnsupportedSize`", "expanded nodes", "left to T013a", "`failed` `unsupported`", "`failed` `invalid`",
    "All", "Any", "StickerAt", "100,000", "depth 3", ...registry.invalid.map((r) => r.code),
  ]) assert.ok(s.includes(needle), `section 2.3 lacks: ${needle}`);
});
test("section 2 does not say that 1.1 takes no further minor next to the 1.2 sentence", () => {
  const line = contract.split("\n").find((l) => l.startsWith("**P** Additive to solver.md 1.0"));
  assert.ok(!line.includes("no further minor"), "line 13");
  assert.ok(line.includes("sections 2.1 to 5 of version 1.1"), "line 13 names what stays in 1.1");
});
test("contract section 3.3 specifies final.rotation and section 8 the predicates capability", () => {
  const r = section(contract, "### 3.3 Final rotation");
  for (const needle of ["`rotation`", "version 1.2", "nine integers", "`RotationNotAllowed`", "`BadRotation`", "`any-rotation`", "`front-image-classes`"]) assert.ok(r.includes(needle), `section 3.3 lacks: ${needle}`);
  const c = section(contract, "## 8. Capabilities and versioning");
  for (const needle of ["\"predicates\":[", "`front-image-classes`", "version 1.2", "minor"]) assert.ok(c.includes(needle), `section 8 lacks: ${needle}`);
});

test("tasks and research record the registry entry and its dependency", () => {
  const t = spec("tasks.md").split("\n").find((l) => l.startsWith("| T013a "));
  const cols = t.split("|").map((c) => c.trim());
  assert.ok(cols[2].includes("solver-stream.md sections 2.1 and 2.3"), "T013a dependency column");
  assert.ok(cols[3].includes("`front-image-classes`"), "T013a description");
  assert.ok(spec("research.md").includes("`front-image-classes`"), "research.md");
});
