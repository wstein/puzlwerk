import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as Codec from "../core/res/PwCodec.res.mjs";
import * as Goal from "../core/res/PwGoal.res.mjs";
import * as Id from "../core/res/PwId.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";
import { countNodes, expand, frames, frontSlot } from "./helpers/front-image-classes-replay.mjs";

// Caller replay of `front-image-classes` (solver-stream.md section 2.3): All(cells), cell = Any(StickerAt(..., C1)), the 24 rotations
// as frames, with the existing PwGoal nodes. Expected values are hand-derived from the contract text, not from the evaluator.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const vectors = JSON.parse(readFileSync(new URL("./fixtures/solver-stream/vectors.json", import.meta.url), "utf8"));
const registry = vectors.registry["front-image-classes"];
const def = ok(Codec.decodeDefinition(readFileSync(new URL(`./fixtures/wire/${registry.definition}`, import.meta.url), "utf8")));
const rawDefinition = JSON.parse(readFileSync(new URL(`./fixtures/wire/${registry.definition}`, import.meta.url), "utf8"));
const home = Codec.homeState(def);
const params = (name) => registry.valid.find((r) => r.name === name).goal.params;
const holds = (state, p, { frameSet = frames(), ...opt } = {}) => Goal.evaluate(def, state, ok(Goal.makeGoal(def, [], frameSet, expand(p, opt))));
const withPoses = (state, f) => ok(Codec.stateOfPoses(def, Codec.poses(state).map(f)));
const rotated = (state, o) => withPoses(state, (p) => {
  const w = Orientation.apply(o, Shell.toVec(Pose.position(p)));
  return Pose.make(Pose.pieceId(p), ok(Shell.makeSlot(ok(Shell.makeSize(3)), w)), Orientation.compose(o, Pose.orientation(p)));
});
const homeFront = params("home-front-center-up");

test("expansion size: 1 + 9 cells + 4 ups per listed non-centre ID + 1 or 4 per centre ID", () => {
  assert.equal(countNodes(expand(homeFront)), 1 + 9 + 8 * 4 + 1);
  assert.equal(countNodes(expand(params("several-ids-per-cell-center-free"))), 1 + 9 + 12 * 4 + 2 * 4);
});

test("the home front holds under all 24 rotations of the whole cube, and under the identity frame only without a rotation", () => {
  const all = Orientation.all();
  assert.equal(all.length, 24);
  assert.equal(all.filter((o) => holds(rotated(home, o), homeFront)).length, 24);
  assert.equal(all.filter((o) => holds(rotated(home, o), homeFront, { frameSet: [Orientation.identity] })).length, 1);
});

test("a front cell that accepts another sticker does not hold (UF.F at the top-left slot)", () => {
  const cells = homeFront.cells.map((c, i) => (i === 0 ? ["UF.F"] : c));
  assert.equal(holds(home, { cells, centerUp: true }), false);
  assert.equal(holds(home, { cells: homeFront.cells.map((c, i) => (i === 0 ? ["UF.F", "UFL.F"] : c)), centerUp: true }), true);
});

// The up rule applies to the centre only: the F centre turned by a quarter turn in place (position and normal unchanged).
test("centerUp rejects a twisted centre; without centerUp the same state holds", () => {
  const RZ = ok(Orientation.make([0, -1, 0, 1, 0, 0, 0, 0, 1]));
  const twisted = withPoses(home, (p) => (Id.toString(Pose.pieceId(p)) === "F" ? Pose.make(Pose.pieceId(p), Pose.position(p), RZ) : p));
  assert.equal(holds(twisted, { ...homeFront, centerUp: true }), false);
  assert.equal(holds(twisted, { ...homeFront, centerUp: false }), true);
});

// The stickers of a state with world normal +Z at front slot i (read from the definition and the poses, not from PwGoal).
function shownAt(state, i) {
  const target = Shell.toVec(frontSlot(i));
  const ids = [];
  for (const p of Codec.poses(state)) {
    const w = Shell.toVec(Pose.position(p));
    if (w.x !== target.x || w.y !== target.y || w.z !== target.z) continue;
    for (const st of rawDefinition.pieces.find((q) => q.id === Id.toString(Pose.pieceId(p))).stickers) {
      const n = Orientation.apply(Pose.orientation(p), { x: st.normal[0], y: st.normal[1], z: st.normal[2] });
      if (n.x === 0 && n.y === 0 && n.z === 1) ids.push(st.id);
    }
  }
  return ids;
}

// After a front quarter turn the edge and corner stickers on the front show other ups. Their up is fixed by piece, slot and normal, so
// the replay lists all four quarter turns about +Z; a single up (+Y) is a mutation that fails here. Layer index 2 is z=+2 (N=3).
test("a non-centre sticker with another up still holds: four ups are needed", () => {
  const made = ok(Move.make(ok(Shell.makeSize(3)), "Z", [2], -1));
  const turned = withPoses(home, (p) => Move.applyToPose(made, p));
  const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => shownAt(turned, i));
  assert.ok(cells.every((c) => c.length === 1));
  assert.notDeepEqual(cells, homeFront.cells);
  const identity = { frameSet: [Orientation.identity] };
  assert.equal(holds(turned, { cells, centerUp: false }, identity), true);
  assert.equal(holds(turned, { cells, centerUp: false }, { ...identity, ups: [{ x: 0, y: 1, z: 0 }] }), false);
});

// `final.rotation` (section 3.3) is the rotation R that, applied to the whole final state, shows the goal in the fixed frame.
test("final.rotation: the inverse of the cube's rotation puts the goal on the front in the identity frame", () => {
  const identity = { frameSet: [Orientation.identity] };
  for (const o of Orientation.all()) {
    const state = rotated(home, o);
    assert.equal(holds(rotated(state, Orientation.transpose(o)), homeFront, identity), true);
    // Applying o again (instead of its inverse) gives the front of the cube turned by o twice: not the home front unless o*o is the identity.
    if (!Orientation.equal(Orientation.compose(o, o), Orientation.identity)) assert.equal(holds(rotated(state, o), homeFront, identity), false, `rotation ${o} is not its own inverse`);
  }
});
