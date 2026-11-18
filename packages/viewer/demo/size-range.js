// A solved CubeState of size n (?n=2..15, structurally open to 64) through the packaged bridge, with the view presets,
// external stickerless and interaction setters, the size-independent camera fit and the layer-width aware play target.
import {createCubeStage,cubeStageFit,standardLayerWidths,VIEW_PRESETS,viewPresetOrientation,ACCEPTED_MAX_SIZE} from '../dist/index.js';
import {createPlayer} from '../dist/bridge/index.mjs';
import {cubeStateDocuments} from '../dist/bridge/cube-state.mjs';
const n=Number(new URLSearchParams(location.search).get('n')??3);
const PALETTE={W:'#f7f6f1',R:'#cf2a3a',G:'#1e9e57',Y:'#f2d21b',O:'#ff7a1a',B:'#2459d6'};
const face=c=>Array(n*n).fill(c),cube={u:face('W'),r:face('R'),f:face('G'),d:face('Y'),l:face('O'),b:face('B')};
const made=cubeStateDocuments(n,cube,PALETTE);if(!made.ok)throw Error(`CubeState: ${JSON.stringify(made.error)}`);
const widths=standardLayerWidths(n),half=widths.reduce((a,b)=>a+b,0)/2,fit=cubeStageFit(half),views=[];
const created=createCubeStage(document.querySelector('#stage'),{resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'No assets'}}),appearanceControls:'hidden',viewPolicy:fit.viewPolicy,casterEnvelope:fit.casterEnvelope,initialOrientation:viewPresetOrientation('isometric'),mode:'smart',onViewChanged:view=>views.push(view.orientation),onError:error=>console.error(error.message)});
if(!created.ok)throw Error(created.error.message);const stage=created.value,added=stage.addCube({position:[0,0,0]});if(!added.ok)throw Error(added.error.message);const child=added.value;
const player=createPlayer(made.value.definition,made.value.state,made.value.appearance,made.value.options,child);if(!player.ok)throw Error(`Player: ${JSON.stringify(player.error)}`);
const t0=performance.now(),loaded=await child.setProjection(player.value.projection());if(!loaded.ok)throw Error(loaded.error.message);const loadMs=performance.now()-t0;
const setup=stage.setPlayTarget({child,player:player.value,size:n,layerWidths:widths,halfExtent:half});if(!setup.ok)throw Error(setup.error.message);
const nav=document.querySelector('#presets');for(const name of VIEW_PRESETS){const b=document.createElement('button');b.textContent=name;b.onclick=()=>stage.setViewPreset(name);nav.append(b)}
const sizes=document.querySelector('#sizes');for(let k=2;k<=ACCEPTED_MAX_SIZE;k++){const a=document.createElement('a');a.href=`?n=${k}`;a.textContent=`${k}`;sizes.append(a)}
document.querySelector('#stickerless').onclick=()=>void stage.setAppearance({...stage.getAppearance(),construction:stage.getAppearance().construction==='stickerless'?'stickered':'stickerless'});
document.querySelector('#play').onclick=()=>stage.setInteractionMode(stage.getInteractionMode()==='play'?'view':'play');
window.sizeRange={n,stage,child,player:player.value,widths,half,views,loadMs};
