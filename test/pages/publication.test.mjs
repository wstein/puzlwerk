import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePublication, readPublication, trustedPublisher, verifyLiveReceipt } from '../../scripts/pages/publication.mjs';
const receipt={schema:1,sha:'a'.repeat(40),run:42,attempt:1,nonce:'b'.repeat(32),root:'c'.repeat(64),snapshot:'d'.repeat(64)};
const response=(status,body='')=>new Response(body,{status});
test('receipt shape is exact and digests are bounded',()=>{
 assert.deepEqual(parsePublication(JSON.stringify(receipt)),receipt);
 for(const value of [{...receipt,root:'x'}, {...receipt,extra:1}, {...receipt,run:0}, {...receipt,nonce:'a'}]) assert.throws(()=>parsePublication(JSON.stringify(value)));
});
test('public receipt is fixed origin, without redirects, and fails closed',async()=>{
 const fetch=async(url,options)=>{assert.match(url,/^https:\/\/wstein\.github\.io\/puzlwerk\/\.puzlwerk-publication\.json\?receipt=/);assert.equal(options.redirect,'error');return response(200,JSON.stringify(receipt));};
 assert.deepEqual(await readPublication({fetch}),receipt);
 assert.equal(await readPublication({fetch:async()=>response(404)}),null);
 await assert.rejects(readPublication({fetch:async()=>response(403)}));
 await assert.rejects(readPublication({fetch:async()=>response(200,'x'.repeat(32769))}));
 await assert.rejects(verifyLiveReceipt({...receipt,nonce:'e'.repeat(32)},{fetch}));
});
test('only a successful trusted main publisher binds the exact run',()=>{
 const run={id:42,run_attempt:1,head_sha:receipt.sha,head_branch:'main',repository:{full_name:'wstein/puzlwerk'},head_repository:{full_name:'wstein/puzlwerk'},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success'};
 assert.equal(trustedPublisher(run,receipt),true);
 for(const change of [{head_branch:'other'},{conclusion:'failure'},{run_attempt:2},{path:'evil.yml'},{event:'pull_request'},{head_sha:'f'.repeat(40)}]) assert.equal(trustedPublisher({...run,...change},receipt),false);
});

test('snapshot authenticates artifact and verifies both tree digests',async()=>{
 const {mkdtemp,readFile,rm,writeFile,mkdir}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os'); const {join}=await import('node:path');
 const {execFileSync}=await import('node:child_process');
 const {readVerifiedSnapshot}=await import('../../scripts/pages/publication.mjs');
 const temp=await mkdtemp(join(tmpdir(),'publication-test-'));
 try {
  const script=`import json,sys,zipfile\nfrom pathlib import Path\nsys.path.insert(0,'scripts/pages')\nfrom baseline import make_receipt\nr=Path(sys.argv[1]); (r/'index.html').write_text('root'); (r/'pr-preview').mkdir(); (r/'pr-preview'/'x').write_text('preview')\nv=make_receipt(r,'a'*40,42,1,'b'*32); (r/'.puzlwerk-publication.json').write_text(json.dumps(v))\nwith zipfile.ZipFile(sys.argv[2],'w') as z:\n for p in r.rglob('*'):\n  if p.is_file(): z.write(p,p.relative_to(r).as_posix())\nprint(json.dumps(v))`;
  const root=join(temp,'source'); await mkdir(root); const archive=join(temp,'snapshot.zip');
  const valid=JSON.parse(execFileSync('python3',['-c',script,root,archive],{encoding:'utf8'}));
  const bytes=await readFile(archive);
  const run={id:42,run_attempt:1,head_sha:valid.sha,head_branch:'main',repository:{full_name:'wstein/puzlwerk'},head_repository:{full_name:'wstein/puzlwerk'},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success'};
  const artifact={id:9,name:'pages-published-snapshot-1',expired:false,workflow_run:{id:42},size_in_bytes:bytes.length};
  const api={request:async()=>run,pages:async()=>[artifact],zip:async()=>bytes};
  const fetch=async()=>response(200,JSON.stringify(valid));
  const verifyCurrentDeployment=async()=>true;
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'unproven'),fetch}));
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'stale'),fetch,verifyCurrentDeployment:async()=>false}));
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'unknown'),fetch,verifyCurrentDeployment:async()=>{throw Error('unavailable');}}));
  const dest=join(temp,'output'); assert.deepEqual(await readVerifiedSnapshot(api,{destination:dest,fetch,verifyCurrentDeployment}),valid);
  assert.equal(await readFile(join(dest,'pr-preview','x'),'utf8'),'preview');
  await assert.rejects(readVerifiedSnapshot({...api,pages:async()=>[artifact,artifact]},{destination:join(temp,'duplicate'),fetch,verifyCurrentDeployment}));
  await assert.rejects(readVerifiedSnapshot({...api,request:async()=>({...run,conclusion:'failure'})},{destination:join(temp,'untrusted'),fetch,verifyCurrentDeployment}));
  const existing=join(temp,'existing'); await mkdir(existing); await writeFile(join(existing,'keep'),'safe');
  await assert.rejects(readVerifiedSnapshot(api,{destination:existing,fetch,verifyCurrentDeployment})); assert.equal(await readFile(join(existing,'keep'),'utf8'),'safe');
  const bad={...valid,snapshot:'f'.repeat(64)};
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'bad'),fetch:async()=>response(200,JSON.stringify(bad)),verifyCurrentDeployment}));
 } finally {await rm(temp,{recursive:true,force:true});}
});
