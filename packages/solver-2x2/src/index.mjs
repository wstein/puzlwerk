import * as Canonical from "../res/upstream/Canonical2x2.res.mjs";
import * as Solver from "../res/upstream/Optimal2x2Solver.res.mjs";
import * as Table from "../res/upstream/Optimal2x2Table.res.mjs";
import { bindPrint, coordinatesForState } from "./physical-adapter.mjs";

export const TABLE_SHA256 =
  "3b7f10a07d2e13b54044e9073b46f39544640fb6adf8e903ed84f8c3199dae5a";
export const TABLE_URL = new URL("../assets/optimal-2x2.v2.bin", import.meta.url);
const rotationFaces = { x: ["R", "L'"], y: ["U", "D'"], z: ["F", "B'"] };
const inverseToken = (token) =>
  token.endsWith("'") ? token.slice(0, -1) : token.endsWith("2") ? token : token + "'";
const equal = (a, b) =>
  a.cp.every((value, i) => value === b.cp[i] && a.co[i] === b.co[i]);

function inverse(state) {
  const cp = Array(8),
    co = Array(8);
  for (let slot = 0; slot < 8; slot++) {
    cp[state.cp[slot]] = slot;
    co[state.cp[slot]] = (3 - state.co[slot]) % 3;
  }
  return { cp, co };
}

function faceTokens(rotations) {
  return rotations.flatMap((token) => {
    const faces = rotationFaces[token[0]];
    if (!faces) throw new Error("Unsupported upstream frame correction");
    return token.endsWith("'") ? faces.map(inverseToken) : faces;
  });
}

/** Caller owns resource loading. The table and print are snapshotted once. */
export async function create2x2Solver(tableBytes, print) {
  if (!(tableBytes instanceof Uint8Array))
    throw new TypeError("Expected table Uint8Array");
  const bytes = Uint8Array.from(tableBytes);
  if (bytes.length !== Table.optimal2x2TableBytes())
    throw new Error("Invalid table length");
  const binding = bindPrint(print);
  if (!globalThis.crypto?.subtle)
    throw new Error("Web Crypto is required to authenticate the solver table");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
  if (hash !== TABLE_SHA256) throw new Error("Solver table SHA-256 mismatch");
  const tables = Table.decodeOptimal2x2Tables(bytes.buffer);
  const transforms = Canonical.transformations();
  const apply = (state, tokens) =>
    tokens.reduce((value, token) => {
      const index = Canonical.moveTokens.indexOf(token);
      if (index < 0) throw new Error("Solver returned an unsupported move");
      return Canonical.applyTransform(value, transforms[index]);
    }, state);
  return Object.freeze({
    solve2x2(fromState, targetState, options) {
      const mode = options?.mode;
      if (mode !== "rotationEquivalent" && mode !== "exactPhysical") {
        throw new Error("Choose an explicit rotationEquivalent or exactPhysical mode");
      }
      const from = coordinatesForState(binding, fromState);
      const target = coordinatesForState(binding, targetState);
      // from ∘ word = target, so solve target^-1 ∘ from to identity.
      const relative = Canonical.applyTransform(inverse(target), from);
      const solution = Solver.solutionMoves(tables, relative);
      const quotient = solution.moves.map((index) => Canonical.moveTokens[index]);
      const correction =
        mode === "exactPhysical"
          ? faceTokens(Canonical.rotationTokensToIdentity(solution.final))
          : [];
      const moves = [...quotient, ...correction];
      const replay = apply(from, moves);
      if (
        mode === "exactPhysical"
          ? !equal(replay, target)
          : Canonical.coordinateForCubies(
              Canonical.applyTransform(inverse(target), replay),
            ) !== 0
      ) {
        throw new Error("Solver replay failed for the requested mode");
      }
      return Object.freeze({
        moves: Object.freeze(moves),
        mode,
        metric: "HTM",
        moveCount: moves.length,
        quotientDistance: quotient.length,
        frameCorrectionMoves: correction.length,
        optimality:
          mode === "rotationEquivalent" ? "rotation-equivalent-HTM" : "not-guaranteed",
      });
    },
  });
}
