import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os'; import {join} from 'node:path';
import {preparePreview} from '../../scripts/pages/preview.mjs';
test('preview assembly binds old receipt and retains production root',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'preview-prepare-')); try {
  await writeFile(join(dir,'index.html'),'root');
  const script=`import importlib.util,json,sys\ns=importlib.util.spec_from_file_location('baseline',sys.argv[1]); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); print(json.dumps(m.make_receipt(sys.argv[2],'c'*40,41,1,'b'*32)))`;
  const previous=JSON.parse(execFileSync('python3',['-B','-c',script,join(process.cwd(),'scripts/pages/baseline.py'),dir],{encoding:'utf8'}));
  await writeFile(join(dir,'.puzlwerk-publication.json'),JSON.stringify(previous));
  const api={pages:async()=>[],request:async()=>null};
  await writeFile(join(dir,'index.html'),'tampered');
  await assert.rejects(preparePreview(api,dir,previous,{sha:'a'.repeat(40),run:42,attempt:1}));
  await writeFile(join(dir,'index.html'),'root');
  const state=await preparePreview(api,dir,previous,{sha:'a'.repeat(40),run:42,attempt:1});
  assert.equal((await readFile(join(dir,'index.html'),'utf8')),'root');
  assert.equal(state.receipt.previous,previous.nonce);
  assert.equal(state.receipt.run,42);
  assert.deepEqual(state.changed,[]);
 } finally {await rm(dir,{recursive:true,force:true});}
});
