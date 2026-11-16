import {test} from 'node:test'; import assert from 'node:assert/strict';
import {begin,finish} from '../../scripts/pages/writer.mjs';
const receipt={schema:1,sha:'a'.repeat(40),run:3,attempt:1,nonce:'b'.repeat(32),previous:null,root:'c'.repeat(64),snapshot:'d'.repeat(64)};
const context={sha:'e'.repeat(40),run:4,attempt:2};
test('writer requires opt-in and verified baseline before preview',async()=>{
 await assert.rejects(begin('preview','false',context,{read:async()=>receipt}),/disabled/);
 await assert.rejects(begin('preview','true',context,{read:async()=>null}),/baseline/);
 assert.deepEqual(await begin('production','false',context,{read:async()=>null,legacyAllowed:async()=>true}),{legacy:true});
 await assert.rejects(begin('production','false',context,{read:async()=>null,legacyAllowed:async()=>false}),/ledger/);
 await assert.rejects(begin('preview','true',context,{read:async()=>receipt}),/bootstrap/i);
 assert.deepEqual(await begin('preview','true',context,{read:async()=>receipt,bootstrapConfigured:true}),{legacy:false,previous:receipt,start:{schema:1,...context,previous:receipt.nonce}});
});
test('writer commits only after exact live receipt verified',async()=>{
 const next={...receipt,sha:context.sha,run:context.run,attempt:context.attempt,previous:receipt.nonce,nonce:'f'.repeat(32)};
 const start={schema:1,...context,previous:receipt.nonce};
 await assert.rejects(finish(start,next,{verify:async()=>{throw Error('stale')}}),/stale/);
 assert.deepEqual(await finish(start,next,{verify:async()=>next}),{...start,receipt:next});
 await assert.rejects(finish({...start,attempt:3},next,{verify:async()=>next}),/identity/);
});

test('missing public receipt cannot use legacy deploy after ledger state or an unreadable inventory',async()=>{
 const {legacyAllowed}=await import('../../scripts/pages/writer.mjs');
 const empty={pages:async()=>[]};
 assert.equal(await legacyAllowed(empty,null),true);
 assert.equal(await legacyAllowed(empty,{run:1,attempt:1,nonce:'a'.repeat(32)}),false);
 const stored={pages:async path=>path.includes('/artifacts')?[{name:'pages-writer-start-1'}]:[{id:1}]};
 assert.equal(await legacyAllowed(stored,null),false);
 const denied={pages:async()=>{throw Error('403')}};
 await assert.rejects(legacyAllowed(denied,null),/403/);
 await assert.rejects(begin('production','true',context,{read:async()=>{throw Error('403')},legacyAllowed:async()=>true}),/403/);
});

test('bootstrap requires explicit owner attestation and no preexisting ledger',async()=>{
 const request={run:42,attempt:1,artifact:9,root:'a'.repeat(64),snapshot:'b'.repeat(64),attested:true};
 const options={read:async()=>null,legacyAllowed:async()=>true,bootstrapRequest:request};
 const result=await begin('production','false',context,options);
 assert.equal(result.legacy,false); assert.equal(result.start.previous,null); assert.deepEqual(result.bootstrap,request);
 await assert.rejects(begin('production','false',context,{...options,bootstrapRequest:{...request,attested:false}}),/bootstrap/i);
 await assert.rejects(begin('production','false',context,{...options,legacyAllowed:async()=>false}),/ledger/);
 await assert.rejects(begin('production','false',context,{...options,read:async()=>receipt}),/bootstrap/i);
});
