import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('CI exercises native source and consumer render fixtures',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/solver.yml',import.meta.url),'utf8');
 for(const name of ['native-cube-assembler.test.mjs','cube-assembler-raw-mesh.test.mjs','cube-assembler-shadow.test.mjs','cube-assembler-source-profile.mjs','cube-assembler-browser.mjs','cube-assembler-profile-shadow-browser.mjs','cube-assembler-profile-surface-browser.mjs'])assert.ok(workflow.includes(name),name);
});
