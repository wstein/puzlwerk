import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
const dir = mkdtempSync(join(tmpdir(), "puzlwerk-picture-consumer-"));
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        "--workspace",
        "@puzlwerk/solver-3x3-picture",
        "--pack-destination",
        dir,
        "--json",
      ],
      { encoding: "utf8" },
    ),
  )[0];
  if (packed.files.filter((f) => f.path.endsWith(".res.mjs")).length !== 12)
    throw Error("Expected twelve compiled upstream modules");
  const meta = JSON.parse(
    readFileSync("packages/solver-3x3-picture/package.json"),
  );
  const runtime = JSON.parse(readFileSync("package-lock.json")).packages[
    "node_modules/@rescript/runtime"
  ];
  const dependency = `file:${join(dir, packed.filename)}`;
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "picture-isolated-consumer",
      version: "0.0.0",
      private: true,
      type: "module",
      dependencies: { [packed.name]: dependency },
    }),
  );
  writeFileSync(
    join(dir, "package-lock.json"),
    JSON.stringify({
      name: "picture-isolated-consumer",
      version: "0.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: {
        "": {
          name: "picture-isolated-consumer",
          version: "0.0.0",
          dependencies: { [packed.name]: dependency },
        },
        [`node_modules/${packed.name}`]: {
          version: packed.version,
          resolved: dependency,
          integrity: packed.integrity,
          license: meta.license,
          dependencies: meta.dependencies,
        },
        "node_modules/@rescript/runtime": runtime,
      },
    }),
  );
  execFileSync(
    "npm",
    [
      "ci",
      "--offline",
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: dir, stdio: "pipe" },
  );
  writeFileSync(
    join(dir, "consumer.mjs"),
    `import assert from 'node:assert/strict'; import{solvePicture3x3}from'@puzlwerk/solver-3x3-picture';const facelets='U'.repeat(9)+'R'.repeat(9)+'F'.repeat(9)+'D'.repeat(9)+'L'.repeat(9)+'B'.repeat(9);const answer=solvePicture3x3({facelets,centerOrientations:[0,0,0,0,0,0],maximumDepth:0});assert.equal(answer.status,'solved');assert.equal(answer.htm,0);assert.equal(solvePicture3x3({facelets,centerOrientations:[1,0,0,0,0,0]}).status,'invalid');console.log('Isolated picture package PASS');`,
  );
  execFileSync(process.execPath, ["consumer.mjs"], {
    cwd: dir,
    stdio: "inherit",
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}
