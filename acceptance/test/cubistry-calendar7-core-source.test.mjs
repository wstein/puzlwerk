// The original 2026 Calendar7 root is used as a Core home state for this comparison.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {open} from '../../packages/core-viewer-bridge/src/index.mjs';

for (const mode of ['standard','names','names-any']) test(`Calendar7 ${mode} original sticker frames enter Core`,async()=>{
 const path=mode==='standard'?'':`${mode}/`;
 const source=JSON.parse(await readFile(new URL(`../references/cubistry-calendar7/public/calendar7/${path}state.v1.json`,import.meta.url),'utf8'));
 const groups=new Map();for(const s of source.stickers){const list=groups.get(s.piece)??[];list.push(s);groups.set(s.piece,list)}
 assert.equal(source.stickers.length,294);assert.equal(groups.size,218);
 const id=`calendar7-${mode}`,pieces=[...groups].map(([piece,stickers])=>({id:`p${piece}`,home:stickers[0].p.map(v=>v*2),stickers:stickers.map(s=>({id:`s${s.id}`,normal:s.n,up:s.up}))}));
 const definition={schema:'puzlwerk.definition',revision:1,id,size:7,convention:'cube-shell-v1',movePolicy:'outer-wide',pieces};
 const state={schema:'puzlwerk.state',revision:1,definitionId:id,poses:pieces.map(p=>({pieceId:p.id,position:p.home,orientation:[1,0,0,0,1,0,0,0,1]}))};
 const appearance={schema:'puzlwerk.appearance',revision:1,id:`${id}-art`,definitionId:id,stickers:source.stickers.map(s=>({id:`s${s.id}`,color:'white',image:`tile${s.id}`,symmetry:'C1'}))};
 const result=open(JSON.stringify(definition),JSON.stringify(state),JSON.stringify(appearance),{palette:{white:'#ffffff'},defaultColor:'#ffffff'});
 assert.equal(result.ok,true,JSON.stringify(result.error));
 const projection=result.value.projection;assert.equal(projection.pieces.length,218);
 for(const piece of projection.pieces){const original=groups.get(Number(piece.id.slice('piece:p'.length)));assert.deepEqual(piece.transform.position,original[0].p);for(const sticker of piece.stickers){const originalSticker=original.find(s=>`sticker:s${s.id}`===sticker.id);assert.deepEqual(sticker.sourceFace.normal,originalSticker.n);assert.deepEqual(sticker.sourceFace.up,originalSticker.up);}}
});
