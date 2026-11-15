// Independent derivation of the cube data the front-goal solver needs, from the geometry of the
// standard URFDLB facelet layout (U0-8 R9-17 F18-26 D27-35 L36-44 B45-53, row-major per face).
// Nothing here is read from the Rust engine; the engine's numbers are the oracle in the tests.
// Used by tools/gen-front-data.mjs (writes res/FrontData.res) and by the tests.

export const FACE = "URFDLB";
const NORMAL = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0], [-1, 0, 0], [0, 0, -1]];
const UP0 = [[0, 0, -1], [0, 1, 0], [0, 1, 0], [0, 0, 1], [0, 1, 0], [0, 1, 0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// clockwise quarter turn, seen from outside, about the unit axis a
const cw = (a, v) => { const d = dot(a, v), x = cross(a, v); return [0, 1, 2].map((k) => d * a[k] - x[k] + 0); };
const eqv = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

function geometry(i) {
  const face = Math.floor(i / 9), r = Math.floor((i % 9) / 3), c = i % 3;
  switch (face) {
    case 0: return { p: [c - 1, 1, r - 1], n: [0, 1, 0] };
    case 1: return { p: [1, 1 - r, 1 - c], n: [1, 0, 0] };
    case 2: return { p: [c - 1, 1 - r, 1], n: [0, 0, 1] };
    case 3: return { p: [c - 1, -1, 1 - r], n: [0, -1, 0] };
    case 4: return { p: [-1, 1 - r, c - 1], n: [-1, 0, 0] };
    default: return { p: [1 - c, 1 - r, -1], n: [0, 0, -1] };
  }
}
const geo = Array.from({ length: 54 }, (_, i) => geometry(i));
const keyOf = (p, n) => p.join(",") + "|" + n.join(",");
const index = new Map(geo.map((g, i) => [keyOf(g.p, g.n), i]));
const rnd = (v) => v.map(Math.round);
// perm[i] = where the sticker at facelet i goes (all stickers of the layer, clockwise quarter turn about axis)
function perm(axis, inLayer) {
  return geo.map((g, i) => (inLayer(g.p) ? index.get(keyOf(rnd(cw(axis, g.p)), rnd(cw(axis, g.n)))) : i));
}
export const FACE_PERM = FACE.split("").map((_, f) => perm(NORMAL[f], (p) => dot(p, NORMAL[f]) === 1));
const ROT_GEN = [1, 0, 2].map((f) => perm(NORMAL[f], () => true)); // x = R, y = U, z = F
const GEN_LETTER = ["x", "y", "z"];

// ---- the cubie model (cubie.rs): corners URF UFL ULB UBR DFR DLF DBL DRB, edges UR UF UL UB DR DF DL DB FR FL BL BR
export const CORNER_FACELET = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11], [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]];
export const EDGE_FACELET = [[5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25], [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14]];

// facelet letters -> { ca: piece | twist << 3 per slot, ea: piece << 1 | flip per slot } (null: not a cube)
export function cubieOf(letters) {
  const f = [...letters].map((ch) => FACE.indexOf(ch));
  const ca = [], ea = [];
  for (let i = 0; i < 8; i++) {
    let o = 0;
    while (o < 3 && f[CORNER_FACELET[i][o]] !== 0 && f[CORNER_FACELET[i][o]] !== 3) o++;
    const c = [0, 1, 2].map((k) => f[CORNER_FACELET[i][(o + k) % 3]]);
    const j = CORNER_FACELET.findIndex((h) => h.every((x, k) => Math.floor(x / 9) === c[k]));
    if (j < 0) return null;
    ca.push(((o % 3) << 3) | j);
  }
  for (let i = 0; i < 12; i++) {
    const a = f[EDGE_FACELET[i][0]], b = f[EDGE_FACELET[i][1]];
    let v = -1;
    for (let j = 0; j < 12 && v < 0; j++) {
      const [x, y] = EDGE_FACELET[j].map((q) => Math.floor(q / 9));
      if (a === x && b === y) v = j << 1; else if (a === y && b === x) v = (j << 1) | 1;
    }
    if (v < 0) return null;
    ea.push(v);
  }
  return { ca, ea };
}
export const SOLVED = [...FACE].map((ch) => ch.repeat(9)).join("");
export const applyPerm = (letters, p) => { const out = [...letters]; for (let i = 0; i < 54; i++) out[p[i]] = letters[i]; return out.join(""); };

// the 18 turns m = 3 * face + q (q: 0 clockwise, 1 half, 2 counterclockwise), read off the turned solved cube
export function turnTables() {
  const cfrom = [], cadd = [], efrom = [], eadd = [];
  for (let f = 0; f < 6; f++) for (let q = 0; q < 3; q++) {
    let s = SOLVED;
    for (let t = 0; t <= q; t++) s = applyPerm(s, FACE_PERM[f]);
    const { ca, ea } = cubieOf(s);
    cfrom.push(...ca.map((v) => v & 7)); cadd.push(...ca.map((v) => v >> 3));
    efrom.push(...ea.map((v) => v >> 1)); eadd.push(...ea.map((v) => v & 1));
  }
  return { cfrom, cadd, efrom, eadd };
}

// ---- the 24 whole-cube rotations, breadth first over x, y, z (identity first), with their effect on the six centers
const samePerm = (a, b) => a.every((v, i) => v === b[i]);
export function rotations() {
  const ident = Array.from({ length: 54 }, (_, i) => i);
  const out = [{ word: "", map: ident }];
  for (let at = 0; at < out.length; at++) {
    for (let g = 0; g < 3; g++) {
      const next = out[at].map.map((p) => ROT_GEN[g][p]);
      if (!out.some((r) => samePerm(r.map, next))) out.push({ word: out[at].word ? `${out[at].word} ${GEN_LETTER[g]}` : GEN_LETTER[g], map: next });
    }
  }
  // dest / add of the six centers: center g goes to face dest[g]; its picture turns add[g] more quarters
  for (const r of out) {
    let word = r.word.split(" ").filter(Boolean);
    const normal = NORMAL.map((v) => v.slice()), up = UP0.map((v) => v.slice());
    for (const letter of word) {
      const a = [NORMAL[1], NORMAL[0], NORMAL[2]][GEN_LETTER.indexOf(letter)];
      for (let g = 0; g < 6; g++) { normal[g] = rnd(cw(a, normal[g])); up[g] = rnd(cw(a, up[g])); }
    }
    r.dest = normal.map((n) => NORMAL.findIndex((m) => eqv(m, n)));
    r.add = normal.map((_, g) => {
      const p = r.dest[g];
      for (let k = 0; k < 4; k++) { let v = UP0[p]; for (let t = 0; t < k; t++) v = rnd(cw(NORMAL[p], v)); if (eqv(v, up[g])) return k; }
      throw new Error("picture not square");
    });
    // the center map of the sticker perm must agree with dest
    for (let g = 0; g < 6; g++) if (Math.floor(r.map[9 * g + 4] / 9) !== r.dest[g]) throw new Error("dest disagrees with map");
  }
  return out;
}

// the shortest-spelling rule of the answer: first word of the list empty, x x2 x' y y2 y' z z2 z', then pairs in that order,
// that has the same effect (the same sticker map) as the rotation
export function shortWords(rots) {
  const tok = (t) => { const p = ROT_GEN[GEN_LETTER.indexOf(t[0])]; const n = t.endsWith("'") ? 3 : t.endsWith("2") ? 2 : 1; return { p, n }; };
  const effect = (word) => {
    let m = Array.from({ length: 54 }, (_, i) => i);
    for (const t of word.split(" ").filter(Boolean)) { const { p, n } = tok(t); for (let k = 0; k < n; k++) m = m.map((q) => p[q]); }
    return m;
  };
  const singles = ["x", "y", "z"].flatMap((a) => ["", "2", "'"].map((s) => a + s));
  const candidates = ["", ...singles, ...singles.flatMap((a) => singles.map((b) => `${a} ${b}`))];
  const eff = candidates.map(effect);
  return rots.map((r) => candidates[eff.findIndex((e) => samePerm(e, r.map))]);
}

// ---- replay helpers (the test's own cube model; nothing from the solver)
export const turnWord = (letters, word) => {
  let s = letters;
  for (const tok of word.split(" ").filter(Boolean)) {
    const f = FACE.indexOf(tok[0]);
    const n = tok.endsWith("'") ? 3 : tok.endsWith("2") ? 2 : 1;
    for (let k = 0; k < n; k++) s = applyPerm(s, FACE_PERM[f]);
  }
  return s;
};
export const rotateWord = (letters, word) => {
  let s = letters;
  for (const tok of word.split(" ").filter(Boolean)) {
    const g = ROT_GEN[GEN_LETTER.indexOf(tok[0])];
    const n = tok.endsWith("'") ? 3 : tok.endsWith("2") ? 2 : 1;
    for (let k = 0; k < n; k++) s = applyPerm(s, g);
  }
  return s;
};
// the rotation (index into rotations()) a word of x y z tokens makes
export const rotationIndexOf = (word) => {
  const probe = [...Array(54).keys()].map((i) => String.fromCharCode(48 + i)).join("");
  const moved = rotateWord(probe, word);
  const rots = rotations();
  return rots.findIndex((r) => r.map.every((to, i) => moved[to] === probe[i]));
};
// the sticker identity (home facelet number) shown at facelet `at`, read from the colors of the piece around it
export function identityAt(letters, at) {
  const c = FACE.indexOf(letters[at]);
  if (at % 9 === 4) return 9 * c + 4;
  const around = (list) => list.find((slot) => slot.includes(at));
  const slot = around(CORNER_FACELET) ?? around(EDGE_FACELET);
  const set = slot.map((x) => FACE.indexOf(letters[x])).sort().join();
  const home = (CORNER_FACELET.includes(slot) ? CORNER_FACELET : EDGE_FACELET).find((h) => h.map((x) => Math.floor(x / 9)).sort().join() === set);
  return home.find((x) => Math.floor(x / 9) === c);
}
