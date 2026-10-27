import { mkdtempSync, readFileSync, writeFileSync, cpSync } from "node:fs";
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
const consumer = {
  name: "puzwerk-isolated-consumer",
  version: "0.0.0",
  private: true,
  type: "module",
  dependencies: { "@puzwerk/solver-2x2": `file:${join(dir, packed.filename)}` },
};
const packageMeta = JSON.parse(
  readFileSync(join(root, "packages/solver-2x2/package.json"), "utf8"),
);
const rootLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const runtime = rootLock.packages["node_modules/@rescript/runtime"];
if (
  Object.keys(packageMeta.dependencies).length !== 1 ||
  runtime.version !== packageMeta.dependencies["@rescript/runtime"]
) {
  throw new Error("Update isolated consumer lock for runtime dependency changes");
}
writeFileSync(join(dir, "package.json"), JSON.stringify(consumer));
// npm ci caches locked tarballs, not necessarily registry metadata. Give this
// isolated consumer a real lock with the same runtime URL and integrity so it
// neither needs cached package metadata nor resolves a different dependency.
writeFileSync(
  join(dir, "package-lock.json"),
  JSON.stringify({
    name: consumer.name,
    version: consumer.version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: consumer.name,
        version: consumer.version,
        dependencies: consumer.dependencies,
      },
      "node_modules/@puzwerk/solver-2x2": {
        version: packed.version,
        resolved: consumer.dependencies["@puzwerk/solver-2x2"],
        integrity: packed.integrity,
        license: packageMeta.license,
        dependencies: packageMeta.dependencies,
      },
      "node_modules/@rescript/runtime": runtime,
    },
  }),
);
execFileSync(
  "npm",
  ["ci", "--offline", "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"],
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
