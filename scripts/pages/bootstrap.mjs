import {REPOSITORY} from './policy.mjs';
const positive=n=>Number.isSafeInteger(n)&&n>0;
// Each entry is an audited workflow blob and its exact deployment contract.
const contracts=new Map([
 ['3f73dcb8d236057eb6724d4c45475d5b3215ba53',{job:'deploy'}],
 ['f7f131d5a3bd64a4052ffbc78b90538ba391f51a',{job:'Deploy production snapshot',legacy:true}],
]);
const legacySteps=new Map([
 ['Run node scripts/pages/writer.mjs begin','success'],
 ['Run node scripts/pages/writer.mjs prepare','skipped'],
 ['Run node scripts/pages/writer.mjs check','skipped'],
 ['Run node scripts/pages/writer.mjs finish','skipped'],
 ['Run actions/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9','skipped'],
 ['Deploy explicitly approved main','success'],
]);
function provenLegacy(job) {
 if(!Array.isArray(job.steps)) return false;
 for(const [name,conclusion] of legacySteps) {
  const steps=job.steps.filter(step=>step?.name===name);
  if(steps.length!==1 || steps[0].status!=='completed' || steps[0].conclusion!==conclusion) return false;
 }
 return true;
}
export async function sourceArtifact(api,{run,attempt,artifact}) {
 if (![run,attempt,artifact].every(positive) || attempt!==1) throw Error('Invalid bootstrap source identity');
 const source=await api.request(`actions/runs/${run}`);
 if (!source || source.id!==run || source.run_attempt!==attempt || source.head_branch!=='main' || source.repository?.full_name!==REPOSITORY || source.head_repository?.full_name!==REPOSITORY || !/^[a-f0-9]{40}$/.test(source.head_sha??'') || source.path!=='.github/workflows/documentation.yml' || source.event!=='workflow_dispatch' || source.status!=='completed' || source.conclusion!=='success') throw Error('Untrusted production run');
 const workflow=await api.request(`contents/.github/workflows/documentation.yml?ref=${source.head_sha}`);
 const contract=contracts.get(workflow?.sha);
 if (!contract) throw Error('Unverified production workflow');
 const jobs=await api.pages(`actions/runs/${run}/attempts/${attempt}/jobs`,'jobs');
 const deploy=jobs.filter(job=>job.name===contract.job);
 if(deploy.length!==1 || deploy[0].status!=='completed' || deploy[0].conclusion!=='success' || (contract.legacy && !provenLegacy(deploy[0]))) throw Error('Unverified production deployment');
 const artifacts=await api.pages(`actions/runs/${run}/artifacts`,'artifacts');
 const matches=artifacts.filter(a=>a.name==='github-pages' && !a.expired && a.workflow_run?.id===run);
 if(matches.length!==1 || matches[0].id!==artifact || !positive(matches[0].size_in_bytes) || matches[0].size_in_bytes>33554432) throw Error('Invalid production artifact');
 const bytes=await api.zip(artifact);
 if(!Buffer.isBuffer(bytes) || !bytes.length || bytes.length>33554432) throw Error('Invalid production archive');
 return bytes;
}
