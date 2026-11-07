// Test-only reference model for NxN shells, written from the data model and independent of the
// ReScript core: slots, definition text (canonical wire v1), and rotations as coordinate maps.
export const FACES = "UDFBRL";
export const NORMAL = { U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], R: [1, 0, 0], L: [-1, 0, 0] };
export const UP = { F: [0, 1, 0], B: [0, 1, 0], R: [0, 1, 0], L: [0, 1, 0], U: [0, 0, -1], D: [0, 0, 1] };
const COLOR = { U: "white", D: "yellow", F: "green", B: "blue", R: "red", L: "orange" };

export const slots = (n) => {
  const d = Array.from({ length: n }, (_, i) => -(n - 1) + 2 * i);
  const out = [];
  for (const x of d) for (const y of d) for (const z of d) if (Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) === n - 1) out.push([x, y, z]);
  return out;
};
export const facesOf = (slot, n) => [...FACES].filter((f) => NORMAL[f].reduce((s, c, i) => s + c * slot[i], 0) === n - 1);
// N=2 and N=3 use the face letters (every piece is unique); N>=4 adds the home slot ("m" marks a minus sign).
export const pieceId = (slot, n) => facesOf(slot, n).join("") + (n >= 4 ? ":" + slot.map((c) => (c < 0 ? `m${-c}` : `${c}`)).join("_") : "");

// Canonical definition text for any N (keys sorted, no whitespace), as in contracts/wire-v1.md.
export const definitionText = (n) => {
  const pieces = slots(n).map((s) => {
    const id = pieceId(s, n);
    const stickers = facesOf(s, n).map((f) => ({ color: COLOR[f], id: `${id}.${f}`, normal: NORMAL[f], up: UP[f] })).sort((a, b) => (a.id < b.id ? -1 : 1));
    return { home: s, id, stickers };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
  const sorted = (v) => (Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorted(v[k])])) : v);
  return JSON.stringify(sorted({ convention: "cube-shell-v1", id: `cube${n}`, movePolicy: "outer-wide", pieces, revision: 1, schema: "puzlwerk.definition", size: n }));
};

// Right-hand quarter turn about the positive axis as a coordinate map (data model, "Moves").
const QUARTER = {
  X: ([x, y, z]) => [x, -z, y],
  Y: ([x, y, z]) => [z, y, -x],
  Z: ([x, y, z]) => [-y, x, z],
};
export const turnVector = (axis, turns, v) => {
  let out = v;
  for (let i = 0; i < (turns === -1 ? 3 : turns); i++) out = QUARTER[axis](out);
  return out.map((c) => (c === 0 ? 0 : c));
};

// Reference state: Map id -> { p, o } with o the nine row-major entries; column j is the image of e_j.
export const homeReference = (n) => new Map(slots(n).map((s) => [pieceId(s, n), { p: s, home: s, o: [1, 0, 0, 0, 1, 0, 0, 0, 1] }]));
export const applyReference = (state, n, move) => {
  const next = new Map();
  const ai = "XYZ".indexOf(move.axis);
  for (const [id, { p, home, o }] of state) {
    if (move.layers.includes((p[ai] + n - 1) / 2)) {
      const cols = [0, 1, 2].map((j) => turnVector(move.axis, move.turns, [o[j], o[3 + j], o[6 + j]]));
      next.set(id, { p: turnVector(move.axis, move.turns, p), home, o: [0, 1, 2].flatMap((i) => cols.map((c) => c[i])) });
    } else next.set(id, { p, home, o });
  }
  return next;
};

export const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A random canonical move description { axis, layers, turns } for size n: single layer, contiguous wide
// from either outer side, or an arbitrary sorted subset (including all layers).
export const randomMove = (rand, n) => {
  const axis = "XYZ"[Math.floor(rand() * 3)];
  const turns = [-1, 1, 2][Math.floor(rand() * 3)];
  const kind = Math.floor(rand() * 4);
  let layers;
  if (kind === 0) layers = [Math.floor(rand() * n)];
  else if (kind === 1) { const w = 1 + Math.floor(rand() * n); layers = Array.from({ length: w }, (_, i) => n - w + i); }
  else if (kind === 2) { const w = 1 + Math.floor(rand() * n); layers = Array.from({ length: w }, (_, i) => i); }
  else { layers = Array.from({ length: n }, (_, i) => i).filter(() => rand() < 0.5); if (layers.length === 0) layers = [Math.floor(rand() * n)]; }
  return { axis, layers, turns };
};
export const inverseMove = (m) => ({ ...m, turns: m.turns === 2 ? 2 : -m.turns });
