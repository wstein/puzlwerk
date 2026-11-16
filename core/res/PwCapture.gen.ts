/* TypeScript file generated from PwCapture.resi by genType. */

/* eslint-disable */
/* tslint:disable */

import * as PwCaptureJS from './PwCapture.res.mjs';

export type face = "U" | "R" | "F" | "D" | "L" | "B";

export type grid = Array<string[]>;

export type observation = {
  readonly photoId: string; 
  readonly slot: string; 
  readonly revision: number; 
  readonly sourceGrid: grid; 
  readonly sourceHash: string; 
  readonly guideProtocol: (undefined | string); 
  readonly guideStep: (undefined | number); 
  readonly mirrored: (undefined | boolean)
};

export type input = {
  readonly captureId: string; 
  readonly revision: number; 
  readonly size: number; 
  readonly observations: observation[]
};

export type placement = {
  readonly photoId: string; 
  readonly observationRevision: number; 
  readonly target: face; 
  readonly quarterTurns: number
};

export type legacyTransform = { readonly convention: string; readonly index: number };

export type slotPlacement = {
  readonly slot: string; 
  readonly target: face; 
  readonly quarterTurns: number
};

export type slotCandidateInput = {
  readonly candidateId: string; 
  readonly captureRevision: number; 
  readonly mappingFrame: string; 
  readonly canonicalTransform: (undefined | number[]); 
  readonly legacyTransform: (undefined | legacyTransform); 
  readonly mapping: slotPlacement[]
};

export type candidateInput = {
  readonly candidateId: string; 
  readonly captureRevision: number; 
  readonly mappingFrame: string; 
  readonly canonicalTransform: (undefined | number[]); 
  readonly legacyTransform: (undefined | legacyTransform); 
  readonly mapping: placement[]
};

export type projection = {
  readonly photoId: string; 
  readonly slot: string; 
  readonly observationRevision: number; 
  readonly target: face; 
  readonly quarterTurns: number; 
  readonly sourceHash: string; 
  readonly grid: grid
};

export type outcome<a> = 
    { ok: true; readonly value: a }
  | { ok: false; readonly error: string };

export abstract class capture { protected opaque!: any }; /* simulate opaque types */

export abstract class candidate { protected opaque!: any }; /* simulate opaque types */

export const createCapture: (_1:input) => outcome<capture> = PwCaptureJS.createCapture as any;

export const snapshot: (_1:capture) => input = PwCaptureJS.snapshot as any;

export const createCandidate: (_1:capture, _2:candidateInput) => outcome<candidate> = PwCaptureJS.createCandidate as any;

export const describeCandidate: (_1:candidate) => candidateInput = PwCaptureJS.describeCandidate as any;

export const photoForFace: (_1:capture, _2:(undefined | candidate), _3:face) => (undefined | projection) = PwCaptureJS.photoForFace as any;

export const projectMapping: (_1:capture, _2:candidate, _3:number[]) => outcome<projection[]> = PwCaptureJS.projectMapping as any;

export const identityTransform: () => number[] = PwCaptureJS.identityTransform as any;

export const createCandidateFromSlots: (_1:capture, _2:slotCandidateInput) => outcome<candidate> = PwCaptureJS.createCandidateFromSlots as any;

export const replaceObservation: (_1:capture, _2:number, _3:observation) => outcome<capture> = PwCaptureJS.replaceObservation as any;

export const invalidateCapture: (_1:capture, _2:number) => outcome<capture> = PwCaptureJS.invalidateCapture as any;

export const observationHistory: (_1:capture) => observation[] = PwCaptureJS.observationHistory as any;

export const synchronizeObservations: (_1:capture, _2:number, _3:observation[]) => outcome<capture> = PwCaptureJS.synchronizeObservations as any;

export const verifySourceHash: (_1:capture, _2:string, _3:string) => boolean = PwCaptureJS.verifySourceHash as any;
