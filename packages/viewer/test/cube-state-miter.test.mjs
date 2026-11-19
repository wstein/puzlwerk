import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSceneForTest} from '../dist/scene.js';
import {faceUvAxes,CUT_TEXTURE_SIZE} from '../dist/cut-faces.js';
import {open} from '../../core-viewer-bridge/src/index.mjs';
import {cubeStateDocuments,FACE_KEYS} from '../../core-viewer-bridge/src/cube-state.mjs';
import {mulberry32} from '../../../test/helpers/cube-model.mjs';

// CubeState projections of the bridge render stickerless cubies like a real cube: along each edge that a cut face shares with an
// exterior face, the cut face has the color of THAT exterior face (diagonal mitre where two exterior faces meet).
const PALETTE={W:'#f7f6f1',O:'#ff7a1a',G:'#1e9e57',R:'#cf2a3a',B:'#2459d6',Y:'#f2d21b'};
const FACE_TOKEN={u:'W',r:'R',f:'G',d:'Y',l:'O',b:'B'};
const SIZES=Array.from({length:14},(_,i)=>i+2);
const solved=n=>Object.fromEntries(FACE_KEYS.map(f=>[f,Array(n*n).fill(FACE_TOKEN[f])]));
const random=(n,seed)=>{const rand=mulberry32(seed),tokens=Object.keys(PALETTE);return Object.fromEntries(FACE_KEYS.map(f=>[f,Array.from({length:n*n},()=>tokens[Math.floor(rand()*6)])]));};
const clock=()=>{const frames=[];return {now:()=>0,request:cb=>{frames.push(cb);return frames.length;},cancel(){},flush:()=>frames.splice(0).forEach(cb=>cb(0))};};
const hex=c=>`#${c.getHexString()}`;
const faceIndex=normal=>{const axis=normal.findIndex(v=>v!==0);return axis*2+(normal[axis]>0?0:1);};
const projectionOf=(n,cube)=>{
  const made=cubeStateDocuments(n,cube,PALETTE);assert.equal(made.ok,true);const v=made.value;
  const opened=open(v.definition,v.state,v.appearance,v.options);assert.equal(opened.ok,true);return opened.value.projection;
};
const shellOf=object=>{let found;object.traverse(o=>{if(o.isMesh&&Array.isArray(o.material))found=o;});return found;};

/** Compares every cut-face edge of every stickerless cubie with the color of the exterior face it borders. Returns {edges,textured}. */
function checkEdges(rendered,projection,label){
  let edges=0,textured=0;
  for(const piece of projection.pieces){
    const shell=shellOf(rendered.getObjectByName(piece.id));assert.ok(shell,`${label} ${piece.id} has no stickerless shell`);
    const exterior=Array(6).fill(null);
    for(const sticker of piece.stickers)exterior[faceIndex(sticker.sourceFace.normal)]=sticker.color.toLowerCase();
    const axes=faceUvAxes(shell.geometry);
    for(let cut=0;cut<6;cut++){
      if(exterior[cut]!==null)continue;
      const {uAxis,uSign,vAxis,vSign}=axes[cut],material=shell.material[cut],map=material.map;
      for(let neighbor=0;neighbor<6;neighbor++){
        if(exterior[neighbor]===null||(neighbor>>1)===(cut>>1))continue;
        const axis=neighbor>>1,sign=(neighbor&1)===0?1:-1;
        assert.ok(axis===uAxis||axis===vAxis,`${label} ${piece.id}`);
        const last=CUT_TEXTURE_SIZE-1,mid=CUT_TEXTURE_SIZE/2;
        const [x,y]=axis===uAxis?[sign*uSign>0?last:0,mid]:[mid,sign*vSign>0?last:0];
        let actual;
        if(map){const d=map.image.data,at=(y*CUT_TEXTURE_SIZE+x)*4;actual='#'+[0,1,2].map(k=>d[at+k].toString(16).padStart(2,'0')).join('');}
        else actual=hex(material.color);
        assert.equal(actual,exterior[neighbor],`${label} ${piece.id} cut face ${cut} edge to face ${neighbor}`);
        edges++;if(map)textured++;
      }
    }
  }
  return {edges,textured};
}
async function render(projection,appearance){
  let rendered;const c=clock(),scene=createSceneForTest({resolveAsset:async()=>({ok:false})},c,{render:s=>{rendered=s;},dispose(){}});
  if(appearance)scene.setInitialViewerAppearance(appearance);
  assert.equal((await scene.setProjection(projection)).ok,true);c.flush();return {scene,get rendered(){return rendered;},c};
}

test('every cut-face edge of a stickerless CubeState cube has the color of the adjacent exterior face, sizes 2 to 15, solved and random',async()=>{
  for(const n of SIZES)for(const [name,cube] of [['solved',solved(n)],['random',random(n,4200+n)]]){
    const view=await render(projectionOf(n,cube),{construction:'stickerless',frameColor:null});
    const {edges,textured}=checkEdges(view.rendered,projectionOf(n,cube),`${n} ${name}`);
    assert.ok(edges>0,`${n} ${name} checked no edge`);
    if(name==='random'&&n>=3)assert.ok(textured>0,`${n} random has no mitre texture`);
    view.scene.dispose();
  }
});

test('switching the construction through setAppearance keeps the mitre flag: stickered, stickerless, stickered, stickerless',async()=>{
  for(const n of [3,7]){
    const projection=projectionOf(n,random(n,77+n)),view=await render(projection);
    assert.equal(projection.appearance.miterCutFaces,true);
    for(const construction of ['stickerless','stickered','stickerless']){
      const prepared=await view.scene.prepareViewerAppearance({construction,frameColor:null});assert.equal(prepared.ok,true);
      assert.equal(prepared.value.seal().ok,true);prepared.value.commit();view.c.flush();
      if(construction==='stickerless')checkEdges(view.rendered,projection,`${n} after ${construction}`);
    }
    view.scene.dispose();
  }
});
