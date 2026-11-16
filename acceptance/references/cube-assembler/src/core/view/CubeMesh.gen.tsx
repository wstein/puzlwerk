/* TypeScript file generated from CubeMesh.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeMeshJS from './CubeMesh.res.mjs';

import type {cubeState as CubeState_cubeState} from '../../../src/cube/CubeState.gen.tsx';

import type {faceKey as CubeState_faceKey} from '../../../src/cube/CubeState.gen.tsx';

export type turningLayer = {
  readonly face: CubeState_faceKey;
  readonly depth?: number;
  readonly width?: number;
  readonly angle: number;
  readonly highlight?: boolean
};

export abstract class indices { protected opaque!: any }; /* simulate opaque types */

export type meshData = {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  readonly occlusion: Float32Array;
  readonly indices: indices;
  readonly vertexCount: number;
  readonly indexCount: number
};

export const buildCubeMesh: (_1:CubeState_cubeState, _2:number, _3:{[id: string]: string}, _4:boolean, _5:(undefined | turningLayer)) => meshData = CubeMeshJS.buildCubeMesh as any;
