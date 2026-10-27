import { mkdtempSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "puzwerk-consumer-"));
const packed = JSON.parse(
  execFileSync(
    "npm",
    ["pack", "--workspace", "@puzwerk/solver-2x2", "--pack-destination", dir, "--json"],
    { cwd: root, encoding: "utf8" },
  ),
)[0];
const generated = packed.files.filter((file) => file.path.endsWith(".res.mjs"));
if (generated.length !== 10)
  throw new Error("Packed consumer must include all ten compiled ReScript modules");
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      "@puzwerk/solver-2x2": `file:${join(dir, packed.filename)}`,
    },
  }),
);
// Root npm ci already cached the only runtime dependency; do not fetch new code.
execFileSync(
  "npm",
  ["install", "--offline", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
  { cwd: dir, stdio: "pipe" },
);
cpSync(
  join(root, "test/helpers/physical-replay.mjs"),
  join(dir, "physical-replay.mjs"),
);
cpSync(join(root, "test/fixtures/cubistry-42-43.json"), join(dir, "fixture.json"));
writeFileSync(
  join(dir, "consumer.mjs"),
  `
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {create2x2Solver,TABLE_URL} from '@puzwerk/solver-2x2';
import {initial,replay,poses,stickers} from './physical-replay.mjs';
const f=JSON.parse(await readFile(new URL('./fixture.json',import.meta.url),'utf8'));
const start=initial(f.print),[a,b]=f.witnesses.map(w=>replay(start,w.word));
const solver=await create2x2Solver(await readFile(TABLE_URL),f.print);
const result=solver.solve2x2(a,b,{mode:'exactPhysical'});
const actual=replay(a,result.moves);
assert.equal(result.moveCount,10);
assert.deepEqual(poses(actual),poses(b));
assert.deepEqual(stickers(f.print,actual),stickers(f.print,b));
console.log('Packed standalone consumer: exact 42→43 replay verified, 10 HTM');
`,
);
execFileSync(process.execPath, [join(dir, "consumer.mjs")], {
  cwd: dir,
  stdio: "inherit",
});
console.log(
  `Isolated consumer used ${generated.length} compiled modules; no compiler or application dependency installed`,
);
