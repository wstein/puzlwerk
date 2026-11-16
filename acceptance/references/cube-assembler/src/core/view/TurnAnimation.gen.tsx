/* TypeScript file generated from TurnAnimation.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as TurnAnimationJS from './TurnAnimation.res.mjs';

import type {cubeState as CubeState_cubeState} from '../../../src/cube/CubeState.gen.tsx';

import type {cubeTurn as CubeMoves_cubeTurn} from '../../../src/cube/CubeMoves.gen.tsx';

import type {faceKey as CubeState_faceKey} from '../../../src/cube/CubeState.gen.tsx';

import type {swipeLayer as CubeGesture_swipeLayer} from './CubeGesture.gen.tsx';

export type queuedTurn = {
  readonly face: CubeState_faceKey;
  readonly depth?: number;
  readonly width?: number;
  readonly turns: number;
  readonly from?: number;
  readonly speed?: number;
  readonly duration?: number;
  readonly undo?: boolean
};

export type activeTurn = {
  readonly face: CubeState_faceKey;
  readonly depth?: number;
  readonly width?: number;
  readonly turns: number;
  readonly from?: number;
  readonly speed?: number;
  readonly startTime: number;
  readonly duration: number;
  readonly overshoot: boolean;
  readonly undo?: boolean
};

export type frame = { readonly angle: number; readonly finished: boolean };

export type turned = { readonly cube: CubeState_cubeState; readonly moves: CubeMoves_cubeTurn[] };

export type viewTurn = {
  readonly yaw: number;
  readonly pitch: number;
  readonly yawVelocity: number;
  readonly pitchVelocity: number
};

export const startTurn: (_1:queuedTurn, _2:number, _3:boolean, _4:number) => activeTurn = TurnAnimationJS.startTurn as any;

export const turnFrame: (_1:activeTurn, _2:number) => frame = TurnAnimationJS.turnFrame as any;

export const finishTurn: (_1:CubeState_cubeState, _2:number, _3:CubeMoves_cubeTurn[], _4:activeTurn) => (null | turned) = TurnAnimationJS.finishTurn as any;

export const settleTurn: (_1:CubeGesture_swipeLayer, _2:number, _3:number, _4:number, _5:number) => queuedTurn = TurnAnimationJS.settleTurn as any;

export const scrambleQueue: (_1:CubeMoves_cubeTurn[], _2:number) => queuedTurn[] = TurnAnimationJS.scrambleQueue as any;

export const dragMeshKey: (_1:CubeGesture_swipeLayer, _2:number, _3:boolean) => string = TurnAnimationJS.dragMeshKey as any;

export const clampPitch: (_1:number) => number = TurnAnimationJS.clampPitch as any;

export const viewTurn: (_1:number, _2:number, _3:number) => viewTurn = TurnAnimationJS.viewTurn as any;

export const isInitialCube: (_1:CubeState_cubeState, _2:CubeState_cubeState) => boolean = TurnAnimationJS.isInitialCube as any;
