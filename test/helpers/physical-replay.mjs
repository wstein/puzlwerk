// Independent test oracle: integer rotations of physical bodies and stickers.
// No imports of CubeLab, the solver adapter, its coordinates or its move code.
export const I = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
export const clone = (value) => structuredClone(value);
export function initial(print) {
  return {
    schema: "cubistry.state",
    version: 1,
    printId: print.id,
    topology: { kind: "cube", size: 2 },
    cubies: print.cubies.map((piece) => ({
      ...clone(piece),
      orientation: clone(I),
    })),
  };
}
function quarter(v, axis) {
  const [x, y, z] = v;
  return axis === 0 ? [x, -z, y] : axis === 1 ? [z, y, -x] : [-y, x, z];
}
export function rotateAll(state, axis) {
  const result = clone(state);
  for (const piece of result.cubies) {
    piece.position = quarter(piece.position, axis);
    piece.orientation = piece.orientation.map((v) => quarter(v, axis));
  }
  return result;
}
export function replay(state, word) {
  const result = clone(state);
  const tokens =
    typeof word === "string" ? word.trim().split(/\s+/).filter(Boolean) : word;
  for (const token of tokens) {
    if (!/^[URFDLB](2|')?$/.test(token))
      throw new Error("Non-HTM token in independent replay");
    const [axis, sign] = {
      R: [0, 1],
      L: [0, -1],
      U: [1, 1],
      D: [1, -1],
      F: [2, 1],
      B: [2, -1],
    }[token[0]];
    const turns = token.endsWith("2") ? 2 : token.endsWith("'") ? 3 : 1;
    const positive = (((sign === 1 ? -turns : turns) % 4) + 4) % 4;
    for (const piece of result.cubies) {
      if (piece.position[axis] !== sign) continue;
      for (let turn = 0; turn < positive; turn++) {
        piece.position = quarter(piece.position, axis);
        piece.orientation = piece.orientation.map((v) => quarter(v, axis));
      }
    }
  }
  return result;
}
export function poses(state) {
  return clone(state.cubies).sort((a, b) => a.id - b.id);
}
function transform(v, basis) {
  return [0, 1, 2].map((i) => v.reduce((n, x, j) => n + x * basis[j][i], 0));
}
export function stickers(print, state) {
  return print.stickers
    .map((sticker) => {
      const body = state.cubies.find((piece) => piece.id === sticker.cubie);
      return {
        ...clone(sticker),
        position: body.position,
        normal: transform(sticker.normal, body.orientation),
        up: transform(sticker.up, body.orientation),
      };
    })
    .sort((a, b) => a.id - b.id);
}
export function globalTargets(state) {
  const result = [state],
    seen = new Set([JSON.stringify(poses(state))]);
  for (let i = 0; i < result.length; i++)
    for (let axis = 0; axis < 3; axis++) {
      const next = rotateAll(result[i], axis),
        key = JSON.stringify(poses(next));
      if (!seen.has(key)) {
        seen.add(key);
        result.push(next);
      }
    }
  if (result.length !== 24) throw new Error("Independent rotation group is incomplete");
  return result;
}
export function regularPrint() {
  const cubies = [];
  let id = 0;
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) cubies.push({ id: id++, position: [x, y, z] });
  const stickers = cubies.flatMap((piece) =>
    piece.position.map((sign, axis) => {
      const normal = [0, 0, 0];
      normal[axis] = sign;
      return {
        id: piece.id * 3 + axis,
        cubie: piece.id,
        normal,
        up: axis === 1 ? [0, 0, -sign] : [0, 1, 0],
        assetId: "same-visible-color",
        materialId: "sticker",
        equivalentQuarterTurns: [0],
      };
    }),
  );
  return {
    schema: "cubistry.print",
    version: 1,
    id: "independent-corners",
    topology: { kind: "cube", size: 2 },
    cubies,
    stickers,
  };
}
