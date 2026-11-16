/* TypeScript file generated from Preferences.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as PreferencesJS from './Preferences.res.mjs';

import type {swipeTuning as CubeGesture_swipeTuning} from '../../../src/core/view/CubeGesture.gen.tsx';

export type cubeView = "net" | "3d";

export type range = {
  readonly min: number;
  readonly max: number;
  readonly fallback: number
};

export type turnFeel = { readonly turnMs: number; readonly overshoot: boolean };

export type swipeRanges = {
  readonly startPx: range;
  readonly commitPercent: range;
  readonly flickMs: range
};

export type scrambleLength = "short" | "normal" | "long";

export type scrambleOptions = { readonly length: scrambleLength; readonly innerLayers: boolean };

export type theme = "system" | "light" | "dark";

export const mirrorCookie: string = PreferencesJS.mirrorCookie as any;

export const autoCaptureCookie: string = PreferencesJS.autoCaptureCookie as any;

export const soundCookie: string = PreferencesJS.soundCookie as any;

export const cubeSizeCookie: string = PreferencesJS.cubeSizeCookie as any;

export const colorProfileCookie: string = PreferencesJS.colorProfileCookie as any;

export const cubeViewCookie: string = PreferencesJS.cubeViewCookie as any;

export const stickerlessCookie: string = PreferencesJS.stickerlessCookie as any;

export const autoRotateCookie: string = PreferencesJS.autoRotateCookie as any;

export const viewHelpCookie: string = PreferencesJS.viewHelpCookie as any;

export const seamWideCookie: string = PreferencesJS.seamWideCookie as any;

export const turnSoundCookie: string = PreferencesJS.turnSoundCookie as any;

export const turnMsCookie: string = PreferencesJS.turnMsCookie as any;

export const turnOvershootCookie: string = PreferencesJS.turnOvershootCookie as any;

export const swipeStartCookie: string = PreferencesJS.swipeStartCookie as any;

export const swipeCommitCookie: string = PreferencesJS.swipeCommitCookie as any;

export const swipeFlickCookie: string = PreferencesJS.swipeFlickCookie as any;

export const autoCaptureFramesCookie: string = PreferencesJS.autoCaptureFramesCookie as any;

export const scrambleLengthCookie: string = PreferencesJS.scrambleLengthCookie as any;

export const scrambleInnerCookie: string = PreferencesJS.scrambleInnerCookie as any;

export const layerMovesCookie: string = PreferencesJS.layerMovesCookie as any;

export const layerMovesOn: (_1:string) => boolean = PreferencesJS.layerMovesOn as any;

export const vibrationCookie: string = PreferencesJS.vibrationCookie as any;

export const vibrationMsCookie: string = PreferencesJS.vibrationMsCookie as any;

export const fixtureServerUrlCookie: string = PreferencesJS.fixtureServerUrlCookie as any;

export const localUploadCookie: string = PreferencesJS.localUploadCookie as any;

export const themeCookie: string = PreferencesJS.themeCookie as any;

export const notationCookie: string = PreferencesJS.notationCookie as any;

export const captureModeCookie: string = PreferencesJS.captureModeCookie as any;

export const fixtureServerCookie: string = PreferencesJS.fixtureServerCookie as any;

export const readPreference: (_1:string, _2:string, _3:boolean) => boolean = PreferencesJS.readPreference as any;

export const preferenceCookie: (_1:string, _2:boolean) => string = PreferencesJS.preferenceCookie as any;

export const readSelection: (_1:string, _2:string) => (null | string) = PreferencesJS.readSelection as any;

export const selectionCookie: (_1:string, _2:string) => string = PreferencesJS.selectionCookie as any;

export const selectedCubeSize: (_1:string) => (null | number) = PreferencesJS.selectedCubeSize as any;

export const selectedCubeView: (_1:string) => (null | cubeView) = PreferencesJS.selectedCubeView as any;

export const readChoice: (_1:string, _2:string, _3:string[], _4:string) => string = PreferencesJS.readChoice as any;

export const readNumber: (_1:string, _2:string, _3:range) => number = PreferencesJS.readNumber as any;

export const numberCookie: (_1:string, _2:number) => string = PreferencesJS.numberCookie as any;

export const clearedCookie: (_1:string) => string = PreferencesJS.clearedCookie as any;

export const settingCookies: string[] = PreferencesJS.settingCookies as any;

export const selectedNotationFormat: (_1:string) => string = PreferencesJS.selectedNotationFormat as any;

export const selectedCaptureMode: (_1:string) => string = PreferencesJS.selectedCaptureMode as any;

export const readAutoCapture: (_1:string) => boolean = PreferencesJS.readAutoCapture as any;

export const readCaptureSound: (_1:string) => boolean = PreferencesJS.readCaptureSound as any;

export const turnSoundOn: (_1:string) => boolean = PreferencesJS.turnSoundOn as any;

export const turnMsRange: range = PreferencesJS.turnMsRange as any;

export const readTurnFeel: (_1:string) => turnFeel = PreferencesJS.readTurnFeel as any;

export const swipeRanges: swipeRanges = PreferencesJS.swipeRanges as any;

export const readSwipeTuning: (_1:string) => CubeGesture_swipeTuning = PreferencesJS.readSwipeTuning as any;

export const autoCaptureFramesRange: range = PreferencesJS.autoCaptureFramesRange as any;

export const readAutoCaptureFrames: (_1:string) => number = PreferencesJS.readAutoCaptureFrames as any;

export const readScrambleOptions: (_1:string) => scrambleOptions = PreferencesJS.readScrambleOptions as any;

export const vibrationOn: (_1:string) => boolean = PreferencesJS.vibrationOn as any;

export const vibrationMsRange: range = PreferencesJS.vibrationMsRange as any;

export const readVibrationMs: (_1:string) => number = PreferencesJS.readVibrationMs as any;

export const localUploadShown: (_1:string) => boolean = PreferencesJS.localUploadShown as any;

export const selectedTheme: (_1:string) => theme = PreferencesJS.selectedTheme as any;
