// Convert source-emitted primitive ranges to local piece buffers. Ownership is provided by
// the instrumented source loop, never inferred from vertex positions or sticker colors.
export function sourceMeshProfile(raw,definition){
 const n=definition.size;if(!Number.isInteger(n)||n<2||n>7)throw Error('Invalid source size');
 const {positions,normals,colors,occlusion,indices,ranges}=raw;
 if(![positions,normals,colors,occlusion,indices,ranges].every(Array.isArray)||positions.length%3||normals.length!==positions.length||colors.length!==positions.length||occlusion.length!==positions.length/3||indices.length%3)throw Error('Invalid source buffers');
 const byHome=new Map(),meshes=[];const normalsByFace={u:[0,1,0],r:[1,0,0],f:[0,0,1],d:[0,-1,0],l:[-1,0,0],b:[0,0,-1]};
 for(const piece of definition.pieces){const key=piece.home.join(',');if(byHome.has(key))throw Error('Duplicate home slot');const mesh={pieceId:`piece:${piece.id}`,positions:[],normals:[],colors:[],occlusion:[],indices:[],surfaces:[]};byHome.set(key,{mesh,piece});meshes.push(mesh);}
 let cursor=0;
 for(const range of ranges){
  if(!Array.isArray(range.owner)||range.owner.length!==3||!range.owner.every(v=>Number.isInteger(v)&&v>=0&&v<n)||!['body','sticker','cap'].includes(range.role)||range.firstIndex!==cursor||!Number.isInteger(range.indexCount)||range.indexCount<=0||range.indexCount%3||cursor+range.indexCount>indices.length)throw Error('Invalid source primitive range');
  const home=range.owner.map(v=>2*v-(n-1)),entry=byHome.get(home.join(','));if(!entry)throw Error('Unmapped source owner');const {mesh,piece}=entry;
  let stickerId;if(range.role==='sticker'){const normal=normalsByFace[range.face],sticker=piece.stickers?.find(s=>normal && s.normal.every((v,i)=>v===normal[i]));if(!sticker)throw Error('Unmapped source sticker');stickerId=`sticker:${sticker.id}`;}
  mesh.surfaces.push({role:range.role,...(range.face?{face:range.face}:{}),...(stickerId?{stickerId}:{}),firstIndex:mesh.indices.length,indexCount:range.indexCount});
  for(let i=cursor;i<cursor+range.indexCount;i++){
   const vertex=indices[i];if(!Number.isInteger(vertex)||vertex<0||vertex>=occlusion.length)throw Error('Invalid source index');
   for(let axis=0;axis<3;axis++){mesh.positions.push(positions[vertex*3+axis]-home[axis]/2);mesh.normals.push(normals[vertex*3+axis]);mesh.colors.push(colors[vertex*3+axis]);}
   mesh.occlusion.push(occlusion[vertex]);mesh.indices.push(mesh.indices.length);
  }
  cursor+=range.indexCount;
 }
 if(cursor!==indices.length || meshes.some(mesh=>!mesh.indices.length))throw Error('Incomplete source ranges');
 return {kind:'cubeAssemblerV1',size:n,meshes};
}
