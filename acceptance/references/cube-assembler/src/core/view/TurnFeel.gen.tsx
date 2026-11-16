/* TypeScript file generated from TurnFeel.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as TurnFeelJS from './TurnFeel.res.mjs';

export type note = {
  readonly frequency: number;
  readonly start: number;
  readonly duration: number
};

export const magneticEase: (_1:number) => number = TurnFeelJS.magneticEase as any;

export const turnEase: (_1:number, _2:boolean) => number = TurnFeelJS.turnEase as any;

export const defaultTurnMs: number = TurnFeelJS.defaultTurnMs as any;

export const settleDuration: (_1:number, _2:number) => number = TurnFeelJS.settleDuration as any;

export const scrambleDuration: (_1:number) => number = TurnFeelJS.scrambleDuration as any;

export const turnClickGain: (_1:number, _2:boolean) => number = TurnFeelJS.turnClickGain as any;

export const wideCueNotes: note[] = TurnFeelJS.wideCueNotes as any;

export const modeCueGain: number = TurnFeelJS.modeCueGain as any;

export const magnetReach: number = TurnFeelJS.magnetReach as any;

export const magneticDragAngle: (_1:number) => number = TurnFeelJS.magneticDragAngle as any;

export const magnetImpact: number = TurnFeelJS.magnetImpact as any;

export const magneticSettleAngle: (_1:number, _2:number, _3:number, _4:number, _5:number) => number = TurnFeelJS.magneticSettleAngle as any;
