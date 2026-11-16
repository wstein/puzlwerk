/* TypeScript file generated from RandomSpin.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as RandomSpinJS from './RandomSpin.res.mjs';

export type frame = {
  readonly angle: number;
  readonly swapped: boolean;
  readonly finished: boolean
};

export const spinMs: number = RandomSpinJS.spinMs as any;

export const spinFrame: (_1:number) => frame = RandomSpinJS.spinFrame as any;
