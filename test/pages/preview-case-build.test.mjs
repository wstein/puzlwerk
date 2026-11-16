import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('preview builds the Core modules before the acceptance artifact',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/acceptance-preview.yml',import.meta.url),'utf8');
 const install=workflow.indexOf('- run: npm ci'),build=workflow.indexOf('- run: npm run build\n',install),artifact=workflow.indexOf('- run: node acceptance/build.mjs',build);
 assert.ok(install>=0 && build>install && artifact>build,'preview must compile Core and Viewer before packaging');
});
test('CI exercises native source and consumer render fixtures',()=>{
 const workflow=readFileSync(new URL('../../.github/workflows/solver.yml',import.meta.url),'utf8');
 for(const name of ['native-cube-assembler.test.mjs','cube-assembler-raw-mesh.test.mjs','cube-assembler-shadow.test.mjs','cube-assembler-source-profile.mjs','cube-assembler-browser.mjs','cube-assembler-profile-shadow-browser.mjs','cube-assembler-profile-surface-browser.mjs'])assert.ok(workflow.includes(name),name);
});
