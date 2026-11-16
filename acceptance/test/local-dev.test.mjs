import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {startServer,parseHost} from '../dev.mjs';

const get=(port,path)=>new Promise((resolve,reject)=>{const req=request({host:'127.0.0.1',port,path},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,type:res.headers['content-type'],body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
test('loopback server serves index, case deep link and module with correct MIME',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'acceptance-dev-')); let server;
 try {
  const site=join(dir,'site');await mkdir(join(site,'acceptance/case'),{recursive:true});await mkdir(join(site,'assets'),{recursive:true});
  await writeFile(join(site,'index.html'),'inventory');await writeFile(join(site,'acceptance/case/index.html'),'case');await writeFile(join(site,'assets/demo.mjs'),'export {}');
  await writeFile(join(dir,'secret'),'outside');await symlink(join(dir,'secret'),join(site,'assets/outside'));
  server=await startServer(site,0);const port=server.address().port;
  assert.equal(server.address().address,'127.0.0.1');
  assert.deepEqual(await get(port,'/'),{status:200,type:'text/html; charset=utf-8',body:'inventory'});
  assert.equal((await get(port,'/acceptance/case/')).body,'case');
  assert.match((await get(port,'/assets/demo.mjs')).type,/javascript/);
  assert.equal((await get(port,'/%2e%2e/secret')).status,400);
  assert.equal((await get(port,'/assets/outside')).status,400);
  assert.equal((await get(port,'/missing')).status,404);
 } finally {if(server)await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
test('acceptance manifest points each case at its local route',async()=>{
 const {readFile}=await import('node:fs/promises');
 const manifest=JSON.parse(await readFile(new URL('../../specs/009-viewer-consolidation/acceptance-routes.json',import.meta.url)));
 assert.match(manifest.routeBasePolicy,/127\.0\.0\.1:4174/);
 for(const c of manifest.cases){assert.equal(c.localUrlExample,`http://127.0.0.1:4174/${c.route}`);assert.equal(c.nestedBaseExample,undefined);assert.ok(c.checklist.every(item=>!item.includes('/pr-preview/')));}
});

test('explicit host opt-in changes binding and default stays loopback',async()=>{
 assert.equal(parseHost([]),'127.0.0.1');assert.equal(parseHost(['--host','0.0.0.0']),'0.0.0.0');assert.throws(()=>parseHost(['--host']));
 const dir=await mkdtemp(join(tmpdir(),'acceptance-host-'));let server;try {server=await startServer(dir,0,parseHost(['--host','0.0.0.0']));assert.equal(server.address().address,'0.0.0.0');} finally {if(server)await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
