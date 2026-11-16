/* TypeScript file generated from CubeMoves.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeMovesJS from './CubeMoves.res.mjs';

import type {cubeState as CubeState_cubeState} from './CubeState.gen.tsx';

import type {faceKey as CubeState_faceKey} from './CubeState.gen.tsx';

import type {faces as CubeGeometry_faces} from './CubeGeometry.gen.tsx';

export type faces = CubeGeometry_faces;

export type cubeTurn = {
  readonly face: CubeState_faceKey;
  readonly depth: number;
  readonly width?: number;
  readonly turns: number
};

export type scrambleLength = "short" | "normal" | "long";

export type scrambleOptions = { readonly length?: scrambleLength; readonly innerLayers?: boolean };

export const cubeStateToFaces: (_1:CubeState_cubeState, _2:number) => faces = CubeMovesJS.cubeStateToFaces as any;

export const facesToCubeState: (_1:faces) => CubeState_cubeState = CubeMovesJS.facesToCubeState as any;

export const applyCubeMove: (_1:CubeState_cubeState, _2:number, _3:CubeState_faceKey, _4:number) => CubeState_cubeState = CubeMovesJS.applyCubeMove as any;

export const applyCubeLayerMove: (_1:CubeState_cubeState, _2:number, _3:CubeState_faceKey, _4:number, _5:number, _6:number) => CubeState_cubeState = CubeMovesJS.applyCubeLayerMove as any;

export const formatCubeTurn: (_1:cubeTurn, _2:number) => string = CubeMovesJS.formatCubeTurn as any;

export const recordTurn: (_1:cubeTurn[], _2:cubeTurn) => cubeTurn[] = CubeMovesJS.recordTurn as any;

export const generateScrambleMoves: (_1:number, _2:scrambleOptions, _3:(() => number)) => cubeTurn[] = CubeMovesJS.generateScrambleMoves as any;
