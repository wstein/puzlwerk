// Explicit boundary between Picture3's sticker state and the wire-v1 shell.
const identity=[1,0,0,0,1,0,0,0,1];
export function pictureDocuments(design) {
 const groups=new Map();
 for(const s of design.printing){let group=groups.get(s.cubie);if(!group){group={id:`c${s.cubie}`,home:s.p.map(v=>v*2),stickers:[]};groups.set(s.cubie,group)}group.stickers.push({id:`s${s.id}`,normal:s.n,up:s.up});}
 const pieces=[...groups.values()];
 return {definition:{schema:'puzlwerk.definition',revision:1,id:design.id,size:3,convention:'cube-shell-v1',movePolicy:'outer-wide',pieces},state:{schema:'puzlwerk.state',revision:1,definitionId:design.id,poses:pieces.map(p=>({pieceId:p.id,position:p.home,orientation:identity.slice()}))},appearance:{schema:'puzlwerk.appearance',revision:1,id:'picture3-coast',definitionId:design.id,stickers:design.printing.map(s=>({id:`s${s.id}`,image:`tile:${s.id}`,symmetry:'C1'}))}};
}
const eq=(a,b)=>a.length===b.length && a.every((v,i)=>v===b[i]);
const transform=(m,v)=>[0,1,2].map(row=>m[row*3]*v[0]+m[row*3+1]*v[1]+m[row*3+2]*v[2]);
export function comparePictureState(native,definition,state){
 const poses=new Map(state.poses.map(p=>[p.pieceId,p]));if(poses.size!==definition.pieces.length||state.poses.length!==poses.size)return false;
 const stickers=new Map(native.map(s=>[`s${s.id}`,s]));if(stickers.size!==native.length)return false;
 return definition.pieces.every(piece=>{const pose=poses.get(piece.id);return pose && piece.stickers.every(sticker=>{const source=stickers.get(sticker.id);return source && `c${source.cubie}`===piece.id && eq(pose.position,source.p.map(v=>v*2)) && eq(transform(pose.orientation,sticker.normal),source.n) && eq(transform(pose.orientation,sticker.up),source.up);});});
}

// Native layer coordinates -1, 0, 1 map to Core shell indices 0, 1, 2.
export function pictureMove(move){return {axis:['X','Y','Z'][move.axis],layers:[move.layer+1],turns:move.turns===-2?2:move.turns};}
