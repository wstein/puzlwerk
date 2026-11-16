/* TypeScript file generated from CapturedFaceMatching.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CapturedFaceMatchingJS from './CapturedFaceMatching.res.mjs';

import type {cubeState as CubeState_cubeState} from './CubeState.gen.tsx';

import type {grid as CubeTypes_grid} from './CubeTypes.gen.tsx';

export type guidedCenterIssue =
    { kind: "same-center"; readonly photos: [number, number] }
  | { kind: "turned-twice"; readonly photo: number }
  | { kind: "not-opposite"; readonly photos: [number, number] };

export type faceMatchSample = { readonly colors: CubeTypes_grid };

export type orientedFaceMatch = { readonly slot: number; readonly turns: number };

export const checkGuidedCenters: (_1:Array<(undefined | CubeTypes_grid)>) => guidedCenterIssue[] = CapturedFaceMatchingJS.checkGuidedCenters as any;

export const findCapturedFaceMatch: (_1:Array<(undefined | faceMatchSample)>, _2:faceMatchSample, _3:number) => (null | number) = CapturedFaceMatchingJS.findCapturedFaceMatch as any;

export const findCaptureForOrientedFace: (_1:Array<(undefined | CubeTypes_grid)>, _2:CubeTypes_grid) => (null | orientedFaceMatch) = CapturedFaceMatchingJS.findCaptureForOrientedFace as any;

export const findCaptureSlotForOrientedFace: (_1:Array<(undefined | CubeTypes_grid)>, _2:CubeTypes_grid) => (null | number) = CapturedFaceMatchingJS.findCaptureSlotForOrientedFace as any;

export const findRepeatedFaces: (_1:Array<(undefined | CubeTypes_grid)>) => Array<[number, number]> = CapturedFaceMatchingJS.findRepeatedFaces as any;

export const validateFaceColors: (_1:CubeTypes_grid, _2:number) => boolean = CapturedFaceMatchingJS.validateFaceColors as any;

export const createSolvedCube: (_1:number) => CubeState_cubeState = CapturedFaceMatchingJS.createSolvedCube as any;
