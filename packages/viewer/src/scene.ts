// SPDX-License-Identifier: AGPL-3.0-or-later
// Production rendering uses the extracted Cubistry physical scene; see NOTICE.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {createTwoRadiusBody} from './two-radius-body.js';
import {PhysicalCubeScene} from './physical-scene.js';
import {nativeFrames} from './native-projection.js';
import {createPresentationGeometry} from './presentation-preset.js';
import type { OuterSides } from './two-radius-body.js';
import { createStickerGeometry, createPlasticMaterial, createStickerMaterial, presentationLayerProfile, stickerRadiusFor, bodyRadiusFor, innerRadiusFor } from './presentation-preset.js';
import { createPresentationStudio } from './studio.js';
import { fail, ok, sameValues, validViewerMaterials, validateProjection, validateTransition } from './contract.js';
import type { CubeProjection, CubeScene, Result, Transition, ViewerOptions, PreviewStart, ScenePreview } from './contract.js';
import {validateAppearance,type ViewerAppearance} from './native-appearance.js';
import {animateTimedProgress,type MotionTimingSource} from './motion-timing.js';

type Clock = { now(): number; request(cb: (time: number) => void): number; cancel(id: number): void; isHidden?(): boolean; onVisibility?(cb: () => void): () => void; setTimer?(cb:()=>void,delay:number):number; clearTimer?(id:number):void };
type Backend = { render(scene: THREE.Scene): void; dispose(): void };
type Pending = { controller: AbortController; finish(result: Result<void>): void; from?: CubeProjection; to?: CubeProjection; preview?:boolean };
type PreparedAppearance={seal():Result<void>;commit():void;discard():void};
const copy = <T>(x: T): T => structuredClone(x);
const sameProjection = (a: CubeProjection, b: CubeProjection) => {
  const normalize = (p: CubeProjection) => [...p.pieces].sort((x,y) => x.id.localeCompare(y.id)).map(x => ({...x, stickers: [...x.stickers].sort((s,t) => s.id.localeCompare(t.id))}));
  return sameValues(normalize(a), normalize(b)) && sameValues(a.renderProfile,b.renderProfile) && sameValues(a.geometryProfile,b.geometryProfile) && sameValues(a.presentation,b.presentation) && sameValues(a.core,b.core) && sameValues(a.appearance,b.appearance) && sameValues(a.picture,b.picture);
};

export function createSceneForTest(options: ViewerOptions, clock: Clock, backend: Backend, shared?: { scene: THREE.Scene; parent: THREE.Group }): CubeScene & {prepareViewerAppearance(value:ViewerAppearance):Promise<Result<PreparedAppearance>>;cancelViewerAppearancePreparation():void;setInitialViewerAppearance(value:ViewerAppearance):void} {
  if(!validViewerMaterials(options.materials))throw Error('Invalid viewer materials');
  const materialOptions=structuredClone(options.materials??{});
  const scene = shared?.scene ?? new THREE.Scene();
  const parent = shared?.parent ?? scene;
  const root = new THREE.Group(); parent.add(root);
  const studio = shared ? undefined : createPresentationStudio(scene);

  let native: PhysicalCubeScene | undefined;
  let viewerAppearance: ViewerAppearance | undefined,appearanceOp:Pending|undefined;
  let activeTurnState: {ids:readonly string[];axis:readonly [number,number,number];angle:number;pivot:readonly [number,number,number];progress:number}|undefined;
  let activeTurn: ReturnType<PhysicalCubeScene["beginTurn"]> | undefined;
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
  let frame: number | undefined, animation: ((now: number) => boolean) | undefined,timedAbort:(()=>void)|undefined;
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
  function prepareNative(p: CubeProjection, assets: Map<string, CanvasImageSource>,projectPicture=true) {
    const converted=nativeFrames(p); if(!converted.ok) throw Error(converted.error.message);
    const staging=new THREE.Group(), candidateResources:{dispose():void}[]=[];
    try {
      const data=converted.value, generated=createPresentationGeometry(p.presentation?.size,p.presentation?.nominalEdge);
      const nativeGeometry: Omit<typeof generated,"stickerOffset" | "core"> & {stickerOffset:number;core?:THREE.BufferGeometry} = {...generated,stickerOffset:Number(generated.stickerOffset)};
      const bodyGeometry=new Map<string,THREE.BufferGeometry>(),stickerGeometry=new Map<string,THREE.BufferGeometry>();
      const constructionGuard={dispose(){nativeGeometry.body.dispose();nativeGeometry.sticker.dispose();nativeGeometry.core?.dispose();for(const geometry of new Set([...bodyGeometry.values(),...stickerGeometry.values()]))geometry.dispose();}};
      candidateResources.push(constructionGuard);
      if(data.stickerSize) {
        nativeGeometry.sticker.dispose();
        nativeGeometry.sticker=createStickerGeometry(data.stickerSize[0],data.stickerSize[1],(data.stickerRadius ?? stickerRadiusFor(p.presentation?.size,p.presentation?.nominalEdge)));
      }
      if(data.stickerOffset!==undefined)nativeGeometry.stickerOffset=data.stickerOffset;
      nativeGeometry.layers=undefined;
      if(!p.core){nativeGeometry.core?.dispose();nativeGeometry.core=undefined;}
      if(data.layerWidths){
        const layers=presentationLayerProfile(data.layerWidths,p.presentation?.nominalEdge);
        nativeGeometry.layers={...layers,sticker:data.stickerSize?()=>createStickerGeometry(data.stickerSize![0],data.stickerSize![1],(data.stickerRadius ?? stickerRadiusFor(p.presentation?.size,p.presentation?.nominalEdge))):layers.sticker};
      }
      const plastic=createPlasticMaterial(p.appearance?.frameColor ?? '#202329',materialOptions.plasticRoughness);candidateResources.push(plastic);
      const materials=new Map<string,THREE.Material>();
      for(const piece of p.pieces)for(const sticker of piece.stickers){
        let texture:THREE.Texture|null=null;
        if(sticker.imageId){texture=new THREE.Texture(assets.get(sticker.imageId) as TexImageSource);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=options.textureOrigin!=='bottom-left';texture.needsUpdate=true;candidateResources.push(texture);}
        const material=createStickerMaterial(texture,sticker.color,materialOptions.stickers?.[sticker.id]?.roughness ?? materialOptions.stickerRoughness);material.transparent=Boolean(texture && !sticker.sourceFace);materials.set(sticker.id,material);candidateResources.push(material);
      }
      const bodyOnly=data.bodies.filter(body=>!data.frames.some(frame=>frame.cubie===body.id));
      const profile=presentationLayerProfile(Array(p.presentation?.size ?? 2).fill(1),p.presentation?.nominalEdge);
      const geometryCache=new Map<string,THREE.BufferGeometry>();
      for(const [id,value] of data.bodyGeometry){const key=JSON.stringify(value);let geometry=geometryCache.get(key);if(!geometry){
        const custom=p.geometryProfile?.body;
        if(custom){const size=value.cellSize.map(c=>c-custom.gap) as [number,number,number];geometry=custom.kind==='twoRadius'?createTwoRadiusBody({size,outer:value.outerSides as OuterSides,big:custom.bigRadius ?? bodyRadiusFor(p.presentation!.size,p.presentation!.nominalEdge),small:custom.smallRadius ?? innerRadiusFor(p.presentation!.size,p.presentation!.nominalEdge),segments:custom.bevelSegments}):new RoundedBoxGeometry(...size,custom.bevelSegments,custom.radius);}
        else geometry=profile.body(value.cellSize,value.outerSides as OuterSides);
        geometryCache.set(key,geometry);}bodyGeometry.set(id,geometry);}
      const stickerCache=new Map<string,THREE.BufferGeometry>();
      for(const piece of p.pieces)for(const sticker of piece.stickers)if(sticker.geometry){const shape=sticker.geometry,key=JSON.stringify(shape);let geometry=stickerCache.get(key);if(!geometry){geometry=createStickerGeometry(...shape.referenceSize,shape.cornerRadius);stickerCache.set(key,geometry);}stickerGeometry.set(sticker.id,geometry);}
      const faceColors=new Map(p.pieces.flatMap(piece=>piece.stickers.filter(sticker=>sticker.sourceFace?.color).map(sticker=>[sticker.id,sticker.sourceFace!.color!] as const)));
      const faceEdgeColors=new Map(p.pieces.flatMap(piece=>piece.stickers.filter(sticker=>sticker.sourceFace?.edgeColors).map(sticker=>[sticker.id,sticker.sourceFace!.edgeColors!] as const)));
      const next=new PhysicalCubeScene(staging,data.frames,materials,plastic,1,nativeGeometry,faceColors,{...p.appearance,bodies:bodyOnly,bodyGeometry,stickerGeometry,faceEdgeColors,corePose:p.core});
      candidateResources.splice(candidateResources.indexOf(constructionGuard),1);candidateResources.push(next);
      next.syncBodyPoses(data.bodies);
      if(p.picture && projectPicture){const faces=new Map();for(const [face,id] of Object.entries(p.picture.faces)){const texture=new THREE.Texture(assets.get(id) as TexImageSource);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.needsUpdate=true;faces.set(face,texture);candidateResources.push(texture);}next.setPictureProjection({faces});}
      if(p.appearance?.construction)next.setConstruction(p.appearance.construction);
      return {p,staging,next,candidateResources,replacementTurn:undefined as ReturnType<PhysicalCubeScene["beginTurn"]>|undefined};
    } catch(error) { for(const resource of candidateResources)resource.dispose(); throw error; }
  }
  type PreparedNative=ReturnType<typeof prepareNative>;
  function sealNative(candidate:PreparedNative,live:boolean) {
    if(live && activeTurn && activeTurnState){candidate.replacementTurn=candidate.next.beginTurn(activeTurnState.ids,activeTurnState.axis,activeTurnState.angle,activeTurnState.pivot);candidate.replacementTurn.update(activeTurnState.progress);}
  }
  function discardNative(candidate:PreparedNative) { candidate.replacementTurn?.dispose();for(const resource of candidate.candidateResources)resource.dispose(); }
  function commitNative(candidate:PreparedNative,live:boolean,canonical=candidate.p) {
    if(live && native && candidate.p.picture && projection?.picture && sameValues(candidate.p.picture,projection.picture)) candidate.next.reuseProjectionTextures(native);
    activeTurn?.dispose();clear();root.add(candidate.staging);resourcesForCommit(candidate.candidateResources);native=candidate.next;activeTurn=candidate.replacementTurn;projection=canonical;draw();
  }
  function renderProjection(p:CubeProjection,value=viewerAppearance):CubeProjection {
    if(!value)return p;
    return {...p,appearance:{...p.appearance,construction:value.construction,frameColor:value.frameColor ?? p.appearance?.frameColor}};
  }
  function present(p:CubeProjection,assets:Map<string,CanvasImageSource>,live=false) {
    const candidate=prepareNative(renderProjection(p),assets,!(viewerAppearance?.construction==='stickered' && viewerAppearance.pictureMode==='per-sticker'));
    try { sealNative(candidate,live); } catch(error) { discardNative(candidate);throw error; }
    commitNative(candidate,live,p);
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
  const api: CubeScene & {prepareViewerAppearance(value:ViewerAppearance):Promise<Result<PreparedAppearance>>;cancelViewerAppearancePreparation():void;setInitialViewerAppearance(value:ViewerAppearance):void} = {
    setInitialViewerAppearance(value) { viewerAppearance=validateAppearance(value); },
    cancelViewerAppearancePreparation() {const op=appearanceOp;if(!op || livePending!==op)return;livePending=undefined;op.controller.abort();op.finish(fail('Cancelled','Appearance preparation cancelled'));},
    async prepareViewerAppearance(input) {
      if(disposed)return fail('Disposed','Scene disposed');if(lost)return fail('ContextLost','Context lost');
      if(livePending || (pending && (!pending.from || pending.preview)))return fail('Busy','Operation in progress');
      let value:ViewerAppearance;try{value=validateAppearance(input);}catch{return fail('InvalidProjection','Invalid viewer appearance');}
      if(!projection)return ok({seal:()=>ok(undefined),commit:()=>{viewerAppearance=value;},discard:()=>{}});
      const current=projection,controller=new AbortController();let prepared:PreparedNative|undefined,finished=false;
      let cancel!: (result:Result<PreparedAppearance>)=>void;const cancelled=new Promise<Result<PreparedAppearance>>(resolve=>{cancel=resolve;});
      const op:Pending={controller,finish:result=>{if(prepared){discardNative(prepared);prepared=undefined;}if(appearanceOp===op)appearanceOp=undefined;finished=true;cancel(result as Result<PreparedAppearance>);}};livePending=op;appearanceOp=op;
      const work=(async():Promise<Result<PreparedAppearance>>=>{
        try {const assets=new Map<string,CanvasImageSource>(),rendered=renderProjection(current,value);
          for(const id of new Set([...rendered.pieces.flatMap(piece=>piece.stickers.flatMap(sticker=>sticker.imageId?[sticker.imageId]:[])),...Object.values(rendered.picture?.faces??{})])){
            const result=await options.resolveAsset(id,controller.signal);if(livePending!==op)return fail('Cancelled','Operation cancelled');if(!result.ok){livePending=undefined;appearanceOp=undefined;finished=true;return fail('UnresolvedAsset',`Unable to resolve ${id}`);}assets.set(id,result.value);}
          if(livePending!==op)return fail('Cancelled','Operation cancelled');prepared=prepareNative(rendered,assets,!(value.construction==='stickered' && value.pictureMode==='per-sticker'));
          const candidate=prepared;let sealed=false;
          return ok({seal(){if(finished || livePending!==op || disposed || lost || !projection)return fail('Cancelled','Appearance no longer current');try{
            if(!activeTurn){const pose=nativeFrames(projection);if(!pose.ok)return pose;candidate.next.syncBodyPoses(pose.value.bodies);}
            sealNative(candidate,true);sealed=true;return ok(undefined);
          }catch{return fail('Unavailable','Unable to prepare appearance');}},
          commit(){if(!sealed || finished || livePending!==op || !projection)throw Error('Appearance was not sealed');const canonical=projection;commitNative(candidate,true,canonical);viewerAppearance=value;prepared=undefined;finished=true;livePending=undefined;appearanceOp=undefined;},
          discard(){if(finished)return;finished=true;if(livePending===op)livePending=undefined;if(appearanceOp===op)appearanceOp=undefined;discardNative(candidate);prepared=undefined;}});
        }catch{if(livePending===op)livePending=undefined;if(appearanceOp===op)appearanceOp=undefined;finished=true;return fail('Unavailable','Unable to prepare appearance');}
      })();return Promise.race([work,cancelled]);
    },
    setArtwork(input) {
      if (disposed) return Promise.resolve(fail('Disposed','Scene disposed'));
      if (lost) return Promise.resolve(fail('ContextLost','Context lost'));
      if (livePending || (pending && (!pending.from || pending.preview))) return Promise.resolve(fail('Busy','Operation in progress'));
      if (!projection) return Promise.resolve(fail('InvalidProjection','No projection'));
      if (projection.renderProfile) return Promise.resolve(fail('Unavailable','Artwork replacement is unsupported for source mesh profiles'));
      let replacement: typeof input;
      try { replacement=copy(input); } catch { return Promise.resolve(fail('InvalidProjection','Invalid artwork')); }
      if (!replacement || !Array.isArray(replacement.stickers) || Array.from(replacement.stickers).some(s=>!s || typeof s.id !== 'string' || !s.id)) return Promise.resolve(fail('InvalidProjection','Invalid artwork'));
      const byId=new Map(replacement.stickers.map(s=>[s.id,s]));
      if (byId.size!==replacement.stickers.length) return Promise.resolve(fail('InvalidProjection','Duplicate sticker IDs'));
      const existing=projection.pieces.flatMap(piece=>piece.stickers);
      if (byId.size!==existing.length || existing.some(s=>!byId.has(s.id))) return Promise.resolve(fail('InvalidProjection','Sticker IDs differ'));
      const decorate=(p: CubeProjection): CubeProjection => ({...p,appearance:replacement.appearance,picture:replacement.picture,pieces:p.pieces.map(piece=>({...piece,stickers:piece.stickers.map(sticker=>{
        const entry=byId.get(sticker.id)!;
        return {id:sticker.id,transform:sticker.transform,size:sticker.size,...(sticker.geometry?{geometry:sticker.geometry}:{}),color:entry.color,...(entry.imageId!==undefined?{imageId:entry.imageId}:{}),...(entry.sourceFace!==undefined?{sourceFace:entry.sourceFace}:{}),...(entry.picture!==undefined?{picture:entry.picture}:{})};
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
      const p = copy(input); const capability = nativeFrames(p); if(!capability.ok)return Promise.resolve(capability); const {op,promise} = begin();
      void assetsFor(p,op).then(assets => { if (assets && pending === op) { try { present(p,assets); recordReferences(p,true); finish(op,ok(undefined)); } catch { finish(op,fail('Unavailable','Unable to build projection')); } } });
      return promise;
    },
    beginPreview(input:PreviewStart):Result<ScenePreview> {
      const state=status();if(!state.ok)return state;
      if(!projection || !native || !input || !validateProjection(input.from).ok || !sameProjection(projection,input.from) || !Array.isArray(input.pieceIds) || !Array.from(input.pieceIds).every(id=>typeof id==='string' && projection!.pieces.some(piece=>piece.id===id)) || new Set(input.pieceIds).size!==input.pieceIds.length || !Array.isArray(input.axis) || input.axis.length!==3 || !Array.from(input.axis).every(Number.isFinite) || Math.abs(Math.hypot(...input.axis)-1)>1e-6 || !Array.isArray(input.pivot) || input.pivot.length!==3 || !Array.from(input.pivot).every(Number.isFinite))return fail('InvalidTransition','Invalid preview');
      const start=copy(input);try{activeTurn=native.beginTurn(start.pieceIds,start.axis,1,start.pivot);}catch{lost=true;return fail('Unavailable','Unable to begin preview');}const {op}=begin(projection);op.preview=true;activeTurnState={ids:start.pieceIds,axis:start.axis,angle:1,pivot:start.pivot,progress:0};
      const valid=()=>pending===op && !disposed && !lost;
      const abort=()=>{try{return api.cancel();}catch{lost=true;activeTurn=undefined;activeTurnState=undefined;finish(op,fail('Unavailable','Unable to restore preview'));return fail('Unavailable','Unable to restore preview');}};
      return ok({isActive:valid,update(angle){if(!valid())return fail('Cancelled','Preview ended');if(!Number.isFinite(angle))return fail('InvalidTransition','Invalid preview angle');try{activeTurnState!.progress=angle;activeTurn!.update(angle);draw();return ok(undefined);}catch{abort();return fail('Unavailable','Unable to update preview');}},
        cancel(){if(!valid())return fail('Cancelled','Preview ended');return abort();},
        commit(transition){if(!valid())return fail('Cancelled','Preview ended');const checked=validateTransition(transition);if(!checked.ok)return checked;if(!sameProjection(transition.from,op.from!) || !sameValues(transition.pieceIds,start.pieceIds) || !sameValues(transition.axis,start.axis) || !sameValues(transition.pivot,start.pivot))return fail('InvalidTransition','Preview selection changed');const target=nativeFrames(transition.to);if(!target.ok)return target;try{activeTurn!.dispose();activeTurn=undefined;activeTurnState=undefined;native!.syncBodyPoses(target.value.bodies);projection=copy(transition.to);finish(op,ok(undefined));draw();return ok(undefined);}catch{activeTurn?.dispose();activeTurn=undefined;activeTurnState=undefined;try{const restored=nativeFrames(op.from!);if(!restored.ok)throw Error('Invalid source');native!.syncBodyPoses(restored.value.bodies);}catch{lost=true;}projection=op.from;finish(op,fail('Unavailable','Unable to commit preview'));draw();return fail('Unavailable','Unable to commit preview');}}});
    },
    transition(input: Transition,timing?:MotionTimingSource) {
      const s = status(); if (!s.ok) return Promise.resolve(s);
      const validation = validateTransition(input); if (!validation.ok) return Promise.resolve(validation);
      if (!projection || !sameProjection(projection,input.from)) return Promise.resolve(fail('InvalidTransition','Source does not match current projection'));
      const t = copy(input), from = projection; const {op,promise} = begin(from);
      const sourceOrder=new Map(from.pieces.map(piece=>[piece.id,piece.stickers.map(sticker=>sticker.id)]));
      op.to={...t.to,pieces:t.to.pieces.map(piece=>{const byId=new Map(piece.stickers.map(sticker=>[sticker.id,sticker]));return {...piece,stickers:sourceOrder.get(piece.id)!.map(id=>byId.get(id)!)};})};
      const target = nativeFrames(op.to); if(!target.ok){finish(op,target);return promise;}
      if(!native){finish(op,fail('Unavailable','Native scene unavailable'));return promise;}
      activeTurnState={ids:t.pieceIds,axis:t.axis,angle:t.signedAngleRadians,pivot:t.pivot,progress:0};
      activeTurn=native.beginTurn(t.pieceIds,t.axis,t.signedAngleRadians,t.pivot);
      const started=clock.now(),duration=t.durationMs;
      if(timing){
        const frames=new Set<number>(),timers=new Set<number>();
        const failTiming=()=>{if(pending!==op)return;timedAbort?.();timedAbort=undefined;activeTurn?.dispose();activeTurn=undefined;activeTurnState=undefined;const currentFrom=op.from ?? from;const restored=nativeFrames(currentFrom);if(restored.ok)native?.syncBodyPoses(restored.value.bodies);projection=currentFrom;finish(op,fail('Unavailable','Timing source failed'));draw();};
        const runtime={now:()=>clock.now(),frame:(callback:(at:number)=>void)=>{const id=clock.request(at=>{frames.delete(id);try{callback(at)}catch{failTiming()}});frames.add(id);return id;},cancelFrame:(id:number)=>{frames.delete(id);clock.cancel(id);},timer:(callback:()=>void,delay:number)=>{const id=(clock.setTimer??setTimeout)(()=>{timers.delete(id as number);try{callback()}catch{failTiming()}},delay) as number;timers.add(id);return id;},cancelTimer:(id:number)=>{timers.delete(id);(clock.clearTimer??clearTimeout)(id);}};
        timedAbort=()=>{for(const id of frames)clock.cancel(id);for(const id of timers)(clock.clearTimer??clearTimeout)(id);frames.clear();timers.clear();};
        void animateTimedProgress(timing,()=>Math.max(10,duration),progress=>{if(pending!==op || !activeTurn || !activeTurnState)return;const eased=progress*progress*(3-2*progress);activeTurnState.progress=eased;activeTurn.update(eased);
          if(progress>=1){activeTurn.dispose();activeTurn=undefined;activeTurnState=undefined;native!.syncBodyPoses(target.value.bodies);projection=op.to;timedAbort=undefined;finish(op,ok(undefined));}draw();},runtime).catch(failTiming);
        return promise;
      }
      pausedDuration=0;pausedAt=hidden()?started:undefined;
      const update=(now:number)=>{
        const progress=duration===0?1:Math.min(1,Math.max(0,(now-started-pausedDuration)/duration));
        const eased=progress*progress*(3-2*progress);activeTurnState!.progress=eased;activeTurn!.update(eased);
        if(progress<1)return true;
        activeTurn!.dispose();activeTurn=undefined;activeTurnState=undefined;native!.syncBodyPoses(target.value.bodies);
        projection=op.to;animation=undefined;finish(op,ok(undefined));return false;
      };
      animation = update;
      if (duration === 0) update(started); draw();
      return promise;
    },
    cancel() {
      if (disposed) return fail('Disposed','Scene disposed');
      if (livePending) {const live=livePending;livePending=undefined;live.controller.abort();live.finish(fail('Cancelled','Operation cancelled'));}
      if (pending) {
        const op = pending; op.controller.abort(); animation = undefined;timedAbort?.();timedAbort=undefined;
        if (op.from) {
          activeTurn?.dispose();activeTurn=undefined;activeTurnState=undefined;
          const restored=nativeFrames(op.from);if(restored.ok)native?.syncBodyPoses(restored.value.bodies);
          projection = op.from; draw();
        }
        finish(op,fail('Cancelled','Operation cancelled'));
      }
      return ok(undefined);
    },
    invalidate() { const s = disposed ? fail('Disposed','Scene disposed') : lost ? fail('ContextLost','Context lost') : ok(undefined); if (s.ok) draw(); return s; },
    dispose() { if (disposed) return; api.cancel(); disposed = true; unsubscribe?.(); if (frame !== undefined) clock.cancel(frame); frame = undefined; clear(); root.removeFromParent(); studio?.dispose(); backend.dispose(); },
  };
  // Context loss is wired by the browser host; kept private to the implementation.
  Object.assign(api, {contextLost() { if (disposed || lost) return; const op = pending, live=livePending; if (op) { const finishOriginal = op.finish; op.finish = () => finishOriginal(fail('ContextLost','Context lost')); } if (live) { const finishOriginal=live.finish; live.finish=()=>finishOriginal(fail('ContextLost','Context lost')); } if (op || live) api.cancel(); lost = true; if (frame !== undefined) clock.cancel(frame); frame = undefined; }});
  return api;
}
