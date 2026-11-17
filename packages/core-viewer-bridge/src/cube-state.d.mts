import type { BridgeResult, Options } from './index.mjs';
/** Facelet arrays of CubeAssembler's CubeState, in the order of the net. */
export const FACE_KEYS: readonly ['u','r','f','d','l','b'];
export type FaceKey = 'u'|'r'|'f'|'d'|'l'|'b';
export type CubeStateFacelets = Readonly<Record<FaceKey, readonly string[]>>;
export type CubeStateDocuments = { readonly definition: string; readonly state: string; readonly appearance: string; readonly options: Options & { readonly presentation: NonNullable<Options['presentation']>; readonly core: NonNullable<Options['core']> } };
export function cubePresentation(size: number): NonNullable<Options['presentation']> & { readonly layerWidths: readonly number[]; readonly nominalEdge: number };
export function cubeStateDocuments(size: number, cube: CubeStateFacelets, palette: Readonly<Record<string, string>>): BridgeResult<CubeStateDocuments>;
export function cubeStateFromWire(size: number, state: string, appearance: string): BridgeResult<Record<FaceKey, string[]>>;
export function faceStickerIds(size: number, face: FaceKey): string[];
