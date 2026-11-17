import * as THREE from 'three';
import {createCubeStage} from '../viewer/index.js';
import {createPlayer} from '../packages/core-viewer-bridge/src/index.mjs';
import {visibleColorsMatch} from './facelet-compare.mjs';
import {sourceMeshProfile} from './source-mesh-profile.mjs';

const read=async url=>{const response=await fetch(url);if(!response.ok)throw Error(`Cannot load ${url}`);return response.json();};
const palette={W:'#f7f6f1',O:'#ff7a1a',G:'#1e9e57',R:'#cf2a3a',B:'#2459d6',Y:'#f2d21b'};

// The original component reads and writes document.cookie. An iframe-local accessor isolates
// those preferences before its module is loaded, without reading or mutating the host's cookies.
function originalFrame(host,referenceBase) {
  const frame=document.createElement('iframe'); frame.title='Original CubeAssembler viewer';
  frame.setAttribute('sandbox','allow-scripts allow-same-origin'); frame.style.cssText='width:100%;height:360px;border:0';
  const js=JSON.stringify(new URL('original.js',referenceBase).href).replaceAll('<','\\u003c');
  const css=JSON.stringify(new URL('original.css',referenceBase).href).replaceAll('<','\\u003c');
  frame.srcdoc=`<!doctype html><html><head><style>html,body,#root{margin:0;width:100%;height:100%}</style></head><body><div id="root"></div><script type="module">
    Object.defineProperty(document,'cookie',{configurable:false,get(){return ''},set(_value){}});
    const link=document.createElement('link');link.rel='stylesheet';link.href=${css};document.head.append(link);
    try {const {mountOriginal}=await import(${js});const app=mountOriginal(document.querySelector('#root'));
      addEventListener('message',event=>{if(event.source!==parent)return;const {id,action,face,turns}=event.data||{};try{if(action==='move')app.move(face,turns);if(action==='dispose')app.dispose();parent.postMessage({kind:'ca-reference',id,state:app.getState()},'*');}catch(e){parent.postMessage({kind:'ca-reference',id,error:String(e)},'*');}});
      parent.postMessage({kind:'ca-reference-ready',state:app.getState()},'*');
    } catch(e) {parent.postMessage({kind:'ca-reference-error',error:String(e)},'*');}
  <\/script></body></html>`;
  host.append(frame);
  let next=0;const pending=new Map();let readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const listener=event=>{if(event.source!==frame.contentWindow)return;const data=event.data;if(data?.kind==='ca-reference-ready')readyResolve(data.state);else if(data?.kind==='ca-reference-error')readyReject(Error(data.error));else if(data?.kind==='ca-reference'){const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.state);}};
  window.addEventListener('message',listener);
  return {frame,ready,request(action,face,turns){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});frame.contentWindow.postMessage({id,action,face,turns},'*');});},dispose(){window.removeEventListener('message',listener);frame.remove();}};
}

export async function mountCubeAssembler(root,fixtureBase,referenceBase) {
  const base=new URL(fixtureBase,location.href),reference=new URL(referenceBase,location.href);
  const [native,definition,state,appearance,provenance,raw,projector]=await Promise.all([
    read(new URL('native.json',base)),read(new URL('definition.json',base)),read(new URL('state.json',base)),read(new URL('appearance.json',base)),read(new URL('provenance.json',base)),read(new URL('raw-mesh.json',base)),import(new URL('facelets.mjs',base).href)
  ]);
  const add=(tag,text,parent=root)=>{const element=document.createElement(tag);if(text)element.textContent=text;parent.append(element);return element;};
  add('p','CubeAssembler solved 2×2: the source state contains colors only. Candidate piece and sticker IDs label known home slots; they are not source identities.');
  add('p','Visible facelet equality is checked after each move. The candidate uses source-derived geometry, material and shadow in the shared viewer. Visual equivalence, gestures, touch turns, animation and owner acceptance remain open.');
  const panes=add('div');panes.className='comparison';panes.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem';const originalPane=add('section','',panes),candidatePane=add('section','',panes);
  add('h3','Original CubeAssembler',originalPane);const originalHost=add('div','',originalPane);
  add('h3','PuzlWerk Core and Viewer',candidatePane);const candidateHost=add('div','',candidatePane);candidateHost.className='scene';candidateHost.style.background='transparent';
  const status=add('output');status.textContent='Loading';
  const inspector=add('details');add('summary','Definition, state, appearance and color assets',inspector);const output=add('pre','',inspector);
  output.textContent=JSON.stringify({definition,state,appearance,palette,presentation:provenance.presentation},null,2);
  const original=originalFrame(originalHost,reference);
  const {camera,lighting:l}=provenance.presentation;
  const renderProfile=sourceMeshProfile({...raw.mesh,ranges:raw.ranges},definition);
  const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(camera.pitchRadians,camera.yawRadians,0,'XYZ')).toArray();
  const directional=(position,intensity,visible=true)=>({color:'#ffffff',intensity,visible,position,target:[0,0,0]});
  const lighting={ambient:{color:'#ffffff',intensity:l.ambient,visible:true},hemisphere:{sky:'#ffffff',ground:'#ffffff',intensity:0,visible:false,position:[0,1,0]},key:directional(l.keyDirection,l.keyDiffuse),fill:directional(l.fillDirection,l.fillDiffuse),rim:directional([0,1,1],0,false),shadowFill:directional([0,1,1],0,false),extraDirectionals:[],keyShadowStrength:0,shadowFillStrength:0,floorOpacity:0,contactShadow:false,fineShadowEdges:false,colorTemperature:false,toneMapping:'neutral',exposure:1};
  const created=createCubeStage(candidateHost,{resolveAsset:async id=>({ok:false,error:{code:'UnresolvedAsset',message:`No asset mapping for ${id}`}}),fovDegrees:camera.fieldOfViewDegrees,zoom:1,initialOrientation:orientation,mode:'classic',sensitivity:.004,dragThreshold:0,reducedMotion:false,casterEnvelope:{radius:2,clearance:.08},viewPolicy:()=>({distance:camera.distance,far:camera.far,groupScale:1}),lighting});
  if(!created.ok)throw Error(created.error.message);const stage=created.value;
  const added=stage.addCube({position:[0,0,0]});if(!added.ok)throw Error(added.error.message);const scene=added.value;
  const opened=createPlayer(JSON.stringify(definition),JSON.stringify(state),JSON.stringify(appearance),{palette,defaultColor:'#ffffff',renderProfile},scene);
  if(!opened.ok)throw Error(JSON.stringify(opened.error));const player=opened.value;
  const loaded=await scene.setProjection(player.projection());if(!loaded.ok)throw Error(JSON.stringify(loaded.error));
  const projected=()=>projector.faceletsFromWire(definition,JSON.parse(player.state()),appearance);
  const initial=await original.ready;
  const show=(nativeState,label)=>{const equal=visibleColorsMatch(nativeState,projected());status.textContent=equal?`Visible facelets match ${label}`:`Visible facelets differ ${label}`;return equal;};
  if(!show(initial,'at start')||!visibleColorsMatch(initial,native.home))throw Error('Initial native fixture mismatch');
  const controls=add('div');let failed=false;
  for(const [label,face,turns,axis,coreTurns] of [['R','R',1,'X',-1],['U','U',1,'Y',-1],["R'",'R',-1,'X',1],["U'",'U',-1,'Y',1]]){
    const button=add('button',label,controls);button.onclick=async()=>{for(const b of controls.children)b.disabled=true;
      try {const result=await player.turn(axis,[1],coreTurns,300);if(!result.ok)throw Error(JSON.stringify(result.error));const resultState=await original.request('move',face,turns);if(!show(resultState,`after ${label}`))throw Error('Visible facelets differ');}
      catch(e){failed=true;status.textContent=`Comparison stopped: ${e.message}`;}
      finally {if(!failed)for(const b of controls.children)b.disabled=false;}
    };
  }
  return {player,original,dispose(){player.dispose();stage.dispose();original.request('dispose').finally(()=>original.dispose());}};
}
