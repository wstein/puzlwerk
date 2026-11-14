// Test-only helpers for the reachability evidence of M2 (T013), independent of the ReScript core.
// - rotations24: the 24 proper signed permutation matrices, row-major, column j is the image of e_j.
// - groupOrder: the order of a permutation group given by generators (Schreier-Sims with BigInt).
export const rotations24 = (() => {
  const out = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (const perm of perms) for (let signs = 0; signs < 8; signs++) {
    const m = new Array(9).fill(0);
    for (let col = 0; col < 3; col++) m[3 * perm[col] + col] = signs & (1 << col) ? -1 : 1;
    const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    if (det === 1) out.push(m);
  }
  return out;
})();

// A permutation is an Int32Array p with p[x] the image of x. compose(a, b) applies b first.
const compose = (a, b) => { const r = new Int32Array(a.length); for (let x = 0; x < a.length; x++) r[x] = a[b[x]]; return r; };
const invert = (a) => { const r = new Int32Array(a.length); for (let x = 0; x < a.length; x++) r[a[x]] = x; return r; };
const isIdentity = (a) => a.every((v, i) => v === i);

export const groupOrder = (generators, degree) => {
  const levels = []; // { base, gens, trans: Map<point, perm taking base to point> }
  const rebuildOrbit = (level) => {
    level.trans = new Map([[level.base, Int32Array.from({ length: degree }, (_, i) => i)]]);
    const queue = [level.base];
    for (let head = 0; head < queue.length; head++) {
      const x = queue[head];
      const ux = level.trans.get(x);
      for (const s of level.gens) {
        const y = s[x];
        if (!level.trans.has(y)) { level.trans.set(y, compose(s, ux)); queue.push(y); }
      }
    }
  };
  // Sift g through levels from `from`; returns { g, level } with g the residual and level where it stopped.
  const sift = (g, from) => {
    let level = from;
    for (; level < levels.length; level++) {
      const u = levels[level].trans.get(g[levels[level].base]);
      if (u === undefined) return { g, level };
      g = compose(invert(u), g);
    }
    return { g, level };
  };
  const addAt = (h, from, to) => {
    for (let k = from; k <= to; k++) {
      if (k === levels.length) {
        const moved = h.findIndex((v, i) => v !== i);
        levels.push({ base: moved, gens: [], trans: null });
      }
      levels[k].gens.push(h);
      rebuildOrbit(levels[k]);
    }
  };
  for (const g of generators) {
    if (isIdentity(g)) continue;
    const { g: r, level } = sift(g, 0);
    if (!isIdentity(r)) addAt(r, 0, level);
    // Close the chain: every Schreier generator of every level must sift to the identity.
    let i = levels.length - 1;
    while (i >= 0) {
      let added = false;
      const lv = levels[i];
      outer: for (const [x, ux] of lv.trans) {
        for (const s of lv.gens) {
          const y = s[x];
          const schreier = compose(invert(lv.trans.get(y)), compose(s, ux));
          const res = sift(schreier, i + 1);
          if (!isIdentity(res.g)) { addAt(res.g, i + 1, res.level); i = levels.length - 1; added = true; break outer; }
        }
      }
      if (!added) i--;
    }
  }
  return levels.reduce((acc, l) => acc * BigInt(l.trans.size), 1n);
};
