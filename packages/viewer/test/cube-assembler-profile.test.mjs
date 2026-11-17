import {test} from 'node:test';
import {Quaternion,Euler} from 'three';
import assert from 'node:assert/strict';
import {validateProjection,validateTransition} from '../dist/contract.js';
import {createSceneForTest} from '../dist/scene.js';
const identity={position:[0,0,0],rotation:[0,0,0,1]};
const mesh={pieceId:'p',positions:[0,0,0,1,0,0,0,1,0],normals:[0,0,1,0,0,1,0,0,1],colors:[.1,.2,.3,.1,.2,.3,.1,.2,.3],occlusion:[1,.5,1],indices:[0,1,2],surfaces:[{role:'body',firstIndex:0,indexCount:3}]};
const projection={pieces:[{id:'p',transform:identity,stickers:[]}],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[mesh]}};
test('source profile validates complete per-piece buffer geometry',()=>{
 assert.equal(validateProjection(projection).ok,true);
 for(const invalid of [{...mesh,occlusion:[1]}, {...mesh,indices:[0,1,3]}, {...mesh,pieceId:'other'}, {...mesh,colors:[NaN]}, {...mesh,surfaces:[{role:'body',firstIndex:1,indexCount:3}]}]) assert.equal(validateProjection({...projection,renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[invalid]}}).ok,false);
 const to={...projection,renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[{...mesh,occlusion:[1,1,1]}]}};
 assert.equal(validateTransition({from:projection,to,pieceIds:[],axis:[1,0,0],signedAngleRadians:0,pivot:[0,0,0],durationMs:0}).ok,false);
});
test('source profile creates the source attributes and rejects artwork replacement',async()=>{
 let rendered;const frames=[];const clock={now:()=>0,request:cb=>{frames.push(cb);return frames.length;},cancel(){}};
 const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},clock,{render:s=>{rendered=s;},dispose(){}});
 assert.equal((await scene.setProjection(projection)).ok,true);frames.splice(0).forEach(cb=>cb(0));
 const body=rendered.getObjectByName('p');let found;body.traverse(x=>{if(x.isMesh&&x.geometry.getAttribute('occlusion'))found=x;});
 assert.ok(found);assert.deepEqual(Array.from(found.geometry.getAttribute('occlusion').array),mesh.occlusion);
 assert.ok(rendered.getObjectByName('cubeAssemblerV1-shadow'));
 assert.equal((await scene.setArtwork({stickers:[]})).error.code,'Unavailable');scene.dispose();assert.equal(rendered.getObjectByName('cubeAssemblerV1-shadow'),undefined);
});

test('native floor outline is the projected cube hull with fixed-length padding',async()=>{
 const {cubeAssemblerOutline}=await import('../dist/cube-assembler-profile.js');
 const outline=cubeAssemblerOutline(2,[0,0,0,1]);assert.deepEqual(outline.slice(0,4),[[-1,-1],[1,-1],[1,1],[-1,1]]);assert.equal(outline.length,8);assert.deepEqual(outline[7],[-1,1]);
});

// Source oracle: CubeShadow.res at CubeAssembler 1b7387, size=2, Rx(.52)Ry(-.74).
test('source isometric shadow outline agrees with native Float32 oracle',async()=>{
 const {cubeAssemblerOutline}=await import('../dist/cube-assembler-profile.js');
 const q=new Quaternion().setFromEuler(new Euler(.52,-.74,0,'XYZ')).toArray();
 const actual=cubeAssemblerOutline(2,q).flat().map(Math.fround);
 const expected=[-1.4127564430236816,-.441182941198349,-.0641806498169899,-1.7228972911834717,1.4127564430236816,-.5525773167610168,1.4127564430236816,.441182941198349,.0641806498169899,1.7228972911834717,-1.4127564430236816,.5525773167610168,-1.4127564430236816,.5525773167610168,-1.4127564430236816,.5525773167610168];
 assert.deepEqual(actual,expected);
});

test('source-profile sticker surfaces use the projection appearance color',async()=>{
 const surface={...mesh,surfaces:[{role:'sticker',face:'f',stickerId:'s',firstIndex:0,indexCount:3}]};
 const sticker={id:'s',transform:identity,size:[.8,.8],color:'#ff8040'};
 const p={pieces:[{id:'p',transform:identity,stickers:[sticker]}],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[surface]}};
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 assert.equal(validateProjection({...p,pieces:[{...p.pieces[0],stickers:[{...sticker,imageId:'image'}]}]}).ok,false);
 assert.equal(validateProjection({...p,pieces:[{...p.pieces[0],stickers:[{...sticker,color:'transparent'}]}]}).ok,false);
 assert.equal(validateProjection({...p,appearance:{construction:'stickered',frameColor:'#ffffff'}}).ok,false);
 assert.equal(validateProjection({...p,appearance:{construction:'stickerless'}}).ok,false);
 assert.equal((await scene.setProjection(p)).ok,true);frames.splice(0).forEach(cb=>cb(0));let surfaceMesh;rendered.getObjectByName('p').traverse(x=>{if(x.isMesh&&x.geometry.getAttribute('sourceColor'))surfaceMesh=x;});
 const c=surfaceMesh.geometry.getAttribute('sourceColor');assert.equal(c.getX(0),1);assert.ok(Math.abs(c.getY(0)-128/255)<1e-7);assert.ok(Math.abs(c.getZ(0)-64/255)<1e-7);scene.dispose();
});

test('source profile releases mesh and shadow after context loss and dispose',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 assert.equal((await scene.setProjection(projection)).ok,true);frames.splice(0).forEach(cb=>cb(0));const body=rendered.getObjectByName('p');let surface;body.traverse(x=>{if(x.isMesh)surface=x;});let geometryDisposed=false,materialDisposed=false;surface.geometry.addEventListener('dispose',()=>geometryDisposed=true);surface.material.addEventListener('dispose',()=>materialDisposed=true);
 scene.contextLost();assert.equal((await scene.setProjection(projection)).error.code,'ContextLost');scene.dispose();assert.equal(geometryDisposed,true);assert.equal(materialDisposed,true);assert.equal(rendered.getObjectByName('cubeAssemblerV1-shadow'),undefined);
});


test('invalid source profiles are rejected before mutation and preserve lifecycle',async()=>{
 let rendered,requests=0;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>{requests++;return {ok:true,value:{}}}},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:value=>{rendered=value},dispose(){}});
 const supported={pieces:[{id:'kept',transform:identity,stickers:[]}]};assert.equal((await scene.setProjection(supported)).ok,true);frames.splice(0).forEach(cb=>cb(0));const body=rendered.getObjectByName('kept');
 const surface={...mesh,surfaces:[{role:'sticker',face:'f',stickerId:'missing',firstIndex:0,indexCount:3}]};const sticker={id:'s',transform:identity,size:[.8,.8],color:'#ff8040'};
 const unknownSticker={pieces:[{id:'p',transform:identity,stickers:[sticker]}],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[surface]}};
 const imaged={pieces:[{id:'p',transform:identity,stickers:[{...sticker,imageId:'image'}]}],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[{...mesh,surfaces:[{role:'sticker',face:'f',stickerId:'s',firstIndex:0,indexCount:3}]}]}};
 for(const candidate of [unknownSticker,imaged]){assert.equal((await scene.setProjection(candidate)).error.code,'InvalidProjection');assert.equal(rendered.getObjectByName('kept'),body);assert.equal(requests,0);}
 scene.contextLost();assert.equal((await scene.setProjection(projection)).error.code,'ContextLost');scene.dispose();
});

// Two-piece source profile: the stickers are painted into the source meshes, at the body poses of the projection.
const halfTurn=[0,0,1,0];
const twoPieces=()=>{
 const stickerMesh=id=>({...mesh,pieceId:id,positions:[...mesh.positions],colors:[.1,.2,.3,.1,.2,.3,.1,.2,.3],surfaces:[{role:'sticker',face:'f',stickerId:`${id}.f`,firstIndex:0,indexCount:3}]});
 const piece=(id,x,color)=>({id,transform:{position:[x,0,0],rotation:[0,0,0,1]},stickers:[{id:`${id}.f`,transform:identity,size:[.8,.8],color}]});
 return {pieces:[piece('a',-.5,'#ff0000'),piece('b',.5,'#00ff00')],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[stickerMesh('a'),stickerMesh('b')]}};
};
const harness=()=>{let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});return {scene,draw(){frames.splice(0).forEach(cb=>cb(0));return rendered;}};};
const sourceSurface=(root,id)=>{let found;root.getObjectByName(id).traverse(x=>{if(x.isMesh&&x.geometry.getAttribute('sourceColor'))found=x;});return found;};
test('source profile renders the source mesh at the body poses with the projection sticker colors',async()=>{
 const {scene,draw}=harness();assert.equal((await scene.setProjection(twoPieces())).ok,true);const root=draw();
 for(const [id,x,rgb] of [['a',-.5,[1,0,0]],['b',.5,[0,1,0]]]){
  const body=root.getObjectByName(id);assert.equal(body.position.x,x);
  const surface=sourceSurface(root,id);assert.ok(surface,'source surface');
  assert.deepEqual(Array.from(surface.geometry.getAttribute('sourceColor').array.slice(0,3)),rgb.map(Math.fround));
  assert.equal(surface.material.type,'ShaderMaterial');
  assert.equal(root.getObjectByName(`${id}.f`),undefined,'no separate sticker mesh');
  assert.equal(body.children.filter(x=>x.isMesh).length,1);
 }
 assert.ok(root.getObjectByName('cubeAssemblerV1-shadow'));scene.dispose();
});
test('source profile bodies follow a Core transition',async()=>{
 const {scene,draw}=harness();const from=twoPieces();assert.equal((await scene.setProjection(from)).ok,true);draw();
 const to={...from,pieces:from.pieces.map(piece=>({...piece,transform:{position:[-piece.transform.position[0],0,0],rotation:halfTurn}}))};
 assert.equal((await scene.transition({from,to,pieceIds:['a','b'],axis:[0,0,1],signedAngleRadians:Math.PI,pivot:[0,0,0],durationMs:0})).ok,true);const root=draw();
 assert.ok(Math.abs(root.getObjectByName('a').position.x-.5)<1e-9);assert.ok(Math.abs(root.getObjectByName('b').position.x+.5)<1e-9);
 assert.ok(Math.abs(root.getObjectByName('a').quaternion.z-1)<1e-9);assert.ok(sourceSurface(root,'a'));scene.dispose();
});
