// Candidate IDs are assigned to known solved home slots; CubeAssembler supplies no IDs.
import {writeFile} from 'node:fs/promises';
const dir=new URL('./',import.meta.url);
const faces=[['U',[0,1,0],[0,0,-1],'W'],['R',[1,0,0],[0,1,0],'R'],['F',[0,0,1],[0,1,0],'G'],['D',[0,-1,0],[0,0,1],'Y'],['L',[-1,0,0],[0,1,0],'O'],['B',[0,0,-1],[0,1,0],'B']];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const pieces=[], stickers=[];
for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) {
 const home=[x,y,z], id=`p${pieces.length}`;
 const ps=faces.filter(([,normal])=>dot(home,normal)===1).map(([face,normal,up,color])=>{
  const sticker={id:`${id}.${face}`,normal,up}; stickers.push({id:sticker.id,color,symmetry:'C4'}); return sticker;
 });
 pieces.push({id,home,stickers:ps});
}
const id='cube-assembler-solved-2';
const definition={schema:'puzlwerk.definition',revision:1,id,size:2,convention:'cube-shell-v1',movePolicy:'outer-wide',pieces};
const state={schema:'puzlwerk.state',revision:1,definitionId:id,poses:pieces.map(p=>({pieceId:p.id,position:p.home,orientation:[1,0,0,0,1,0,0,0,1]}))};
const appearance={schema:'puzlwerk.appearance',revision:1,id:'cube-assembler-solved-2-colors',definitionId:id,stickers};
for(const [name,value] of Object.entries({definition,state,appearance})) await writeFile(new URL(`${name}.json`,dir),JSON.stringify(value,null,2)+'\n');
