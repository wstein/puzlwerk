import {test, mock} from 'node:test';
import assert from 'node:assert/strict';
import {GitHub} from '../../scripts/pages/api.mjs';

test('pagination fails closed for missing pages and returns all complete pages', async () => {
  const api=new GitHub('token'); let call=0;
  api.request=async () => ++call === 1 ? Array.from({length:100},(_,i)=>i) : [100];
  assert.equal((await api.pages('pulls')).length,101);
  api.request=async () => null;
  await assert.rejects(api.pages('pulls'),/Invalid paginated/);
});
test('artifact identity must be unique, unexpired and attached to run', async () => {
  const api=new GitHub('token');
  const artifact={name:'acceptance-preview-2',expired:false,workflow_run:{id:12}};
  api.pages=async () => [artifact];
  assert.equal(await api.artifact(12,2),artifact);
  for (const list of [[],[artifact,artifact],[{...artifact,expired:true}],[{...artifact,name:'acceptance-preview-1'}],[{...artifact,workflow_run:{id:13}}]]) {
    api.pages=async () => list;
    await assert.rejects(api.artifact(12,2),/Expected one/);
  }
});
