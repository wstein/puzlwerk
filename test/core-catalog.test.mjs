import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";

// Read access to the piece catalog of a decoded definition (needed by the goal predicates of M2).
const ok = (r) => { assert.equal(r.TAG, "Ok"); return r._0; };
const text = (n) => readFileSync(new URL(`./fixtures/wire/definition-${n}.json`, import.meta.url), "utf8");

test("the catalog lists every piece sorted by ID with its home slot and stickers", () => {
  for (const [n, count] of [[2, 8], [3, 26]]) {
    const def = ok(Codec.decodeDefinition(text(n)));
    const raw = JSON.parse(text(n)).pieces;
    const pieces = Codec.pieces(def);
    assert.equal(pieces.length, count);
    assert.deepEqual(pieces.map((p) => Id.toString(p.id)), raw.map((p) => p.id));
    pieces.forEach((p, i) => {
      assert.deepEqual(Object.values(Shell.toVec(p.home)), raw[i].home);
      assert.deepEqual(p.stickers.map((s) => [Id.toString(s.id), Object.values(s.normal), Object.values(s.up), s.color === undefined ? null : Id.toString(s.color)]),
        raw[i].stickers.map((s) => [s.id, s.normal, s.up, s.color ?? null]));
    });
  }
});

test("the catalog is a copy", () => {
  const def = ok(Codec.decodeDefinition(text(2)));
  Codec.pieces(def).length = 0;
  assert.equal(Codec.pieces(def).length, 8);
});
