import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligible, currentBuild, publicationAllowed } from '../../scripts/pages/policy.mjs';

const repo = 'wstein/puzlwerk';
const sha = 'a'.repeat(40);
const pr = () => ({ number: 72, state: 'open', labels: [{name:'preview'}], head: {sha, repo: {full_name: repo}}, base: {repo: {full_name: repo}} });
const run = () => ({ id: 11, run_attempt: 1, status:'completed', conclusion:'success', event:'pull_request', path:'.github/workflows/acceptance-preview.yml', head_sha:sha, repository:{full_name:repo}, head_repository:{full_name:repo}, pull_requests:[{number:72}] });

test('eligibility requires current open same-repository labelled PR', () => {
  assert.equal(eligible(pr()), true);
  for (const mutate of [p => p.state='closed', p => p.labels=[], p => p.head.repo.full_name='fork/puzlwerk', p => p.base.repo.full_name='fork/puzlwerk', p => p.head.sha='bad', p => p.number=0]) {
    const p=pr(); mutate(p); assert.equal(eligible(p),false);
  }
});
test('build identity must match eligible current head and trusted workflow', () => {
  assert.equal(currentBuild(pr(),run()),true);
  for (const mutate of [r => r.head_sha='b'.repeat(40), r => r.conclusion='failure', r => r.status='in_progress', r => r.path='other.yml', r => r.event='push', r => r.repository.full_name='fork/puzlwerk', r => r.head_repository.full_name='fork/puzlwerk', r => r.pull_requests=[{number:73}], r => r.run_attempt=0]) {
    const r=run(); mutate(r); assert.equal(currentBuild(pr(),r),false);
  }
});
test('publication gate accepts only literal true after baseline verification', () => {
  assert.equal(publicationAllowed('true',true),true);
  for (const gate of [undefined, null, false, true, 'false', 'TRUE', '']) assert.equal(publicationAllowed(gate,true),false);
  assert.equal(publicationAllowed('true',false),false);
});
