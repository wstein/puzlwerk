import {
  create2x2Solver,
  type PhysicalPrint,
  type PhysicalState,
  type HTMMove,
} from "@puzlwerk/solver-2x2";
async function consumer(
  bytes: Uint8Array,
  print: PhysicalPrint,
  from: PhysicalState,
  target: PhysicalState,
) {
  const solver = await create2x2Solver(bytes, print);
  const exact = solver.solve2x2(from, target, { mode: "exactPhysical" });
  const quotient = solver.solve2x2(from, target, {
    mode: "rotationEquivalent",
  });
  const moves: readonly HTMMove[] = exact.moves;
  // @ts-expect-error Mode must never be selected implicitly.
  solver.solve2x2(from, target);
  // @ts-expect-error Unsupported color-only goal.
  solver.solve2x2(from, target, { mode: "colorOnly" });
  const exactGuarantee: "not-guaranteed" = exact.optimality;
  const quotientGuarantee: "rotation-equivalent-HTM" = quotient.optimality;
  return { moves, quotient, exactGuarantee, quotientGuarantee };
}
void consumer;

import type { Player } from '../../packages/core-viewer-bridge/src/index.mjs';
declare const timedPlayer: Player;
timedPlayer.turn('X', [1], 1, 100, () => ({endAt: 200, durationMs: 100, revision: 1}));

import type { Options as ViewerBridgeOptions } from '../../packages/core-viewer-bridge/src/index.mjs';
const sourceClockOptions: ViewerBridgeOptions = {
  palette: {white: '#ffffff'}, defaultColor: '#ffffff', sourceFaceColors: {tile: '#ffffff'},
  core: {center: [0,0,0], halfExtent: 1},
  presentation: {cellSize: 1, bodyGap: .01, bodyRadius: .03, bodyKind: 'twoRadius', bodyInnerRadius: .018, size: 2, nominalEdge: 2, bodyBevelSegments: 3, stickerWidth: .87, stickerRadius: .055, stickerOffset: .502},
};
void sourceClockOptions;

import {parseNotation} from '../../packages/core-viewer-bridge/src/index.mjs';
const parsedMove=parseNotation(3,'M');if(parsedMove.ok){const axis:'X'|'Y'|'Z'=parsedMove.value.axis;const rotation:readonly [number,number,number,number]=parsedMove.value.rotation;void axis;void rotation;}
// @ts-expect-error Core notation text must be a string.
parseNotation(3, 4);
