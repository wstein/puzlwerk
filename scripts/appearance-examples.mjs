#!/usr/bin/env node
// Generate and check the `puzlwerk.appearance` revision 1 vectors (specs/001-core-foundation/contracts/appearance-v1.md).
//
//   node scripts/appearance-examples.mjs generate   write test/fixtures/appearance/*
//   node scripts/appearance-examples.mjs check      regenerate in memory and compare with the committed files
//
// The documents are derived from the wire-v1 definitions in test/fixtures/wire. All of them are synthetic:
// they show the shape of the data and carry no artwork. Nothing is edited by hand.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { canonical, tileIds } from "../test/helpers/appearance-reference.mjs";

const root = new URL("../test/fixtures/", import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const defs = { "definition-2.json": read("wire/definition-2.json"), "definition-3.json": read("wire/definition-3.json") };
const stickers = (def) => def.pieces.flatMap((p) => p.stickers.map((s) => ({ piece: p.id, ...s }))).sort((a, b) => (a.id < b.id ? -1 : 1));
const doc = (def, id, extra, entries) => ({ schema: "puzlwerk.appearance", revision: 1, id, definitionId: def.id, ...extra, stickers: entries });

// Cubistry Calendar7 scheme "Rubik-Tint": the tint of a sticker is the Rubik color of its home face
// (cubistry src/apps/calendar7/home-tint.ts, HOME_ORIENTATION at cubistry f77b58f17e7ba7522f7ceb77b99017aba9f79327).
const HOME = { "0,0,1": "white", "0,0,-1": "yellow", "1,0,0": "red", "-1,0,0": "orange", "0,1,0": "blue", "0,-1,0": "green" };

function build() {
  const d2 = defs["definition-2.json"], d3 = defs["definition-3.json"];
  const t2 = tileIds(d2), t3 = tileIds(d3);
  // Picture Cube: image = tile ID, symmetry per tile. Synthetic assignment: one C2 and one C4 tile to exercise the field.
  const picture = (def, tiles, sym) => stickers(def).map((s) => {
    const e = { id: s.id, image: tiles.get(s.id) };
    if (sym[e.image]) e.symmetry = sym[e.image];
    return e;
  });
  const out = {
    "picture-2.json": doc(d2, "picture-2-example", { imageIds: "tile-v1" }, picture(d2, t2, { F_0_0: "C2", U_1_1: "C4" })),
    "picture-3.json": doc(d3, "picture-3-example", { imageIds: "tile-v1" }, picture(d3, t3, { F_1_1: "C2", U_1_1: "C4" })),
    "image-256.json": doc(d2, "image-256-example", {}, [{ id: "DBL.B", image: "a".repeat(256) }]),
    "tint-3.json": doc(d3, "tint-3-example", {}, stickers(d3).map((s) => ({ id: s.id, color: `tint-${HOME[s.normal.join()]}` }))),
    // Cubacle `image` is an opaque string per fixed-frame sticker; the shape `<body>:<axis>` is the one of its tests.
    "cubacle-2.json": doc(d2, "cubacle-2-example", {}, stickers(d2).map((s) => ({
      id: s.id,
      image: `${d2.pieces.findIndex((p) => p.id === s.piece)}:${s.normal.findIndex((v) => v !== 0)}`,
    }))),
  };
  const one = (extra) => doc(d2, "bad", {}, [{ id: "DBL.B", color: "red", ...extra }]);
  const bad = (name, document, code, path, definition = "definition-2.json") => ({ name, definition, document, code, path });
  const tile = (e) => doc(d2, "bad", { imageIds: "tile-v1" }, [e]);
  const mut = (f) => { const x = one({}); f(x); return x; };
  out["invalid.json"] = [
    bad("unknown top-level field", mut((x) => { x.extra = 1; }), "UnknownField", "$.extra"),
    bad("wrong schema name", mut((x) => { x.schema = "puzlwerk.state"; }), "BadSchema", "$.schema"),
    bad("revision 2", mut((x) => { x.revision = 2; }), "BadRevision", "$.revision"),
    bad("missing definitionId", mut((x) => { delete x.definitionId; }), "MissingField", "$.definitionId"),
    bad("other definition", mut((x) => { x.definitionId = "cube3"; }), "DefinitionMismatch", "$.definitionId"),
    bad("unknown sticker ID", doc(d2, "bad", {}, [{ id: "DBL.X", color: "red" }]), "StickerMismatch", "$.stickers[0].id"),
    bad("duplicate sticker entry", doc(d2, "bad", {}, [{ id: "DBL.B", color: "red" }, { id: "DBL.B", color: "blue" }]), "DuplicateId", "$.stickers[1].id"),
    bad("entry without attribute", doc(d2, "bad", {}, [{ id: "DBL.B" }]), "BadValue", "$.stickers[0]"),
    bad("entry unknown field", one({ extra: 1 }), "UnknownField", "$.stickers[0].extra"),
    bad("entry without id", doc(d2, "bad", {}, [{ color: "red" }]), "MissingField", "$.stickers[0].id"),
    bad("document id with a space", mut((x) => { x.id = "a b"; }), "BadId", "$.id"),
    bad("stickers not an array", mut((x) => { x.stickers = {}; }), "WrongType", "$.stickers"),
    bad("revision as string", mut((x) => { x.revision = "1"; }), "WrongType", "$.revision"),
    bad("symmetry C3", one({ symmetry: "C3" }), "BadSymmetry", "$.stickers[0].symmetry"),
    bad("symmetry as quarter turns", one({ symmetry: [0, 2] }), "BadSymmetry", "$.stickers[0].symmetry"),
    bad("color with a space", one({ color: "light red" }), "BadId", "$.stickers[0].color"),
    bad("image over 256 characters", one({ image: "a".repeat(257) }), "BadId", "$.stickers[0].image"),
    bad("unknown imageIds profile", mut((x) => { x.imageIds = "tile-v2"; }), "BadValue", "$.imageIds"),
    bad("tile-v1 with another tile", tile({ id: "DBL.B", image: "B_0_0" }), "BadTile", "$.stickers[0].image"),
    bad("tile-v1 without image", tile({ id: "DBL.B", color: "red" }), "BadTile", "$.stickers[0].image"),
  ];
  return out;
}

const bytes = (v) => Buffer.from(canonical(v), "utf8");
const files = Object.fromEntries(Object.entries(build()).map(([n, v]) => [n, bytes(v)]));
const index = Object.fromEntries(Object.entries(files).sort().map(([n, b]) => [n, { bytes: b.length, sha256: "sha256:" + createHash("sha256").update(b).digest("hex") }]));
files["index.json"] = bytes(index);

const mode = process.argv[2];
if (mode === "generate") {
  for (const [n, b] of Object.entries(files)) writeFileSync(new URL(`appearance/${n}`, root), b);
} else if (mode === "check") {
  const bad = Object.entries(files).filter(([n, b]) => !existsSync(new URL(`appearance/${n}`, root)) || !readFileSync(new URL(`appearance/${n}`, root)).equals(b));
  if (bad.length) { console.error(`differs: ${bad.map(([n]) => n).join(", ")}`); process.exit(1); }
  console.log(`ok: ${Object.keys(files).length} files`);
} else { console.error("usage: appearance-examples.mjs generate|check"); process.exit(2); }
