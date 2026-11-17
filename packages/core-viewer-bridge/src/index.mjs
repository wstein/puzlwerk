// SPDX-License-Identifier: AGPL-3.0-or-later
import { Matrix4, Quaternion, Vector3 } from 'three';
import * as Codec from '../../../core/res/PwCodec.res.mjs';
import * as Json from '../../../core/res/PwJson.res.mjs';
import * as Id from '../../../core/res/PwId.res.mjs';
import * as Shell from '../../../core/res/PwShell.res.mjs';
import * as Pose from '../../../core/res/PwPose.res.mjs';
import * as Move from '../../../core/res/PwMove.res.mjs';
import * as Notation from '../../../core/res/PwNotation.res.mjs';
import * as Validate from '../../../core/res/PwValidate.res.mjs';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
import * as ColorFrame from '../../../core/res/PwColorFrame.res.mjs';
import { checkAppearance } from './appearance.mjs';

const vector = v => [v.x,v.y,v.z];
const rotation = m => {
  const a = Orientation.toArray(m);
  return new Quaternion().setFromRotationMatrix(new Matrix4().set(a[0],a[1],a[2],0,a[3],a[4],a[5],0,a[6],a[7],a[8],0,0,0,0,1)).toArray();
};
const stickerRotation = (normal, up) => {
  const z = new Vector3(...normal), y = new Vector3(...up), x = y.clone().cross(z);
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x,y,z)).toArray();
};
const error = value => ({ok:false,error:typeof value === 'string' ? {code:value} : value?.TAG ? {code:value.TAG,detail:value._0} : value});
/** Parse exactly one Core notation move; policy is enforced when it is applied. */
export function parseNotation(size,text) {
 if(!Number.isSafeInteger(size)||typeof text!=='string')return error({code:'InvalidMove'});
 const made=Shell.makeSize(size);if(made.TAG!=='Ok')return error({code:'InvalidMove'});
 const parsed=Notation.parse(made._0,text);if(parsed.TAG!=='Ok' || parsed._0.length!==1)return error({code:'InvalidMove'});
 const move=parsed._0[0];return {ok:true,value:{axis:Move.axis(move),layers:Move.layers(move),turns:Move.turns(move),rotation:rotation(Move.rotation(move))}};
}
export function open(definitionText,stateText,appearanceText,options) {
  const definition = Codec.decodeDefinition(definitionText);
  if (definition.TAG !== 'Ok') return error(definition._0);
  const state = Codec.decodeState(definition._0,stateText);
  if (state.TAG !== 'Ok') return error(state._0);
  const parsed = Json.parse(appearanceText);
  if (parsed.TAG !== 'Ok') return error(parsed._0);
  const doc = JSON.parse(Json.toCanonical(parsed._0));
  const wire = JSON.parse(Codec.encodeDefinition(definition._0));
  const checked = checkAppearance(wire,doc);
  if (!checked.ok) return error(checked);
  if(options.sourceFaceColors!==undefined && (!options.sourceFaceColors || typeof options.sourceFaceColors!=='object' || Array.isArray(options.sourceFaceColors) || Object.entries(options.sourceFaceColors).some(([id,color])=>!id || typeof color!=='string' || !/^#[0-9a-f]{6}$/i.test(color)))) return error({code:'InvalidPresentation'});
  const profile=options.presentation;
  const widths=profile?.layerWidths;
  if(widths!==undefined && (!profile || profile.bodyKind!=='twoRadius' || !Array.isArray(widths) || widths.length!==profile.size || widths.some((w,i)=>!Number.isFinite(w) || w<=0 || Math.abs(w-widths[widths.length-1-i])>1e-9))) return error({code:'InvalidPresentation'});
  const centers=widths?.map((_,i)=>widths.slice(0,i).reduce((a,b)=>a+b,0)+widths[i]/2-widths.reduce((a,b)=>a+b,0)/2);
  if(profile && ((profile.bodyBevelSegments!==undefined && (!Number.isSafeInteger(profile.bodyBevelSegments) || profile.bodyBevelSegments<1)) || (profile.bodyKind!==undefined && !['roundedBox','twoRadius'].includes(profile.bodyKind)) || (profile.bodyKind==='twoRadius' && (!Number.isInteger(profile.size) || profile.size<2 || profile.size>7 || !Number.isFinite(profile.nominalEdge) || profile.nominalEdge<=0 || !Number.isFinite(profile.bodyInnerRadius) || profile.bodyInnerRadius<=0 || profile.bodyInnerRadius>profile.bodyRadius)))) return error({code:'InvalidPresentation'});
  if (profile && (!Number.isFinite(profile.cellSize) || profile.cellSize<=0 || !Number.isFinite(profile.bodyGap) || profile.bodyGap<0 || profile.bodyGap>=profile.cellSize || !Number.isFinite(profile.bodyRadius) || profile.bodyRadius<=0 || profile.bodyRadius>(profile.cellSize-profile.bodyGap)/2 || (profile.frameColor !== undefined && !/^#[0-9a-f]{6}$/i.test(profile.frameColor)) || !Number.isFinite(profile.stickerWidth) || profile.stickerWidth<=0 || !Number.isFinite(profile.stickerRadius) || profile.stickerRadius<0 || profile.stickerRadius>profile.stickerWidth/2 || !Number.isFinite(profile.stickerOffset) || profile.stickerOffset<=0)) return error({code:'InvalidPresentation'});
  const styles = new Map(doc.stickers.map(s => [s.id,s]));
  for (const p of wire.pieces) for (const s of p.stickers) {
    const token = styles.get(s.id)?.color ?? s.color;
    if (token !== undefined && !Object.hasOwn(options.palette,token)) return error({code:'UnresolvedColor',id:token});
  }
  const poses = new Map(Codec.poses(state._0).map(p => [Id.toString(Pose.pieceId(p)),p]));
  const pieces = Codec.pieces(definition._0).map(p => {
    const id=Id.toString(p.id), pose=poses.get(id);
    const home=vector(Shell.toVec(p.home)), extent=Shell.sizeToInt(Codec.size(definition._0))-1, cell=widths ? home.map(v=>widths[(v+extent)/2]) : undefined;
    return {id:`piece:${id}`,transform:{position:vector(Shell.toVec(Pose.position(pose))).map(v=>centers ? centers[(v+extent)/2] : v*(profile?.cellSize ?? 1)/2),rotation:rotation(Pose.orientation(pose))},...(profile?{geometry:{cellSize:cell ?? [profile.cellSize,profile.cellSize,profile.cellSize],outerSides:home.map(v=>[v===-extent,v===extent])}}:{}),stickers:p.stickers.map(s=>{
      const id=Id.toString(s.id), style=styles.get(id), normal=vector(s.normal), up=vector(s.up);
      const token=style?.color ?? (s.color === undefined ? undefined : Id.toString(s.color));
      const axis=v=>v.findIndex(x=>x!==0), right=[up[1]*normal[2]-up[2]*normal[1],up[2]*normal[0]-up[0]*normal[2],up[0]*normal[1]-up[1]*normal[0]], depth=profile?.stickerOffset ?? .501;
      return {id:`sticker:${id}`,transform:{position:normal.map(v=>v*(cell ? depth-.5+cell[axis(normal)]/2 : depth)),rotation:stickerRotation(normal,up)},size:cell ? [(profile?.stickerWidth ?? .87)*cell[axis(right)],(profile?.stickerWidth ?? .87)*cell[axis(up)]] : [profile?.stickerWidth ?? .87,profile?.stickerWidth ?? .87],...(profile?{geometry:{referenceSize:[profile.stickerWidth,profile.stickerWidth],cornerRadius:profile.stickerRadius}}:{}),color:options.palette[token] ?? options.defaultColor,...(style?.image ? {imageId:style.image}:{}),sourceFace:{normal,up,...(Object.hasOwn(options.sourceFaceColors ?? {},id)?{color:options.sourceFaceColors[id]}:{})}};
    })};
  });
  return {ok:true,value:{definition:definition._0,state:state._0,appearance:doc,ids:{pieces:wire.pieces.map(p=>({wire:p.id,viewer:`piece:${p.id}`})),stickers:wire.pieces.flatMap(p=>p.stickers.map(s=>({wire:s.id,viewer:`sticker:${s.id}`})))},projection:{pieces,...(options.core?{core:structuredClone(options.core)}:{}),...(options.renderProfile?{renderProfile:structuredClone(options.renderProfile)}:{}),...(profile?{...(profile.bodyKind==='twoRadius'?{presentation:{size:profile.size,nominalEdge:profile.nominalEdge,...(widths?{layerWidths:[...widths]}:{})}}:{}),geometryProfile:{body:profile.bodyKind==='twoRadius'?{kind:'twoRadius',gap:profile.bodyGap,bevelSegments:profile.bodyBevelSegments ?? 3,bigRadius:profile.bodyRadius,smallRadius:profile.bodyInnerRadius}:{kind:'roundedBox',gap:profile.bodyGap,radius:profile.bodyRadius,bevelSegments:profile.bodyBevelSegments ?? 3}},appearance:{construction:'stickered',frameColor:profile.frameColor ?? '#1c1c1f'}}:{})}}};
}

// Values are renderer colors in U/R/F/D/L/B order. On odd cubes infer the
// actual current center stickers; image-only or ambiguous centers stay unknown.
function initialColorFrame(snapshot,options) {
 const explicit=options.colorFrame;
 if(explicit!==undefined)return Array.isArray(explicit)&&explicit.length===6&&Array.from(explicit).every(v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))?[...explicit]:undefined;
 const n=Shell.sizeToInt(Codec.size(snapshot.definition));if(n%2===0)return undefined;
 const directions=[[0,1,0],[1,0,0],[0,0,1],[0,-1,0],[-1,0,0],[0,0,-1]], poses=new Map(Codec.poses(snapshot.state).map(p=>[Id.toString(Pose.pieceId(p)),p])),styles=new Map(snapshot.appearance.stickers.map(s=>[s.id,s]));
 const values=directions.map(normal=>{const hits=[];for(const piece of Codec.pieces(snapshot.definition)){const pose=poses.get(Id.toString(piece.id)),pos=vector(Shell.toVec(Pose.position(pose)));if(!pos.every((v,i)=>v===normal[i]*(n-1)))continue;for(const sticker of piece.stickers){const world=vector(Orientation.apply(Pose.orientation(pose),sticker.normal));if(!world.every((v,i)=>v===normal[i]))continue;const id=Id.toString(sticker.id),style=styles.get(id),token=style?.color ?? (sticker.color===undefined?undefined:Id.toString(sticker.color)),color=options.sourceFaceColors?.[id] ?? options.palette[token];if(typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color))hits.push(color)}}return hits.length===1?hits[0]:undefined});
 return values.every(Boolean)?values:undefined;
}
export function createPlayer(definitionText,stateText,appearanceText,options,scene) {
  const lockedOptions=structuredClone(options);
  const first = open(definitionText,stateText,appearanceText,lockedOptions);
  if (!first.ok) return first;
  let current = first.value, colorFrame=initialColorFrame(first.value,lockedOptions), busy = false, disposed = false, activePreview, unavailable = false;
  return {ok:true,value:{
    state: () => Codec.encodeState(current.state),
    colorFrame: () => colorFrame ? {ok:true,value:[...colorFrame]} : error({code:"UnknownColorFrame"}),
    projection: () => current.projection,
    beginPreview(axis,layers) {
      if(activePreview && !activePreview.isActive())activePreview.cancel();
      if(disposed || unavailable || busy)return error({code:disposed?'Disposed':unavailable?'Unavailable':'Busy'});
      if(!['X','Y','Z'].includes(axis) || !Array.isArray(layers) || !layers.every(Number.isInteger))return error({code:'InvalidMove'});
      if(typeof scene.beginPreview!=='function')return error({code:'Unavailable'});
      const chosen=[...layers],probe=Move.make(Codec.size(current.definition),axis,chosen,1);if(probe.TAG!=='Ok')return error(probe._0);
      const permitted=Validate.applyMove(current.definition,current.state,probe._0);if(permitted.TAG!=='Ok')return error(permitted._0);
      const ids=Codec.poses(current.state).filter(p=>Move.selects(probe._0,Pose.position(p))).map(p=>`piece:${Id.toString(Pose.pieceId(p))}`),axes={X:[1,0,0],Y:[0,1,0],Z:[0,0,1]},origin=current;
      let started;try{started=scene.beginPreview({from:origin.projection,pieceIds:ids,axis:axes[axis],pivot:[0,0,0]});}catch{return error({code:'Unavailable'});}if(!started.ok)return started;busy=true;let active=true;
      const finish=()=>{active=false;busy=false;activePreview=undefined;};
      const handle={pieceIds:Object.freeze([...ids]),isActive(){return active && (typeof started.value.isActive!=='function' || started.value.isActive())},update(angle){if(!active || disposed)return error({code:'Cancelled'});let result;try{result=started.value.update(angle)}catch{try{started.value.cancel()}catch{unavailable=true}finish();return error({code:'Unavailable'})}if(!result.ok && (result.error?.code==='Cancelled' || (typeof started.value.isActive==='function' && !started.value.isActive())))finish();return result},cancel(){if(!active)return error({code:'Cancelled'});let result;try{result=started.value.cancel()}catch{unavailable=true;result=error({code:'Unavailable'})}finish();return result},commit(turns){
        if(!active || disposed)return error({code:'Cancelled'});if(![-1,1,2].includes(turns))return error({code:'InvalidMove'});
        const move=Move.make(Codec.size(origin.definition),axis,chosen,turns);if(move.TAG!=='Ok')return error(move._0);const next=Validate.applyMove(origin.definition,origin.state,move._0);if(next.TAG!=='Ok')return error(next._0);
        const target=open(definitionText,Codec.encodeState(next._0),appearanceText,lockedOptions);if(!target.ok)return target;
        let result;try{result=started.value.commit({from:origin.projection,to:target.value.projection,pieceIds:ids,axis:axes[axis],signedAngleRadians:turns*Math.PI/2,pivot:[0,0,0],durationMs:0});}catch{result=error({code:'Unavailable'});}if(result.ok){current=target.value;if(colorFrame)colorFrame=ColorFrame.advance(colorFrame,move._0);}else try{started.value.cancel();}catch{unavailable=true}finish();return result;
      }};activePreview=handle;return {ok:true,value:handle};
    },
    async turn(axis,layers,turns,durationMs,timing) {
      if(activePreview && !activePreview.isActive())activePreview.cancel();
      if (disposed || unavailable || busy) return error({code:disposed?'Disposed':unavailable?'Unavailable':'Busy'});
      if (!['X','Y','Z'].includes(axis) || !Array.isArray(layers) || !layers.every(Number.isInteger) || ![-1,1,2].includes(turns) || !Number.isFinite(durationMs) || durationMs < 0 || (timing !== undefined && typeof timing !== 'function')) return error({code:'InvalidMove'});
      const made=Move.make(Codec.size(current.definition),axis,layers,turns);
      if (made.TAG !== 'Ok') return error(made._0);
      const next=Validate.applyMove(current.definition,current.state,made._0);
      if (next.TAG !== 'Ok') return error(next._0);
      const target=open(definitionText,Codec.encodeState(next._0),appearanceText,lockedOptions);
      if (!target.ok) return target;
      const selected=Codec.poses(current.state).filter(p=>Move.selects(made._0,Pose.position(p))).map(p=>`piece:${Id.toString(Pose.pieceId(p))}`);
      const axes={X:[1,0,0],Y:[0,1,0],Z:[0,0,1]};
      busy=true;
      try {
        const result=await scene.transition({from:current.projection,to:target.value.projection,pieceIds:selected,axis:axes[axis],signedAngleRadians:turns*Math.PI/2,pivot:[0,0,0],durationMs},timing);
        if (!result.ok) return result;
        current=target.value;
        if(colorFrame)colorFrame=ColorFrame.advance(colorFrame,made._0);
        return {ok:true,value:undefined};
      } catch (cause) { return error({code:'TransitionFailed',cause}); }
      finally { busy=false; }
    },
    cancel() { return activePreview ? activePreview.cancel() : scene.cancel(); },
    dispose() { if(activePreview)activePreview.cancel();disposed=true;scene.dispose(); }
  }};
}

