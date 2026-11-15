// SPDX-License-Identifier: AGPL-3.0-or-later
// Pivot grouping adapted from Cubistry physical-scene.ts; see NOTICE.
import * as THREE from 'three';
import { fail, ok, validateProjection, validateTransition } from './contract.js';
import type { CubeProjection, CubeScene, Result, Transition, ViewerOptions } from './contract.js';

type Clock = { now(): number; request(cb: (time: number) => void): number; cancel(id: number): void };
type Backend = { render(scene: THREE.Scene): void; dispose(): void };
type Pending = { controller: AbortController; finish(result: Result<void>): void; from?: CubeProjection };
const copy = <T>(x: T): T => structuredClone(x);
const sameProjection = (a: CubeProjection, b: CubeProjection) => {
  const normalize = (p: CubeProjection) => [...p.pieces].sort((x,y) => x.id.localeCompare(y.id)).map(x => ({...x, stickers: [...x.stickers].sort((s,t) => s.id.localeCompare(t.id))}));
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
};

export function createSceneForTest(options: ViewerOptions, clock: Clock, backend: Backend, reducedMotion: () => boolean = () => false): CubeScene {
  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));
  let projection: CubeProjection | undefined, pending: Pending | undefined, disposed = false, lost = false;
  let frame: number | undefined, animation: ((now: number) => boolean) | undefined;
  const resources: {dispose(): void}[] = [];
  function clear() { root.clear(); for (const r of resources.splice(0)) r.dispose(); }
  function draw() { if (!disposed && !lost && frame === undefined) frame = clock.request(tick); }
  function tick(time: number) {
    frame = undefined;
    if (disposed || lost) return;
    const again = animation?.(time) ?? false;
    scene.updateMatrixWorld(true); backend.render(scene);
    if (again) draw();
  }
  function present(p: CubeProjection, assets: Map<string, CanvasImageSource>) {
    clear();
    for (const piece of p.pieces) {
      const body = new THREE.Group(); body.name = piece.id;
      body.position.set(...piece.transform.position); body.quaternion.set(...piece.transform.rotation);
      const geometry = new THREE.BoxGeometry(.94,.94,.94); const material = new THREE.MeshLambertMaterial({color: 0x222222}); resources.push(geometry, material); body.add(new THREE.Mesh(geometry, material));
      for (const sticker of piece.stickers) {
        const geo = new THREE.PlaneGeometry(...sticker.size);
        const texture = sticker.imageId ? new THREE.Texture(assets.get(sticker.imageId) as TexImageSource) : undefined;
        if (texture) { texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true; resources.push(texture); }
        const mat = new THREE.MeshLambertMaterial({color: sticker.color, ...(texture ? {map: texture, transparent: true} : {})}); resources.push(geo, mat);
        const mesh = new THREE.Mesh(geo, mat); mesh.name = sticker.id;
        mesh.position.set(...sticker.transform.position); mesh.quaternion.set(...sticker.transform.rotation); body.add(mesh);
      }
      root.add(body);
    }
    projection = p; draw();
  }
  const status = (): Result<void> => disposed ? fail('Disposed','Scene disposed') : lost ? fail('ContextLost','Context lost') : pending ? fail('Busy','Operation in progress') : ok(undefined);
  function begin(from?: CubeProjection) {
    let finish!: (r: Result<void>) => void;
    const promise = new Promise<Result<void>>(resolve => { finish = resolve; });
    const op: Pending = {controller: new AbortController(), finish, from}; pending = op;
    return {op,promise};
  }
  function finish(op: Pending, result: Result<void>) { if (pending !== op) return; pending = undefined; op.finish(result); }
  async function assetsFor(p: CubeProjection, op: Pending): Promise<Map<string, CanvasImageSource> | undefined> {
    const assets = new Map<string, CanvasImageSource>();
    try {
      for (const imageId of new Set(p.pieces.flatMap(piece => piece.stickers.flatMap(s => s.imageId ? [s.imageId] : [])))) {
        const r = await options.resolveAsset(imageId, op.controller.signal);
        if (pending !== op) return undefined;
        if (!r.ok) { finish(op,fail('UnresolvedAsset',`Unable to resolve ${imageId}`)); return undefined; }
        assets.set(imageId,r.value);
      }
      return assets;
    } catch { finish(op,fail('UnresolvedAsset','Asset resolver failed')); return undefined; }
  }
  const api: CubeScene = {
    setProjection(input) {
      const s = status(); if (!s.ok) return Promise.resolve(s);
      const validation = validateProjection(input); if (!validation.ok) return Promise.resolve(validation);
      const p = copy(input); const {op,promise} = begin();
      void assetsFor(p,op).then(assets => { if (assets && pending === op) { present(p,assets); finish(op,ok(undefined)); } });
      return promise;
    },
    transition(input: Transition) {
      const s = status(); if (!s.ok) return Promise.resolve(s);
      const validation = validateTransition(input); if (!validation.ok) return Promise.resolve(validation);
      if (!projection || !sameProjection(projection,input.from)) return Promise.resolve(fail('InvalidTransition','Source does not match current projection'));
      const t = copy(input), from = projection; const {op,promise} = begin(from);
      // Stickers are invariant in a transition; reuse the currently rendered materials.
      const pivot = new THREE.Group(); pivot.position.set(...t.pivot); root.add(pivot); root.updateMatrixWorld(true);
      for (const id of t.pieceIds) { const body = root.getObjectByName(id); if (body) pivot.attach(body); }
      const axis = new THREE.Vector3(...t.axis); const started = clock.now();
      const duration = reducedMotion() ? 0 : t.durationMs;
      const update = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min(1,Math.max(0,(now-started)/duration));
        const eased = progress * progress * (3 - 2 * progress);
        pivot.quaternion.setFromAxisAngle(axis,t.signedAngleRadians*eased);
        if (progress < 1) return true;
        pivot.updateMatrixWorld(true);
        for (const id of t.pieceIds) { const body = pivot.getObjectByName(id); if (body) root.attach(body); }
        pivot.removeFromParent();
        // Snap to exact endpoint, avoiding accumulated floating point error.
        for (const piece of t.to.pieces) { const body = root.getObjectByName(piece.id)!; body.position.set(...piece.transform.position); body.quaternion.set(...piece.transform.rotation); }
        projection = t.to; animation = undefined; finish(op,ok(undefined)); return false;
      };
      animation = update;
      if (duration === 0) update(started); draw();
      return promise;
    },
    cancel() {
      if (disposed) return fail('Disposed','Scene disposed');
      if (pending) {
        const op = pending; op.controller.abort(); animation = undefined;
        if (op.from) {
          // Reparent selected bodies, then restore the exact source transforms.
          for (const piece of op.from.pieces) { const body = root.getObjectByName(piece.id); if (body) { root.attach(body); body.position.set(...piece.transform.position); body.quaternion.set(...piece.transform.rotation); } }
          for (const child of [...root.children]) if (!op.from.pieces.some(p => p.id === child.name)) child.removeFromParent();
          projection = op.from; draw();
        }
        finish(op,fail('Cancelled','Operation cancelled'));
      }
      return ok(undefined);
    },
    invalidate() { const s = status(); if (s.ok) draw(); return s; },
    dispose() { if (disposed) return; api.cancel(); disposed = true; if (frame !== undefined) clock.cancel(frame); frame = undefined; clear(); backend.dispose(); },
  };
  // Context loss is wired by the browser host; kept private to the implementation.
  Object.assign(api, {contextLost() { if (disposed || lost) return; const op = pending; if (op) { const finishOriginal = op.finish; op.finish = () => finishOriginal(fail('ContextLost','Context lost')); api.cancel(); } lost = true; if (frame !== undefined) clock.cancel(frame); frame = undefined; }});
  return api;
}
