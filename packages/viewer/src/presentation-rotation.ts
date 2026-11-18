// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from "three";

/** Inverse of the historical camera-orbit view rotation, with no state changes. */
export function rotatePresentation(root: THREE.Object3D, yaw: number, pitch: number): void {
  if (![yaw, pitch].every(Number.isFinite)) throw Error("Invalid presentation rotation");
  root.rotation.set(pitch, -yaw, 0, "XYZ");
}

/** Every orientation of a centered assembly fits without moving the observer on drag. */
export function presentationCameraRadius(aspect: number, sphereRadius: number, fov: number): number {
  if (![aspect, sphereRadius, fov].every(Number.isFinite) || aspect <= 0 || sphereRadius <= 0 || fov <= 0 || fov >= 180)
    throw Error("Invalid presentation camera");
  const vertical = THREE.MathUtils.degToRad(fov / 2);
  const horizontal = Math.atan(Math.tan(vertical) * aspect);
  return sphereRadius * 1.08 / Math.sin(Math.min(vertical, horizontal));
}

/** Includes rounded plastic and the internal seam overlap, through every legal turn. */
export function cubePresentationRadius(halfExtent: number): number {
  if (!Number.isFinite(halfExtent) || halfExtent <= 0) throw Error("Invalid cube extent");
  return Math.sqrt(3) * (halfExtent + .001);
}

/** Called on initialization, resize or explicit zoom; never drag or orientation reset. */
export function fitPresentationCamera(camera: THREE.PerspectiveCamera, sphereRadius: number, zoom = 1): number {
  if (!Number.isFinite(zoom) || zoom <= 0) throw Error("Invalid presentation zoom");
  const distance = presentationCameraRadius(camera.aspect, sphereRadius, camera.fov) * zoom;
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  camera.far = Math.max(100, distance + sphereRadius * 2);
  camera.updateProjectionMatrix();
  return distance;
}

/**
 * Stage options that fit a cube of any size: `{ viewPolicy, casterEnvelope }` for `createCubeStage`, from the cube's half extent
 * (`layerEdge(widths) / 2`). The camera keeps the whole turn sphere in view at every orientation; the group is not scaled, so
 * lights and shadow settings keep their meaning. The stage default is the same fit for half extent 1.
 */
export function cubeStageFit(halfExtent: number): {
  readonly viewPolicy: (view: { readonly aspect: number; readonly fovDegrees: number; readonly zoom: number }) => { readonly distance: number; readonly far: number; readonly groupScale: number };
  readonly casterEnvelope: { readonly radius: number; readonly clearance: number };
} {
  const radius = cubePresentationRadius(halfExtent);
  return {
    viewPolicy: (view) => {
      const distance = presentationCameraRadius(view.aspect, radius, view.fovDegrees) * view.zoom;
      return { distance, far: Math.max(100, distance + 2 * radius), groupScale: 1 };
    },
    casterEnvelope: { radius, clearance: .08 * Math.max(1, halfExtent) },
  };
}
