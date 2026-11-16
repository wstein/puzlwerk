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
