// Reference reader for `puzlwerk.appearance` revision 1 (specs/001-core-foundation/contracts/appearance-v1.md).
// It exists so that the vectors in test/fixtures/appearance have an executable reading until the ReScript
// decoder exists. It checks structure against a parsed wire-v1 definition; it does not read bytes.
import { createHash } from "node:crypto";

const ID = /^[A-Za-z0-9._:-]+$/;
const SYMMETRY = ["C1", "C2", "C4"];
const FIELDS = ["schema", "revision", "id", "definitionId", "imageIds", "stickers"];
const ENTRY_FIELDS = ["id", "color", "image", "symmetry"];
const FACE = { "0,1,0": "U", "0,-1,0": "D", "0,0,1": "F", "0,0,-1": "B", "1,0,0": "R", "-1,0,0": "L" };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Tile ID of a definition sticker: `<face>_<row>_<col>`, row 0 at the top and col 0 at the left of the face as seen from outside. */
export function tileId(size, home, normal, up) {
  const face = FACE[normal.join()];
  const right = cross(up, normal);
  const col = (dot(home, right) + size - 1) / 2;
  const row = (size - 1 - dot(home, up)) / 2;
  return `${face}_${row}_${col}`;
}

/** Map sticker ID to its home tile ID for every sticker of a wire-v1 definition. */
export function tileIds(definition) {
  const out = new Map();
  for (const p of definition.pieces)
    for (const s of p.stickers) out.set(s.id, tileId(definition.size, p.home, s.normal, s.up));
  return out;
}

export const canonical = (v) =>
  Array.isArray(v) ? `[${v.map(canonical).join(",")}]`
  : v !== null && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`
  : JSON.stringify(v);
export const hash = (doc) => "sha256:" + createHash("sha256").update(canonical(doc), "utf8").digest("hex");

const fail = (code, path) => ({ ok: false, code, path });

/** Returns `{ ok: true }` or `{ ok: false, code, path }` for the first error, in the order of the contract. */
export function checkAppearance(definition, doc) {
  const obj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
  if (!obj(doc)) return fail("WrongType", "$");
  for (const k of Object.keys(doc)) if (!FIELDS.includes(k)) return fail("UnknownField", `$.${k}`);
  for (const k of ["schema", "revision", "id", "definitionId", "stickers"]) if (!(k in doc)) return fail("MissingField", `$.${k}`);
  if (doc.schema !== "puzlwerk.appearance") return fail("BadSchema", "$.schema");
  if (!Number.isInteger(doc.revision)) return fail("WrongType", "$.revision");
  if (doc.revision !== 1) return fail("BadRevision", "$.revision");
  for (const k of ["id", "definitionId"]) {
    if (typeof doc[k] !== "string") return fail("WrongType", `$.${k}`);
    if (!ID.test(doc[k])) return fail("BadId", `$.${k}`);
  }
  if (doc.definitionId !== definition.id) return fail("DefinitionMismatch", "$.definitionId");
  if ("imageIds" in doc && doc.imageIds !== "tile-v1") return fail("BadValue", "$.imageIds");
  if (!Array.isArray(doc.stickers)) return fail("WrongType", "$.stickers");
  const tiles = tileIds(definition);
  const seen = new Set();
  for (const [i, e] of doc.stickers.entries()) {
    const at = (k) => `$.stickers[${i}]${k ? "." + k : ""}`;
    if (!obj(e)) return fail("WrongType", at());
    for (const k of Object.keys(e)) if (!ENTRY_FIELDS.includes(k)) return fail("UnknownField", at(k));
    if (!("id" in e)) return fail("MissingField", at("id"));
    for (const k of ["id", "color", "image"]) {
      if (!(k in e)) continue;
      if (typeof e[k] !== "string") return fail("WrongType", at(k));
      if (!ID.test(e[k])) return fail("BadId", at(k));
    }
    if ("image" in e && e.image.length > 256) return fail("BadId", at("image"));
    if ("symmetry" in e && !SYMMETRY.includes(e.symmetry)) return fail("BadSymmetry", at("symmetry"));
    if (!("color" in e || "image" in e || "symmetry" in e)) return fail("BadValue", at());
    if (seen.has(e.id)) return fail("DuplicateId", at("id"));
    seen.add(e.id);
    if (!tiles.has(e.id)) return fail("StickerMismatch", at("id"));
    if (doc.imageIds === "tile-v1" && e.image !== tiles.get(e.id)) return fail("BadTile", at("image"));
  }
  return { ok: true };
}
