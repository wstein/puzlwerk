import {eligible,latestCurrentBuild,REPOSITORY} from './policy.mjs';
// A failed or unreadable build retains the previous namespace, never a silent removal.
export function decide(pr,runs,complete) {
  if (!pr || !Number.isSafeInteger(pr.number) || pr.number<1 || pr.base?.repo?.full_name!==REPOSITORY || !['open','closed'].includes(pr.state)) return null;
  if (pr.state==='closed') return {action:'remove',number:pr.number};
  if (!Array.isArray(pr.labels)) return {action:'retain',number:pr.number};
  if (!pr.labels.some(label=>label?.name==='preview')) return {action:'remove',number:pr.number};
  if (!eligible(pr)) return {action:'retain',number:pr.number};
  const run=latestCurrentBuild(pr,runs,complete);
  return run ? {action:'update',number:pr.number,run:run.id,attempt:run.run_attempt,sha:pr.head.sha} : {action:'retain',number:pr.number};
}

// Operate only on an isolated verified snapshot; returned check runs just before publish.
export async function reconcile(api,root,{stage}) {
  const {readdir,mkdir,mkdtemp,rm,rename} = await import('node:fs/promises');
  const {join} = await import('node:path');
  const directory=join(root,'pr-preview'); await mkdir(directory,{recursive:true});
  const entries=await readdir(directory,{withFileTypes:true});
  const numbers=new Set();
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^pr-[1-9][0-9]*$/.test(entry.name)) throw Error('Invalid preview inventory');
    const n=Number(entry.name.slice(3)); if (!Number.isSafeInteger(n)) throw Error('Invalid preview number'); numbers.add(n);
  }
  const open=await api.pages('pulls?state=open');
  for (const pr of open) if (eligible(pr)) numbers.add(pr.number);
  if (numbers.size>400) throw Error('Preview inventory exceeds budget');
  const changed=[], errors=[];
  async function state(number) {
    const pr=await api.request(`pulls/${number}`);
    if (!pr || pr.number!==number) throw Error('Missing current PR');
    const runs=eligible(pr)?await api.pages(`actions/workflows/acceptance-preview.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs'):[];
    const decision=decide(pr,runs,true); if (!decision) throw Error('Invalid current PR'); return decision;
  }
  for (const number of [...numbers].sort((a,b)=>a-b)) {
    let mutationStarted=false;
    try {
      const decision=await state(number), target=join(directory,`pr-${number}`);
      if (decision.action==='update') {
        const temp=await mkdtemp(join(root,'.puzl-stage-'));
        try {
          const next=join(temp,'next'); await stage(api,number,decision.run,decision.attempt,next);
          if (JSON.stringify(await state(number))!==JSON.stringify(decision)) throw Error('PR changed during staging');
          mutationStarted=true; await rm(target,{recursive:true,force:true}); await rename(next,target); changed.push(decision);
        } finally { await rm(temp,{recursive:true,force:true}); }
      } else if (decision.action==='remove') {
        if (JSON.stringify(await state(number))!==JSON.stringify(decision)) throw Error('PR changed before removal');
        mutationStarted=true; await rm(target,{recursive:true,force:true}); changed.push(decision);
      }
    } catch(error) { if (mutationStarted) throw error; errors.push({number,message:String(error.message).slice(0,300)}); }
  }
  const check=async()=>{for (const decision of changed) if (JSON.stringify(await state(decision.number))!==JSON.stringify(decision)) throw Error('PR changed before publication');};
  check.errors=errors; check.changed=changed; return check;
}
