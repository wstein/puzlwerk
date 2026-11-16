import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('native rotation HUD stylesheet is delivered with the built viewer',async()=>{
 const source=await readFile(new URL('../src/native-rotation-binding.css',import.meta.url),'utf8');
 const built=await readFile(new URL('../dist/native-rotation-binding.css',import.meta.url),'utf8');assert.equal(built,source);
});
