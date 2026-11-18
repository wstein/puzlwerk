// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { configurePresentationRenderer } from './presentation-preset.js';
import { createStageForTest } from './stage.js';
import { fail, ok, validViewerMaterials } from './contract.js';
import type { CubeScene, Result, ViewerOptions } from './contract.js';
export type { BodyProfile, StickerGeometry, SourceMesh, Appearance, ArtworkReplacement, FaceEdgeColors, Picture, SourceFace, AssetResolver, PreviewStart, ScenePreview, CubeProjection, CubeScene, Piece, PieceGeometry, Quaternion, Result, Sticker, Transform, Transition, Vec3, ViewerError, ViewerMaterialOptions, ViewerOptions } from './contract.js';
export function createCubeScene(host: HTMLElement, options: ViewerOptions): Result<CubeScene> {
  if(!validViewerMaterials(options.materials) || (options.textureOrigin!==undefined && !['top-left','bottom-left'].includes(options.textureOrigin)))return fail('InvalidProjection','Invalid viewer presentation options');
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); } catch { return fail('Unavailable','WebGL is unavailable'); }
  configurePresentationRenderer(renderer, null);
  const camera = new THREE.PerspectiveCamera(35,1,.1,100); camera.position.set(4,3,5); camera.lookAt(0,0,0);
  host.appendChild(renderer.domElement);
  let observer: ResizeObserver | undefined;
  const clock = {now:()=>performance.now(),request:(cb:(time:number)=>void)=>requestAnimationFrame(cb),cancel:(id:number)=>cancelAnimationFrame(id), isHidden:()=>document.hidden, onVisibility:(cb:()=>void)=>{document.addEventListener('visibilitychange',cb);return ()=>document.removeEventListener('visibilitychange',cb);}};
  let stage:ReturnType<typeof createStageForTest>;
  const onLost = (event: Event) => { event.preventDefault(); stage.contextLost(); };
  const backend = {render(scene: THREE.Scene) { const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.render(scene,camera); },dispose() { observer?.disconnect(); renderer.domElement.removeEventListener('webglcontextlost',onLost); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); }};
  stage=createStageForTest({...options,singleCompatibility:true,studioHost:host},clock,backend);
  const added=stage.addCube({position:[0,0,0]});
  if(!added.ok){stage.dispose();return fail('Unavailable','Unable to create scene');}
  const child=added.value;
  const scene:CubeScene={setProjection:p=>child.setProjection(p),setArtwork:a=>child.setArtwork(a),transition:(t,timing)=>child.transition(t,timing),cancel:()=>child.cancel(),invalidate:()=>child.invalidate(),dispose:()=>stage.dispose()};
  renderer.domElement.addEventListener('webglcontextlost',onLost);
  if (typeof ResizeObserver !== 'undefined') { observer=new ResizeObserver(()=>{scene.invalidate();}); observer.observe(host); }
  return ok(scene);
}

export {createCubeStage} from './stage-host.js';
export type {CubeStage,StageOptions,InteractionMode,IndicatorSettings} from './stage-host.js';
export type {StageChild,StageError,StageResult,StageView,ViewPolicy,ChildMaterial} from './stage.js';
export type {StageLighting,DirectionalData,ExposurePolicy,ExposureSnapshot,LightSnapshot} from './stage-lighting.js';

export {weightedFaceExposure} from './weighted-exposure.js';
export type {ExposureLights} from './weighted-exposure.js';

export type {MotionTiming,MotionTimingSource} from './motion-timing.js';
export {groupZoom} from './zoom-policy.js';

export { standardLayerWidths, STANDARD_CUBE_MEASUREMENTS } from './layer-widths.js';
export type { StandardLayerWidthsOptions } from './layer-widths.js';
export {cubePresentationRadius,presentationCameraRadius} from './presentation-rotation.js';
export {MIN_CUBE_SIZE,MAX_CUBE_SIZE,ACCEPTED_MAX_SIZE,validCubeSize} from './size-range.js';
