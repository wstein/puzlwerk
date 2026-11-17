import {addCoreMoves,refreshIndicator} from './core-controls.mjs';
import {createCubeStage} from '../viewer/index.js';
import {createPlayer} from '../packages/core-viewer-bridge/src/index.mjs';
import {pictureDocuments,comparePictureState,pictureMove} from './picture-mapping.mjs';
import {PictureEditor} from '../picture-reference/src/apps/picture3/editor.js';
import {createCube3Design,moveInfo,apply} from '../picture-reference/src/apps/picture3/model.js';
import {CalendarViewer} from '../picture-reference/src/apps/calendar/viewer.js';
import {stickerArt,DEFAULT_CAL3_SCHEME} from '../picture-reference/src/apps/calendar/artwork.js';

/** Original Picture3 editor and CalendarViewer alongside Core and the shared viewer. */
export async function mountPicture(root) {
 const element=(tag,parent,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;parent.append(e);return e};
 const panes=element('div',root);panes.className='comparison';
 const left=element('section',panes),right=element('section',panes);
 element('h2',left,'Original Cubistry Picture3');const sourceHost=element('div',left);sourceHost.className='scene';
 element('h2',right,'PuzlWerk Core + Viewer');const targetHost=element('div',right);targetHost.className='scene';
 element('p',root,'Shared Play supports a single pointer; a second contact cancels. The native reference remains independently controlled.');
 const status=element('output',root,'Loading six native coast pictures');
 const editor=new PictureEditor();if(!await editor.preset('coast'))throw Error('Picture preset did not load');
 const design=createCube3Design(),artwork=editor.artwork('picture'),documents=pictureDocuments(design);
 const original=new CalendarViewer(sourceHost);original.configure(design,design.printing,artwork);
 const radius=Math.sqrt(3)*1.501;
 const made=createCubeStage(targetHost,{resolveAsset:async id=>{const match=/^tile:(\d+)$/.exec(id),image=match&&artwork.get(Number(match[1]));return image?{ok:true,value:image}:{ok:false,error:{code:'UnresolvedAsset',message:id}}},textureOrigin:'top-left',fovDegrees:24,initialOrientation:original.presentation.quaternion.toArray(),sensitivity:.007,dragThreshold:0,casterEnvelope:{radius,clearance:.08},viewPolicy:view=>{const vertical=Math.PI*view.fovDegrees/360,horizontal=Math.atan(Math.tan(vertical)*view.aspect),distance=radius*1.08/Math.sin(Math.min(vertical,horizontal))*view.zoom;return {distance,far:Math.max(100,distance+2*radius),groupScale:1}},materials:{plasticRoughness:.65}});
 if(!made.ok)throw Error(JSON.stringify(made.error));const stage=made.value,added=stage.addCube({position:[0,0,0]});if(!added.ok)throw Error(JSON.stringify(added.error));
 const opened=createPlayer(JSON.stringify({...documents.definition,movePolicy:'any'}),JSON.stringify(documents.state),JSON.stringify(documents.appearance),{palette:{},defaultColor:'#ffffff',colorFrame:['#f4f4f4','#d9493f','#4caf67','#ffd500','#ff8000','#2154c8'],sourceFaceColors:Object.fromEntries(design.printing.map(s=>[`s${s.id}`,stickerArt(s,DEFAULT_CAL3_SCHEME,false).ground])),sceneAppearance:{construction:'stickered',bodyColor:DEFAULT_CAL3_SCHEME.ground,frameColor:'#243d35'},core:{center:[0,0,0],halfExtent:1.5},presentation:{cellSize:1,bodyGap:.01,bodyRadius:.055,bodyKind:'twoRadius',bodyInnerRadius:.033,size:3,nominalEdge:3,stickerWidth:.87,stickerRadius:.055,stickerOffset:.502,frameColor:'#243d35'}},added.value);
 if(!opened.ok)throw Error(JSON.stringify(opened.error));const player=opened.value,loaded=await added.value.setProjection(player.projection());if(!loaded.ok)throw Error(JSON.stringify(loaded.error));
 const indicator=refreshIndicator(player,stage);if(!indicator.ok)throw Error(JSON.stringify(indicator.error));const configured=stage.setPlayTarget({child:added.value,player,size:3,onCommit:()=>{refreshIndicator(player,stage);status.textContent='Shared Core changed by play; native comparison state is unchanged.';}});if(!configured.ok)throw Error(JSON.stringify(configured.error));
 const controls=element('div',root);let state=design.printing,busy=false;
 const compare=()=>comparePictureState(state,documents.definition,JSON.parse(player.state()));
 const update=()=>{status.textContent=compare()?'Native and Core sticker positions and orientations match':'State mismatch';};update();
 async function turn(token){if(busy)return;busy=true;for(const button of controls.children)button.disabled=true;try{const from=state,to=apply(from,token),move=moveInfo(token),mapped=pictureMove(move);const [_,result]=await Promise.all([original.animate(from,token,to),player.turn(mapped.axis,mapped.layers,mapped.turns,250*Math.abs(move.turns))]);if(!result.ok)throw Error(JSON.stringify(result.error));state=to;update();}catch(error){status.textContent=`Error: ${error.message}`;throw error}finally{busy=false;for(const button of controls.children)button.disabled=false;}}
 for(const face of ['U','D','F','B','L','R'])for(const suffix of ['',"'",'2']){const token=face+suffix,button=element('button',controls,token);button.onclick=()=>{void turn(token).catch(()=>{})};}
 addCoreMoves(controls,{player,stage,size:3,setStatus:text=>{status.textContent=text}});
 const details=element('details',root);element('summary',details,'Native picture mapping and wire documents');element('pre',details,JSON.stringify(documents,null,2));
 return {editor,original,player,stage,documents,turn,compare,dispose(){player.dispose();stage.dispose();original.destroy();editor.dispose()}};
}
