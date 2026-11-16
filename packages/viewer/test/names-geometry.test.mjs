import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {createSceneForTest} from '../dist/scene.js';import {validateProjection,validateTransition} from '../dist/contract.js';
const t=(position=[0,0,0])=>({position,rotation:[0,0,0,1]});const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');const buffers=g=>({position:hash(g.attributes.position.array),normal:hash(g.attributes.normal.array),uv:hash(g.attributes.uv.array),index:g.index?hash(g.index.array):null});
test('Names source body, sticker shape and standard rounded box use actual source geometry',async()=>{
 const f=JSON.parse(await readFile(new URL('./fixtures/cubistry-names-geometry.json',import.meta.url)));let seen;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{seen=s},dispose(){}});
 const sticker={id:'s',transform:{position:f.stickerPosition,rotation:f.stickerRotation},size:[.87*1.6,.87],color:'#fff',geometry:{referenceSize:[.87,.87],cornerRadius:.055}};
 const piece={id:'p',transform:t(f.bodyPosition),geometry:{cellSize:[1.6,1,1.6],outerSides:[[false,true],[false,false],[false,true]]},stickers:[sticker]};
 const names={pieces:[piece],presentation:{size:7,nominalEdge:8.2},geometryProfile:{body:{kind:'twoRadius',gap:f.gap,bevelSegments:2}}};
 assert.equal((await scene.setProjection(names)).ok,true);frames.shift()(0);const body=seen.getObjectByName('p'),mesh=body.children[0],tile=seen.getObjectByName('s');assert.deepEqual(buffers(mesh.geometry),f.body);assert.deepEqual(buffers(tile.geometry),f.sticker);assert.deepEqual(tile.scale.toArray(),f.stickerScale);assert.deepEqual(tile.position.toArray(),f.stickerPosition);
 const standard={pieces:[{...piece,geometry:{...piece.geometry,cellSize:[1,1,1]}}],geometryProfile:{body:{kind:'roundedBox',gap:.01,radius:.055,bevelSegments:1}}};assert.equal((await scene.setProjection(standard)).ok,true);frames.shift()(0);assert.deepEqual(buffers(seen.getObjectByName('p').children[0].geometry),f.rounded);scene.dispose();
});
test('geometry profiles validate explicit cells and remain invariant during turns',()=>{
 const piece={id:'p',transform:t(),geometry:{cellSize:[1,1,1],outerSides:[[false,false],[false,false],[false,false]]},stickers:[{id:'s',transform:t(),size:[1,1],color:'#fff',geometry:{referenceSize:[.87,.87],cornerRadius:.055}}]};
 const p={pieces:[piece],presentation:{size:7,nominalEdge:8.2},geometryProfile:{body:{kind:'twoRadius',gap:.001,bevelSegments:2}}};assert.equal(validateProjection(p).ok,true);
 for(const body of [{kind:'twoRadius',gap:-1,bevelSegments:2},{kind:'twoRadius',gap:1,bevelSegments:2},{kind:'twoRadius',gap:.01,bevelSegments:0},{kind:'roundedBox',gap:.01,radius:0,bevelSegments:1},{kind:'other',gap:0,bevelSegments:1}])assert.equal(validateProjection({...p,geometryProfile:{body}}).error.code,'InvalidProjection');
 for(const geometry of [{referenceSize:[.87,,],cornerRadius:.05},{referenceSize:[.87,.87],cornerRadius:.5},{referenceSize:[.87,.87],cornerRadius:NaN}])assert.equal(validateProjection({...p,pieces:[{...piece,stickers:[{...piece.stickers[0],geometry}]}]}).error.code,'InvalidProjection');
 assert.equal(validateProjection({...p,pieces:[{...piece,geometry:undefined}]}).error.code,'InvalidProjection');
 const transition={from:p,to:{...p,geometryProfile:{body:{...p.geometryProfile.body,gap:.002}}},pieceIds:[],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:0,durationMs:0};assert.equal(validateTransition(transition).error.code,'InvalidTransition');
});
test('geometry metadata is snapshotted and preserved through live artwork and cancel',async()=>{
 let release,seen;const frames=[];const scene=createSceneForTest({resolveAsset:()=>new Promise(r=>{release=r})},{now:()=>0,request:cb=>{frames.push(cb);return frames.length},cancel(){}},{render:s=>{seen=s},dispose(){}});
 const p={pieces:[{id:'p',transform:t(),geometry:{cellSize:[1.6,1,1.6],outerSides:[[false,true],[false,false],[false,true]]},stickers:[{id:'s',transform:t([0,0,.802]),size:[1.392,.87],color:'#fff',imageId:'img',geometry:{referenceSize:[.87,.87],cornerRadius:.055}}]}],presentation:{size:7,nominalEdge:8.2},geometryProfile:{body:{kind:'twoRadius',gap:.001,bevelSegments:2}}};
 const original=structuredClone(p),pending=scene.setProjection(p);p.geometryProfile.body.gap=.2;p.pieces[0].stickers[0].geometry.referenceSize[0]=.4;release({ok:true,value:{}});assert.equal((await pending).ok,true);frames.shift()(0);assert.ok(Math.abs(seen.getObjectByName('s').scale.x-1.6)<1e-12);
 const motion={from:original,to:original,pieceIds:[],axis:[0,0,1],pivot:[0,0,0],signedAngleRadians:0,durationMs:100};const turning=scene.transition(motion);scene.cancel();assert.equal((await turning).error.code,'Cancelled');
 const live=scene.setArtwork({stickers:[{id:'s',color:'#fff',imageId:'img'}]});release({ok:true,value:{}});assert.equal((await live).ok,true);frames.shift()(0);assert.ok(Math.abs(seen.getObjectByName('s').scale.x-1.6)<1e-12);
 assert.equal((await scene.transition({...motion,durationMs:0})).ok,true);scene.dispose();
});

test('native source reference geometry scales independently per sticker and disposes once',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:false})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:value=>{rendered=value},dispose(){}});
 const geometry={referenceSize:[.87,.87],cornerRadius:.055};const p={pieces:[{id:'p',transform:t(),geometry:{cellSize:[1.6,1,1.6],outerSides:[[false,true],[false,true],[false,true]]},stickers:[{id:'front',transform:t([0,0,.802]),size:[1.392,.87],geometry,color:'#fff'},{id:'top',transform:{position:[0,.502,0],rotation:[-Math.SQRT1_2,0,0,Math.SQRT1_2]},size:[.87,1.392],geometry,color:'#fff'}]}],presentation:{size:7,nominalEdge:8.2},geometryProfile:{body:{kind:'twoRadius',gap:.001,bevelSegments:2}}};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);const front=rendered.getObjectByName('front'),top=rendered.getObjectByName('top');assert.equal(front.geometry,top.geometry);assert.ok(front.scale.toArray().every((v,i)=>Math.abs(v-[1.6,1,1][i])<1e-12));assert.ok(top.scale.toArray().every((v,i)=>Math.abs(v-[1,1.6,1][i])<1e-12));assert.ok(Math.abs(front.position.z-.802)<1e-12);assert.ok(Math.abs(top.position.y-.502)<1e-12);let disposed=0;front.geometry.addEventListener('dispose',()=>disposed++);scene.dispose();assert.equal(disposed,1);
});

test('scaled source stickers in a picture layer are not scaled or offset twice',async()=>{
 let rendered;const frames=[];const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{width:8,height:8}})},{now:()=>0,request:cb=>{frames.push(cb);return 1},cancel(){}},{render:value=>{rendered=value},dispose(){}});
 const shape={referenceSize:[.87,.87],cornerRadius:.055},faces={U:'u',R:'r',F:'f',D:'d',L:'l',B:'b'};const sticker={id:'s',transform:t([0,0,.802]),size:[1.392,.87],geometry:shape,color:'#fff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[1,0,1]}};
 const p={pieces:[{id:'p',transform:t([.5,-.8,.5]),geometry:{cellSize:[1.6,1,1.6],outerSides:[[false,true],[true,false],[false,true]]},stickers:[sticker]},{id:'other',transform:t([-.8,.5,-.8]),geometry:{cellSize:[1,1.6,1],outerSides:[[true,false],[false,true],[true,false]]},stickers:[]}],presentation:{size:2,nominalEdge:2.6},geometryProfile:{body:{kind:'twoRadius',gap:.001,bevelSegments:2}},picture:{widths:[1,1.6],faces}};
 assert.equal((await scene.setProjection(p)).ok,true);frames.shift()(0);const tile=rendered.getObjectByName('s');assert.ok(Math.abs(tile.scale.x-1.6)<1e-12);assert.equal(tile.scale.y,1);assert.ok(Math.abs(tile.position.z-.802)<1e-12);assert.ok(tile.material.map);
 scene.dispose();
});
