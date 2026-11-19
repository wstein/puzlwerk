import type { CubeProjection, CubeScene } from '../../viewer/src/contract.js';
import type { MotionTimingSource } from '../../viewer/src/motion-timing.js';
export type BridgeError = { readonly code: string; readonly path?: string; readonly id?: string };
export type BridgeResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: BridgeError };
export type Options = { readonly palette: Readonly<Record<string, string>>; readonly defaultColor: string; readonly colorFrame?: readonly [string,string,string,string,string,string]; readonly renderProfile?: CubeProjection['renderProfile']; readonly core?: CubeProjection['core']; readonly sourceFaceColors?: Readonly<Record<string,string>>; readonly presentation?: {readonly cellSize: number; readonly bodyGap: number; readonly bodyRadius: number; readonly bodyBevelSegments?: number; readonly bodyKind?: 'roundedBox'|'twoRadius'; readonly bodyInnerRadius?: number; readonly miterCutFaces?: boolean; readonly size?: number; readonly nominalEdge?: number; readonly layerWidths?: readonly number[]; readonly stickerWidth: number; readonly stickerRadius: number; readonly stickerOffset: number; readonly frameColor?: string} };
export type OpenValue = { readonly definition: unknown; readonly state: unknown; readonly appearance: unknown; readonly ids: { readonly pieces: readonly {readonly wire: string; readonly viewer: string}[]; readonly stickers: readonly {readonly wire: string; readonly viewer: string}[] }; readonly projection: CubeProjection };
export function parseNotation(size:number,text:string): BridgeResult<{readonly axis:'X'|'Y'|'Z';readonly layers:readonly number[];readonly turns:-1|1|2;readonly rotation:readonly [number,number,number,number]}>;
export function open(definition: string, state: string, appearance: string, options: Options): BridgeResult<OpenValue>;
export interface Player {
  beginPreview(axis: 'X'|'Y'|'Z', layers: readonly number[]): BridgeResult<{readonly pieceIds:readonly string[];update(angle:number):BridgeResult<void>;commit(turns:-1|1|2):BridgeResult<void>;cancel():BridgeResult<void>}>;
  state(): string;
  colorFrame(): BridgeResult<readonly [string,string,string,string,string,string]>;
  projection(): CubeProjection;
  turn(axis: 'X'|'Y'|'Z', layers: readonly number[], turns: -1|1|2, durationMs: number, timing?: MotionTimingSource): Promise<BridgeResult<void>>;
  cancel(): unknown;
  dispose(): void;
}
export function createPlayer(definition: string, state: string, appearance: string, options: Options, scene: CubeScene): BridgeResult<Player>;
