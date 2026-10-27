import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import * as Table from "../packages/solver-2x2/res/upstream/Optimal2x2Table.res.mjs";
const root = new URL("../packages/solver-2x2/", import.meta.url);
test("pinned upstream source and lookup asset provenance", async () => {
  const manifest = JSON.parse(await readFile(new URL("provenance.json", root), "utf8"));
  for (const file of manifest.files) {
    const bytes = await readFile(new URL(file.path, root));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      file.importedSha256 ?? file.sha256,
      file.path,
    );
  }
});
test("existing table decoder accepts pinned data and rejects damage", async () => {
  const bytes = await readFile(new URL("assets/optimal-2x2.v2.bin", root));
  const copy = () => Uint8Array.from(bytes).buffer;
  assert.equal(bytes.length, Table.optimal2x2TableBytes());
  assert.equal(
    Table.packedDistance(Table.decodeOptimal2x2Tables(copy()).distance, 0),
    0,
  );
  for (const index of [0, 8, 12, 16, 100]) {
    const damaged = copy();
    new Uint8Array(damaged)[index] ^= 1;
    assert.throws(() => Table.decodeOptimal2x2Tables(damaged));
  }
  assert.throws(() => Table.decodeOptimal2x2Tables(copy().slice(1)));
});
