import { test } from "node:test";
import assert from "node:assert/strict";
import * as Id from "../core/res/PwId.res.mjs";
import * as Shell from "../core/res/PwShell.res.mjs";
import * as Orientation from "../core/res/PwOrientation.res.mjs";
import * as Pose from "../core/res/PwPose.res.mjs";
import * as Move from "../core/res/PwMove.res.mjs";
import * as Notation from "../core/res/PwNotation.res.mjs";

// Bounded notation: outer/wide turns, 3x3 M/E/S and 2x2/3x3 x/y/z.
// Lowercase wide aliases remain unsupported; unknown input fails. Expected ASTs are derived by hand from the data model: R = X,[N-1],-1;
// L = X,[0],+1; U = Y,[N-1],-1; D = Y,[0],+1; F = Z,[N-1],-1; B = Z,[0],+1.
const ok = (r) => { assert.equal(r.TAG, "Ok", `expected Ok, got ${JSON.stringify(r)}`); return r._0; };
const err = (r) => { assert.equal(r.TAG, "Error", `expected Error, got ${JSON.stringify(r)}`); return r._0; };
const size = (n) => ok(Shell.makeSize(n));
const parse = (n, text) => Notation.parse(size(n), text);
const ast = (m) => [Move.axis(m), Move.layers(m), Move.turns(m)];
const one = (n, text) => { const ms = ok(parse(n, text)); assert.equal(ms.length, 1, text); return ast(ms[0]); };

test("outer face turns map to the hand-derived AST (N=3)", () => {
  assert.deepEqual(one(3, "R"), ["X", [2], -1]);
  assert.deepEqual(one(3, "L"), ["X", [0], 1]);
  assert.deepEqual(one(3, "U"), ["Y", [2], -1]);
  assert.deepEqual(one(3, "D"), ["Y", [0], 1]);
  assert.deepEqual(one(3, "F"), ["Z", [2], -1]);
  assert.deepEqual(one(3, "B"), ["Z", [0], 1]);
});

test("prime inverts and 2 is a half turn, independent of the face", () => {
  assert.deepEqual(one(3, "R'"), ["X", [2], 1]);
  assert.deepEqual(one(3, "L'"), ["X", [0], -1]);
  assert.deepEqual(one(3, "F2"), ["Z", [2], 2]);
  assert.deepEqual(one(3, "B2"), ["Z", [0], 2]);
  assert.deepEqual(one(2, "U'"), ["Y", [1], 1]);
  assert.deepEqual(one(4, "D'"), ["Y", [0], -1]);
});

test("wide moves: Rw is two layers, kRw is k layers, taken from the face side", () => {
  assert.deepEqual(one(3, "Rw"), ["X", [1, 2], -1]);
  assert.deepEqual(one(4, "Lw"), ["X", [0, 1], 1]);
  assert.deepEqual(one(5, "3Rw"), ["X", [2, 3, 4], -1]);
  assert.deepEqual(one(5, "3Lw'"), ["X", [0, 1, 2], -1]);
  assert.deepEqual(one(3, "Bw2"), ["Z", [0, 1], 2]);
  assert.deepEqual(one(4, "3Uw"), ["Y", [1, 2, 3], -1]);
});

test("sequences split on whitespace of any width; empty text is the empty sequence", () => {
  assert.deepEqual(ok(parse(3, "R U R' U'")).map(ast), [["X", [2], -1], ["Y", [2], -1], ["X", [2], 1], ["Y", [2], 1]]);
  assert.equal(ok(parse(3, "  R \n\t U  ")).length, 2);
  assert.equal(ok(parse(3, "")).length, 0);
  assert.equal(ok(parse(3, "   ")).length, 0);
});

test("(R U R' U')^6 restores every piece of the 3x3, (R U R' U')^1 does not", () => {
  const slots = Shell.slots(size(3));
  const poses = slots.map((s, i) => Pose.make(ok(Id.make(`p${i}`)), s, Orientation.identity));
  const run = (text, times) => {
    const moves = ok(parse(3, text));
    let state = poses;
    for (let k = 0; k < times; k++) for (const m of moves) state = state.map((p) => Move.applyToPose(m, p));
    return state;
  };
  assert.deepEqual(run("R U R' U'", 6), poses);
  assert.notDeepEqual(run("R U R' U'", 1), poses);
});

test("lowercase wide aliases remain unsupported", () => {
  for (const t of ["r", "l", "u", "d", "f", "b", "u'"]) {
    const e = err(parse(3, t));
    assert.equal(e.kind, "UnsupportedAlias", t);
    assert.equal(e.start, 0);
    assert.equal(e.stop, t.length);
  }
});

test("unknown or malformed tokens fail with their position", () => {
  const bad = ["Q", "R3", "R''", "R2'", "R'2", "RW", "Rv", "w", "2R", "2R'", "R,U", "(R)", "R-U", "R·U", "R.", "03Rw", "Rww", "Rw3", "٣Rw", "R U", "Rx"];
  for (const t of bad) assert.equal(err(parse(3, t)).kind, "UnknownToken", t);
  const e = err(parse(3, "R U Q U"));
  assert.deepEqual([e.kind, e.start, e.stop], ["UnknownToken", 4, 5]);
  // the first bad token is reported
  assert.equal(err(parse(3, "R Q M")).start, 2);
});

test("wide widths must satisfy 2 <= k < N; a width of N would be a whole-cube rotation", () => {
  assert.equal(err(parse(3, "1Rw")).kind, "BadWidth");
  assert.equal(err(parse(3, "0Rw")).kind, "BadWidth");
  assert.equal(err(parse(3, "3Rw")).kind, "BadWidth");
  assert.equal(err(parse(3, "4Rw")).kind, "BadWidth");
  assert.equal(err(parse(2, "Rw")).kind, "BadWidth");
  assert.equal(err(parse(5, "5Rw")).kind, "BadWidth");
  assert.equal(err(parse(5, "99999999999999999999Rw")).kind, "BadWidth");
  assert.deepEqual(one(5, "4Rw"), ["X", [1, 2, 3, 4], -1]);
});

test("input is bounded: 100000 characters pass, more fail before parsing", () => {
  assert.equal(ok(parse(3, "R ".repeat(50000))).length, 50000);
  const e = err(parse(3, "R ".repeat(50001)));
  assert.equal(e.kind, "InputTooLong");
  assert.equal(err(parse(3, "Q".repeat(100001))).kind, "InputTooLong");
});

test("parsing is deterministic and returns canonical, valid ASTs", () => {
  const text = "R U2 F' Lw 2Dw' B";
  const a = ok(parse(4, text)).map(ast);
  const b = ok(parse(4, text)).map(ast);
  assert.deepEqual(a, b);
  for (const m of ok(parse(4, text))) assert.equal(Shell.sizeToInt(Move.size(m)), 4);
});

test('3×3 middle slices use L/D/F directions and reject unsupported sizes',()=>{
 for(const [name,axis,turn] of [['M','X',1],['E','Y',1],['S','Z',-1]]){assert.deepEqual(one(3,name),[axis,[1],turn]);assert.deepEqual(one(3,name+"'"),[axis,[1],-turn]);assert.deepEqual(one(3,name+'2'),[axis,[1],2]);for(const n of [2,4])assert.equal(err(parse(n,name)).kind,'UnsupportedAlias');}
});

test('whole cube rotations select all 2×2/3×3 layers in R/U/F directions',()=>{
 for(const n of [2,3])for(const [name,axis] of [['x','X'],['y','Y'],['z','Z']]){const layers=Array.from({length:n},(_,i)=>i);assert.deepEqual(one(n,name),[axis,layers,-1]);assert.deepEqual(one(n,name+"'"),[axis,layers,1]);assert.deepEqual(one(n,name+'2'),[axis,layers,2]);}for(const name of ['x','y','z'])assert.equal(err(parse(4,name)).kind,'UnsupportedAlias');
});

test('aliases and inverses restore every Core pose after two and four moves',()=>{
 for(const n of [2,3])for(const token of n===2?['x','y','z']:['M','E','S','x','y','z']){const poses=Shell.slots(size(n)).map((slot,i)=>Pose.make(ok(Id.make(`p${i}`)),slot,Orientation.identity)),move=ok(parse(n,token))[0],inverse=ok(parse(n,token+"'"))[0],apply=(state,m)=>state.map(p=>Move.applyToPose(m,p));const changed=apply(poses,move);assert.notDeepEqual(changed,poses,`${n} ${token}`);assert.deepEqual(apply(changed,inverse),poses,`${n} ${token} inverse`);assert.deepEqual([1,2,3,4].reduce(state=>apply(state,move),poses),poses,`${n} ${token} four`);}
});

test('alias legality follows the explicit policy without widening face-turn guarantees',async()=>{
 const Codec=await import('../core/res/PwCodec.res.mjs'),Validate=await import('../core/res/PwValidate.res.mjs'),{definitionText}=await import('./helpers/cube-model.mjs');
 for(const n of [2,3]){const outer=JSON.parse(definitionText(n)),any={...outer,movePolicy:'any'},dOuter=ok(Codec.decodeDefinition(JSON.stringify(outer))),dAny=ok(Codec.decodeDefinition(JSON.stringify(any))),start=Codec.homeState(dAny);for(const name of n===2?['x','y','z']:['M','E','S','x','y','z']){const move=ok(parse(n,name))[0],changed=ok(Validate.applyMove(dAny,start,move));assert.equal(Validate.applyMove(dOuter,Codec.homeState(dOuter),move).TAG,'Error',`${name}: outer-wide`);assert.equal(Validate.assess(dAny,changed,'FaceTurns',undefined).reachability._0,'ProfileOutsidePolicy');assert.equal(Validate.assess(dAny,changed,undefined,[move]).reachability.TAG,'VerifiedByReplay');}}
});
