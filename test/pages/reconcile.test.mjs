import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decide} from '../../scripts/pages/reconcile.mjs';
const repo='wstein/puzlwerk', sha='a'.repeat(40);
const pr=(number=1)=>({number,state:'open',labels:[{name:'preview'}],head:{sha,repo:{full_name:repo}},base:{repo:{full_name:repo}}});
const run=(number=1)=>({id:number,run_attempt:1,status:'completed',conclusion:'success',event:'pull_request',path:'.github/workflows/acceptance-preview.yml',head_sha:sha,repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[{number}],created_at:'2026-11-16T10:00:00Z'});
test('two PRs are isolated and failure retains the old namespace',()=>{
 assert.deepEqual(decide(pr(1),[run(1)],true),{action:'update',number:1,run:1,attempt:1,sha});
 assert.deepEqual(decide(pr(2),[{...run(2),conclusion:'failure'}],true),{action:'retain',number:2});
 assert.deepEqual(decide(pr(2),null,false),{action:'retain',number:2});
});
test('cleanup requires an observed current ineligible PR; missing state is unknown',()=>{
 const closed={...pr(1),state:'closed'}; assert.deepEqual(decide(closed,[],true),{action:'remove',number:1});
 const unlabelled={...pr(1),labels:[]}; assert.deepEqual(decide(unlabelled,[],true),{action:'remove',number:1});
 assert.equal(decide(null,[],true),null);
 assert.deepEqual(decide(pr(1),[],true),{action:'retain',number:1});
});

test('reconciliation preserves siblings and aborts if removal was reopened',async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os'); const {join}=await import('node:path');
 const {reconcile,validateChanges}=await import('../../scripts/pages/reconcile.mjs');
 const root=await mkdtemp(join(tmpdir(),'puzl-reconcile-'));
 try {
  for(const n of [1,2]){await mkdir(join(root,`pr-preview/pr-${n}`),{recursive:true});await writeFile(join(root,`pr-preview/pr-${n}/index.html`),`old${n}`);}
  let reopened=false;
  const api={pages:async path=>path.startsWith('pulls?')?[pr(1)]:[run(1)],request:async path=>path==='pulls/1'?pr(1):(reopened?pr(2):{...pr(2),state:'closed'})};
  const stage=async (_api,n,_id,_attempt,dest)=>{await mkdir(dest);await writeFile(join(dest,'index.html'),`new${n}`);};
  const check=await reconcile(api,root,{stage});
  assert.equal(await readFile(join(root,'pr-preview/pr-1/index.html'),'utf8'),'new1');
  await assert.rejects(readFile(join(root,'pr-preview/pr-2/index.html')),{code:'ENOENT'});
  await validateChanges(api,check.changed);
  reopened=true; await assert.rejects(check(),/changed/);
  await assert.rejects(validateChanges(api,check.changed),/changed/);
 } finally {await rm(root,{recursive:true,force:true});}
});
