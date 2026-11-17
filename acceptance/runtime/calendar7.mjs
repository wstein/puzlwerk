import {createCubeStage} from '../viewer/index.js';
import {open} from '../packages/core-viewer-bridge/src/index.mjs';
import {Calendar7Viewer,faceFills} from '../calendar7-reference/src/apps/calendar7/viewer.js';
import {parseState} from '../calendar7-reference/src/apps/calendar7/graph.js';
import {loadCalendarFont} from '../calendar7-reference/src/apps/calendar7/fonts.js';
import {namesGround} from '../calendar7-reference/src/apps/calendar7/schemes.js';
import * as geometry from '../calendar7-reference/src/apps/calendar7/geometry.js';

/** Original 2026 calendar root beside the Core-driven shared stage. */
export async function mountCalendar7(root,mode='standard') {
 const ref=new URL('../calendar7-reference/public/',import.meta.url),path=mode==='standard'?'':`${mode}/`,names=mode!=='standard';
 const data=await (await fetch(new URL(`calendar7/${path}state.v1.json`,ref))).json(),state=parseState(data),font=await loadCalendarFont('noto',ref.href);
 const pane=(title)=>{const section=document.createElement('section'),heading=document.createElement('h2'),host=document.createElement('div');heading.textContent=title;host.className='scene';section.append(heading,host);root.append(section);return host};
 const sourceHost=pane('Original Cubistry'),panel=document.createElement('div');sourceHost.append(panel);const source=new Calendar7Viewer(sourceHost,panel);source.setFont(font);source.setHomePose(state.pose);source.configure(state.printing,state.pose,state.surface,names?'names':'standard');
 const frames=source.frames,groups=new Map(),canvases=new Map();for(const frame of frames){let group=groups.get(frame.cubie);if(!group)groups.set(frame.cubie,group=[]);group.push(frame)}source.presentation.traverse(o=>{if(o.userData.stickerId)canvases.set(o.userData.stickerId,o.material.map.image)});
 const id='calendar7-source',pieces=[...groups].map(([n,a])=>({id:`p${n}`,home:a[0].p.map(v=>v*2),stickers:a.map(s=>({id:`s${s.id}`,normal:s.n,up:s.up}))}));
 const definition={schema:'puzlwerk.definition',revision:1,id,size:7,convention:'cube-shell-v1',movePolicy:'outer-wide',pieces},wire={schema:'puzlwerk.state',revision:1,definitionId:id,poses:pieces.map(p=>({pieceId:p.id,position:p.home,orientation:[1,0,0,0,1,0,0,0,1]}))},appearance={schema:'puzlwerk.appearance',revision:1,id:'calendar7-art',definitionId:id,stickers:frames.map(s=>({id:`s${s.id}`,color:'white',image:`tile${s.id}`,symmetry:'C1'}))};
 const colors=faceFills(source.printing,source.scheme,names?'names':'standard'),edges=source.edgeFills(source.printing,names?'names':'standard');
 const presentation=names?{cellSize:1,bodyGap:geometry.NAMES_GAP,bodyRadius:geometry.NAMES_BODY_RADIUS,bodyKind:'twoRadius',bodyInnerRadius:geometry.NAMES_INNER_RADIUS,bodyBevelSegments:geometry.NAMES_BEVEL_SEGMENTS,size:7,nominalEdge:geometry.NAMES_CUBE_EDGE,layerWidths:geometry.layerWidthsOf('names'),stickerWidth:.87,stickerRadius:.055,stickerOffset:.502}:{cellSize:1,bodyGap:.01,bodyRadius:.055,bodyBevelSegments:1,stickerWidth:.87,stickerRadius:.055,stickerOffset:.502};
 const opened=open(JSON.stringify(definition),JSON.stringify(wire),JSON.stringify(appearance),{palette:{white:'#ffffff'},defaultColor:'#ffffff',presentation,sourceFaceColors:Object.fromEntries([...colors].map(([n,c])=>[`s${n}`,c]))});if(!opened.ok)throw Error(JSON.stringify(opened.error));
 const targetHost=pane('PuzlWerk Core + Viewer'),made=createCubeStage(targetHost,{resolveAsset:async image=>{const value=canvases.get(Number(image.slice(4)));return value?{ok:true,value}:{ok:false,error:{code:'UnresolvedAsset',message:image}}},fovDegrees:24,initialOrientation:source.presentation.quaternion.toArray(),viewPolicy:()=>({distance:source.camera.position.z,far:200,groupScale:1})});if(!made.ok)throw Error(JSON.stringify(made.error));const stage=made.value,child=stage.addCube({position:[0,0,0]});if(!child.ok)throw Error(JSON.stringify(child.error));
 const projection=opened.value.projection;projection.appearance={construction:'stickerless',bodyColor:names?namesGround(source.scheme.dayFill):source.scheme.dayFill,miterCutFaces:names,planarFaceUv:names};for(const piece of projection.pieces)for(const sticker of piece.stickers)sticker.sourceFace.edgeColors=edges.get(Number(sticker.id.slice('sticker:s'.length)));
 const result=await child.value.setProjection(projection);if(!result.ok)throw Error(JSON.stringify(result.error));const checkbox=targetHost.querySelector('input[aria-label=Stickerless]');checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));return {source,stage};
}
