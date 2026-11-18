// SPDX-License-Identifier: AGPL-3.0-or-later
// The view presets of the CubeAssembler 3D view, as display orientations of the stage. Values follow wstein/cube-assembler
// origin/main 18ecf8b: src/core/view/CubeViewState.res (facePreset, isometricAngles) and src/client/view3d/useCubeRenderer.ts
// (model matrix = mat4RotateX(pitch) then mat4RotateY(yaw) on the identity = Rx(pitch) * Ry(yaw), observer on +Z, +Y up).
// The zoom that CubeAssembler's "isometric" reset also sets belongs to `CubeStage.setZoom` and is not part of a preset.
import { Euler, Quaternion } from "three";

export const VIEW_PRESETS = ["up", "right", "front", "down", "left", "back", "isometric", "iso-back"] as const;
export type ViewPreset = (typeof VIEW_PRESETS)[number];

const QUARTER = Math.PI / 2;
/** Up and Down stop short of the pole (CubeAssembler: quarter turn minus 0.05). */
const PITCH_LIMIT = QUARTER - 0.05;
const ISOMETRIC_PITCH = 0.52, ISOMETRIC_YAW = -0.74;

export function viewPresetAngles(preset: ViewPreset): { readonly pitch: number; readonly yaw: number } {
  switch (preset) {
    case "up": return { pitch: PITCH_LIMIT, yaw: 0 };
    case "down": return { pitch: -PITCH_LIMIT, yaw: 0 };
    case "front": return { pitch: 0, yaw: 0 };
    case "back": return { pitch: 0, yaw: Math.PI };
    case "right": return { pitch: 0, yaw: -QUARTER };
    case "left": return { pitch: 0, yaw: QUARTER };
    case "isometric": return { pitch: ISOMETRIC_PITCH, yaw: ISOMETRIC_YAW };
    case "iso-back": return { pitch: -ISOMETRIC_PITCH, yaw: ISOMETRIC_YAW + Math.PI };
    default: throw Error(`Unknown view preset: ${String(preset)}`);
  }
}

/** Display orientation (x, y, z, w) of a preset: Rx(pitch) * Ry(yaw), i.e. three.js Euler(pitch, yaw, 0, "XYZ"). */
export function viewPresetOrientation(preset: ViewPreset): [number, number, number, number] {
  const { pitch, yaw } = viewPresetAngles(preset);
  return new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, "XYZ")).toArray() as [number, number, number, number];
}
