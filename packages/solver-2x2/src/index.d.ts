/** Explicit compatibility types for Cubistry v1; not the proposed 001 core ABI. */
export type Vec3 = readonly [number, number, number];
/** Source basis vectors expressed in the fixed world frame (+X right,+Y up,+Z front). */
export type BodyFrame = readonly [Vec3, Vec3, Vec3];
export interface PhysicalPrint {
  readonly schema: "cubistry.print";
  readonly version: 1;
  readonly id: string;
  readonly topology: { readonly kind: "cube"; readonly size: 2 };
  readonly cubies: readonly { readonly id: number; readonly position: Vec3 }[];
  readonly stickers: readonly {
    readonly id: number;
    readonly cubie: number;
    readonly normal: Vec3;
    readonly up: Vec3;
    readonly assetId: string;
    readonly materialId: string;
    readonly equivalentQuarterTurns: readonly number[];
  }[];
}
export interface PhysicalState {
  readonly schema: "cubistry.state";
  readonly version: 1;
  readonly printId: string;
  readonly topology: { readonly kind: "cube"; readonly size: 2 };
  readonly cubies: readonly {
    readonly id: number;
    readonly position: Vec3;
    readonly orientation: BodyFrame;
  }[];
}
export type SolverMode = "rotationEquivalent" | "exactPhysical";
export type HTMMove = `${"U" | "R" | "F" | "D" | "L" | "B"}${"" | "2" | "'"}`;
interface SolutionBase {
  readonly moves: readonly HTMMove[];
  readonly metric: "HTM";
  readonly moveCount: number;
  readonly quotientDistance: number;
  readonly frameCorrectionMoves: number;
}
export type Solution<M extends SolverMode = SolverMode> = SolutionBase &
  (M extends "exactPhysical"
    ? { readonly mode: "exactPhysical"; readonly optimality: "not-guaranteed" }
    : {
        readonly mode: "rotationEquivalent";
        readonly optimality: "rotation-equivalent-HTM";
      });
export interface Solver2x2 {
  solve2x2<M extends SolverMode>(
    from: PhysicalState,
    target: PhysicalState,
    options: { readonly mode: M },
  ): Solution<M>;
}
/** Validates and snapshots the pinned table and immutable physical print. */
export function create2x2Solver(
  tableBytes: Uint8Array,
  print: PhysicalPrint,
): Promise<Solver2x2>;
export const TABLE_SHA256: string;
/** Consumer controls loading; no fetch is performed by this package. */
export const TABLE_URL: URL;
