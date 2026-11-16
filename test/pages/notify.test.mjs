import {test} from 'node:test'; import assert from 'node:assert/strict';
import {notifyOne} from '../../scripts/pages/notify.mjs';
const sha='a'.repeat(40),repo='wstein/puzlwerk';
const pr=()=>({number:72,state:'open',labels:[{name:'preview'}],head:{sha,repo:{full_name:repo}},base:{repo:{full_name:repo}}});
const run=()=>({id:12,run_attempt:2,status:'completed',conclusion:'success',event:'pull_request',path:'.github/workflows/acceptance-preview.yml',head_sha:sha,repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[{number:72}],created_at:'2026-11-16T10:00:00Z'});
test('success comment requires matching current head, build and fresh published receipt',async()=>{
 let writes=0, fresh=true, current=pr();
 const api={request:async (_path,opts)=>{if(opts?.method){writes++;return {}} return current;},pages:async path=>path.includes('/comments')?[]:[run()]};
 const metadata={number:72,sha,run:12,attempt:2};
 await notifyOne(api,metadata,async()=>fresh); assert.equal(writes,1);
 fresh=false; await notifyOne(api,metadata,async()=>fresh); assert.equal(writes,1);
 fresh=true; current={...pr(),state:'closed'}; await notifyOne(api,metadata,async()=>fresh); assert.equal(writes,1);
 current=pr(); await notifyOne(api,{...metadata,sha:'b'.repeat(40)},async()=>fresh); assert.equal(writes,1);
});

test('a changed head or removed label neutralizes the old success link',async()=>{
 const {clearStale}=await import('../../scripts/pages/notify.mjs');
 let current={...pr(),head:{...pr().head,sha:'b'.repeat(40)}},body='';
 const old=`<!-- puzlwerk-pr-preview -->\n[link](https://wstein.github.io/puzlwerk/pr-preview/pr-72/) · ${sha} · build 12 attempt 2.`;
 const api={request:async (_path,opts)=>{if(opts?.method){body=JSON.parse(opts.body).body;return {}} return current;},pages:async path=>path.includes('/comments')?[{id:1,user:{login:'github-actions[bot]'},body:old}]:[run()]};
 await clearStale(api,72); assert.match(body,/pending or no longer current/); assert.doesNotMatch(body,/https:\/\//);
});
