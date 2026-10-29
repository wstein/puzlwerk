import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { solvePicture3x3 } from "../packages/solver-3x3-picture/src/index.mjs";
import * as Executor from "../packages/solver-3x3-picture/res/upstream/Move/MoveExecutor.res.mjs";
import * as Parser from "../packages/solver-3x3-picture/res/upstream/Move/MoveParser.res.mjs";
import * as Codec from "../packages/solver-3x3-picture/res/upstream/State/FaceletCodec.res.mjs";
import * as Centers from "../packages/solver-3x3-picture/res/upstream/Solver/PictureCenters.res.mjs";
import * as Ordinary from "../packages/solver-3x3-picture/res/upstream/Solver/TwoPhaseSolver.res.mjs";
const zero = () => Array(6).fill(0),
  exact = () => Array(6).fill(4);
const input = (word) => ({
  facelets: Codec.render(Executor.parseAndApply(3, word)._0),
  centerOrientations: Centers.apply(zero(), Parser.parse(3, word)._0)._0,
});
const solved = Codec.render(Executor.parseAndApply(3, "")._0);

test("private picture API solves bounded physical inputs and replays complete goals", () => {
  for (const word of ["", "R", "U F2", "R U F'", "D2 L2 B U"]) {
    const request = {
      ...input(word),
      maximumDepth: word ? word.split(" ").length : 0,
      maximumNodes: 200000,
    };
    const before = JSON.stringify(request),
      result = solvePicture3x3(request);
    assert.equal(result.status, "solved", JSON.stringify(result));
    assert.equal(JSON.stringify(request), before);
    assert(result.htm <= request.maximumDepth);
    const parsed = Parser.parse(3, result.moves.join(" "))._0;
    assert.equal(
      Codec.render(
        Executor.applyAlg(Codec.parse(3, request.facelets)._0, parsed)._0,
      ),
      solved,
    );
    assert.deepEqual(
      Centers.apply(request.centerOrientations, parsed)._0,
      zero(),
    );
  }
});
test("identical colors with different printed centers require a different valid six-move route", () => {
  const a = input("U R L U2 R' L'"),
    b = input("L R U2 L' R' U'");
  assert.equal(a.facelets, b.facelets);
  assert.notDeepEqual(a.centerOrientations, b.centerOrientations);
  const color = Codec.parse(3, a.facelets)._0,
    ordinary = Ordinary.solveAtDepth(color, 6)._0.alg;
  const state = Centers.apply(a.centerOrientations, ordinary)._0.some(Boolean)
    ? a
    : b;
  const result = solvePicture3x3({
    ...state,
    maximumDepth: 6,
    maximumNodes: 1000000,
  });
  assert.equal(result.status, "solved", JSON.stringify(result));
  assert.equal(result.htm, 6);
  assert.deepEqual(result.centerOrientationsAfter, zero());
});
test("parity, optical symmetry and exhausted budgets remain distinct", () => {
  assert.equal(
    solvePicture3x3({
      facelets: solved,
      centerOrientations: [1, 0, 0, 0, 0, 0],
    }).status,
    "invalid",
  );
  const half = {
    facelets: solved,
    centerOrientations: [2, 0, 0, 0, 0, 0],
    maximumDepth: 0,
  };
  assert.equal(solvePicture3x3(half).status, "unknown");
  assert.equal(
    solvePicture3x3({ ...half, symmetry: [2, 4, 4, 4, 4, 4] }).status,
    "solved",
  );
  assert.equal(
    solvePicture3x3({ ...input("R U F L"), maximumDepth: 8, maximumNodes: 1 })
      .status,
    "unknown",
  );
  for (const request of [
    null,
    {},
    { ...input("R"), maximumDepth: 1.5 },
    { ...input("R"), maximumNodes: NaN },
    { ...input("R"), centerOrientations: [0.5, 0.5, 0, 0, 0, 0] },
    { ...input("R"), symmetry: [3, 4, 4, 4, 4, 4] },
  ])
    assert.equal(solvePicture3x3(request).status, "invalid");
});
test("retained ReScript sources match their pinned CubeLab provenance", () => {
  const root = new URL("../packages/solver-3x3-picture/", import.meta.url);
  const p = JSON.parse(readFileSync(new URL("provenance.json", root)));
  assert.equal(p.revision, "08e079f3bc211777d8980f75ec6a7f61979dd2ac");
  assert.equal(p.files.length, 12);
  for (const file of p.files)
    assert.equal(
      createHash("sha256")
        .update(readFileSync(new URL(file.path, root)))
        .digest("hex"),
      file.sha256,
      file.path,
    );
});

test("the center reference kernel covers all 2048 legal tuples with bounded exact words", async () => {
  const { centerKernelReference, centerKernelReferenceStatistics } =
    await import("../packages/solver-3x3-picture/src/index.mjs");
  const stats = centerKernelReferenceStatistics();
  assert.equal(stats.states, 2048);
  assert.equal(stats.maximumReferenceMoves, 286);
  for (let coordinate = 0; coordinate < 4096; coordinate++) {
    const tuple = Centers.decode(coordinate),
      answer = centerKernelReference(tuple);
    if (tuple.reduce((a, b) => a + b, 0) % 2) {
      assert.equal(answer.status, "invalid");
      continue;
    }
    assert.equal(answer.status, "reference");
    assert(answer.htm <= 286);
    const count = [0, 0, 0, 0, 0, 0];
    for (const token of answer.moves) {
      const at = "ULFRBD".indexOf(token[0]);
      count[at] =
        (count[at] + (token.endsWith("2") ? 2 : token.endsWith("'") ? 3 : 1)) %
        4;
    }
    assert.deepEqual(count, tuple);
    if (coordinate % 127 === 0) {
      const alg = Parser.parse(3, answer.moves.join(" "))._0;
      assert.equal(
        Codec.render(Executor.applyAlg(Codec.parse(3, solved)._0, alg)._0),
        solved,
      );
      assert.deepEqual(Centers.apply(zero(), alg)._0, tuple);
    }
  }
  for (const generator of stats.generators) {
    const parsed = Parser.parse(3, generator.word)._0;
    assert.equal(
      Codec.render(Executor.applyAlg(Codec.parse(3, solved)._0, parsed)._0),
      solved,
    );
    assert.deepEqual(Centers.apply(zero(), parsed)._0, generator.delta);
  }
});
