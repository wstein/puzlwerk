import type { CubeProjection, CubeScene } from '../../viewer/src/contract.js';
export type BridgeError = { readonly code: string; readonly path?: string; readonly id?: string };
export type BridgeResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: BridgeError };
export type Options = { readonly palette: Readonly<Record<string, string>>; readonly defaultColor: string; readonly presentation?: {readonly cellSize: number; readonly bodyGap: number; readonly bodyRadius: number; readonly stickerWidth: number; readonly stickerRadius: number; readonly stickerOffset: number; readonly frameColor?: string} };
export type OpenValue = { readonly definition: unknown; readonly state: unknown; readonly appearance: unknown; readonly ids: { readonly pieces: readonly {readonly wire: string; readonly viewer: string}[]; readonly stickers: readonly {readonly wire: string; readonly viewer: string}[] }; readonly projection: CubeProjection };
export function open(definition: string, state: string, appearance: string, options: Options): BridgeResult<OpenValue>;
export interface Player {
  state(): string;
  projection(): CubeProjection;
  turn(axis: 'X'|'Y'|'Z', layers: readonly number[], turns: -1|1|2, durationMs: number): Promise<BridgeResult<void>>;
  cancel(): unknown;
  dispose(): void;
}
export function createPlayer(definition: string, state: string, appearance: string, options: Options, scene: CubeScene): BridgeResult<Player>;
