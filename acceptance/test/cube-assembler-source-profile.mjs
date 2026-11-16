import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {sourceMeshProfile} from '../runtime/source-mesh-profile.mjs';
const dir=resolve(process.argv[2] ?? 'acceptance/fixtures/cube-assembler-solved-2');
const load=async name=>JSON.parse(await readFile(resolve(dir,name),'utf8'));
const [raw,definition]=await Promise.all([load('raw-mesh.json'),load('definition.json')]);
const profile=sourceMeshProfile({...raw.mesh,ranges:raw.ranges},definition);
const byId=new Map(profile.meshes.map(m=>[m.pieceId,m])),used=new Map();
let checked=0;
for(const range of raw.ranges){
 const home=range.owner.map(v=>2*v-(definition.size-1));const piece=definition.pieces.find(p=>p.home.every((v,i)=>v===home[i]));assert.ok(piece);
 const id=`piece:${piece.id}`,mesh=byId.get(id);assert.ok(mesh);let local=used.get(id)??0;
 for(let j=range.firstIndex;j<range.firstIndex+range.indexCount;j++,local++){
  const source=raw.mesh.indices[j];
  for(let axis=0;axis<3;axis++){
   assert.equal(Math.fround(mesh.positions[local*3+axis]+home[axis]/2),Math.fround(raw.mesh.positions[source*3+axis]));
   assert.equal(mesh.normals[local*3+axis],raw.mesh.normals[source*3+axis]);assert.equal(mesh.colors[local*3+axis],raw.mesh.colors[source*3+axis]);
  }
  assert.equal(mesh.occlusion[local],raw.mesh.occlusion[source]);assert.equal(mesh.indices[local],local);checked++;
 }
 used.set(id,local);
}
assert.equal(checked,raw.mesh.indices.length);assert.equal(profile.meshes.length,definition.pieces.length);
console.log(`PASS: ${checked} indexed source vertices retain owner, position, normal, color and occlusion`);
if(process.argv[3]){
 const turnDir=resolve(process.argv[3]);
 for(const [name,angle] of [['zero',0],['mid',Math.PI/4],['end',Math.PI/2]]){
  const native=JSON.parse(await readFile(resolve(turnDir,`ca-native-r-${name}.json`),'utf8'));
  assert.deepEqual(native.ranges,raw.ranges);let max=0,count=0;
  const cs=Math.cos(-angle),sn=Math.sin(-angle);
  for(const range of raw.ranges)for(let i=range.firstIndex;i<range.firstIndex+range.indexCount;i++){
   const source=raw.mesh.indices[i],target=native.mesh.indices[i],offset=source*3,tOffset=target*3;
   for(const attribute of ['positions','normals']){
    const data=raw.mesh[attribute], out=native.mesh[attribute], x=data[offset],y=data[offset+1],z=data[offset+2];
    const expected=range.owner[0]===1?[x,y*cs-z*sn,y*sn+z*cs]:[x,y,z];
    for(let axis=0;axis<3;axis++)max=Math.max(max,Math.abs(expected[axis]-out[tOffset+axis]));
   }
   for(let axis=0;axis<3;axis++)assert.equal(raw.mesh.colors[offset+axis],native.mesh.colors[tOffset+axis]);
   assert.equal(raw.mesh.occlusion[source],native.mesh.occlusion[target]);count++;
  }
  assert.ok(max<1e-6,`${name} source pose delta ${max}`);console.log(`PASS: native R ${name}, ${count} vertices, maximum pose delta ${max}`);
 }
}
