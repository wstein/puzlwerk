import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { create2x2Solver, TABLE_URL } from "@puzwerk/solver-2x2";
import {
  clone,
  initial,
  replay,
  poses,
  stickers,
  globalTargets,
  rotateAll,
  regularPrint,
} from "./helpers/physical-replay.mjs";
const bytes = await readFile(TABLE_URL);
const print = regularPrint(),
  solved = initial(print);
const solver = await create2x2Solver(bytes, print);
function exact(from, target) {
  const result = solver.solve2x2(from, target, { mode: "exactPhysical" });
  const actual = replay(from, result.moves);
  assert.equal(result.mode, "exactPhysical");
  assert.equal(result.metric, "HTM");
  assert.equal(result.optimality, "not-guaranteed");
  assert.equal(result.moveCount, result.moves.length);
  assert.equal(result.moveCount, result.quotientDistance + result.frameCorrectionMoves);
  assert.deepEqual(poses(actual), poses(target));
  assert.deepEqual(stickers(print, actual), stickers(print, target));
  return result;
}

test("solved to solved and all 18 single-turn transitions replay exactly", () => {
  assert.equal(exact(solved, solved).moveCount, 0);
  for (const face of "URFDLB")
    for (const suffix of ["", "'", "2"]) {
      const token = face + suffix,
        target = replay(solved, [token]);
      const result = exact(solved, target);
      assert.equal(result.metric, "HTM");
      // Exact-mode optimality is intentionally not promised, even for one turn.
      exact(target, solved);
      const quotient = solver.solve2x2(solved, target, {
        mode: "rotationEquivalent",
      });
      assert.equal(quotient.moveCount, 1);
    }
});

test("arbitrary complete transitions and inverses preserve all body/sticker frames", () => {
  const tokens = ["R", "U2", "F'", "L", "D2", "B'", "R2", "U'", "F"];
  for (let seed = 0; seed < 9; seed++) {
    const from = replay(solved, tokens.slice(seed).concat(tokens.slice(0, seed)));
    const to = replay(
      solved,
      tokens
        .slice()
        .reverse()
        .slice(seed % 4),
    );
    exact(from, to);
    exact(to, from);
    const result = solver.solve2x2(from, to, { mode: "rotationEquivalent" });
    assert.equal(result.optimality, "rotation-equivalent-HTM");
    assert.equal(result.frameCorrectionMoves, 0);
    assert.ok(result.moveCount <= 11);
    assert.ok(
      globalTargets(to).some(
        (target) =>
          JSON.stringify(poses(target)) ===
          JSON.stringify(poses(replay(from, result.moves))),
      ),
    );
  }
});

test("distinct physical orientations are never collapsed in exactPhysical mode", () => {
  const x = rotateAll(solved, 0),
    y = rotateAll(solved, 1);
  assert.notDeepEqual(poses(x), poses(y));
  assert.equal(solver.solve2x2(solved, x, { mode: "rotationEquivalent" }).moveCount, 0);
  assert.equal(solver.solve2x2(solved, y, { mode: "rotationEquivalent" }).moveCount, 0);
  const rx = exact(solved, x),
    ry = exact(solved, y);
  assert.ok(rx.frameCorrectionMoves > 0 && ry.frameCorrectionMoves > 0);
  assert.notDeepEqual(rx.moves, ry.moves);
  assert.notDeepEqual(
    stickers(print, replay(solved, rx.moves)),
    stickers(print, replay(solved, ry.moves)),
  );
  for (const target of globalTargets(replay(solved, "R U F2"))) exact(solved, target);
});

test("A → B → C → A uses each actual replayed state and closes every sticker frame", () => {
  const a = replay(solved, "R U F2 L'"),
    b = rotateAll(replay(solved, "B2 D R' F"), 0),
    c = replay(solved, "D2 L F' U B");
  let actual = clone(a);
  for (const target of [b, c, a]) {
    const result = solver.solve2x2(actual, target, { mode: "exactPhysical" });
    actual = replay(actual, result.moves);
    assert.deepEqual(poses(actual), poses(target));
    assert.deepEqual(stickers(print, actual), stickers(print, target));
  }
  assert.deepEqual(actual, a);
  assert.deepEqual(stickers(print, actual), stickers(print, a));
});

test("fixed print and table snapshots survive caller mutation; JSON round trips do not lose identity", async () => {
  const inputPrint = clone(print),
    inputBytes = Uint8Array.from(bytes);
  const pending = create2x2Solver(inputBytes, inputPrint);
  inputBytes.fill(0);
  inputPrint.cubies[0].id = 100;
  inputPrint.stickers[0].up = [0, 0, 0];
  const isolated = await pending;
  const from = JSON.parse(JSON.stringify(solved));
  const target = JSON.parse(JSON.stringify(replay(solved, "F2 U")));
  const result = isolated.solve2x2(from, target, { mode: "exactPhysical" });
  assert.deepEqual(
    stickers(print, replay(from, result.moves)),
    stickers(print, target),
  );
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.moves));
  assert.deepEqual(from, solved);
});

test("rejects malformed, impossible or incompatible states and implicit modes", async () => {
  assert.throws(() => solver.solve2x2(solved, solved), /explicit/);
  assert.throws(
    () => solver.solve2x2(solved, solved, { mode: "colorOnly" }),
    /explicit/,
  );
  const invalid = [];
  for (const mutate of [
    (s) => (s.version = 2),
    (s) => (s.topology.size = 3),
    (s) => (s.printId = "other"),
    (s) => s.cubies.pop(),
    (s) => (s.cubies[0].id = 999),
    (s) => (s.cubies[0].id = s.cubies[1].id),
    (s) => (s.cubies[0].position = [0, 0, 0]),
    (s) => (s.cubies[0].orientation[0] = [0, 0, 0]),
    (s) => (s.cubies[0].orientation[0] = [-1, 0, 0]),
    (s) =>
      (s.cubies[0].orientation = [
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ]),
  ]) {
    const state = clone(solved);
    mutate(state);
    invalid.push(state);
  }
  for (const state of invalid) {
    assert.throws(() => solver.solve2x2(state, solved, { mode: "exactPhysical" }));
    assert.throws(() => solver.solve2x2(solved, state, { mode: "rotationEquivalent" }));
  }
  for (const mutate of [
    (p) => (p.stickers[0].id = p.stickers[1].id),
    (p) => (p.stickers[0].up = p.stickers[0].normal),
    (p) => (p.cubies[0].position = p.cubies[1].position),
    (p) => p.stickers.pop(),
    (p) => (p.stickers[0].normal = [0, 0, 0]),
  ]) {
    const bad = clone(print);
    mutate(bad);
    await assert.rejects(create2x2Solver(bytes, bad));
  }
  const corrupt = Uint8Array.from(bytes);
  corrupt[100] ^= 1;
  await assert.rejects(create2x2Solver(corrupt, print), /SHA-256/);
  await assert.rejects(create2x2Solver(bytes.subarray(1), print), /length/);
});

test("Cubistry 42→43 witness baseline and direct full-physical transition", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("fixtures/cubistry-42-43.json", import.meta.url), "utf8"),
  );
  const [a, b] = fixture.witnesses.map((value) => value.word.trim().split(/\s+/));
  assert.equal(a.length + b.length, 18);
  const start = initial(fixture.print),
    from = replay(start, a),
    target = replay(start, b);
  const direct = await create2x2Solver(bytes, fixture.print);
  const result = direct.solve2x2(from, target, { mode: "exactPhysical" });
  assert.deepEqual(poses(replay(from, result.moves)), poses(target));
  assert.deepEqual(
    stickers(fixture.print, replay(from, result.moves)),
    stickers(fixture.print, target),
  );
  assert.equal(result.moveCount, 10);
  for (const [state, lastDigit] of [
    [from, "2"],
    [replay(from, result.moves), "3"],
  ]) {
    const front = stickers(fixture.print, state).filter(
      (sticker) => sticker.normal[2] === 1,
    );
    for (const [position, asset] of [
      [[-1, 1, 1], "title-left"],
      [[1, 1, 1], "title-right"],
      [[-1, -1, 1], "4"],
      [[1, -1, 1], lastDigit],
    ]) {
      const sticker = front.find((s) => s.position.every((v, i) => v === position[i]));
      assert.equal(sticker.assetId, asset);
      assert.deepEqual(sticker.up, [0, 1, 0]);
    }
  }
  console.log(
    JSON.stringify({
      transition: "42→43",
      referenceHTM: a.length + b.length,
      ...result,
    }),
  );
});
