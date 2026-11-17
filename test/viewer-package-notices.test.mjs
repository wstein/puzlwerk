import {test} from 'node:test';import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('every license file the viewer NOTICE names ships with the acceptance pages and the package',()=>{
  const notice=read('../packages/viewer/NOTICE'),build=read('../acceptance/build.mjs'),pkg=JSON.parse(read('../packages/viewer/package.json'));
  const named=[...new Set(notice.match(/\b[A-Z_]+_LICENSE\.txt\b/g))];
  assert.ok(named.includes('CORE_EUPL_LICENSE.txt'));
  for(const file of named){assert.ok(build.includes(`'${file}'`),`${file} missing from acceptance/build.mjs`);assert.ok(pkg.files.includes(file),`${file} missing from package files`);assert.ok(existsSync(new URL(`../packages/viewer/${file}`,import.meta.url)))}
});
test('every shipped Core module is dual licensed in its source, as the NOTICE says',()=>{
  const notice=read('../packages/viewer/NOTICE'),shipped=readdirSync(new URL('../packages/viewer/dist/bridge/core/',import.meta.url));
  assert.ok(shipped.includes('PwColorFrame.res.mjs'));assert.ok(notice.includes('EUPL-1.2 OR AGPL-3.0-or-later'));
  for(const file of shipped)assert.equal(read(`../core/res/${file.replace('.res.mjs','')}.res`).split('\n')[0],'// SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later',file);
});
test('every export condition of the viewer package points to a built file, and "." also has a default',()=>{
  const pkg=JSON.parse(read('../packages/viewer/package.json'));
  assert.equal(pkg.exports['.'].default,pkg.exports['.'].import);
  for(const [key,conditions] of Object.entries(pkg.exports))for(const [condition,target] of Object.entries(conditions))assert.ok(existsSync(new URL(`../packages/viewer/${target}`,import.meta.url)),`${key} ${condition}: ${target}`);
});
