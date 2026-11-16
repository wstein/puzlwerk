// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { configurePresentationRenderer } from './presentation-preset.js';
import { createSceneForTest } from './scene.js';
import { fail, ok } from './contract.js';
import type { CubeScene, Result, ViewerOptions } from './contract.js';
export type { AssetResolver, CubeProjection, CubeScene, Piece, Quaternion, Result, Sticker, Transform, Transition, Vec3, ViewerError, ViewerOptions } from './contract.js';
export function createCubeScene(host: HTMLElement, options: ViewerOptions): Result<CubeScene> {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({antialias:true, alpha:true}); } catch { return fail('Unavailable','WebGL is unavailable'); }
  configurePresentationRenderer(renderer, null);
  const camera = new THREE.PerspectiveCamera(35,1,.1,100); camera.position.set(4,3,5); camera.lookAt(0,0,0);
  host.appendChild(renderer.domElement);
  let observer: ResizeObserver | undefined;
  const clock = {now:()=>performance.now(),request:(cb:(time:number)=>void)=>requestAnimationFrame(cb),cancel:(id:number)=>cancelAnimationFrame(id), isHidden:()=>document.hidden, onVisibility:(cb:()=>void)=>{document.addEventListener('visibilitychange',cb);return ()=>document.removeEventListener('visibilitychange',cb);}};
  const backend = {render(scene: THREE.Scene) { const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.render(scene,camera); },dispose() { observer?.disconnect(); renderer.domElement.removeEventListener('webglcontextlost',onLost); renderer.dispose(); renderer.domElement.remove(); }};
  const scene = createSceneForTest(options,clock,backend);
  const onLost = (event: Event) => { event.preventDefault(); (scene as CubeScene & {contextLost():void}).contextLost(); };
  renderer.domElement.addEventListener('webglcontextlost',onLost);
  if (typeof ResizeObserver !== 'undefined') { observer=new ResizeObserver(()=>{scene.invalidate();}); observer.observe(host); }
  return ok(scene);
}
