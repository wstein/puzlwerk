// Explicit adapter for the accepted Cubistry v1 wire format. This is not a
// second canonical puzzle model or a mechanics engine. CubeLab coordinates
// stay private, and no normalization of physical poses or sticker-up occurs.
const normals = [
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, 1, 0],
    [0, 0, 1],
    [-1, 0, 0],
  ],
  [
    [0, 1, 0],
    [-1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, 1, 0],
    [0, 0, -1],
    [1, 0, 0],
  ],
  [
    [0, -1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  [
    [0, -1, 0],
    [-1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, -1, 0],
    [0, 0, -1],
    [-1, 0, 0],
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
];
const positions = normals.map((faces) =>
  faces.reduce((p, n) => p.map((v, i) => v + n[i]), [0, 0, 0]),
);
const same = (a, b) => a.every((v, i) => v === b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const rotate = (v, basis) =>
  [0, 1, 2].map((i) => v.reduce((sum, x, j) => sum + x * basis[j][i], 0));
const id = (value) => Number.isSafeInteger(value) && value >= 0;
const object = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const vector = (value) =>
  Array.isArray(value) && value.length === 3 && value.every(Number.isInteger);
const axis = (value) => vector(value) && dot(value, value) === 1;
function demand(condition, message) {
  if (!condition) throw new Error(message);
}
function topology(value) {
  return object(value) && value.kind === "cube" && value.size === 2;
}
function slotFor(position) {
  return vector(position) ? positions.findIndex((p) => same(p, position)) : -1;
}
function proper(basis) {
  if (!Array.isArray(basis) || basis.length !== 3 || !basis.every(axis)) return false;
  const [a, b, c] = basis;
  return (
    dot(a, b) === 0 &&
    dot(a, c) === 0 &&
    dot(b, c) === 0 &&
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
      a[1] * (b[0] * c[2] - b[2] * c[0]) +
      a[2] * (b[0] * c[1] - b[1] * c[0]) ===
      1
  );
}

export function bindPrint(raw) {
  demand(
    object(raw) &&
      raw.schema === "cubistry.print" &&
      raw.version === 1 &&
      topology(raw.topology),
    "Unsupported physical print schema/topology",
  );
  demand(typeof raw.id === "string" && raw.id.length > 0, "Invalid print identity");
  demand(
    Array.isArray(raw.cubies) &&
      raw.cubies.length === 8 &&
      Array.isArray(raw.stickers) &&
      raw.stickers.length === 24,
    "A complete 2x2 print requires eight cubies and 24 stickers",
  );
  const print = structuredClone(raw);
  const pieces = Array(8),
    ids = new Map();
  for (const piece of print.cubies) {
    demand(
      object(piece) && id(piece.id) && !ids.has(piece.id),
      "Invalid or duplicate cubie identity",
    );
    const slot = slotFor(piece.position);
    demand(slot >= 0 && !pieces[slot], "Invalid or duplicate source corner position");
    pieces[slot] = piece;
    ids.set(piece.id, slot);
  }
  const stickerIds = new Set(),
    seen = Array.from({ length: 8 }, () => new Set());
  for (const sticker of print.stickers) {
    demand(
      object(sticker) &&
        id(sticker.id) &&
        !stickerIds.has(sticker.id) &&
        ids.has(sticker.cubie),
      "Invalid or duplicate sticker identity",
    );
    const slot = ids.get(sticker.cubie);
    demand(
      axis(sticker.normal) && axis(sticker.up) && dot(sticker.normal, sticker.up) === 0,
      "Invalid sticker frame",
    );
    const face = normals[slot].findIndex((n) => same(n, sticker.normal));
    demand(
      face >= 0 && !seen[slot].has(face),
      "Sticker normal must cover one outward face per corner",
    );
    demand(
      typeof sticker.assetId === "string" &&
        sticker.assetId.length > 0 &&
        typeof sticker.materialId === "string" &&
        sticker.materialId.length > 0,
      "Invalid immutable sticker reference",
    );
    const symmetry = sticker.equivalentQuarterTurns;
    demand(
      Array.isArray(symmetry) &&
        symmetry.every(Number.isInteger) &&
        new Set(symmetry).size === symmetry.length &&
        ["0", "0,2", "0,1,2,3"].includes([...symmetry].sort((a, b) => a - b).join(",")),
      "Invalid optical symmetry: expected a C4 subgroup",
    );
    stickerIds.add(sticker.id);
    seen[slot].add(face);
  }
  return { print, pieces, ids };
}

export function coordinatesForState(binding, raw) {
  const { print, ids, pieces } = binding;
  demand(
    object(raw) &&
      raw.schema === "cubistry.state" &&
      raw.version === 1 &&
      topology(raw.topology),
    "Unsupported physical state schema/topology",
  );
  demand(raw.printId === print.id, "Incompatible print identity");
  demand(
    Array.isArray(raw.cubies) && raw.cubies.length === 8,
    "Expected eight physical corner poses",
  );
  const cp = Array(8),
    co = Array(8),
    seen = new Set();
  for (const pose of raw.cubies) {
    demand(
      object(pose) && id(pose.id) && ids.has(pose.id) && !seen.has(pose.id),
      "Unknown or duplicate cubie identity",
    );
    const slot = slotFor(pose.position),
      piece = ids.get(pose.id);
    demand(
      slot >= 0 && cp[slot] === undefined && proper(pose.orientation),
      "Invalid corner position/orientation",
    );
    demand(
      same(rotate(pieces[piece].position, pose.orientation), pose.position),
      "Corner body frame does not match its physical position",
    );
    const oriented = normals[piece].map((n) => rotate(n, pose.orientation));
    const twist = normals[slot].findIndex((n) => same(n, oriented[0]));
    demand(
      twist >= 0 && oriented.every((n, i) => same(n, normals[slot][(twist + i) % 3])),
      "Incompatible corner frame convention",
    );
    cp[slot] = piece;
    co[slot] = twist;
    seen.add(pose.id);
  }
  demand(
    co.reduce((sum, twist) => sum + twist, 0) % 3 === 0,
    "Physically impossible corner twist",
  );
  return { cp, co };
}
