// SPDX-License-Identifier: AGPL-3.0-or-later
import { Matrix4, Quaternion, Vector3 } from 'three';
import * as Codec from '../../../core/res/PwCodec.res.mjs';
import * as Json from '../../../core/res/PwJson.res.mjs';
import * as Id from '../../../core/res/PwId.res.mjs';
import * as Shell from '../../../core/res/PwShell.res.mjs';
import * as Pose from '../../../core/res/PwPose.res.mjs';
import * as Move from '../../../core/res/PwMove.res.mjs';
import * as Validate from '../../../core/res/PwValidate.res.mjs';
import * as Orientation from '../../../core/res/PwOrientation.res.mjs';
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
    const home=vector(Shell.toVec(p.home)), extent=Shell.sizeToInt(Codec.size(definition._0))-1;
    return {id:`piece:${id}`,transform:{position:vector(Shell.toVec(Pose.position(pose))).map(v=>v*(profile?.cellSize ?? 1)/2),rotation:rotation(Pose.orientation(pose))},...(profile?{geometry:{cellSize:[profile.cellSize,profile.cellSize,profile.cellSize],outerSides:home.map(v=>[v===-extent,v===extent])}}:{}),stickers:p.stickers.map(s=>{
      const id=Id.toString(s.id), style=styles.get(id), normal=vector(s.normal), up=vector(s.up);
      const token=style?.color ?? (s.color === undefined ? undefined : Id.toString(s.color));
      return {id:`sticker:${id}`,transform:{position:normal.map(v=>v*(profile?.stickerOffset ?? .501)),rotation:stickerRotation(normal,up)},size:[profile?.stickerWidth ?? .87,profile?.stickerWidth ?? .87],...(profile?{geometry:{referenceSize:[profile.stickerWidth,profile.stickerWidth],cornerRadius:profile.stickerRadius}}:{}),color:options.palette[token] ?? options.defaultColor,...(style?.image ? {imageId:style.image}:{}),sourceFace:{normal,up,...(Object.hasOwn(options.sourceFaceColors ?? {},id)?{color:options.sourceFaceColors[id]}:{})}};
    })};
  });
  return {ok:true,value:{definition:definition._0,state:state._0,appearance:doc,ids:{pieces:wire.pieces.map(p=>({wire:p.id,viewer:`piece:${p.id}`})),stickers:wire.pieces.flatMap(p=>p.stickers.map(s=>({wire:s.id,viewer:`sticker:${s.id}`})))},projection:{pieces,...(options.core?{core:structuredClone(options.core)}:{}),...(options.renderProfile?{renderProfile:structuredClone(options.renderProfile)}:{}),...(profile?{...(profile.bodyKind==='twoRadius'?{presentation:{size:profile.size,nominalEdge:profile.nominalEdge}}:{}),geometryProfile:{body:profile.bodyKind==='twoRadius'?{kind:'twoRadius',gap:profile.bodyGap,bevelSegments:profile.bodyBevelSegments ?? 3,bigRadius:profile.bodyRadius,smallRadius:profile.bodyInnerRadius}:{kind:'roundedBox',gap:profile.bodyGap,radius:profile.bodyRadius,bevelSegments:profile.bodyBevelSegments ?? 3}},appearance:{construction:'stickered',frameColor:profile.frameColor ?? '#1c1c1f'}}:{})}}};
}

export function createPlayer(definitionText,stateText,appearanceText,options,scene) {
  const lockedOptions=structuredClone(options);
  const first = open(definitionText,stateText,appearanceText,lockedOptions);
  if (!first.ok) return first;
  let current = first.value, busy = false, disposed = false;
  return {ok:true,value:{
    state: () => Codec.encodeState(current.state),
    projection: () => current.projection,
    async turn(axis,layers,turns,durationMs,timing) {
      if (disposed || busy) return error({code:disposed?'Disposed':'Busy'});
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
        return {ok:true,value:undefined};
      } catch (cause) { return error({code:'TransitionFailed',cause}); }
      finally { busy=false; }
    },
    cancel() { return scene.cancel(); },
    dispose() { disposed=true; scene.dispose(); }
  }};
}
