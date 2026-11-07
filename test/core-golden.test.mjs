import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Notation from "../core/res/PwNotation.res.mjs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import { definitionText, pieceId, slots } from "./helpers/cube-model.mjs";

// T009 / AC08, AC16: golden tests against the conformance fixtures of ADR 0008. Each fixture is bound to
// its provenance file (pinned source commit, input and output SHA-256) before it is used.
const dir = new URL("./fixtures/conformance/", import.meta.url);
const bytes = (name) => readFileSync(new URL(name, dir));
const json = (name) => JSON.parse(bytes(name).toString("utf8"));
const provenance = (stem) => Object.fromEntries(bytes(`${stem}.provenance`).toString("utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const home = (n) => Codec.poses(Codec.homeState(ok(Codec.decodeDefinition(definitionText(n)))));
const apply = (poses, moves) => moves.reduce((acc, m) => acc.map((p) => Move.applyToPose(m, p)), poses);
const byId = (poses) => new Map(poses.map((p) => [Id.toString(Pose.pieceId(p)), p]));
const vec = (p) => Object.values(Shell.toVec(Pose.position(p)));

test("the fixtures used here match the output hash recorded in their provenance", () => {
  for (const [file, stem] of [["f2-move-signs.json", "f2-move-signs"], ["f3-2x2-v1.json", "f3-2x2-v1"], ["f4-3x3-picture-rotations.json", "f4-3x3-picture-rotations"]]) {
    const p = provenance(stem);
    assert.match(p.source_commit, /^[0-9a-f]{40}$/, stem);
    assert.match(p.input_sha256, /^[0-9a-f]{64}$/, stem);
    assert.equal(createHash("sha256").update(bytes(file)).digest("hex"), p.output_sha256, stem);
  }
});

test("F2: every outer face move of the notation parser has the recorded axis, layers, turns and rotation", () => {
  const f2 = json("f2-move-signs.json");
  const faceMoves = f2.moves.filter((m) => "RLUDFB".includes(m.move[0]));
  assert.equal(faceMoves.length, 18);
  for (const n of [2, 3]) {
    for (const m of faceMoves) {
      const [parsed] = ok(Notation.parse(size(n), m.move));
      // F2 lists layers as doubled coordinates c = 2i-(N-1); the core uses the index i.
      assert.deepEqual(Move.layers(parsed), m.layers[n].map((c) => (c + n - 1) / 2), `${m.move} N=${n}`);
      assert.equal(Move.axis(parsed), m.axis, m.move);
      assert.equal(Move.turns(parsed), m.turns, m.move);
      assert.deepEqual(Orientation.toArray(Move.rotation(parsed)), m.rotation, m.move);
    }
  }
});

test("F2: x, y, z are unsupported text (Q2) but their all-layer AST has the recorded rotation", () => {
  const f2 = json("f2-move-signs.json");
  for (const m of f2.moves.filter((m) => "xyz".includes(m.move[0]))) {
    assert.equal(Notation.parse(size(3), m.move)._0.kind, "UnsupportedAlias", m.move);
    for (const n of [2, 3]) {
      const ast = ok(Move.make(size(n), m.axis, m.layers[n].map((c) => (c + n - 1) / 2), m.turns));
      assert.equal(Move.layers(ast).length, n, `${m.move} selects all layers`);
      assert.deepEqual(Orientation.toArray(Move.rotation(ast)), m.rotation, m.move);
    }
  }
});

test("F2: the recorded slot examples", () => {
  for (const e of json("f2-move-signs.json").examples) {
    const m = ok(Move.make(size(2), e.axis, [0, 1], e.turns)); // all layers of the N=2 cube
    const p = Pose.make(ok(Id.make("p")), ok(Shell.makeSlot(size(2), { x: e.from[0], y: e.from[1], z: e.from[2] })), Orientation.identity);
    assert.deepEqual(vec(Move.applyToPose(m, p)), e.to, e.text);
  }
});

test("F3: the Cubistry v1 witnesses replay to the recorded positions and orientations (N=2)", () => {
  const f3 = json("f3-2x2-v1.json");
  assert.equal(f3.witnesses.length, 2);
  for (const w of f3.witnesses) {
    const end = byId(apply(home(2), ok(Notation.parse(size(2), w.word))));
    assert.equal(w.cubies.length, 8);
    for (const c of w.cubies) {
      const piece = end.get(pieceId(c.home, 2));
      assert.deepEqual(vec(piece), c.position, `${w.word} cubie ${c.id} position`);
      assert.deepEqual(Orientation.toArray(Pose.orientation(piece)), c.o, `${w.word} cubie ${c.id} orientation`);
      assert.equal(c.oEqualsTransposed, JSON.stringify(c.o) === JSON.stringify(Orientation.toArray(Orientation.transpose(ok(Orientation.make(c.o))))));
    }
    // the replayed state is a valid canonical state of the 2x2 definition
    ok(Codec.stateOfPoses(ok(Codec.decodeDefinition(definitionText(2))), [...end.values()]));
  }
});

test("F4: whole-cube rotations x, y, z move every piece and center as recorded (N=3)", () => {
  const f4 = json("f4-3x3-picture-rotations.json");
  assert.equal(f4.rotations.length, 9);
  const faceOf = { U: [0, 2, 0], D: [0, -2, 0], F: [0, 0, 2], B: [0, 0, -2], R: [2, 0, 0], L: [-2, 0, 0] };
  const faceAt = (v) => Object.keys(faceOf).find((f) => faceOf[f].join() === v.join());
  const axisOf = { x: "X", y: "Y", z: "Z" };
  for (const r of f4.rotations) {
    const turns = r.word.endsWith("'") ? 1 : r.word.endsWith("2") ? 2 : -1;
    const all = ok(Move.make(size(3), axisOf[r.word[0]], [0, 1, 2], turns));
    const end = byId(apply(home(3), [all]));
    for (const p of end.values()) assert.deepEqual(Orientation.toArray(Pose.orientation(p)), r.o, r.word);
    for (const c of r.centers) assert.equal(faceAt(vec(end.get(c.face))), c.slot, `${r.word}: center ${c.face}`);
  }
});

test("F4: the recorded x rotation is a valid state with the U center on B (ADR 0008, center twist example)", () => {
  const rx = json("f4-3x3-picture-rotations.json").rotations.find((r) => r.word === "x");
  assert.equal(rx.centers.find((c) => c.face === "U").slot, "B");
  assert.equal(rx.centers.find((c) => c.face === "U").twist, 2);
  const def = ok(Codec.decodeDefinition(definitionText(3)));
  const end = apply(home(3), [ok(Move.make(size(3), "X", [0, 1, 2], -1))]);
  ok(Codec.stateOfPoses(def, end));
  assert.equal(slots(3).length, 26);
});
