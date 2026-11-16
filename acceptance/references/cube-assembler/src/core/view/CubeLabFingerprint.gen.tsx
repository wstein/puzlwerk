/* TypeScript file generated from CubeLabFingerprint.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeLabFingerprintJS from './CubeLabFingerprint.res.mjs';

import type {cubeTurn as CubeMoves_cubeTurn} from '../../../src/cube/CubeMoves.gen.tsx';

export type payload = {
  readonly size: number;
  readonly moves: string;
  readonly format: string
};

export const format: string = CubeLabFingerprintJS.format as any;

export const movesText: (_1:CubeMoves_cubeTurn[], _2:number) => string = CubeLabFingerprintJS.movesText as any;

export const payload: (_1:CubeMoves_cubeTurn[], _2:number) => payload = CubeLabFingerprintJS.payload as any;

export const escapeForScript: (_1:string) => string = CubeLabFingerprintJS.escapeForScript as any;

export const json: (_1:CubeMoves_cubeTurn[], _2:number) => string = CubeLabFingerprintJS.json as any;
