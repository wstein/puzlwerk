import {test} from 'node:test'; import assert from 'node:assert/strict';
import {sourceArtifact} from '../../scripts/pages/bootstrap.mjs';
const repo='wstein/puzlwerk';
const run={id:42,head_sha:'a'.repeat(40),run_attempt:1,head_branch:'main',repository:{full_name:repo},head_repository:{full_name:repo},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success'};
const artifact={id:9,name:'github-pages',expired:false,size_in_bytes:100,workflow_run:{id:42}};
const currentBlob='f7f131d5a3bd64a4052ffbc78b90538ba391f51a';
const currentHead='4e9eb02e601af3e786943f6335f4dad121e65f15';
const legacyStep=(name,conclusion)=>({name,status:'completed',conclusion});
const currentSteps=()=>[legacyStep('Run node scripts/pages/writer.mjs begin','success'),legacyStep('Run node scripts/pages/writer.mjs prepare','skipped'),legacyStep('Run node scripts/pages/writer.mjs check','skipped'),legacyStep('Run node scripts/pages/writer.mjs finish','skipped'),legacyStep('Run actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9','skipped'),legacyStep('Deploy explicitly approved main','success')];
test('bootstrap source binds an explicitly supplied successful production run and artifact',async()=>{
 let state=run,items=[artifact],jobs=[{name:'deploy',status:'completed',conclusion:'success'}];
 let blob={sha:'3f73dcb8d236057eb6724d4c45475d5b3215ba53'};
 const api={request:async path=>path.startsWith('contents/')?blob:state,pages:async path=>path.includes('/jobs')?jobs:items,zip:async()=>Buffer.from('archive')};
 assert.deepEqual(await sourceArtifact(api,{run:42,attempt:1,artifact:9}),Buffer.from('archive'));
 for(const alteration of [{conclusion:'failure'},{head_branch:'other'},{run_attempt:2},{path:'evil'}]){state={...run,...alteration};await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));}
 state=run; blob={sha:'f'.repeat(40)}; await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
 blob={sha:'3f73dcb8d236057eb6724d4c45475d5b3215ba53'}; items=[{...artifact,id:10}]; await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
 items=[artifact]; jobs=[{name:'deploy',status:'completed',conclusion:'skipped'}]; await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
});

test('verified source artifact produces a matching bootstrap receipt',async()=>{
 const {mkdtemp,mkdir,writeFile,readFile,rm}=await import('node:fs/promises'); const {join}=await import('node:path'); const {tmpdir}=await import('node:os'); const {execFileSync}=await import('node:child_process');
 const root=await mkdtemp(join(tmpdir(),'puzl-bootstrap-')); try {
  const source=join(root,'source'); await mkdir(source); await writeFile(join(source,'index.html'),'published');
  const archive=join(root,'artifact.zip');
  const pack=`import sys,tarfile,zipfile,io\nfrom pathlib import Path\nb=io.BytesIO()\nwith tarfile.open(fileobj=b,mode='w') as t:t.add(Path(sys.argv[1])/'index.html',arcname='index.html')\nwith zipfile.ZipFile(sys.argv[2],'w') as z:z.writestr('artifact.tar',b.getvalue())`;
  execFileSync('python3',['-B','-c',pack,source,archive]); const bytes=await readFile(archive);
  const hashScript="import sys; sys.path.insert(0,sys.argv[1]); import baseline; print(baseline.digest(sys.argv[2])); print(baseline.digest(sys.argv[2],include_previews=True))";
  const hashes=execFileSync('python3',['-B','-c',hashScript,join(process.cwd(),'scripts/pages'),source],{encoding:'utf8'}).trim().split('\n');
  const api={request:async path=>path.startsWith('contents/')?{sha:currentBlob}:{...run,head_sha:currentHead},pages:async path=>path.includes('/jobs')?[{name:'Deploy production snapshot',status:'completed',conclusion:'success',steps:currentSteps()}]:[{...artifact,size_in_bytes:bytes.length}],zip:async()=>bytes};
  const {begin}=await import('../../scripts/pages/writer.mjs');
  const context={sha:'c'.repeat(40),run:44,attempt:1};
  assert.deepEqual(await begin('production','true',context,{read:async()=>null,legacyAllowed:async()=>true}),{legacy:true});
  const requested={run:42,attempt:1,artifact:9,root:hashes[0],snapshot:hashes[1],attested:true};
  const next=await begin('production','true',context,{read:async()=>null,legacyAllowed:async()=>true,bootstrapRequest:requested});
  assert.equal(next.start.previous,null);
  const authenticated=await sourceArtifact(api,{run:42,attempt:1,artifact:9}); const downloaded=join(root,'download.zip'); await writeFile(downloaded,authenticated);
  const env={...process.env,GITHUB_SHA:'c'.repeat(40),GITHUB_RUN_ID:'44',GITHUB_RUN_ATTEMPT:'1'};
  execFileSync('python3',['-B',join(process.cwd(),'scripts/pages/bootstrap.py'),downloaded,join(root,'out'),...hashes],{env});
  const receipt=JSON.parse(await readFile(join(root,'out/.puzlwerk-publication.json'),'utf8'));
  assert.equal(receipt.root,hashes[0]); assert.equal(receipt.snapshot,hashes[1]); assert.equal(receipt.previous,null); assert.equal(receipt.run,44);
 } finally {await rm(root,{recursive:true,force:true});}
});

test('current merged workflow accepts only a proven first-attempt legacy deploy',async()=>{
 const {readFile}=await import('node:fs/promises'); const {createHash}=await import('node:crypto');
 const contents=await readFile('test/pages/fixtures/documentation-4e9eb02.yml');
 const hash=createHash('sha1').update(`blob ${contents.length}\0`).update(contents).digest('hex');
 assert.equal(hash,'f7f131d5a3bd64a4052ffbc78b90538ba391f51a');
 const text=contents.toString('utf8');
 assert.match(text,/name: Deploy production snapshot/);
 assert.match(text,/artifact_name: \$\{\{ steps\.begin\.outputs\.legacy == 'true' && 'github-pages'/);
 const steps=currentSteps();
 const current={...run,head_sha:currentHead};
 let job={name:'Deploy production snapshot',status:'completed',conclusion:'success',steps};
 const build={name:'build',status:'completed',conclusion:'success'};
 const api={request:async path=>path.startsWith('contents/')?{sha:hash}:current,pages:async path=>path.includes('/jobs')?[build,job]:[artifact],zip:async()=>Buffer.from('archive')};
 assert.deepEqual(await sourceArtifact(api,{run:42,attempt:1,artifact:9}),Buffer.from('archive'));
 job={...job,name:'wrong deploy job'};
 await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
 job={...job,name:'Deploy production snapshot'};
 await assert.rejects(sourceArtifact({...api,request:async path=>path.startsWith('contents/')?{sha:hash}:{...current,run_attempt:2}},{run:42,attempt:2,artifact:9}));
 job={...job,steps:steps.map(x=>x.name.includes('writer.mjs prepare')?{...x,conclusion:'success'}:x)};
 await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
 for (const expected of steps) {
  job={...job,steps:steps.map(x=>x.name===expected.name?{...x,conclusion:x.conclusion==='success'?'skipped':'success'}:x)};
  await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
  job={...job,steps:steps.map(x=>x.name===expected.name?{...x,status:'in_progress'}:x)};
  await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
  job={...job,steps:steps.filter(x=>x.name!==expected.name)};
  await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
  job={...job,steps:[...steps,expected]};
  await assert.rejects(sourceArtifact(api,{run:42,attempt:1,artifact:9}));
 }
 job={...job,steps};
 await assert.rejects(sourceArtifact({...api,request:async path=>path.startsWith('contents/')?{sha:hash}:{...current,head_repository:{full_name:'fork/puzlwerk'}}},{run:42,attempt:1,artifact:9}));
 await assert.rejects(sourceArtifact({...api,request:async path=>path.startsWith('contents/')?{sha:hash}:{...current,run_attempt:2}},{run:42,attempt:1,artifact:9}));
 await assert.rejects(sourceArtifact({...api,pages:async path=>path.includes('/jobs')?[job]:[{...artifact,expired:true}]},{run:42,attempt:1,artifact:9}));
});
