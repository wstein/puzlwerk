import test from 'node:test'; import assert from 'node:assert/strict'; import {readFile} from 'node:fs/promises';
test('shadow oracle retains native outline, shader and floor',async()=>{
 const {generateShadow}=await import('../fixtures/cube-assembler-solved-2/generate-shadow.mjs');
 const oracle=JSON.parse(await readFile(new URL('../fixtures/cube-assembler-solved-2/shadow-oracle.json',import.meta.url),'utf8'));
 assert.deepEqual(await generateShadow(),oracle); assert.equal(oracle.floorY,-1.8); assert.equal(oracle.outline.length,6); assert.equal(oracle.padded.length,16); assert.equal(oracle.soft,.4); assert.match(oracle.shader.fragment,/smoothstep\(-u_soft \* 0\.6, u_soft, d\)/);
});
