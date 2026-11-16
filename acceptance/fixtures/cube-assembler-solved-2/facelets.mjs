// Project known candidate identities to CubeAssembler's visible facelet order.
// Native CubeState carries colors only; this never infers physical identity from them.
export function faceletsFromWire(definition,state,appearance) {
 const result=Object.fromEntries(['u','r','f','d','l','b'].map(face=>[face,Array(4).fill(null)]));
 const poses=new Map(state.poses.map(p=>[p.pieceId,p]));
 const colors=new Map(appearance.stickers.map(s=>[s.id,s.color]));
 for(const piece of definition.pieces) {
  const pose=poses.get(piece.id); if(!pose) throw Error('Missing pose');
  const m=pose.orientation;
  for(const sticker of piece.stickers) {
   const n=[0,1,2].map(i=>[0,1,2].reduce((sum,j)=>sum+m[3*i+j]*sticker.normal[j],0));
   const [x,y,z]=pose.position.map(v=>(v+1)/2);
   let face,index;
   if(n[1]===1) {face='u';index=z*2+x;}
   else if(n[1]===-1) {face='d';index=(1-z)*2+x;}
   else if(n[2]===1) {face='f';index=(1-y)*2+x;}
   else if(n[2]===-1) {face='b';index=(1-y)*2+1-x;}
   else if(n[0]===1) {face='r';index=(1-y)*2+1-z;}
   else if(n[0]===-1) {face='l';index=(1-y)*2+z;}
   else throw Error('Invalid sticker normal');
   if(result[face][index]!==null || !colors.has(sticker.id)) throw Error('Duplicate or missing facelet');
   result[face][index]=colors.get(sticker.id);
  }
 }
 if(Object.values(result).some(face=>face.some(color=>color===null))) throw Error('Incomplete facelets');
 return result;
}
