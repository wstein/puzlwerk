import { createCubeStage } from '../viewer/index.js';
import { createPlayer } from '../packages/core-viewer-bridge/src/index.mjs';
import { mountOriginal } from '../reference/original.js';
import { comparePoses } from './compare.mjs';
import {addCoreMoves,refreshIndicator} from './core-controls.mjs';

const read = async url => { const r=await fetch(url); if(!r.ok) throw Error(`Failed to load ${url}`); return r.json(); };
export async function mountClassic(root, fixtureBase) {
  const [native,definition,state,appearance] = await Promise.all(['native.json','definition.json','state.json','appearance.json'].map(f=>read(new URL(f,fixtureBase))));
  const make=(tag,text,parent=root)=>{const e=document.createElement(tag); if(text)e.textContent=text; parent.append(e);return e;};
  const panes=make('div'); panes.className='comparison';
  const originalPane=make('section','',panes), candidatePane=make('section','',panes);
  make('h2','Original Cubistry',originalPane); const originalHost=make('div','',originalPane); originalHost.className='scene';
  make('h2','PuzlWerk Core + Viewer',candidatePane); const candidateHost=make('div','',candidatePane); candidateHost.className='scene';
  const info=make('p','Native Cubistry classic 2×2; move buttons compare independent physical states. Shared Play supports a single pointer; a second contact cancels. Native gesture parity and owner visual acceptance remain open.');
  const status=make('output'); status.textContent='Loading';
  const details=make('details'); make('summary','Wire, appearance, and native assets',details); const inspector=make('pre','',details);
  inspector.textContent=JSON.stringify({definition,state,appearance,assets:native.assets},null,2);
  const palette=Object.fromEntries(native.assets.images.filter(i=>i.kind==='color').map(i=>[i.id,i.color]));
  const resolveAsset=async id=>({ok:false,error:{code:'UnresolvedAsset',message:`No image asset mapping for ${id}`}});
  const created=createCubeStage(candidateHost,{resolveAsset,rotationStorageKey:`cubistry-viewer-rotation-v1:${location.pathname.slice(0,200)}`,appearanceStorageKey:`cubistry-viewer-appearance-v1:${location.pathname.slice(0,200)}`}); if(!created.ok) throw Error(created.error.message);
  const stage=created.value, added=stage.addCube({position:[0,0,0]}); if(!added.ok) throw Error(added.error.message);
  const scene=added.value;
  const opened=createPlayer(JSON.stringify({...definition,movePolicy:'any'}),JSON.stringify(state),JSON.stringify(appearance),{palette,defaultColor:'#ffffff',colorFrame:['#f4f4f4','#d9493f','#4caf67','#ffd500','#ff8000','#2154c8'],core:{center:[0,0,0],halfExtent:1}},scene);
  if(!opened.ok) throw Error(JSON.stringify(opened.error));
  const player=opened.value, loaded=await scene.setProjection(player.projection()); if(!loaded.ok) throw Error(JSON.stringify(loaded.error));
  const indicator=refreshIndicator(player,stage);if(!indicator.ok)throw Error(JSON.stringify(indicator.error));const configured=stage.setPlayTarget({child:scene,player,size:2,onCommit:()=>{refreshIndicator(player,stage);status.textContent='Shared Core changed by play; native comparison state is unchanged.';}});if(!configured.ok)throw Error(JSON.stringify(configured.error));
  const original=await mountOriginal(originalHost,native,fixtureBase.href);
  const compare=()=>comparePoses(original.getState(),JSON.parse(player.state()));
  status.textContent=compare()?'States match':'State mismatch';
  const controls=make('div');
  const actions=[['R','X',-1],['U','Y',-1],["R'",'X',1],["U'",'Y',1]];
  for(const [token,axis,turns] of actions){const button=make('button',token,controls);button.onclick=async()=>{
    for(const b of controls.children)b.disabled=true;
    try {const [result]=await Promise.all([player.turn(axis,[1],turns,250),original.move(token)]);if(!result.ok)throw Error(JSON.stringify(result.error));status.textContent=compare()?`States match after ${token}`:`State mismatch after ${token}`;}
    catch(e){status.textContent=`Error: ${e.message}`;}
    finally {for(const b of controls.children)b.disabled=false;}
  };}
  addCoreMoves(controls,{player,stage,size:2,setStatus:text=>{status.textContent=text}});
  return {player,stage,original,dispose(){player.dispose();stage.dispose();original.dispose();info.remove();}};
}
