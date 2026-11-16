// Notification pattern adapted from Cubistry at efafcc1d97687eccea0cde87a230f447ce1b6c66.
// SPDX-License-Identifier: AGPL-3.0-or-later
import {eligible,latestCurrentBuild} from './policy.mjs';
const marker='<!-- puzlwerk-pr-preview -->';
export async function notifyOne(api,metadata,fresh) {
  const {number,sha,run,attempt}=metadata??{};
  if (!Number.isSafeInteger(number)||number<1 || !/^[a-f0-9]{40}$/.test(sha??'') || !Number.isSafeInteger(run)||run<1 || !Number.isSafeInteger(attempt)||attempt<1) throw Error('Invalid preview metadata');
  async function current(){
    const pr=await api.request(`pulls/${number}`);
    if (!eligible(pr)||pr.number!==number||pr.head.sha!==sha) return false;
    const runs=await api.pages(`actions/workflows/acceptance-preview.yml/runs?event=pull_request&head_sha=${sha}`,'workflow_runs');
    const latest=latestCurrentBuild(pr,runs,true);
    return Boolean(latest && latest.id===run && latest.run_attempt===attempt);
  }
  if (!await current()) return;
  const comments=await api.pages(`issues/${number}/comments`);
  const matches=comments.filter(c=>c.user?.login==='github-actions[bot]' && c.body?.includes(marker));
  if (matches.length>1) throw Error('Ambiguous preview comments');
  const body=`${marker}\n### PuzlWerk PR preview\n[Open non-production acceptance preview](https://wstein.github.io/puzlwerk/pr-preview/pr-${number}/) · ${sha} · build ${run} attempt ${attempt}.`;
  if (matches[0]?.body===body) return;
  if (!await fresh() || !await current()) return;
  await api.request(matches.length?`issues/comments/${matches[0].id}`:`issues/${number}/comments`,{method:matches.length?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});
}

export async function clearStale(api,number) {
 if(!Number.isSafeInteger(number)||number<1) throw Error('Invalid PR number');
 const comments=await api.pages(`issues/${number}/comments`);
 const matches=comments.filter(c=>c.user?.login==='github-actions[bot]' && c.body?.includes(marker));
 if(matches.length>1) throw Error('Ambiguous preview comments');
 if(!matches.length) return;
 const match=/ · ([a-f0-9]{40}) · build ([1-9][0-9]*) attempt ([1-9][0-9]*)\./.exec(matches[0].body);
 if(!match) return;
 async function isCurrent() {
  const pr=await api.request(`pulls/${number}`);
  if(!eligible(pr)||pr.number!==number||pr.head.sha!==match[1]) return false;
  const runs=await api.pages(`actions/workflows/acceptance-preview.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs');
  const latest=latestCurrentBuild(pr,runs,true);
  return Boolean(latest && latest.id===Number(match[2]) && latest.run_attempt===Number(match[3]));
 }
 if(await isCurrent()) return;
 const latestComments=await api.pages(`issues/${number}/comments`);
 const unchanged=latestComments.filter(c=>c.user?.login==='github-actions[bot]' && c.body?.includes(marker));
 if(unchanged.length!==1 || unchanged[0].id!==matches[0].id || unchanged[0].body!==matches[0].body || await isCurrent()) return;
 const body=`${marker}\n### PuzlWerk PR preview\nPreview is pending or no longer current.`;
 await api.request(`issues/comments/${matches[0].id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})});
}

async function cli() {
 const {mkdtemp,readdir,readFile,rm}=await import('node:fs/promises'); const {join}=await import('node:path'); const {tmpdir}=await import('node:os');
 const {GitHub}=await import('./api.mjs'); const {readVerifiedSnapshot,verifyLiveReceipt,readWriterLedger}=await import('./publication.mjs');
 const api=new GitHub();
 if(process.env.NOTIFY_MODE==='clear') {await clearStale(api,Number(process.env.PR_NUMBER)); return;}
 const bootstrap={run:Number(process.env.PAGES_BOOTSTRAP_RUN),attempt:Number(process.env.PAGES_BOOTSTRAP_ATTEMPT),nonce:process.env.PAGES_BOOTSTRAP_NONCE};
 const tmp=await mkdtemp(join(tmpdir(),'puzlwerk-notify-'));
 try {
  const snapshot=join(tmp,'snapshot'); const receipt=await readVerifiedSnapshot(api,{destination:snapshot,bootstrap});
  if (!receipt || receipt.run!==Number(process.env.PUBLISH_RUN) || receipt.attempt!==Number(process.env.PUBLISH_ATTEMPT) || receipt.sha!==process.env.PUBLISH_SHA) throw Error('Publisher receipt is not current');
  const entries=await readdir(join(snapshot,'pr-preview'),{withFileTypes:true}).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
  if(entries.length>400) throw Error('Preview inventory exceeds budget');
  const fresh=async()=>{await verifyLiveReceipt(receipt);await readWriterLedger(api,receipt,{bootstrap});return true;};
  for(const entry of entries){
   if(!entry.isDirectory() || !/^pr-[1-9][0-9]*$/.test(entry.name)) throw Error('Invalid preview inventory');
   const path=join(snapshot,'pr-preview',entry.name,'preview-info.json'); const bytes=await readFile(path);
   if(bytes.length>32768) throw Error('Preview metadata exceeds budget');
   const metadata=JSON.parse(bytes); if(metadata.number!==Number(entry.name.slice(3))) throw Error('Preview metadata mismatch');
   await notifyOne(api,metadata,fresh);
  }
 } finally {await rm(tmp,{recursive:true,force:true});}
}
if(process.argv[1] && new URL(import.meta.url).pathname===process.argv[1]) await cli();
