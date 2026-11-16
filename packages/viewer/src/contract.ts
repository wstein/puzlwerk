// SPDX-License-Identifier: AGPL-3.0-or-later
import type {MotionTimingSource} from './motion-timing.js';
import { Quaternion as Q, Vector3 } from 'three';
import { PROJECTED_FACES, FACE_KEYS, type FaceKey } from './projected-uv.js';

export type Vec3 = readonly [number, number, number];
export type Quaternion = readonly [number, number, number, number];
export type ViewerError = { readonly code: 'InvalidProjection' | 'InvalidTransition' | 'UnresolvedAsset' | 'Busy' | 'Disposed' | 'Unavailable' | 'ContextLost' | 'Cancelled'; readonly message: string; readonly path?: string };
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: ViewerError };
export type Transform = { readonly position: Vec3; readonly rotation: Quaternion };
export type FaceEdgeColors = Partial<Record<'left'|'right'|'top'|'bottom', string | readonly {readonly to:number; readonly color:string}[]>>;
export type SourceFace = { readonly normal: Vec3; readonly up: Vec3; readonly color?:string; readonly edgeColors?: FaceEdgeColors };
export type StickerGeometry = { readonly referenceSize:readonly [number,number]; readonly cornerRadius:number };
export type BodyProfile = { readonly kind:'twoRadius'; readonly gap:number; readonly bevelSegments:number; readonly bigRadius?:number; readonly smallRadius?:number } | { readonly kind:'roundedBox'; readonly gap:number; readonly radius:number; readonly bevelSegments:number };
export type Sticker = { readonly geometry?:StickerGeometry; readonly id: string; readonly transform: Transform; readonly size: readonly [number, number]; readonly color: string; readonly imageId?: string; readonly sourceFace?: SourceFace; readonly picture?: {readonly face:FaceKey; readonly layerIndex:Vec3} };
export type PieceGeometry = { readonly cellSize: Vec3; readonly outerSides: readonly [readonly [boolean, boolean], readonly [boolean, boolean], readonly [boolean, boolean]] };
export type Piece = { readonly id: string; readonly transform: Transform; readonly stickers: readonly Sticker[]; readonly geometry?: PieceGeometry };
export type Appearance = {readonly construction:'stickered'|'stickerless'; readonly bodyColor?:string|null; readonly coreColor?:string; readonly frameColor?:string|null; readonly miterCutFaces?:boolean; readonly planarFaceUv?:boolean};
export type Picture = {readonly widths:readonly number[]; readonly faces:Readonly<Record<FaceKey,string>>};
export type SourceMesh = { readonly pieceId:string; readonly positions:readonly number[]; readonly normals:readonly number[]; readonly colors:readonly number[]; readonly occlusion:readonly number[]; readonly indices:readonly number[]; readonly surfaces:readonly {readonly role:'body'|'sticker'|'cap';readonly face?:string;readonly stickerId?:string;readonly firstIndex:number;readonly indexCount:number}[] };
export type CubeProjection = { readonly renderProfile?: {readonly kind:'cubeAssemblerV1'; readonly size:number; readonly meshes:readonly SourceMesh[]}; readonly geometryProfile?: { readonly body:BodyProfile }; readonly appearance?:Appearance; readonly picture?:Picture; readonly pieces: readonly Piece[]; readonly presentation?: { readonly size: number; readonly nominalEdge: number }; readonly core?: { readonly center: Vec3; readonly halfExtent: number } };
export type Transition = { readonly from: CubeProjection; readonly to: CubeProjection; readonly pieceIds: readonly string[]; readonly axis: Vec3; readonly signedAngleRadians: number; readonly pivot: Vec3; readonly durationMs: number };
export type AssetResolver = (imageId: string, signal: AbortSignal) => Promise<Result<CanvasImageSource>>;
export type ViewerMaterialOptions = {readonly plasticRoughness?:number;readonly stickerRoughness?:number;readonly stickers?:Readonly<Record<string,{readonly roughness:number}>>};
export type ViewerOptions = { readonly resolveAsset: AssetResolver; readonly textureOrigin?:'top-left'|'bottom-left';readonly materials?:ViewerMaterialOptions };
export function validViewerMaterials(value:ViewerMaterialOptions|undefined):boolean {
 if(value===undefined)return true;if(!value || typeof value!=='object' || Array.isArray(value))return false;
 const valid=(n:unknown)=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1;
 if(value.plasticRoughness!==undefined && !valid(value.plasticRoughness) || value.stickerRoughness!==undefined && !valid(value.stickerRoughness))return false;
 return value.stickers===undefined || !!value.stickers && typeof value.stickers==='object' && !Array.isArray(value.stickers) && Object.entries(value.stickers).every(([id,item])=>!!id && !!item && valid(item.roughness));
}
export type ArtworkReplacement = { readonly appearance?: Appearance; readonly picture?: Picture; readonly stickers: readonly {readonly id:string; readonly color:string; readonly imageId?:string; readonly sourceFace?:SourceFace; readonly picture?:Sticker['picture']}[] };
export interface CubeScene { setArtwork(artwork: ArtworkReplacement): Promise<Result<void>>; setProjection(projection: CubeProjection): Promise<Result<void>>; transition(transition: Transition,timing?:MotionTimingSource): Promise<Result<void>>; cancel(): Result<void>; invalidate(): Result<void>; dispose(): void }
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (code: ViewerError['code'], message: string, path?: string): Result<never> => ({ ok: false, error: { code, message, ...(path ? { path } : {}) } });
const tol = 1e-6;
const array = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
const unit = (v: readonly number[]) => Math.abs(Math.hypot(...v) - 1) <= tol;
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const hex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const dense = (v: unknown, n?: number): v is unknown[] => Array.isArray(v) && (n === undefined || v.length === n) && Array.from(v).every(x => x !== undefined);
const axis = (v: unknown): v is number[] => dense(v,3) && v.every(x => typeof x === 'number' && [-1,0,1].includes(x)) && v.filter(x => x !== 0).length === 1;
const transform = (v: Transform) => v && array(v.position, 3) && array(v.rotation, 4) && unit(v.rotation);
export function validateProjection(p: CubeProjection): Result<void> {
  if (!p || !Array.isArray(p.pieces)) return fail('InvalidProjection', 'Expected pieces', 'pieces');
  if (p.presentation !== undefined && (!p.presentation || !Number.isInteger(p.presentation.size) || p.presentation.size < 2 || p.presentation.size > 7 || !Number.isFinite(p.presentation.nominalEdge) || p.presentation.nominalEdge <= 0)) return fail('InvalidProjection', 'Invalid presentation', 'presentation');
  if (p.core !== undefined && (!p.core || !array(p.core.center, 3) || Array.from(p.core.center).some(x => !Number.isFinite(x)) || !Number.isFinite(p.core.halfExtent) || p.core.halfExtent <= 0)) return fail('InvalidProjection', 'Invalid core', 'core');
  const body=p.geometryProfile?.body; if(p.geometryProfile !== undefined && (!p.geometryProfile || !body || !['twoRadius','roundedBox'].includes(body.kind) || !Number.isFinite(body.gap) || body.gap<0 || !Number.isSafeInteger(body.bevelSegments) || body.bevelSegments<1 || (body.kind==='twoRadius' && (!p.presentation || (body.bigRadius!==undefined && (!Number.isFinite(body.bigRadius)||body.bigRadius<=0)) || (body.smallRadius!==undefined && (!Number.isFinite(body.smallRadius)||body.smallRadius<=0)) || (body.bigRadius!==undefined && body.smallRadius!==undefined && body.smallRadius>body.bigRadius))) || (body.kind==='roundedBox' && (!Number.isFinite(body.radius)||body.radius<=0)))) return fail('InvalidProjection','Invalid body profile','geometryProfile');
  const a=p.appearance; if (a !== undefined && (!a || !['stickered','stickerless'].includes(a.construction) || (a.bodyColor != null && !hex(a.bodyColor)) || (a.coreColor !== undefined && !hex(a.coreColor)) || (a.frameColor != null && !hex(a.frameColor)) || (a.miterCutFaces !== undefined && typeof a.miterCutFaces !== 'boolean') || (a.planarFaceUv !== undefined && typeof a.planarFaceUv !== 'boolean'))) return fail('InvalidProjection','Invalid appearance','appearance');
  const picture=p.picture; if (picture !== undefined && (!picture || !dense(picture.widths) || picture.widths.length === 0 || !picture.widths.every(x => typeof x === 'number' && Number.isFinite(x) && x > 0) || (p.presentation && picture.widths.length !== p.presentation.size) || !picture.faces || Object.keys(picture.faces).length !== 6 || !FACE_KEYS.every(k => Object.hasOwn(picture.faces,k) && id(picture.faces[k])))) return fail('InvalidProjection','Invalid picture','picture');
  const profile=p.renderProfile;
  if(profile !== undefined) {
    if(!profile || profile.kind!=='cubeAssemblerV1' || !Number.isInteger(profile.size) || profile.size<2 || profile.size>7 || !dense(profile.meshes) || profile.meshes.length!==p.pieces.length || p.picture !== undefined || p.geometryProfile !== undefined || p.core !== undefined || (p.appearance !== undefined && (p.appearance.construction!=='stickered' || Object.keys(p.appearance).some(k=>k!=='construction')))  || p.pieces.some((piece:Piece)=>Array.isArray(piece?.stickers) && piece.stickers.some((sticker:Sticker)=>(sticker?.imageId !== undefined || !hex(sticker?.color))))) return fail('InvalidProjection','Invalid source render profile','renderProfile');
    const meshIds=new Set<string>();
    for(const mesh of profile.meshes){
      if(!mesh || !id(mesh.pieceId) || meshIds.has(mesh.pieceId) || !p.pieces.some((piece:Piece)=>piece?.id===mesh.pieceId)) return fail('InvalidProjection','Invalid source mesh identity','renderProfile');
      meshIds.add(mesh.pieceId);
      const piece=p.pieces.find((p:Piece)=>p?.id===mesh.pieceId) as Piece;
      if(!dense(mesh.surfaces) || mesh.surfaces.length===0) return fail('InvalidProjection','Missing source surface ranges','renderProfile');
      let rangeCursor=0;
      for(const surface of mesh.surfaces){
        if(!surface || !['body','sticker','cap'].includes(surface.role) || surface.firstIndex!==rangeCursor || !Number.isInteger(surface.indexCount) || surface.indexCount<=0 || surface.indexCount%3!==0 || (surface.face!==undefined && !['u','r','f','d','l','b'].includes(surface.face)) || (surface.role==='sticker' && (!surface.stickerId || !Array.isArray(piece.stickers) || !piece.stickers.some((sticker:Sticker)=>sticker?.id===surface.stickerId))) || (surface.role!=='sticker' && surface.stickerId!==undefined)) return fail('InvalidProjection','Invalid source surface range','renderProfile');
        rangeCursor+=surface.indexCount;
      }
      if(!Array.isArray(mesh.indices) || rangeCursor!==mesh.indices.length) return fail('InvalidProjection','Incomplete source surface ranges','renderProfile');
      if(!dense(mesh.positions) || mesh.positions.length===0 || mesh.positions.length%3!==0 || mesh.positions.length>3000000 || !mesh.positions.every(Number.isFinite) || !dense(mesh.normals,mesh.positions.length) || !mesh.normals.every(Number.isFinite) || !dense(mesh.colors,mesh.positions.length) || !mesh.colors.every(n=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1) || !dense(mesh.occlusion,mesh.positions.length/3) || !mesh.occlusion.every(n=>typeof n==='number' && Number.isFinite(n) && n>=0 && n<=1) || !dense(mesh.indices) || mesh.indices.length===0 || mesh.indices.length%3!==0 || !mesh.indices.every((n,i)=>typeof n==='number' && Number.isInteger(n) && n===i && n<mesh.positions.length/3)) return fail('InvalidProjection','Invalid source mesh attributes','renderProfile');
    }
  }
  let participating=0; const ids = new Set<string>();
  for (const [i, piece] of p.pieces.entries()) {
    if (!piece || !id(piece.id) || ids.has(piece.id) || !transform(piece.transform) || !Array.isArray(piece.stickers)) return fail('InvalidProjection', 'Invalid piece', `pieces[${i}]`);
    ids.add(piece.id);
    if (body && piece.geometry === undefined) return fail('InvalidProjection','Body profile requires piece geometry',`pieces[${i}].geometry`);
    if (piece.geometry !== undefined) {
      const g = piece.geometry;
      if (!g || !array(g.cellSize,3) || Array.from(g.cellSize).some((x: unknown) => typeof x !== 'number' || !Number.isFinite(x)) || g.cellSize.some((x: number) => x <= (body?.gap ?? 1 - .99)) || !Array.isArray(g.outerSides) || g.outerSides.length !== 3 || !Array.from(g.outerSides).every((side: unknown) => Array.isArray(side) && side.length === 2 && Array.from(side).every((v: unknown) => typeof v === 'boolean'))) return fail('InvalidProjection','Invalid piece geometry',`pieces[${i}].geometry`);
    }
    const normals=new Set<string>();
    for (const [j, s] of piece.stickers.entries()) {
      if (!s || !id(s.id) || ids.has(s.id) || !transform(s.transform) || !array(s.size, 2) || s.size.some((x: number) => x <= 0) || !id(s.color) || (s.imageId !== undefined && !id(s.imageId))) return fail('InvalidProjection', 'Invalid sticker', `pieces[${i}].stickers[${j}]`);
      ids.add(s.id);
      if(s.geometry !== undefined && (!s.geometry || !dense(s.geometry.referenceSize,2) || !s.geometry.referenceSize.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>0) || !Number.isFinite(s.geometry.cornerRadius) || s.geometry.cornerRadius<0 || s.geometry.cornerRadius>Math.min(...s.geometry.referenceSize)/2)) return fail('InvalidProjection','Invalid sticker geometry');
      if (s.sourceFace !== undefined) {
        const f=s.sourceFace; if (!f || !axis(f.normal) || !axis(f.up) || f.normal.reduce((sum:number,x:number,i:number)=>sum+x*f.up[i],0)!==0 || normals.has(f.normal.join(','))) return fail('InvalidProjection','Invalid source face',`pieces[${i}].stickers[${j}].sourceFace`);
        normals.add(f.normal.join(','));
        if(f.color !== undefined && !hex(f.color)) return fail('InvalidProjection','Invalid source face color');
        if (f.edgeColors !== undefined && (!f.edgeColors || typeof f.edgeColors !== 'object' || Array.isArray(f.edgeColors) || Object.entries(f.edgeColors).some(([k,v]) => !['left','right','top','bottom'].includes(k) || !(hex(v) || (dense(v) && v.length>0 && v.every((stop:unknown)=>!!stop && typeof stop==='object' && Number.isFinite((stop as {to:number}).to) && hex((stop as {color:string}).color))))))) return fail('InvalidProjection','Invalid face edges');
      }
      if (s.picture !== undefined) {
        const q=s.picture, f=s.sourceFace; if (!picture || !q || !FACE_KEYS.includes(q.face) || !dense(q.layerIndex,3) || !q.layerIndex.every((n:unknown)=>typeof n==='number' && Number.isInteger(n) && n>=0 && n<picture.widths.length) || !f || !sameValues(f.normal,PROJECTED_FACES[q.face as FaceKey].normal) || !sameValues(f.up,PROJECTED_FACES[q.face as FaceKey].up)) return fail('InvalidProjection','Invalid picture mapping');
        participating++;
      }
    }
  }
  if (picture && !participating) return fail('InvalidProjection','Picture has no participating stickers');
  return ok(undefined);
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,canonical(v)]));
  return value;
}
export const sameValues = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function validateTransition(t: Transition): Result<void> {
  if (!t) return fail('InvalidTransition', 'Missing transition');
  const fromValidation = validateProjection(t.from); if (!fromValidation.ok) return fromValidation;
  const toValidation = validateProjection(t.to); if (!toValidation.ok) return toValidation;
  if (!array(t.axis, 3) || !unit(t.axis) || !array(t.pivot, 3) || !Number.isFinite(t.signedAngleRadians) || !Number.isFinite(t.durationMs) || t.durationMs < 0 || !Array.isArray(t.pieceIds) || new Set(t.pieceIds).size !== t.pieceIds.length) return fail('InvalidTransition', 'Invalid turn');
  if (!sameValues(t.from.renderProfile,t.to.renderProfile) || !sameValues(t.from.geometryProfile,t.to.geometryProfile) || !sameValues(t.from.presentation, t.to.presentation) || !sameValues(t.from.core, t.to.core) || !sameValues(t.from.appearance,t.to.appearance) || !sameValues(t.from.picture,t.to.picture)) return fail('InvalidTransition', 'Scene metadata differs');
  const targets = new Map(t.to.pieces.map(p => [p.id, p]));
  const selected = new Set(t.pieceIds);
  if (targets.size !== t.from.pieces.length || [...selected].some(k => !targets.has(k) || !t.from.pieces.some(p => p.id === k))) return fail('InvalidTransition', 'Piece IDs differ');
  const pivot = new Vector3(...t.pivot);
  const rotation = new Q().setFromAxisAngle(new Vector3(...t.axis), t.signedAngleRadians);
  for (const source of t.from.pieces) {
    const target = targets.get(source.id);
    if (!target || !sameValues(source.geometry, target.geometry) || !sameValues([...source.stickers].sort((a,b) => a.id.localeCompare(b.id)), [...target.stickers].sort((a,b) => a.id.localeCompare(b.id)))) return fail('InvalidTransition', 'Sticker definitions differ');
    if (!selected.has(source.id)) { if (!sameValues(source.transform, target.transform)) return fail('InvalidTransition', 'Unselected piece changed'); continue; }
    const position = new Vector3(...source.transform.position).sub(pivot).applyQuaternion(rotation).add(pivot);
    const actual = new Vector3(...target.transform.position);
    const expectedQ = rotation.clone().multiply(new Q(...source.transform.rotation));
    const actualQ = new Q(...target.transform.rotation);
    if (position.distanceTo(actual) > tol || 1 - Math.abs(expectedQ.dot(actualQ)) > tol) return fail('InvalidTransition', 'Target does not match rotation');
  }
  return ok(undefined);
}
