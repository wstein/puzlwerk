/* TypeScript file generated from CubeViewState.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeViewStateJS from './CubeViewState.res.mjs';

import type {axis as CubeGeometry_axis} from '../../../src/cube/CubeGeometry.gen.tsx';

import type {cubeState as CubeState_cubeState} from '../../../src/cube/CubeState.gen.tsx';

export type vec3 = [number, number, number];

export type face = "u" | "d" | "f" | "b" | "r" | "l";

export type viewAngles = { readonly pitch: number; readonly yaw: number };

export type seams = {
  readonly top: boolean;
  readonly bot: boolean;
  readonly rt: boolean;
  readonly lt: boolean
};

export const defaultStickerHex: {[id: string]: string} = CubeViewStateJS.defaultStickerHex as any;

export const autoRotateResumeDelayMs: number = CubeViewStateJS.autoRotateResumeDelayMs as any;

export const autoRotateRadiansPerMs: number = CubeViewStateJS.autoRotateRadiansPerMs as any;

export const isometricPitch: number = CubeViewStateJS.isometricPitch as any;

export const isometricYaw: number = CubeViewStateJS.isometricYaw as any;

export const facePreset: (_1:face) => viewAngles = CubeViewStateJS.facePreset as any;

export const isometricAngles: (_1:boolean) => viewAngles = CubeViewStateJS.isometricAngles as any;

export const tiltPitch: (_1:number, _2:boolean) => number = CubeViewStateJS.tiltPitch as any;

export const rotateYaw: (_1:number, _2:boolean) => number = CubeViewStateJS.rotateYaw as any;

export const wheelZoom: (_1:number, _2:number, _3:boolean, _4:number) => number = CubeViewStateJS.wheelZoom as any;

export const hexToRgb: (_1:string) => vec3 = CubeViewStateJS.hexToRgb as any;

export const getFaceletColor: (_1:CubeState_cubeState, _2:number, _3:face, _4:number, _5:number, _6:number) => string = CubeViewStateJS.getFaceletColor as any;

export const getDefaultZoom: (_1:number) => number = CubeViewStateJS.getDefaultZoom as any;

export const getFaceSeams: (_1:face, _2:number, _3:number, _4:number, _5:number) => seams = CubeViewStateJS.getFaceSeams as any;

export const rotateVec: (_1:vec3, _2:CubeGeometry_axis, _3:number) => vec3 = CubeViewStateJS.rotateVec as any;
