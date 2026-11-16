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
test('source profile creates the source attributes and rejects artwork replacement',{skip:'BLOCKED: native shared mesh capability is required in stage 2'},async()=>{
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

test('source-profile sticker surfaces use the projection appearance color',{skip:'BLOCKED: native shared mesh capability is required in stage 2'},async()=>{
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

test('source profile releases mesh and shadow after context loss and dispose',{skip:'BLOCKED: native shared mesh capability is required in stage 2'},async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{}})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{rendered=s},dispose(){}});
 assert.equal((await scene.setProjection(projection)).ok,true);frames.splice(0).forEach(cb=>cb(0));const body=rendered.getObjectByName('p');let surface;body.traverse(x=>{if(x.isMesh)surface=x;});let geometryDisposed=false,materialDisposed=false;surface.geometry.addEventListener('dispose',()=>geometryDisposed=true);surface.material.addEventListener('dispose',()=>materialDisposed=true);
 scene.contextLost();assert.equal((await scene.setProjection(projection)).error.code,'ContextLost');scene.dispose();assert.equal(geometryDisposed,true);assert.equal(materialDisposed,true);assert.equal(rendered.getObjectByName('cubeAssemblerV1-shadow'),undefined);
});


test('unsupported raw source profiles are rejected before mutation and preserve lifecycle',async()=>{
 let rendered,requests=0;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>{requests++;return {ok:true,value:{}}}},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:value=>{rendered=value},dispose(){}});
 const supported={pieces:[{id:'kept',transform:identity,stickers:[]}]};assert.equal((await scene.setProjection(supported)).ok,true);frames.splice(0).forEach(cb=>cb(0));const body=rendered.getObjectByName('kept');
 const surface={...mesh,surfaces:[{role:'sticker',face:'f',stickerId:'s',firstIndex:0,indexCount:3}]};const sticker={id:'s',transform:identity,size:[.8,.8],color:'#ff8040'};
 const painted={pieces:[{id:'p',transform:identity,stickers:[sticker]}],renderProfile:{kind:'cubeAssemblerV1',size:2,meshes:[surface]}};
 for(const candidate of [projection,painted]){assert.equal((await scene.setProjection(candidate)).error.code,'Unavailable');assert.equal(rendered.getObjectByName('kept'),body);assert.equal(requests,0);}
 scene.contextLost();assert.equal((await scene.setProjection(projection)).error.code,'ContextLost');scene.dispose();
});
