/* TypeScript file generated from CubeGesture.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as CubeGestureJS from './CubeGesture.res.mjs';

import type {faceKey as CubeState_faceKey} from '../../../src/cube/CubeState.gen.tsx';

export type vec = [number, number, number];

export type camera = {
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly size: number
};

export type surfaceHit = {
  readonly face: CubeState_faceKey;
  readonly point: vec;
  readonly normalAxis: number
};

export type swipeLayer = {
  readonly face: CubeState_faceKey;
  readonly depth: number;
  readonly width?: number;
  readonly axis: number;
  readonly sign: number
};

export type pressLevel = "layer" | "wide";

export type pressKeys = { readonly shiftKey: boolean };

export type seamDrag = {
  readonly layer: swipeLayer;
  readonly angle: number;
  readonly velocity: number
};

export type seamSwitch = {
  readonly locked: boolean;
  readonly layer: swipeLayer;
  readonly angle: number;
  readonly velocity: number
};

export type swipeTuning = {
  readonly startPx: number;
  readonly commitFraction: number;
  readonly flickMs: number
};

export type release = { readonly turns: number; readonly speed: number };

export type dragMotion = {
  readonly angle: number;
  readonly velocity: number;
  readonly time: number
};

export type startKind = "wait" | "nothing" | "turn";

export type swipeStart = {
  readonly kind: startKind;
  readonly layer: (null | swipeLayer);
  readonly seam: boolean;
  readonly wide: boolean
};

export type cubeGesture =
    "pending"
  | "turn"
  | "camera"
  | "two-finger"
  | "none";

export type screenPoint = [number, number];

export type motion = {
  readonly dx: number;
  readonly dy: number;
  readonly scale: number
};

export type twoFingerLock = "undecided" | "tilt" | "pinch";

export type wheel = {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;
  readonly ctrlKey: boolean
};

export type wheelGesture = "zoom" | "tilt";

export type wheelSwipe = {
  readonly startTime: number;
  readonly lastTime: number;
  readonly dx: number;
  readonly dy: number;
  readonly lastMagnitude: number;
  readonly shrinking: number;
  readonly coasting: boolean
};

export const pickCubeSurface: (_1:number, _2:number, _3:camera) => (null | surfaceHit) = CubeGestureJS.pickCubeSurface as any;

export const pickStickerSurface: (_1:number, _2:number, _3:camera) => (null | surfaceHit) = CubeGestureJS.pickStickerSurface as any;

export const viewPoint: (_1:vec, _2:camera) => vec = CubeGestureJS.viewPoint as any;

export const screenPoint: (_1:vec, _2:camera) => [number, number] = CubeGestureJS.screenPoint as any;

export const swipeStartPx: number = CubeGestureJS.swipeStartPx as any;

export const pickSwipeLayer: (_1:surfaceHit, _2:number, _3:number, _4:camera, _5:number) => (null | swipeLayer) = CubeGestureJS.pickSwipeLayer as any;

export const swipeLayerAngle: (_1:surfaceHit, _2:swipeLayer, _3:number, _4:number, _5:camera) => number = CubeGestureJS.swipeLayerAngle as any;

export const pressLevel: (_1:pressKeys) => pressLevel = CubeGestureJS.pressLevel as any;

export const blockLayer: (_1:number, _2:number, _3:number, _4:number) => swipeLayer = CubeGestureJS.blockLayer as any;

export const wholeCubeLayer: (_1:number, _2:number) => swipeLayer = CubeGestureJS.wholeCubeLayer as any;

export const standardWideLayer: (_1:swipeLayer, _2:number) => swipeLayer = CubeGestureJS.standardWideLayer as any;

export const onSeam: (_1:surfaceHit, _2:swipeLayer, _3:camera) => boolean = CubeGestureJS.onSeam as any;

export const seamWideLayer: (_1:surfaceHit, _2:swipeLayer, _3:number, _4:number, _5:camera) => (null | swipeLayer) = CubeGestureJS.seamWideLayer as any;

export const seamChoice: (_1:surfaceHit, _2:swipeLayer, _3:number, _4:number, _5:camera) => swipeLayer = CubeGestureJS.seamChoice as any;

export const seamSwitch: (_1:surfaceHit, _2:seamDrag, _3:number, _4:number, _5:number, _6:number, _7:camera) => seamSwitch = CubeGestureJS.seamSwitch as any;

export const turnCommitFraction: number = CubeGestureJS.turnCommitFraction as any;

export const flickMs: number = CubeGestureJS.flickMs as any;

export const defaultSwipeTuning: swipeTuning = CubeGestureJS.defaultSwipeTuning as any;

export const releasedQuarterTurns: (_1:number, _2:number, _3:number, _4:number) => number = CubeGestureJS.releasedQuarterTurns as any;

export const releaseDrag: (_1:number, _2:number, _3:number, _4:number, _5:boolean, _6:swipeTuning) => release = CubeGestureJS.releaseDrag as any;

export const followDrag: (_1:dragMotion, _2:number, _3:number) => dragMotion = CubeGestureJS.followDrag as any;

export const swipeStart: (_1:surfaceHit, _2:number, _3:number, _4:camera, _5:number, _6:pressLevel, _7:boolean) => swipeStart = CubeGestureJS.swipeStart as any;

export const gestureForPointerDown: (_1:string, _2:number, _3:(null | undefined | surfaceHit), _4:(null | undefined | cubeGesture)) => cubeGesture = CubeGestureJS.gestureForPointerDown as any;

export const lockedHintGapMs: number = CubeGestureJS.lockedHintGapMs as any;

export const lockedHintDue: (_1:(null | number), _2:number) => boolean = CubeGestureJS.lockedHintDue as any;

export const gestureWhenLayerMovesLocked: (_1:string, _2:number, _3:boolean, _4:(null | undefined | cubeGesture)) => cubeGesture = CubeGestureJS.gestureWhenLayerMovesLocked as any;

export const gestureWhenSwipeTurnsNothing: (_1:string) => cubeGesture = CubeGestureJS.gestureWhenSwipeTurnsNothing as any;

export const gestureAfterPointerUp: (_1:number, _2:(null | undefined | cubeGesture)) => (null | cubeGesture) = CubeGestureJS.gestureAfterPointerUp as any;

export const twoFingerMotion: (_1:[screenPoint, screenPoint], _2:[screenPoint, screenPoint]) => motion = CubeGestureJS.twoFingerMotion as any;

export const twoFingerLock: (_1:number, _2:number, _3:number, _4:twoFingerLock) => twoFingerLock = CubeGestureJS.twoFingerLock as any;

export const clampZoom: (_1:number, _2:number) => number = CubeGestureJS.clampZoom as any;

export const wheelGesture: (_1:wheel) => wheelGesture = CubeGestureJS.wheelGesture as any;

export const wheelSwipeGapMs: number = CubeGestureJS.wheelSwipeGapMs as any;

export const nextWheelSwipe: (_1:(null | wheelSwipe), _2:number, _3:number, _4:number) => wheelSwipe = CubeGestureJS.nextWheelSwipe as any;
