import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {stage} from '../../scripts/pages/stage.mjs';
const sha='a'.repeat(40), repo='wstein/puzlwerk', manifest=Buffer.from('{"cases":[{"route":"acceptance/case/"}]}');
const pr=()=>({number:72,state:'open',labels:[{name:'preview'}],head:{sha,repo:{full_name:repo}},base:{repo:{full_name:repo}}});
const run=()=>({id:12,run_attempt:2,status:'completed',conclusion:'success',event:'pull_request',path:'.github/workflows/acceptance-preview.yml',head_sha:sha,repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[{number:72}],created_at:'2026-11-16T10:00:00Z'});
const record={viewerHead:sha,base:'/puzlwerk/pr-preview/pr-72/',manifestSha256:createHash('sha256').update(manifest).digest('hex'),routes:['acceptance/case/']};
const html='<!doctype html><html><head><title>case</title></head><body>ok</body></html>';
test('stages a packaged artifact only while run and source still match',async()=>{
 const tmp=await mkdtemp(join(tmpdir(),'puzlwerk-stage-')); try {
  const archive=join(tmp,'input.zip');
  execFileSync('python3',['-c',`import zipfile,sys,json\nz=zipfile.ZipFile(sys.argv[1],'w'); z.writestr('index.html',sys.argv[2]); z.writestr('acceptance/case/index.html',sys.argv[2]); z.writestr('build-record.json',sys.argv[3]); z.close()`,archive,html,JSON.stringify(record)]);
  let state=pr(); const api={request:async path=>path.startsWith('pulls/')?state:{encoding:'base64',content:manifest.toString('base64'),size:manifest.length},pages:async()=>[run()],artifact:async()=>({id:5,size_in_bytes:1000}),zip:async()=>readFile(archive)};
  await stage(api,72,12,2,join(tmp,'output'));
  assert.match(await readFile(join(tmp,'output/acceptance/case/index.html'),'utf8'),/noindex/);
  let reads=0; const moving={...api,request:async path=>path.startsWith('pulls/')?(++reads===1?pr():{...pr(),state:'closed'}):{encoding:'base64',content:manifest.toString('base64'),size:manifest.length}};
  await assert.rejects(stage(moving,72,12,2,join(tmp,'moving')),/current/);
  await assert.rejects(readFile(join(tmp,'moving/index.html')),{code:'ENOENT'});
  state={...pr(),state:'closed'};
  await assert.rejects(stage(api,72,12,2,join(tmp,'closed')),/current/);
 } finally {await rm(tmp,{recursive:true,force:true});}
});
