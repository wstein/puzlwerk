import test from 'node:test';
import assert from 'node:assert/strict';
test('instrumented ranges partition the unmodified native mesh', async()=>{
 const {generateRawMesh}=await import('../fixtures/cube-assembler-solved-2/generate-raw-mesh.mjs');
 const {mesh,baseline,ranges}=await generateRawMesh();
 for(const key of ['positions','normals','colors','occlusion','indices']) assert.deepEqual(Buffer.from(mesh[key].buffer),Buffer.from(baseline[key].buffer),key);
 assert.equal(ranges[0].firstIndex,0);
 assert.equal(ranges.reduce((end,r)=>{assert.equal(r.firstIndex,end);assert.ok(r.indexCount>0&&r.indexCount%3===0);assert.equal(r.owner.length,3);assert.ok(['body','sticker','cap'].includes(r.role));return end+r.indexCount},0),mesh.indices.length);
 assert.equal(new Set(ranges.filter(r=>r.role==='sticker').map(r=>`${r.owner.join(',')}:${r.face}`)).size,24);
 assert.equal(new Set(ranges.map(r=>r.owner.join(','))).size,8);
});

test('committed mesh is byte-equal to source for every typed attribute',async()=>{
 const {readFile}=await import('node:fs/promises'); const {generateRawMesh}=await import('../fixtures/cube-assembler-solved-2/generate-raw-mesh.mjs');
 const fixture=JSON.parse(await readFile(new URL('../fixtures/cube-assembler-solved-2/raw-mesh.json',import.meta.url),'utf8')); const {baseline,ranges}=await generateRawMesh();
 for(const key of ['positions','normals','colors','occlusion','indices']) assert.deepEqual(Buffer.from(new baseline[key].constructor(fixture.mesh[key]).buffer),Buffer.from(baseline[key].buffer),key);
 assert.deepEqual(fixture.ranges,ranges);
});

test('native rotating layer retains exact output and ownership at zero, midpoint and endpoint',async()=>{
 const {readFile}=await import('node:fs/promises'); const {createHash}=await import('node:crypto'); const {generateRawMesh}=await import('../fixtures/cube-assembler-solved-2/generate-raw-mesh.mjs');
 const expected=JSON.parse(await readFile(new URL('../fixtures/cube-assembler-solved-2/turn-oracle.json',import.meta.url),'utf8'));
 for(const [i,angle] of [0,Math.PI/4,Math.PI/2].entries()) {
  const {mesh,baseline,ranges}=await generateRawMesh({face:'R',depth:1,width:1,angle});
  for(const key of ['positions','normals','colors','occlusion','indices']) {assert.deepEqual(Buffer.from(mesh[key].buffer),Buffer.from(baseline[key].buffer),key);assert.equal(createHash('sha256').update(Buffer.from(baseline[key].buffer)).digest('hex'),expected[i].sha256[key],`${angle}:${key}`)}
  assert.deepEqual(ranges,expected[i].ranges);
 }
});

test('native loop owns each outside face and cut cap in its explicit home cell',async()=>{
 const {readFile}=await import('node:fs/promises');const data=JSON.parse(await readFile(new URL('../fixtures/cube-assembler-solved-2/raw-mesh.json',import.meta.url),'utf8'));
 for(let x=0;x<2;x++) for(let y=0;y<2;y++) for(let z=0;z<2;z++) {
  const own=data.ranges.filter(r=>r.owner[0]===x&&r.owner[1]===y&&r.owner[2]===z);
  const outside=[y?'u':'d',z?'f':'b',x?'r':'l'].sort();
  const inside=[y?'d':'u',z?'b':'f',x?'l':'r'].sort();
  for(const role of ['body','sticker']) assert.deepEqual(own.filter(r=>r.role===role).map(r=>r.face).sort(),outside,`${x}${y}${z}:${role}`);
  assert.deepEqual(own.filter(r=>r.role==='cap').map(r=>r.face).sort(),inside,`${x}${y}${z}:cap`);
 }
});

test('native sticker colors match the fixed wire appearance and source palette',async()=>{
 const {readFile}=await import('node:fs/promises'); const {defaultStickerHex}=await import('../references/cube-assembler/src/core/view/CubeViewState.res.mjs');
 const dir=new URL('../fixtures/cube-assembler-solved-2/',import.meta.url);const data=JSON.parse(await readFile(new URL('raw-mesh.json',dir),'utf8'));const appearance=JSON.parse(await readFile(new URL('appearance.json',dir),'utf8'));
 const tokens=new Map(appearance.stickers.map(s=>[s.id,s.color]));let checked=0;
 for(const r of data.ranges.filter(r=>r.role==='sticker')) {
  const [x,y,z]=r.owner;const id=`p${4*x+2*y+z}.${r.face.toUpperCase()}`; const token=tokens.get(id);assert.ok(token,id);
  const hex=defaultStickerHex[token];assert.match(hex,/^#[0-9a-f]{6}$/i);const rgb=[1,3,5].map(i=>Math.fround(parseInt(hex.slice(i,i+2),16)/255));
  for(let i=r.firstIndex;i<r.firstIndex+r.indexCount;i++){const v=data.mesh.indices[i];assert.deepEqual(data.mesh.colors.slice(v*3,v*3+3),rgb,id);}
  checked++;
 }
 assert.equal(checked,24);
});
