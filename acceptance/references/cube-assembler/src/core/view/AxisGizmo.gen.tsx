/* TypeScript file generated from AxisGizmo.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as AxisGizmoJS from './AxisGizmo.res.mjs';

import type {camera as CubeGesture_camera} from './CubeGesture.gen.tsx';

import type {cubeState as CubeState_cubeState} from '../../../src/cube/CubeState.gen.tsx';

import type {faceKey as CubeState_faceKey} from '../../../src/cube/CubeState.gen.tsx';

export type axisName = "x" | "y" | "z";

export type gizmoAxis = {
  readonly name: axisName;
  readonly face: CubeState_faceKey;
  readonly center: [number, number];
  readonly tip: [number, number];
  readonly label: [number, number];
  readonly front: boolean
};

export type colorFrame = {
  readonly u: string;
  readonly r: string;
  readonly f: string;
  readonly d: string;
  readonly l: string;
  readonly b: string
};

export const gizmoCamera: (_1:number, _2:number, _3:number, _4:number) => CubeGesture_camera = AxisGizmoJS.gizmoCamera as any;

export const gizmoAxes: (_1:CubeGesture_camera) => gizmoAxis[] = AxisGizmoJS.gizmoAxes as any;

export const initialColorFrame: (_1:CubeState_cubeState, _2:number) => colorFrame = AxisGizmoJS.initialColorFrame as any;

export const advanceColorFrame: (_1:colorFrame, _2:number, _3:CubeState_faceKey, _4:number, _5:number, _6:number) => colorFrame = AxisGizmoJS.advanceColorFrame as any;
