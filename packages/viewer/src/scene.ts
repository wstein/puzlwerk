// SPDX-License-Identifier: AGPL-3.0-or-later
// Pivot grouping adapted from Cubistry physical-scene.ts; see NOTICE.
import * as THREE from 'three';
import type { OuterSides } from './two-radius-body.js';
import { createStickerGeometry, createPlasticMaterial, createStickerMaterial, presentationLayerProfile, stickerRadiusFor } from './presentation-preset.js';
import { createPresentationStudio } from './studio.js';
import { sourceBody, pictureTexture } from './artwork-scene.js';
import { stickerWindow } from './projected-uv.js';
import { sourceFaceIndex } from './body-artwork.js';
import { fail, ok, sameValues, validateProjection, validateTransition } from './contract.js';
import type { CubeProjection, CubeScene, Result, Transition, ViewerOptions } from './contract.js';

type Clock = { now(): number; request(cb: (time: number) => void): number; cancel(id: number): void; isHidden?(): boolean; onVisibility?(cb: () => void): () => void };
type Backend = { render(scene: THREE.Scene): void; dispose(): void };
type Pending = { controller: AbortController; finish(result: Result<void>): void; from?: CubeProjection; to?: CubeProjection };
const copy = <T>(x: T): T => structuredClone(x);
const sameProjection = (a: CubeProjection, b: CubeProjection) => {
  const normalize = (p: CubeProjection) => [...p.pieces].sort((x,y) => x.id.localeCompare(y.id)).map(x => ({...x, stickers: [...x.stickers].sort((s,t) => s.id.localeCompare(t.id))}));
  return sameValues(normalize(a), normalize(b)) && sameValues(a.presentation,b.presentation) && sameValues(a.core,b.core) && sameValues(a.appearance,b.appearance) && sameValues(a.picture,b.picture);
};

export function createSceneForTest(options: ViewerOptions, clock: Clock, backend: Backend): CubeScene {
  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);
  const studio = createPresentationStudio(scene);

  let projection: CubeProjection | undefined, pending: Pending | undefined, livePending: Pending | undefined, disposed = false, lost = false;
  let referenceWidths: readonly number[] | undefined;
  const referenceFaces=new Map<string,{normal:readonly number[];up:readonly number[]}>(), referencePictures=new Map<string,unknown>();
  function recordReferences(p: CubeProjection, reset = false) {
    if(reset){referenceWidths=undefined;referenceFaces.clear();referencePictures.clear();}
    if(p.picture && !referenceWidths)referenceWidths=copy(p.picture.widths);
    for(const sticker of p.pieces.flatMap(piece=>piece.stickers)) {
      if(sticker.sourceFace && !referenceFaces.has(sticker.id))referenceFaces.set(sticker.id,{normal:copy(sticker.sourceFace.normal),up:copy(sticker.sourceFace.up)});
      if(sticker.picture && !referencePictures.has(sticker.id))referencePictures.set(sticker.id,copy(sticker.picture));
    }
  }
  let frame: number | undefined, animation: ((now: number) => boolean) | undefined;
  let pausedAt: number | undefined, pausedDuration = 0, dirty = false;
  const hidden = () => clock.isHidden?.() ?? false;
  const unsubscribe = clock.onVisibility?.(() => {
    if (hidden()) {
      if (animation && pausedAt === undefined) pausedAt = clock.now();
      if (frame !== undefined) { clock.cancel(frame); frame = undefined; dirty = true; }
    } else {
      if (pausedAt !== undefined) { pausedDuration += clock.now() - pausedAt; pausedAt = undefined; }
      if (dirty || animation) draw();
    }
  });
  const resources: {dispose(): void}[] = [];
  function clear() { root.clear(); for (const r of resources.splice(0)) r.dispose(); }
  function resourcesForCommit(candidate: {dispose():void}[]) { resources.push(...candidate); }
  function draw() { dirty = true; if (!disposed && !lost && !hidden() && frame === undefined) frame = clock.request(tick); }
  function tick(time: number) {
    frame = undefined;
    if (disposed || lost || hidden()) return;
    dirty = false;
    const again = animation?.(time) ?? false;
    scene.updateMatrixWorld(true); backend.render(scene);
    if (again) draw();
  }
  function present(p: CubeProjection, assets: Map<string, CanvasImageSource>, live = false) {
    const staging = new THREE.Group(), cores: THREE.Object3D[] = [];
    const candidateResources: {dispose():void}[] = [];
    const pictureTextures = new Map<string,THREE.Texture>();
    const artworkCache={cuts:new Map<string,THREE.MeshPhysicalMaterial>(),miters:new Map<string,THREE.MeshPhysicalMaterial>(),artwork:new Map<string,THREE.BufferGeometry>(),planar:new Map<string,THREE.BufferGeometry>()};
    const bodyGeometries=new Map<string,THREE.BufferGeometry>(),stickerGeometries=new Map<string,THREE.BufferGeometry>();
    try {
    if (p.picture) for (const [face,id] of Object.entries(p.picture.faces)) {
      const texture=new THREE.Texture(assets.get(id) as TexImageSource); texture.colorSpace=THREE.SRGBColorSpace; texture.flipY=false; texture.needsUpdate=true;
      candidateResources.push(texture); pictureTextures.set(face,texture);
    }
    const profile = p.presentation ? presentationLayerProfile(Array(p.presentation.size).fill(1), p.presentation.nominalEdge) : presentationLayerProfile([1,1],2);
    if (p.core) {
      const geometry = new THREE.SphereGeometry(1,48,24);
      const material = createPlasticMaterial(p.appearance?.construction === 'stickerless' ? (p.appearance.coreColor ?? '#3a3d42') : (p.appearance?.frameColor ?? '#1b2431'));
      candidateResources.push(geometry,material);
      const core = new THREE.Mesh(geometry,material);
      core.position.set(...p.core.center); core.scale.setScalar(.8 * p.core.halfExtent);
      core.castShadow = true; core.receiveShadow = true; cores.push(core);
      candidateResources.push({dispose() { core.removeFromParent(); }});
    }
    for (const piece of p.pieces) {
      const body = new THREE.Group(); body.name = piece.id;
      body.position.set(...piece.transform.position); body.quaternion.set(...piece.transform.rotation);
      const sides: [[boolean, boolean], [boolean, boolean], [boolean, boolean]] = [[false,false],[false,false],[false,false]];
      for (const sticker of piece.stickers) {
        const n = new THREE.Vector3(0,0,1).applyQuaternion(new THREE.Quaternion(...sticker.transform.rotation));
        const axis = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)].indexOf(Math.max(Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)));
        const component = [n.x,n.y,n.z][axis];
        if (Math.abs(component) > .999) sides[axis][component > 0 ? 1 : 0] = true;
      }
      const offsets = piece.stickers.map(s => Math.hypot(...s.transform.position)).filter(n => n > .1);
      const width = offsets.length ? Math.max(.94, Math.min(.99, Math.min(...offsets) * 2 - .002)) : .94;
      const cell=piece.geometry?.cellSize ?? [width+.01,width+.01,width+.01], outer=piece.geometry?.outerSides ?? sides as OuterSides;
      const geometryKey=JSON.stringify([cell,outer]);let geometry=bodyGeometries.get(geometryKey);
      if(!geometry){geometry=profile.body(cell as [number,number,number],outer);bodyGeometries.set(geometryKey,geometry);candidateResources.push(geometry);}
      const material = createPlasticMaterial(p.appearance?.frameColor ?? '#1b2431'); candidateResources.push(material);
      const tileTextures=new Map<string,THREE.Texture>();
      for (const sticker of piece.stickers) if (sticker.imageId) {
        const texture=new THREE.Texture(assets.get(sticker.imageId) as TexImageSource); texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
        candidateResources.push(texture); tileTextures.set(sticker.id,texture);
      }
      const surface=sourceBody(piece,p,geometry,material,pictureTextures,tileTextures,candidateResources,artworkCache);
      const mesh = new THREE.Mesh(surface.geometry, surface.material); mesh.castShadow = true; mesh.receiveShadow = true; body.add(mesh);
      for (const sticker of piece.stickers) {
        const radius=Math.min(p.presentation ? stickerRadiusFor(p.presentation.size,p.presentation.nominalEdge) : .055, ...sticker.size.map(x => x / 2));
        const stickerKey=JSON.stringify([...sticker.size,radius]);let geo=stickerGeometries.get(stickerKey);
        if(!geo){geo=createStickerGeometry(...sticker.size,radius);stickerGeometries.set(stickerKey,geo);candidateResources.push(geo);}
        let texture=tileTextures.get(sticker.id); let color=sticker.color;
        if (sticker.picture && p.picture) { const win=stickerWindow(p.picture.widths,.87,sticker.picture.face,sticker.picture.layerIndex,sticker.size); texture=pictureTexture(pictureTextures.get(sticker.picture.face)!,win,candidateResources); color='#ffffff'; }
        const mat = createStickerMaterial(texture ?? null, color); if (texture && !sticker.picture && !sticker.sourceFace) mat.transparent = true; candidateResources.push(mat);
        const mesh = new THREE.Mesh(geo, mat); mesh.name = sticker.id;
        mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = p.appearance?.construction !== 'stickerless' || !sticker.sourceFace;
        mesh.position.set(...sticker.transform.position); mesh.quaternion.set(...sticker.transform.rotation); body.add(mesh);
      }
      staging.add(body);
    }
    if (live) {
      const pairs = staging.children.map(candidate => ({candidate, existing:root.getObjectByName(candidate.name)}));
      if (pairs.some(pair => !pair.existing)) throw Error('Missing live body');
      const keep=new Set<{dispose():void}>(), discard=new Set<{dispose():void}>();
      const reuse=(old:THREE.MeshStandardMaterial, next:THREE.MeshStandardMaterial) => {
        keep.add(old); if(old.map) keep.add(old.map); discard.add(next); if(next.map) discard.add(next.map); return old;
      };
      if (p.picture && projection?.picture && sameValues(p.picture,projection.picture)) {
        const oldStickers=new Map(projection.pieces.flatMap(piece=>piece.stickers).map(sticker=>[sticker.id,sticker]));
        for (const piece of p.pieces) for (const sticker of piece.stickers) {
          const old=oldStickers.get(sticker.id);
          if (!sticker.picture || !old || !sameValues(sticker.picture,old.picture) || !sticker.sourceFace || !old.sourceFace || !sameValues(sticker.sourceFace.normal,old.sourceFace.normal) || !sameValues(sticker.sourceFace.up,old.sourceFace.up)) continue;
          const previous=root.getObjectByName(sticker.id) as THREE.Mesh, next=staging.getObjectByName(sticker.id) as THREE.Mesh;
          if (previous && next) next.material=reuse(previous.material as THREE.MeshStandardMaterial,next.material as THREE.MeshStandardMaterial);
          const previousBody=root.getObjectByName(piece.id), nextBody=staging.getObjectByName(piece.id);
          const oldShell=previousBody?.children[0] as THREE.Mesh|undefined, newShell=nextBody?.children[0] as THREE.Mesh|undefined;
          if (oldShell && newShell && Array.isArray(oldShell.material) && Array.isArray(newShell.material) && sticker.sourceFace) {
            const index=sourceFaceIndex(sticker.sourceFace.normal), oldMaterial=oldShell.material[index] as THREE.MeshStandardMaterial, newMaterial=newShell.material[index] as THREE.MeshStandardMaterial;
            if(oldMaterial.map && newMaterial.map) newShell.material[index]=reuse(oldMaterial,newMaterial);
          }
        }
      }
      for (const resource of discard) {resource.dispose();const i=candidateResources.indexOf(resource);if(i>=0)candidateResources.splice(i,1);}
      for (const {candidate,existing} of pairs) { existing!.clear(); while(candidate.children.length) existing!.add(candidate.children[0]); }
      const retained=resources.splice(0);for (const r of retained) {if(keep.has(r)) candidateResources.push(r);else r.dispose();}
    } else { clear(); while (staging.children.length) root.add(staging.children[0]); }
    for (const core of cores) scene.add(core);
    resourcesForCommit(candidateResources);
    projection = p; draw();
    } catch (error) { for (const resource of candidateResources) resource.dispose(); throw error; }
  }
  const status = (): Result<void> => disposed ? fail('Disposed','Scene disposed') : lost ? fail('ContextLost','Context lost') : pending || livePending ? fail('Busy','Operation in progress') : ok(undefined);
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
      for (const imageId of new Set([...p.pieces.flatMap(piece => piece.stickers.flatMap(s => s.imageId ? [s.imageId] : [])),...Object.values(p.picture?.faces ?? {})])) {
        const r = await options.resolveAsset(imageId, op.controller.signal);
        if (pending !== op) return undefined;
        if (!r.ok) { finish(op,fail('UnresolvedAsset',`Unable to resolve ${imageId}`)); return undefined; }
        assets.set(imageId,r.value);
      }
      return assets;
    } catch { finish(op,fail('UnresolvedAsset','Asset resolver failed')); return undefined; }
  }
  const api: CubeScene = {
    setArtwork(input) {
      if (disposed) return Promise.resolve(fail('Disposed','Scene disposed'));
      if (lost) return Promise.resolve(fail('ContextLost','Context lost'));
      if (livePending || (pending && !pending.from)) return Promise.resolve(fail('Busy','Operation in progress'));
      if (!projection) return Promise.resolve(fail('InvalidProjection','No projection'));
      let replacement: typeof input;
      try { replacement=copy(input); } catch { return Promise.resolve(fail('InvalidProjection','Invalid artwork')); }
      if (!replacement || !Array.isArray(replacement.stickers) || Array.from(replacement.stickers).some(s=>!s || typeof s.id !== 'string' || !s.id)) return Promise.resolve(fail('InvalidProjection','Invalid artwork'));
      const byId=new Map(replacement.stickers.map(s=>[s.id,s]));
      if (byId.size!==replacement.stickers.length) return Promise.resolve(fail('InvalidProjection','Duplicate sticker IDs'));
      const existing=projection.pieces.flatMap(piece=>piece.stickers);
      if (byId.size!==existing.length || existing.some(s=>!byId.has(s.id))) return Promise.resolve(fail('InvalidProjection','Sticker IDs differ'));
      const decorate=(p: CubeProjection): CubeProjection => ({...p,appearance:replacement.appearance,picture:replacement.picture,pieces:p.pieces.map(piece=>({...piece,stickers:piece.stickers.map(sticker=>{
        const entry=byId.get(sticker.id)!;
        return {id:sticker.id,transform:sticker.transform,size:sticker.size,color:entry.color,...(entry.imageId!==undefined?{imageId:entry.imageId}:{}),...(entry.sourceFace!==undefined?{sourceFace:entry.sourceFace}:{}),...(entry.picture!==undefined?{picture:entry.picture}:{})};
      })}))});
      const candidate=decorate(projection), validation=validateProjection(candidate); if (!validation.ok) return Promise.resolve(validation);
      if(candidate.picture && referenceWidths && !sameValues(candidate.picture.widths,referenceWidths)) return Promise.resolve(fail('InvalidProjection','Picture reference widths differ'));
      for (const sticker of candidate.pieces.flatMap(piece=>piece.stickers)) {
        const face=referenceFaces.get(sticker.id), picture=referencePictures.get(sticker.id);
        if(face && (!sticker.sourceFace || !sameValues(sticker.sourceFace.normal,face.normal) || !sameValues(sticker.sourceFace.up,face.up))) return Promise.resolve(fail('InvalidProjection','Source face reference differs'));
        if(picture && sticker.picture && !sameValues(sticker.picture,picture)) return Promise.resolve(fail('InvalidProjection','Picture reference differs'));
      }
      let finishLive!: (result:Result<void>)=>void; const promise=new Promise<Result<void>>(resolve=>{finishLive=resolve;});
      const op:Pending={controller:new AbortController(),finish:finishLive}; livePending=op;
      const finishArtwork=(result:Result<void>)=>{if(livePending!==op)return;livePending=undefined;op.finish(result);};
      void (async()=>{
        const assets=new Map<string,CanvasImageSource>();
        try {
          for (const imageId of new Set([...candidate.pieces.flatMap(piece=>piece.stickers.flatMap(s=>s.imageId?[s.imageId]:[])),...Object.values(candidate.picture?.faces??{})])) {
            let r: Awaited<ReturnType<ViewerOptions['resolveAsset']>>;
            try {r=await options.resolveAsset(imageId,op.controller.signal);} catch {finishArtwork(fail('UnresolvedAsset','Asset resolver failed'));return;}
            if(livePending!==op)return;
            if(!r.ok){finishArtwork(fail('UnresolvedAsset',`Unable to resolve ${imageId}`));return;} assets.set(imageId,r.value);
          }
          if(livePending!==op || !projection)return;
          const current=decorate(projection); present(current,assets,true); recordReferences(current);
          if(pending?.from) {pending.from=decorate(pending.from);if(pending.to)pending.to=decorate(pending.to);}
          finishArtwork(ok(undefined));
        } catch {finishArtwork(fail('Unavailable','Unable to build artwork'));}
      })();
      return promise;
    },
    setProjection(input) {
      const s = status(); if (!s.ok) return Promise.resolve(s);
      const validation = validateProjection(input); if (!validation.ok) return Promise.resolve(validation);
      const p = copy(input); const {op,promise} = begin();
      void assetsFor(p,op).then(assets => { if (assets && pending === op) { try { present(p,assets); recordReferences(p,true); finish(op,ok(undefined)); } catch { finish(op,fail('Unavailable','Unable to build projection')); } } });
      return promise;
    },
    transition(input: Transition) {
      const s = status(); if (!s.ok) return Promise.resolve(s);
      const validation = validateTransition(input); if (!validation.ok) return Promise.resolve(validation);
      if (!projection || !sameProjection(projection,input.from)) return Promise.resolve(fail('InvalidTransition','Source does not match current projection'));
      const t = copy(input), from = projection; const {op,promise} = begin(from);
      const sourceOrder=new Map(from.pieces.map(piece=>[piece.id,piece.stickers.map(sticker=>sticker.id)]));
      op.to={...t.to,pieces:t.to.pieces.map(piece=>{const byId=new Map(piece.stickers.map(sticker=>[sticker.id,sticker]));return {...piece,stickers:sourceOrder.get(piece.id)!.map(id=>byId.get(id)!)};})};
      // Stickers are invariant in a transition; reuse the currently rendered materials.
      const pivot = new THREE.Group(); pivot.position.set(...t.pivot); root.add(pivot); root.updateMatrixWorld(true);
      for (const id of t.pieceIds) { const body = root.getObjectByName(id); if (body) pivot.attach(body); }
      const axis = new THREE.Vector3(...t.axis); const started = clock.now();
      const duration = t.durationMs;
      pausedDuration = 0; pausedAt = hidden() ? started : undefined;
      const update = (now: number) => {
        const progress = duration === 0 ? 1 : Math.min(1,Math.max(0,(now-started-pausedDuration)/duration));
        const eased = progress * progress * (3 - 2 * progress);
        pivot.quaternion.setFromAxisAngle(axis,t.signedAngleRadians*eased);
        if (progress < 1) return true;
        pivot.updateMatrixWorld(true);
        for (const id of t.pieceIds) { const body = pivot.getObjectByName(id); if (body) root.attach(body); }
        pivot.removeFromParent();
        // Snap to exact endpoint, avoiding accumulated floating point error.
        for (const piece of op.to!.pieces) { const body = root.getObjectByName(piece.id)!; body.position.set(...piece.transform.position); body.quaternion.set(...piece.transform.rotation); }
        projection = op.to; animation = undefined; finish(op,ok(undefined)); return false;
      };
      animation = update;
      if (duration === 0) update(started); draw();
      return promise;
    },
    cancel() {
      if (disposed) return fail('Disposed','Scene disposed');
      if (livePending) {const live=livePending;livePending=undefined;live.controller.abort();live.finish(fail('Cancelled','Operation cancelled'));}
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
    invalidate() { const s = disposed ? fail('Disposed','Scene disposed') : lost ? fail('ContextLost','Context lost') : ok(undefined); if (s.ok) draw(); return s; },
    dispose() { if (disposed) return; api.cancel(); disposed = true; unsubscribe?.(); if (frame !== undefined) clock.cancel(frame); frame = undefined; clear(); studio.dispose(); backend.dispose(); },
  };
  // Context loss is wired by the browser host; kept private to the implementation.
  Object.assign(api, {contextLost() { if (disposed || lost) return; const op = pending, live=livePending; if (op) { const finishOriginal = op.finish; op.finish = () => finishOriginal(fail('ContextLost','Context lost')); } if (live) { const finishOriginal=live.finish; live.finish=()=>finishOriginal(fail('ContextLost','Context lost')); } if (op || live) api.cancel(); lost = true; if (frame !== undefined) clock.cancel(frame); frame = undefined; }});
  return api;
}
