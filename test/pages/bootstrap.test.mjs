import {test} from 'node:test'; import assert from 'node:assert/strict';
import {sourceArtifact} from '../../scripts/pages/bootstrap.mjs';
const repo='wstein/puzlwerk';
const run={id:42,head_sha:'a'.repeat(40),run_attempt:1,head_branch:'main',repository:{full_name:repo},head_repository:{full_name:repo},path:'.github/workflows/documentation.yml',event:'workflow_dispatch',status:'completed',conclusion:'success'};
const artifact={id:9,name:'github-pages',expired:false,size_in_bytes:100,workflow_run:{id:42}};
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
