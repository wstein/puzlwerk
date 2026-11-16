/* TypeScript file generated from CubeShadow.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeShadowJS from './CubeShadow.res.mjs';

export type vec3 = [number, number, number];

export type floorPoint = [number, number];

export const shadowOutlinePoints: number = CubeShadowJS.shadowOutlinePoints as any;

export const shadowFloorY: (_1:number) => number = CubeShadowJS.shadowFloorY as any;

export const rotateModelPoint: (_1:vec3, _2:number, _3:number) => vec3 = CubeShadowJS.rotateModelPoint as any;

export const shadowOutline: (_1:number, _2:number, _3:number) => floorPoint[] = CubeShadowJS.shadowOutline as any;

export const paddedOutline: (_1:floorPoint[]) => Float32Array = CubeShadowJS.paddedOutline as any;
