import {test} from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
// Owner decision 2026-11-17 (specs/006-shared-model/plan.md, SM11): Core is EUPL-1.2 OR AGPL-3.0-or-later.
const SPDX='// SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later',DUAL='EUPL-1.2 OR AGPL-3.0-or-later';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const sources=execFileSync('git',['ls-files','core/res'],{cwd:root,encoding:'utf8'}).split('\n').filter(f=>/\.resi?$/.test(f));
test('every Core source file starts with the dual SPDX line',()=>{
  assert.ok(sources.length>=28);
  for(const file of sources)assert.equal(read(file).split('\n')[0],SPDX,file);
});
test('every Core source file carries exactly one SPDX line',()=>{
  for(const file of sources)assert.equal(read(file).split('\n').filter(l=>l.includes('SPDX-License-Identifier')).length,1,file);
});
test('the viewer NOTICE says Core is dual licensed and that this package uses the AGPL choice',()=>{
  const notice=read('packages/viewer/NOTICE');
  assert.ok(notice.includes(DUAL));assert.match(notice,/uses? .{0,40}AGPL-3\.0-or-later/s);
  assert.ok(!/open owner question/.test(notice));
  assert.ok(existsSync(new URL('packages/viewer/CORE_EUPL_LICENSE.txt',root)));assert.match(read('packages/viewer/LICENSE'),/GNU AFFERO GENERAL PUBLIC LICENSE/);
});
test('capture-recovery declares the dual license in package.json, NOTICE and provenance, and ships both texts',()=>{
  const pkg=JSON.parse(read('packages/capture-recovery/package.json')),notice=read('packages/capture-recovery/NOTICE'),build=read('packages/capture-recovery/build.mjs');
  assert.equal(pkg.license,DUAL);assert.ok(notice.includes(DUAL));assert.ok(build.includes(`license:'${DUAL}'`));
  assert.ok(!build.includes("license:'EUPL-1.2'"));
  assert.match(read('packages/capture-recovery/LICENSE'),/EUROPEAN UNION PUBLIC LICENCE/);
  assert.match(read('packages/capture-recovery/AGPL-3.0-or-later.txt'),/GNU AFFERO GENERAL PUBLIC LICENSE/);
  for(const file of ['LICENSE','AGPL-3.0-or-later.txt'])assert.ok(pkg.files.includes(file),file);
});
test('SM11 records the dual-license decision and keeps the EUPL decision',()=>{
  const plan=read('specs/006-shared-model/plan.md');
  assert.ok(plan.includes('SM11')&&plan.includes('2026-11-12')&&plan.includes(DUAL)&&plan.includes('2026-11-17'));
});
