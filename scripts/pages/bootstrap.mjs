import {REPOSITORY} from './policy.mjs';
const positive=n=>Number.isSafeInteger(n)&&n>0;
export async function sourceArtifact(api,{run,attempt,artifact}) {
 if (![run,attempt,artifact].every(positive) || attempt!==1) throw Error('Invalid bootstrap source identity');
 const source=await api.request(`actions/runs/${run}`);
 if (!source || source.id!==run || source.run_attempt!==attempt || source.head_branch!=='main' || source.repository?.full_name!==REPOSITORY || source.head_repository?.full_name!==REPOSITORY || !/^[a-f0-9]{40}$/.test(source.head_sha??'') || source.path!=='.github/workflows/documentation.yml' || source.event!=='workflow_dispatch' || source.status!=='completed' || source.conclusion!=='success') throw Error('Untrusted production run');
 const workflow=await api.request(`contents/.github/workflows/documentation.yml?ref=${source.head_sha}`);
 if (workflow?.sha!=='3f73dcb8d236057eb6724d4c45475d5b3215ba53') throw Error('Unverified original production workflow');
 const jobs=await api.pages(`actions/runs/${run}/attempts/${attempt}/jobs`,'jobs');
 const deploy=jobs.filter(job=>job.name==='deploy');
 if(deploy.length!==1 || deploy[0].status!=='completed' || deploy[0].conclusion!=='success') throw Error('Unverified production deployment');
 const artifacts=await api.pages(`actions/runs/${run}/artifacts`,'artifacts');
 const matches=artifacts.filter(a=>a.name==='github-pages' && !a.expired && a.workflow_run?.id===run);
 if(matches.length!==1 || matches[0].id!==artifact || !positive(matches[0].size_in_bytes) || matches[0].size_in_bytes>33554432) throw Error('Invalid production artifact');
 const bytes=await api.zip(artifact);
 if(!Buffer.isBuffer(bytes) || !bytes.length || bytes.length>33554432) throw Error('Invalid production archive');
 return bytes;
}
