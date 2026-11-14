// Test-only reference for the caller replay of the predicate `front-image-classes` (solver-stream.md section 2.3): the
// predicate expands to existing goal nodes, All(cells), cell = Any(StickerAt(id, slot, +Z, up, C1)), evaluated with the 24
// rotations as frames. This is not the registry evaluator of T013a; it checks that the nodes of PwGoal express the semantics.
import * as Shell from "../../core/res/PwShell.res.mjs";
import * as Id from "../../core/res/PwId.res.mjs";
import * as Orientation from "../../core/res/PwOrientation.res.mjs";

const ok = (r) => { if (r.TAG !== "Ok") throw new Error(`expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const UPS = [{ x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }];
const FRONT = { x: 0, y: 0, z: 1 };

// Slot i, row-major as seen from the front with +Y up: column 0 is x=-2, row 0 is y=+2 (N=3, z=+2).
export const frontSlot = (i) => ok(Shell.makeSlot(ok(Shell.makeSize(3)), { x: -2 + 2 * (i % 3), y: 2 - 2 * Math.floor(i / 3), z: 2 }));
export const frames = () => Orientation.all();

// Options: ups (the target ups tried for a cell without an up rule; default all four quarter turns about +Z).
export function expand(params, { ups = UPS } = {}) {
  const cells = params.cells.map((cell, i) => {
    const targetUps = i === 4 && params.centerUp ? [UPS[0]] : ups;
    return { TAG: "Any", _0: cell.flatMap((sid) => targetUps.map((up) => ({ TAG: "StickerAt", _0: ok(Id.make(sid)), _1: frontSlot(i), _2: FRONT, _3: up, _4: "C1" }))) };
  });
  return { TAG: "All", _0: cells };
}
export const countNodes = (n) => 1 + (n.TAG === "All" || n.TAG === "Any" ? n._0.reduce((s, c) => s + countNodes(c), 0) : 0);
