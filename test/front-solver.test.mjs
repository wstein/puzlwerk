// Front-goal solver in ReScript (packages/solver-3x3-front): parity with the Rust engine (cubacle, ABI 3 export) on 183 cases.
// Oracle: test/fixtures/front-solver/oracle-183.jsonl (status, route, final rotation, nodes of the Rust/WASM answer,
// default Groups9 tables). FRONT_SRC points the test at another build of the package (used by the mutation runs).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as Model from "../packages/solver-3x3-front/tools/front-model.mjs";
import { generate } from "../packages/solver-3x3-front/tools/gen-front-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = process.env.FRONT_PKG ?? path.join(here, "../packages/solver-3x3-front");
const Front = await import(pathToFileURL(path.join(pkgDir, "src/index.mjs")).href);
const rd = (p) => fs.readFileSync(path.join(here, "fixtures/front-solver", p), "utf8");
const cases = JSON.parse(rd("cases-183.json")).cases;
const oracle = new Map(rd("oracle-183.jsonl").trim().split("\n").slice(1).map((l) => JSON.parse(l)).map((r) => [r.id, r]));
const CLASS = { 0: "ok", 1: "invalid", 2: "noroute", 3: "budget", 4: "tablebudget" };

const line = (c, extra = [60000, 60000, 1e11, 0]) =>
  ["1", c.facelets, c.twists.join(","), c.accepted.map((g) => g.join(",")).join(" "), c.centerUp ? 1 : 0, ...extra].join("\t");
const wordLength = (w) => w.split(" ").filter(Boolean).length;
const solved = new Map();
const run = (c) => {
  if (!solved.has(c.id)) {
    const [status, text] = Front.solveFrontText(line(c));
    const f = text.split("\t");
    solved.set(c.id, { status: CLASS[status], text, moves: f[1], rotation: f[2], nodes: Number(f[3]), tablesMs: Number(f[4]) });
  }
  return solved.get(c.id);
};
const routeCases = cases.filter((c) => oracle.get(c.id).status === "ok");

test("res/FrontData.res is the output of the independent derivation (tools/front-model.mjs)", () => {
  const strip = (s) => s.replace(/\/\/[^\n]*/g, "").replace(/\s+/g, "").replace(/,\]/g, "]");
  const committed = fs.readFileSync(path.join(pkgDir, "res/FrontData.res"), "utf8");
  assert.equal(strip(committed), strip(generate()));
});

test("the 24 rotations, their short words and the turn tables are consistent", () => {
  const rots = Model.rotations();
  assert.equal(rots.length, 24);
  const short = Model.shortWords(rots);
  assert.equal(new Set(short).size, 24);
  for (const w of short) assert.ok(wordLength(w) <= 2, w);
  rots.forEach((r, i) => assert.equal(Model.rotationIndexOf(short[i]), i));
});

test("status class of every case equals the oracle", () => {
  for (const c of cases) assert.equal(run(c).status, oracle.get(c.id).status, c.id);
});

test("route length (half turns) of every route equals the oracle and the fixture optimum", () => {
  for (const c of routeCases) {
    const r = run(c), o = oracle.get(c.id);
    assert.equal(wordLength(r.moves), wordLength(o.moves), c.id);
    if (c.group === "fixture80") assert.equal(wordLength(r.moves), c.expectedHtm, c.id);
  }
});

test("search nodes of every route equal the oracle", () => {
  for (const c of routeCases) assert.equal(run(c).nodes, oracle.get(c.id).nodes, c.id);
});

test("route and final rotation equal the oracle word for word", () => {
  for (const c of routeCases) {
    const r = run(c), o = oracle.get(c.id);
    assert.equal(r.moves, o.moves, c.id);
    assert.equal(r.rotation, o.rotation, c.id);
  }
});

test("final rotation has at most two tokens", () => {
  for (const c of routeCases) assert.ok(wordLength(run(c).rotation) <= 2, `${c.id}: ${run(c).rotation}`);
});

// replay with the model of tools/front-model.mjs (face turns and rotations as sticker permutations)
const replay = (c, r) => {
  let s = Model.turnWord(c.facelets, r.moves);
  s = Model.rotateWord(s, r.rotation);
  return s;
};

test("replay: after the route and the rotation every front position shows an accepted sticker", () => {
  for (const c of routeCases) {
    const s = replay(c, run(c));
    for (let i = 0; i < 9; i++) assert.ok(c.accepted[i].includes(Model.identityAt(s, 18 + i)), `${c.id} position ${i}`);
  }
});

test("replay: with centerUp the front center is upright after the rotation", () => {
  let upright = 0;
  for (const c of routeCases) {
    if (!c.centerUp) continue;
    const r = run(c);
    const tw = [...c.twists];
    for (const tok of r.moves.split(" ").filter(Boolean)) tw[Model.FACE.indexOf(tok[0])] = (tw[Model.FACE.indexOf(tok[0])] + (tok.endsWith("'") ? 3 : tok.endsWith("2") ? 2 : 1)) % 4;
    const rot = Model.rotations()[Model.rotationIndexOf(r.rotation)];
    const g = rot.dest.indexOf(2); // the center that now sits on the front
    assert.equal((tw[g] + rot.add[g]) % 4, 0, c.id);
    upright++;
  }
  assert.ok(upright >= 80, `only ${upright} centerUp cases`);
});

test("the shortest route is shortest: no route one half turn shorter exists (own depth-first search, twist rule included)", () => {
  const short = routeCases.filter((c) => wordLength(run(c).moves) >= 1 && wordLength(run(c).moves) <= 4).slice(0, 4);
  assert.ok(short.length >= 3);
  const rots = Model.rotations();
  const moves = Model.FACE.split("").flatMap((f) => [f, f + "2", f + "'"]);
  for (const c of short) {
    const n = wordLength(run(c).moves);
    const accepts = (s, tw) => rots.some((r) => {
      const t = [...s]; for (let i = 0; i < 54; i++) t[r.map[i]] = s[i];
      const u = t.join("");
      if (!c.accepted.every((list, i) => list.includes(Model.identityAt(u, 18 + i)))) return false;
      const g = r.dest.indexOf(2);
      return !c.centerUp || (tw[g] + r.add[g]) % 4 === 0;
    });
    const dfs = (s, tw, d, last) => {
      if (accepts(s, tw)) return true;
      if (d === 0) return false;
      for (const m of moves) {
        if (m[0] === last) continue;
        const f = Model.FACE.indexOf(m[0]);
        const t2 = tw.slice(); t2[f] = (t2[f] + (m.endsWith("'") ? 3 : m.endsWith("2") ? 2 : 1)) % 4;
        if (dfs(Model.turnWord(s, m), t2, d - 1, m[0])) return true;
      }
      return false;
    };
    assert.equal(dfs(c.facelets, c.twists, n - 1, ""), false, c.id);
  }
});

test("the start that already meets the goal returns no moves, no nodes and a zero table time", () => {
  const solvedCube = [...Model.FACE].map((ch) => ch.repeat(9)).join("");
  const accepted = [...Array(9).keys()].map((i) => [18 + i]);
  const [st, text] = Front.solveFrontText(["1", solvedCube, "0,0,0,0,0,0", accepted.map((l) => l.join(",")).join(" "), "1", 0, 0, 0, 0].join("\t"));
  assert.equal(st, 0);
  assert.equal(text, "1\t\t\t0\t0.000");
});

test("node cap: status 3 and nodes = cap + 1", () => {
  const c = cases.find((x) => x.id === "e-centre-twist2");
  const [st, text] = Front.solveFrontText(line(c, [60000, 60000, 1000, 0]));
  assert.equal(st, 3);
  assert.equal(text, "1\tnodes=1001");
});

test("search time budget is read every 65,536 nodes: a 1 ms budget stops the 265,174 node search at 65,536", () => {
  const c = cases.find((x) => x.id === "e-centre-twist2");
  const [st, text] = Front.solveFrontText(line(c, [60000, 1, 0, 0]));
  assert.equal(st, 3);
  assert.equal(text, "1\tnodes=65536");
});

test("table budget: status 4 with progress in thousandths", () => {
  const c = cases[0];
  const [st, text] = Front.solveFrontText(line(c, [1, 60000, 0, 0]));
  assert.equal(st, 4);
  const m = /^1\tpermille=(\d+)$/.exec(text);
  assert.ok(m && Number(m[1]) <= 1000, text);
});

test("move limit: a limit below the shortest route is a no-route answer", () => {
  const c = cases.find((x) => x.id === "fx-de-a-1"); // 9 moves
  const [st] = Front.solveFrontText(line(c, [60000, 60000, 0, 8]));
  assert.equal(st, 2);
  const [st2, text2] = Front.solveFrontText(line(c, [60000, 60000, 0, 9]));
  assert.equal(st2, 0);
  assert.equal(wordLength(text2.split("\t")[1]), 9);
});

test("the request is checked like the Rust export", () => {
  const c = cases[0];
  const f = line(c).split("\t");
  const with_ = (i, v) => f.map((x, k) => (k === i ? v : x)).join("\t");
  const status = (s) => Front.solveFrontText(s)[0];
  assert.equal(status(with_(0, "2")), 1);
  assert.equal(status(f.slice(0, 8).join("\t")), 1);
  assert.equal(status(with_(1, f[1].slice(1))), 1);
  assert.equal(status(with_(1, "U".repeat(54))), 1);
  assert.equal(status(with_(2, "0,0,0,0,0")), 1);
  assert.equal(status(with_(2, "0,0,0,0,0,4")), 1);
  assert.equal(status(with_(3, f[3].split(" ").slice(1).join(" "))), 1);
  assert.equal(status(with_(3, "99 " + f[3].split(" ").slice(1).join(" "))), 1);
  assert.equal(status(with_(4, "2")), 1);
  assert.equal(status(with_(5, "x")), 1);
  // twist parity: one center turned a quarter breaks the parity rule
  const t = c.twists.slice(); t[0] = (t[0] + 1) % 4;
  assert.equal(status(with_(2, t.join(","))), 1);
  // not a legal cube: one edge flipped
  const letters = [...c.facelets]; assert.notEqual(letters[5], letters[10]); [letters[5], letters[10]] = [letters[10], letters[5]];
  assert.equal(status(with_(1, letters.join(""))), 1);
});

test("the object API gives the same answer as the text API and is deterministic", () => {
  const c = cases.find((x) => x.id === "fx-de-a-3");
  const a = Front.solveFront3x3({ facelets: c.facelets, centerTwists: c.twists, accepted: c.accepted, centerUp: c.centerUp });
  const b = Front.solveFront3x3({ facelets: c.facelets, centerTwists: c.twists, accepted: c.accepted, centerUp: c.centerUp });
  const o = oracle.get(c.id);
  assert.equal(a.status, "ok");
  assert.equal(a.moves.join(" "), o.moves);
  assert.equal(a.nodes, o.nodes);
  assert.deepEqual({ ...a, tablesMs: 0 }, { ...b, tablesMs: 0 });
  assert.equal(Front.solveFront3x3({ facelets: "x" }).status, "invalid");
});

test("reading all nine tables for every child (as Rust) gives the same nodes as the early exit", () => {
  const some = routeCases.filter((c, i) => i % 9 === 0);
  try {
    Front.unstable_setLazyBound(false);
    for (const c of some) {
      const [, text] = Front.solveFrontText(line(c));
      assert.equal(Number(text.split("\t")[3]), oracle.get(c.id).nodes, c.id);
    }
  } finally {
    Front.unstable_setLazyBound(true);
  }
});

test("the search loop allocates nothing: no array, object, closure or call to a constructor in dfs and its bound functions", () => {
  const src = fs.readFileSync(path.join(pkgDir, "res/FrontSearch.res.mjs"), "utf8");
  for (const name of ["dfs", "childValue", "childValueLazy", "stepGroup", "allowed"]) {
    const m = new RegExp(`function ${name}\\([^)]*\\) \\{([\\s\\S]*?)\\n\\}\\n`).exec(src);
    assert.ok(m, `function ${name} not found`);
    assert.doesNotMatch(m[1], /\bnew\b|=>|\[\s*[^\]\s][^\]]*,|\{\s*[a-zA-Z]+:/, name);
  }
});

const heavy = cases.find((x) => x.id === "e-centre-twist2"); // 265,174 nodes
const asRequest = (c, more = {}) => ({ facelets: c.facelets, centerTwists: c.twists, accepted: c.accepted, centerUp: c.centerUp, ...more });

test("progress: the table build reports thousandths, strictly rising, ending at 1000; the search reports every 65,536 nodes", () => {
  const events = [];
  const r = Front.solveFront3x3(asRequest(heavy, { searchMs: 60000, maxNodes: 1e11, onProgress: (e) => { events.push(e); } }));
  assert.equal(r.status, "ok");
  assert.equal(r.nodes, oracle.get(heavy.id).nodes);
  const tables = events.filter((e) => e.stage === "tables").map((e) => e.permille);
  assert.ok(tables.length >= 9, `${tables.length} table reports`);
  for (let i = 1; i < tables.length; i++) assert.ok(tables[i] > tables[i - 1]);
  assert.equal(tables.at(-1), 1000);
  const search = events.filter((e) => e.stage === "search");
  assert.deepEqual(search.map((e) => e.nodes), [65536, 131072, 196608, 262144]);
  assert.ok(search.every((e) => Number.isInteger(e.depth) && e.depth > 0));
});

test("progress: a start that already meets the goal reports nothing", () => {
  const solvedCube = [...Model.FACE].map((ch) => ch.repeat(9)).join("");
  const events = [];
  const r = Front.solveFront3x3({ facelets: solvedCube, centerTwists: [0, 0, 0, 0, 0, 0], accepted: [...Array(9).keys()].map((i) => [18 + i]), onProgress: (e) => { events.push(e); } });
  assert.equal(r.status, "ok");
  assert.deepEqual(events, []);
});

test("cancel: an observer that returns false stops the table build or the search", () => {
  const a = Front.solveFront3x3(asRequest(cases[0], { onProgress: () => false }));
  assert.equal(a.status, "cancelled");
  assert.equal(a.stage, "tables");
  assert.ok(a.permille >= 0 && a.permille < 1000);
  const b = Front.solveFront3x3(asRequest(heavy, { searchMs: 60000, maxNodes: 1e11, onProgress: (e) => e.stage !== "search" }));
  assert.deepEqual({ status: b.status, stage: b.stage, nodes: b.nodes }, { status: "cancelled", stage: "search", nodes: 65536 });
  const [st, text] = Front.solveFrontText(line(heavy), { onProgress: (e) => e.stage !== "search" });
  assert.equal(st, 5);
  assert.equal(text, "1\tnodes=65536");
  const [st4, text4] = Front.solveFrontText(line(cases[0]), { onProgress: () => false });
  assert.equal(st4, 4);
  assert.match(text4, /^1\tpermille=\d+$/);
});

test("cancel: a flag set before the call, or from the progress callback, stops at the next check", () => {
  const flag = new Int32Array(new SharedArrayBuffer(4));
  flag[0] = 1;
  const a = Front.solveFront3x3(asRequest(cases[0], { cancel: flag }));
  assert.deepEqual({ status: a.status, stage: a.stage }, { status: "cancelled", stage: "tables" });
  flag[0] = 0;
  const b = Front.solveFront3x3(asRequest(heavy, { searchMs: 60000, maxNodes: 1e11, cancel: flag, onProgress: (e) => { if (e.stage === "search") Atomics.store(flag, 0, 1); } }));
  assert.deepEqual({ status: b.status, stage: b.stage, nodes: b.nodes }, { status: "cancelled", stage: "search", nodes: 131072 });
});

test("nodes are counted beyond 2^31 without wrapping (a float counter, exact to 2^53); the cap is not clamped", () => {
  const c = cases.find((x) => x.id === "fx-de-a-3");
  const r = Front.solveFront3x3(asRequest(c, { maxNodes: 2 ** 40, searchMs: 60000 }));
  assert.equal(r.status, "ok");
  assert.equal(r.nodes, oracle.get(c.id).nodes);
  const src = fs.readFileSync(path.join(pkgDir, "res/FrontSearch.res.mjs"), "utf8");
  assert.match(src, /nodes = s\.nodes \+ 1(\.0)?[;\n]/);
  assert.doesNotMatch(src, /s\.nodes \+ 1 \| 0/);
});

test("the package carries license, notice and provenance files, and npm packs them", () => {
  const dir = path.join(here, "../packages/solver-3x3-front");
  for (const f of ["LICENSE", "COPYING", "NOTICE", "provenance.json", "README.md"]) assert.ok(fs.existsSync(path.join(dir, f)), f);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  assert.equal(meta.license, "AGPL-3.0-or-later");
  for (const f of ["LICENSE", "COPYING", "NOTICE", "provenance.json"]) assert.ok(meta.files.includes(f), `files lacks ${f}`);
  const notice = fs.readFileSync(path.join(dir, "NOTICE"), "utf8");
  assert.match(notice, /Copyright \(c\) 2024 Chen Shuang/);
  assert.match(notice, /Permission is hereby granted, free of charge/);
  const packed = JSON.parse(execFileSync("npm", ["pack", "--workspace", "@puzlwerk/solver-3x3-front", "--dry-run", "--json"], { cwd: path.join(here, ".."), encoding: "utf8" }))[0];
  for (const f of ["LICENSE", "COPYING", "NOTICE", "provenance.json", "README.md"]) assert.ok(packed.files.some((x) => x.path === f), `pack lacks ${f}`);
});

test("provenance.json pins the Cubacle revision and lists the ported Rust sources with their hashes", () => {
  const p = JSON.parse(fs.readFileSync(path.join(here, "../packages/solver-3x3-front/provenance.json"), "utf8"));
  assert.equal(p.revision, "8b4aafea3fd2719af84d1e3548009eff5e7733b5");
  assert.equal(p.baseRevision, "0216da533c39bd64cfe96a2f10210ec04be668b1");
  assert.equal(p.license, "AGPL-3.0-or-later");
  assert.ok(p.files.length >= 9);
  for (const f of p.files) assert.match(f.sha256, /^[0-9a-f]{64}$/, f.source);
});
