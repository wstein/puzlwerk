import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifyRecord} from '../../scripts/pages/record.mjs';
const sha='a'.repeat(40), manifest=Buffer.from('{"cases":[{"route":"acceptance/case/"}]}');
const record=()=>({viewerHead:sha,base:'/puzlwerk/pr-preview/pr-72/',manifestSha256:createHash('sha256').update(manifest).digest('hex'),routes:['acceptance/case/']});
test('record binds source head, namespace and manifest bytes',()=>{
 assert.equal(verifyRecord(record(),{sha,number:72,manifest}),true);
 for(const alter of [r=>r.viewerHead='b'.repeat(40),r=>r.base='/puzlwerk/pr-preview/pr-73/',r=>r.manifestSha256='0'.repeat(64),r=>r.routes=['../escape'],r=>r.routes=['acceptance/a/','acceptance/a/']]){
  const value=record();alter(value);assert.equal(verifyRecord(value,{sha,number:72,manifest}),false);
 }
 assert.equal(verifyRecord(record(),{sha,number:72,manifest:Buffer.from('different')}),false);
});
