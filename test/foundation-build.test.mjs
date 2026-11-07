import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// T004: the approved build foundation (Q6, 2026-11-07): ReScript 12.3.1, ES modules,
// Node 24 LTS, npm lockfile, one deterministic check command, a core source directory.
const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const pkg = read("package.json");
const config = read("rescript.json");
const lock = read("package-lock.json");

test("ReScript is pinned to 12.3.1 in package.json and the lockfile", () => {
  assert.equal(pkg.devDependencies.rescript, "12.3.1");
  assert.equal(lock.packages["node_modules/rescript"].version, "12.3.1");
});

test("runtime is Node 24 or newer and the package is ESM", () => {
  assert.equal(pkg.engines.node, ">=24");
  assert.equal(pkg.type, "module");
  assert.ok(Number(process.versions.node.split(".")[0]) >= 24, `running on Node ${process.versions.node}`);
});

test("rescript.json emits in-source ES modules with the .res.mjs suffix", () => {
  assert.deepEqual(config["package-specs"], { module: "esmodule", "in-source": true });
  assert.equal(config.suffix, ".res.mjs");
});

test("the core source directory is compiled and exists", () => {
  const core = config.sources.find((s) => s.dir === "core/res");
  assert.ok(core, "rescript.json lists core/res");
  assert.equal(core.subdirs, true);
  assert.ok(existsSync(new URL("../core/res/", import.meta.url)));
});

test("the deterministic check command formats, typechecks, builds and tests", () => {
  assert.equal(pkg.scripts.check, "npm run format:check && npm run typecheck && npm test");
  assert.match(pkg.scripts.test, /^npm run build && node --test test\/\*\.test\.mjs$/);
  assert.match(pkg.scripts.build, /^rescript build/);
});
