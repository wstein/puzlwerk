import type { BridgeResult, Options } from './index.mjs';
import type { CubeProjection } from '../../viewer/src/contract.js';
/** Facelet arrays of CubeAssembler's CubeState, in the order of the net. */
export const FACE_KEYS: readonly ['u','r','f','d','l','b'];
export type FaceKey = 'u'|'r'|'f'|'d'|'l'|'b';
export type CubeStateFacelets = Readonly<Record<FaceKey, readonly string[]>>;
export type CubeStateDocuments = { readonly definition: string; readonly state: string; readonly appearance: string; readonly options: Options & { readonly presentation: NonNullable<Options['presentation']>; readonly core: NonNullable<Options['core']> } };
export function cubePresentation(size: number): NonNullable<Options['presentation']> & { readonly layerWidths: readonly number[]; readonly nominalEdge: number };
export function cubeStateDocuments(size: number, cube: CubeStateFacelets, palette: Readonly<Record<string, string>>, options?: { readonly movePolicy?: MovePolicy }): BridgeResult<CubeStateDocuments>;
export function cubeStateFromWire(size: number, state: string, appearance: string): BridgeResult<Record<FaceKey, string[]>>;
export function faceStickerIds(size: number, face: FaceKey): string[];
export type MovePolicy = 'outer-wide' | 'any';
export type CubeTurn = { readonly face: 'U'|'R'|'F'|'D'|'L'|'B'; readonly depth: number; readonly width?: number; readonly turns: number };
export type CubeMove = { readonly axis: 'X'|'Y'|'Z'; readonly layers: readonly number[]; readonly turns: -1|1|2 };
/** CubeAssembler turn to Core move (`Player.turn` arguments); errors InvalidSize, InvalidTurn. */
export function cubeTurnToMove(size: number, turn: CubeTurn): BridgeResult<CubeMove>;
/** Core move to the CubeAssembler turn of the nearer face; errors InvalidSize, InvalidMove. */
export function moveToCubeTurn(size: number, move: CubeMove): BridgeResult<CubeTurn>;
export type PaletteArtwork = { readonly appearance?: CubeProjection['appearance']; readonly picture?: CubeProjection['picture']; readonly stickers: readonly { readonly id: string; readonly color: string; readonly imageId?: string; readonly sourceFace?: CubeProjection['pieces'][number]['stickers'][number]['sourceFace']; readonly picture?: CubeProjection['pieces'][number]['stickers'][number]['picture'] }[] };
/** Sticker colors of a new palette for the scene's current projection, as the argument of `CubeScene.setArtwork`. Errors: InvalidSize, InvalidPalette, InvalidAppearance, DefinitionMismatch, InvalidProjection. */
export function paletteArtwork(size: number, appearance: string, palette: Readonly<Record<string, string>>, projection: CubeProjection): BridgeResult<PaletteArtwork>;
