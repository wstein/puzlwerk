import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePublication, readPublication, trustedPublisher, verifyLiveReceipt } from '../../scripts/pages/publication.mjs';
const receipt={schema:1,sha:'a'.repeat(40),run:42,attempt:1,nonce:'b'.repeat(32),previous:null,root:'c'.repeat(64),snapshot:'d'.repeat(64)};
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
  const script=`import json,sys,zipfile\nfrom pathlib import Path\nsys.path.insert(0,'scripts/pages')\nfrom baseline import make_receipt\nr=Path(sys.argv[1]); (r/'index.html').write_text('root'); (r/'pr-preview').mkdir(); (r/'pr-preview'/'x').write_text('preview')\nv=make_receipt(r,'a'*40,42,1,'b'*32); v['previous']=None; (r/'.puzlwerk-publication.json').write_text(json.dumps(v))\nwith zipfile.ZipFile(sys.argv[2],'w') as z:\n for p in r.rglob('*'):\n  if p.is_file(): z.write(p,p.relative_to(r).as_posix())\nprint(json.dumps(v))`;
  const root=join(temp,'source'); await mkdir(root); const archive=join(temp,'snapshot.zip');
  const valid=JSON.parse(execFileSync('python3',['-c',script,root,archive],{encoding:'utf8'}));
  const bytes=await readFile(archive);
  const run={id:42,run_attempt:1,head_sha:valid.sha,head_branch:'main',repository:{full_name:'wstein/puzlwerk'},head_repository:{full_name:'wstein/puzlwerk'},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success',created_at:'2026-01-01T00:00:00Z'};
  const start={schema:1,run:42,attempt:1,sha:valid.sha,previous:null};
  const makeZip=async(name,value)=>{const p=join(temp,name);execFileSync('python3',['-c',"import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z: z.writestr('ledger.json',sys.argv[2])",p,JSON.stringify(value)]);return readFile(p);};
  const ledger=[await makeZip('start.zip',start),await makeZip('commit.zip',{...start,receipt:valid})];
  const artifact={id:9,name:'pages-published-snapshot-1',expired:false,workflow_run:{id:42},size_in_bytes:bytes.length};
  const ledgerArtifacts=ledger.map((b,i)=>({id:i+1,name:`pages-writer-${i?'commit':'start'}-1`,expired:false,workflow_run:{id:42},size_in_bytes:b.length}));
  const api={request:async()=>run,pages:async path=>path.includes('/artifacts')?[artifact,...ledgerArtifacts]:path.includes('/jobs')?[{name:'Deploy production snapshot',status:'completed',conclusion:'success'}]:path.includes('documentation.yml')?[run]:[],zip:async id=>id===9?bytes:ledger[id-1]};
  const fetch=async()=>response(200,JSON.stringify(valid));
  const bootstrap={run:42,attempt:1,nonce:valid.nonce};
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'unproven'),fetch}));
  const dest=join(temp,'output'); assert.deepEqual(await readVerifiedSnapshot(api,{destination:dest,fetch,bootstrap}),valid);
  assert.equal(await readFile(join(dest,'pr-preview','x'),'utf8'),'preview');
  await assert.rejects(readVerifiedSnapshot({...api,pages:async path=>path.includes('/artifacts')?[artifact,artifact,...ledgerArtifacts]:api.pages(path)},{destination:join(temp,'duplicate'),fetch,bootstrap}));
  await assert.rejects(readVerifiedSnapshot({...api,request:async()=>({...run,conclusion:'failure'})},{destination:join(temp,'untrusted'),fetch,bootstrap}));
  const existing=join(temp,'existing'); await mkdir(existing); await writeFile(join(existing,'keep'),'safe');
  await assert.rejects(readVerifiedSnapshot(api,{destination:existing,fetch,bootstrap})); assert.equal(await readFile(join(existing,'keep'),'utf8'),'safe');
  const corrupt=join(temp,'corrupt.zip');
  execFileSync('python3',['-c',"import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as source, zipfile.ZipFile(sys.argv[2],'w') as out:\n for i in source.infolist(): out.writestr(i, b'changed' if i.filename=='pr-preview/x' else source.read(i))",archive,corrupt]);
  const corruptBytes=await readFile(corrupt);
  await assert.rejects(readVerifiedSnapshot({...api,zip:async id=>id===9?corruptBytes:ledger[id-1]},{destination:join(temp,'corrupt'),fetch,bootstrap}));
  const badRoot={...valid,root:'f'.repeat(64)};
  const badRootArchive=join(temp,'bad-root.zip');
  execFileSync('python3',['-c',"import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1]) as source, zipfile.ZipFile(sys.argv[2],'w') as out:\n for i in source.infolist(): out.writestr(i, sys.argv[3] if i.filename=='.puzlwerk-publication.json' else source.read(i))",archive,badRootArchive,JSON.stringify(badRoot)]);
  const badRootBytes=await readFile(badRootArchive);
  const badRootCommit=await makeZip('bad-root-ledger.zip',{...start,receipt:badRoot});
  const badRootApi={...api,zip:async id=>id===9?badRootBytes:id===2?badRootCommit:ledger[id-1]};
  await assert.rejects(readVerifiedSnapshot(badRootApi,{destination:join(temp,'bad-root'),fetch:async()=>response(200,JSON.stringify(badRoot)),bootstrap}),/Snapshot receipt or digest mismatch/);
  const bad={...valid,snapshot:'f'.repeat(64)};
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(temp,'bad'),fetch:async()=>response(200,JSON.stringify(bad)),bootstrap}));
 } finally {await rm(temp,{recursive:true,force:true});}
});

test('ledger rejects replay, forks, missing starts and unknown writers', async()=>{
 const {verifyWriterLedger}=await import('../../scripts/pages/publication.mjs');
 const a={...receipt,previous:null};
 const b={...receipt,run:43,nonce:'e'.repeat(32),previous:a.nonce};
 const make=r=>({start:{schema:1,run:r.run,attempt:r.attempt,sha:r.sha,previous:r.previous},commit:{schema:1,run:r.run,attempt:r.attempt,sha:r.sha,previous:r.previous,receipt:r}});
 const bootstrap={run:a.run,attempt:a.attempt,nonce:a.nonce};
 const chain=[make(a),make(b)];
 assert.equal(verifyWriterLedger(chain,b,{bootstrap}),true);
 for(const [field,value] of [['run',99],['attempt',2],['sha','f'.repeat(40)],['previous','f'.repeat(32)]]) {
  const broken={...chain[1],commit:{...chain[1].commit,[field]:value}};
  assert.throws(()=>verifyWriterLedger([chain[0],broken],b,{bootstrap}),/Invalid writer commit/);
 }
 assert.throws(()=>verifyWriterLedger(chain,a,{bootstrap}));
 assert.throws(()=>verifyWriterLedger([...chain,make({...b,run:44,nonce:'f'.repeat(32)})],b,{bootstrap}));
 assert.throws(()=>verifyWriterLedger([make(a),{...make(b),start:null}],b,{bootstrap}));
 assert.throws(()=>verifyWriterLedger([...chain,{start:{...make(b).start,run:45,previous:b.nonce},commit:null}],b,{bootstrap}));
 assert.throws(()=>verifyWriterLedger(chain,b,{bootstrap:{...bootstrap,nonce:'f'.repeat(32)}}));
});

test('ledger API binds artifact bytes and rejects incomplete writer history',async()=>{
 const {readWriterLedger}=await import('../../scripts/pages/publication.mjs');
 const {mkdtemp,readFile,rm}=await import('node:fs/promises'); const {tmpdir}=await import('node:os'); const {join}=await import('node:path'); const {execFileSync}=await import('node:child_process');
 const temp=await mkdtemp(join(tmpdir(),'ledger-test-'));
 try {
  const r={...receipt,previous:null}; const start={schema:1,run:r.run,attempt:r.attempt,sha:r.sha,previous:null}; const commit={...start,receipt:r};
  const makeZip=async(name,value)=>{const path=join(temp,name);execFileSync('python3',['-c',"import json,sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z: z.writestr('ledger.json',sys.argv[2])",path,JSON.stringify(value)]);return readFile(path);};
  const zips=[await makeZip('start.zip',start),await makeZip('commit.zip',commit)];
  const run={id:42,run_attempt:1,head_sha:r.sha,head_branch:'main',repository:{full_name:'wstein/puzlwerk'},head_repository:{full_name:'wstein/puzlwerk'},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success',created_at:'2026-01-01T00:00:00Z'};
  const artifacts=['start','commit'].map((v,i)=>({id:i+1,name:`pages-writer-${v}-1`,expired:false,size_in_bytes:zips[i].length,workflow_run:{id:42}}));
  const api={request:async()=>run,pages:async(path)=>path.includes('/artifacts')?artifacts:path.includes('/jobs')?[{name:'Deploy production snapshot',status:'completed',conclusion:'success'}]:path.includes('documentation.yml')?[run]:[],zip:async id=>zips[id-1]};
  const bootstrap={run:42,attempt:1,nonce:r.nonce};
  assert.equal(await readWriterLedger(api,r,{bootstrap}),true);
  const signal={...run,id:43,path:'.github/workflows/pages-publish.yml',event:'pull_request_target'};
  const signalApi=state=>({...api,pages:async path=>path.includes('pages-publish.yml/runs')?[signal]:path.includes('/43/attempts/')?[{name:'Publish preview snapshot',status:'completed',conclusion:state}]:api.pages(path)});
  assert.equal(await readWriterLedger(signalApi('skipped'),r,{bootstrap}),true);
  await assert.rejects(readWriterLedger(signalApi('success'),r,{bootstrap}));
  const next={...r,run:43,nonce:'e'.repeat(32),previous:r.nonce};
  const signalStart={schema:1,run:43,attempt:1,sha:r.sha,previous:r.nonce};
  const signalZips=[await makeZip('signal-start.zip',signalStart),await makeZip('signal-commit.zip',{...signalStart,receipt:next})];
  const signalArtifacts=signalZips.map((v,i)=>({id:10+i,name:`pages-writer-${i?'commit':'start'}-1`,expired:false,size_in_bytes:v.length,workflow_run:{id:43}}));
  const activeSignal={...signalApi('success'),pages:async path=>path.includes('/43/artifacts')?signalArtifacts:signalApi('success').pages(path),zip:async id=>id>=10?signalZips[id-10]:zips[id-1]};
  await assert.rejects(readWriterLedger(activeSignal,next,{bootstrap}),/Signal run activated publisher job/);
  await assert.rejects(readWriterLedger({...api,pages:async path=>path.includes('/artifacts')?artifacts.slice(0,1):api.pages(path)},r,{bootstrap}));
  await assert.rejects(readWriterLedger({...api,zip:async id=>id===2?zips[0]:zips[id-1]},r,{bootstrap}));
 } finally {await rm(temp,{recursive:true,force:true});}
});

test('bounded receipt confirmation tolerates only the exact previous receipt and transient HTTP failures',async()=>{
 const {waitForLiveReceipt}=await import('../../scripts/pages/publication.mjs');
 const prior={...receipt,run:41,nonce:'e'.repeat(32)}; const next={...receipt,previous:prior.nonce};
 const sequence=[new Response(JSON.stringify(prior),{status:200}),new Response('',{status:503}),new Response('',{status:404}),new Response(JSON.stringify(next),{status:200})];
 let waits=0; const got=await waitForLiveReceipt(next,{previous:prior,fetch:async()=>sequence.shift(),sleep:async()=>{waits++;},attempts:4});
 assert.deepEqual(got,next); assert.equal(waits,3);
 let foreignCalls=0; await assert.rejects(waitForLiveReceipt(next,{previous:prior,fetch:async()=>{foreignCalls++;return new Response(JSON.stringify({...prior,nonce:'f'.repeat(32)}));},sleep:async()=>{},attempts:4}),/mismatch/); assert.equal(foreignCalls,1);
 let calls=0; await assert.rejects(waitForLiveReceipt(next,{previous:prior,fetch:async()=>{calls++;return new Response('',{status:503});},sleep:async()=>{},attempts:3}),/exhausted/); assert.equal(calls,3);
 await assert.rejects(waitForLiveReceipt(next,{previous:prior,fetch:async()=>new Response('',{status:403}),sleep:async()=>{},attempts:3}),/failed/);
});

test('actual failed writer metadata distinguishes a deployed snapshot from a skipped deployment',async()=>{
 const {readFile}=await import('node:fs/promises'); const {classifyFailedWriter}=await import('../../scripts/pages/publication.mjs');
 const fixture=async name=>JSON.parse(await readFile(`test/pages/fixtures/receipt-recovery/${name}.json`));
 const run=await fixture('deployed-run'); const deployed=(await fixture('deployed-jobs')).find(j=>j.name==='Publish preview snapshot');
 const skipped=(await fixture('predeploy-failed-jobs')).find(j=>j.name==='Publish preview snapshot');
 const blob='757cc0f56c8edb67cf62306da379c018b5902c65';
 assert.equal(classifyFailedWriter(run,deployed,blob,1),'recover');
 assert.equal(classifyFailedWriter(run,skipped,blob,1),'not-deployed');
 for(const variant of [{...run,head_branch:'other'},{...run,run_attempt:2},{...run,event:'push'},{...run,head_repository:{full_name:'fork/puzlwerk'}},{...run,status:'in_progress'}]) assert.equal(classifyFailedWriter(variant,deployed,blob,1),null);
 assert.equal(classifyFailedWriter(run,deployed,'f'.repeat(40),1),null);
 assert.equal(classifyFailedWriter(run,{...deployed,steps:deployed.steps.filter(s=>s.name!=='Deploy combined snapshot')},blob,1),null);
 assert.equal(classifyFailedWriter(run,{...deployed,steps:[...deployed.steps,deployed.steps.find(s=>s.name==='Deploy combined snapshot')]},blob,1),null);
 assert.equal(classifyFailedWriter(run,{...deployed,steps:deployed.steps.map(s=>s.name==='Run node scripts/pages/writer.mjs finish'?{...s,conclusion:'success'}:s)},blob,1),null);
});

test('deployed failed writer recovery binds the verified snapshot to the actual start and run',async()=>{
 const {readFile}=await import('node:fs/promises'); const {recoverFailedWriter}=await import('../../scripts/pages/publication.mjs');
 const fixture=async name=>JSON.parse(await readFile(`test/pages/fixtures/receipt-recovery/${name}.json`));
 const run=await fixture('deployed-run'), r=await fixture('public-receipt');
 const job=(await fixture('deployed-jobs')).find(j=>j.name==='Publish preview snapshot');
 const before=(await fixture('predeploy-failed-jobs')).find(j=>j.name==='Publish preview snapshot');
 const start={schema:1,run:run.id,attempt:1,sha:run.head_sha,previous:r.previous};
 const api={request:async()=>({sha:'757cc0f56c8edb67cf62306da379c018b5902c65'})};
 const result=await recoverFailedWriter(api,run,job,start,1,{snapshotReader:async()=>r});
 assert.deepEqual(result,{start,commit:{...start,receipt:r}});
 assert.equal(await recoverFailedWriter(api,run,before,start,1,{snapshotReader:async()=>{throw Error('must not read')}}),null);
 for(const altered of [{...r,run:99},{...r,attempt:2},{...r,previous:'f'.repeat(32)},{...r,sha:'f'.repeat(40)}]) await assert.rejects(recoverFailedWriter(api,run,job,start,1,{snapshotReader:async()=>altered}));
 await assert.rejects(recoverFailedWriter({...api,request:async()=>({sha:'f'.repeat(40)})},run,job,start,1,{snapshotReader:async()=>r}));
});

test('actual failed-deploy shape is recovered in the ledger and later skipped-deploy writers are ignored',async()=>{
 const {mkdtemp,mkdir,readFile,rm}=await import('node:fs/promises'); const {tmpdir}=await import('node:os'); const {join}=await import('node:path'); const {execFileSync}=await import('node:child_process');
 const {readVerifiedSnapshot}=await import('../../scripts/pages/publication.mjs');
 const fixture=async name=>JSON.parse(await readFile(`test/pages/fixtures/receipt-recovery/${name}.json`));
 const failed=await fixture('deployed-run'), actual=await fixture('public-receipt');
 const deployedJobs=await fixture('deployed-jobs'), skippedJobs=await fixture('predeploy-failed-jobs');
 const tmp=await mkdtemp(join(tmpdir(),'recovery-test-'));
 try {
  const source=join(tmp,'source'); await mkdir(source); const archive=join(tmp,'snapshot.zip');
  const makeSnapshot=`import json,sys,zipfile\nfrom pathlib import Path\nsys.path.insert(0,'scripts/pages')\nfrom baseline import make_receipt\nr=Path(sys.argv[1]); (r/'index.html').write_text('root'); v=make_receipt(r,sys.argv[3],int(sys.argv[4]),1,sys.argv[5],previous=sys.argv[6]); (r/'.puzlwerk-publication.json').write_text(json.dumps(v))\nwith zipfile.ZipFile(sys.argv[2],'w') as z:\n for p in r.rglob('*'):\n  if p.is_file():z.write(p,p.relative_to(r).as_posix())\nprint(json.dumps(v))`;
  const current=JSON.parse(execFileSync('python3',['-B','-c',makeSnapshot,source,archive,failed.head_sha,String(failed.id),actual.nonce,actual.previous],{encoding:'utf8'}));
  const anchor={...current,run:10,sha:'d'.repeat(40),nonce:actual.previous,previous:null};
  const start=r=>({schema:1,run:r.run,attempt:r.attempt,sha:r.sha,previous:r.previous});
  const zip=async(name,value)=>{const file=join(tmp,name);execFileSync('python3',['-B','-c',"import sys,zipfile\nwith zipfile.ZipFile(sys.argv[1],'w') as z:z.writestr('ledger.json',sys.argv[2])",file,JSON.stringify(value)]);return readFile(file);};
  const blobs={1:await zip('anchor-start.zip',start(anchor)),2:await zip('anchor-commit.zip',{...start(anchor),receipt:anchor}),3:await zip('failed-start.zip',start(current)),4:await readFile(archive)};
  const repo={full_name:'wstein/puzlwerk'}; const anchorRun={id:10,run_attempt:1,event:'workflow_dispatch',status:'completed',conclusion:'success',head_sha:anchor.sha,head_branch:'main',path:'.github/workflows/documentation.yml',created_at:'2026-11-16T11:00:00Z',repository:repo,head_repository:repo};
  const skipped={...failed,id:43875644347,created_at:'2026-11-16T13:25:00Z'};
  const art=(id,name,run)=>({id,name,expired:false,size_in_bytes:blobs[id].length,workflow_run:{id:run}});
  const items={10:[art(1,'pages-writer-start-1',10),art(2,'pages-writer-commit-1',10)],[failed.id]:[art(3,'pages-writer-start-1',failed.id),art(4,'pages-published-snapshot-1',failed.id)],[skipped.id]:[]};
  const api={request:async path=>path.startsWith('contents/')?{sha:'757cc0f56c8edb67cf62306da379c018b5902c65'}:path.endsWith('/10')?anchorRun:failed,pages:async path=>{if(path.includes('/artifacts'))return items[Number(path.match(/runs\/(\d+)/)[1])];if(path.includes('/jobs')){const id=Number(path.match(/runs\/(\d+)/)[1]);return id===10?[{name:'Deploy production snapshot',status:'completed',conclusion:'success'}]:id===failed.id?deployedJobs:skippedJobs;}return path.includes('documentation.yml')?[anchorRun]:[failed,skipped];},zip:async id=>blobs[id]};
  const fetch=async()=>new Response(JSON.stringify(current));
  const got=await readVerifiedSnapshot(api,{destination:join(tmp,'out'),fetch,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}});
  assert.deepEqual(got,current);
  await assert.rejects(readVerifiedSnapshot({...api,zip:async id=>id===4?Buffer.from('corrupt'):blobs[id]},{destination:join(tmp,'corrupt'),fetch,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}));
  await assert.rejects(readVerifiedSnapshot({...api,request:async path=>path.startsWith('contents/')?{sha:'f'.repeat(40)}:api.request(path)},{destination:join(tmp,'wrong-workflow'),fetch,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}));
  await assert.rejects(readVerifiedSnapshot({...api,pages:async path=>path.includes(`/runs/${failed.id}/artifacts`)?items[failed.id].filter(x=>!x.name.startsWith('pages-writer-start-')):api.pages(path)},{destination:join(tmp,'missing-start'),fetch,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}));
  await assert.rejects(readVerifiedSnapshot({...api,pages:async path=>path.includes(`/runs/${failed.id}/attempts/`)?deployedJobs.map(job=>job.name==='Publish preview snapshot'?{...job,steps:job.steps.map(step=>step.name==='Deploy combined snapshot'?{...step,conclusion:'skipped'}:step)}:job):api.pages(path)},{destination:join(tmp,'not-deployed'),fetch,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}));
  let reads=0; const changed=async()=>new Response(JSON.stringify(++reads===1?current:{...current,nonce:'f'.repeat(32)}));
  await assert.rejects(readVerifiedSnapshot(api,{destination:join(tmp,'changed-live'),fetch:changed,bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}));
  const source2=join(tmp,'source2'); await mkdir(source2); const archive2=join(tmp,'next-snapshot.zip');
  const next=JSON.parse(execFileSync('python3',['-B','-c',makeSnapshot,source2,archive2,failed.head_sha,'50','9'.repeat(32),current.nonce],{encoding:'utf8'}));
  blobs[5]=await readFile(archive2); blobs[6]=await zip('next-start.zip',start(next)); blobs[7]=await zip('next-commit.zip',{...start(next),receipt:next});
  const success={...failed,id:50,created_at:'2026-11-16T13:30:00Z',status:'completed',conclusion:'success'};
  items[50]=[art(5,'pages-published-snapshot-1',50),art(6,'pages-writer-start-1',50),art(7,'pages-writer-commit-1',50)];
  const later={...api,request:async path=>path.endsWith('/50')?success:api.request(path),pages:async path=>{if(path.includes('/runs/50/artifacts'))return items[50];if(path.includes('/runs/50/attempts/'))return [{name:'Publish preview snapshot',status:'completed',conclusion:'success'}];if(path.includes('pages-publish.yml/runs'))return [failed,skipped,success];return api.pages(path);}};
  assert.deepEqual(await readVerifiedSnapshot(later,{destination:join(tmp,'later'),fetch:async()=>new Response(JSON.stringify(next)),bootstrap:{run:10,attempt:1,nonce:anchor.nonce}}),next);
 } finally {await rm(tmp,{recursive:true,force:true});}
});
