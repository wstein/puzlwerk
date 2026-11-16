// Adapted from Cubistry scripts/pages/publication.mjs at efafcc1d97687eccea0cde87a230f447ce1b6c66.
// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { REPOSITORY } from './policy.mjs';
export const PUBLICATION_PATH = '.puzlwerk-publication.json';
export const PUBLICATION_URL = `https://wstein.github.io/puzlwerk/${PUBLICATION_PATH}`;
const positive = n => Number.isSafeInteger(n) && n > 0;
const hex = (v,n) => typeof v === 'string' && new RegExp(`^[a-f0-9]{${n}}$`).test(v);
export function parsePublication(text) {
 if (Buffer.byteLength(text)>32768) throw Error('Receipt exceeds budget');
 const r=JSON.parse(text);
 if (!r || Array.isArray(r) || Object.keys(r).sort().join(',')!=='attempt,nonce,previous,root,run,schema,sha,snapshot' || r.schema!==1 || !positive(r.run) || !positive(r.attempt) || !hex(r.sha,40) || !hex(r.nonce,32) || !(r.previous===null || hex(r.previous,32)) || !hex(r.root,64) || !hex(r.snapshot,64)) throw Error('Invalid publication receipt');
 return r;
}
export function samePublication(a,b) { return Boolean(a && b && ['schema','sha','run','attempt','nonce','previous','root','snapshot'].every(k=>a[k]===b[k])); }
export async function readPublication({fetch:request=fetch}={}) {
 const response=await request(`${PUBLICATION_URL}?receipt=${randomUUID()}`,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(response.status===404) return null;
 if(!response.ok || response.redirected) { const error=Error('Public receipt request failed'); error.status=response.status; throw error; }
 const reader=response.body.getReader(), parts=[]; let size=0;
 for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>32768){await reader.cancel();throw Error('Receipt exceeds budget');} parts.push(value); }
 return parsePublication(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts)));
}
export async function verifyLiveReceipt(receipt,options={}) {
 parsePublication(JSON.stringify(receipt));
 const live=await readPublication(options);
 if(!samePublication(live,receipt)) throw Error('Live publication receipt mismatch');
 return live;
}
export async function waitForLiveReceipt(receipt,{previous=null,fetch:request=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),attempts=12}={}) {
 parsePublication(JSON.stringify(receipt));
 if(previous!==null) parsePublication(JSON.stringify(previous));
 if(!Number.isSafeInteger(attempts) || attempts<1 || attempts>30) throw Error('Invalid receipt wait budget');
 for(let i=0;i<attempts;i++) {
  let live;
  try { live=await readPublication({fetch:request}); }
  catch(error) { if(!Number.isInteger(error.status) || error.status<500 || error.status>599) throw error; live=null; }
  if(samePublication(live,receipt)) return live;
  if(live!==null && !samePublication(live,previous)) throw Error('Live publication receipt mismatch');
  if(i+1<attempts) await sleep(2000);
 }
 throw Error('Live receipt wait exhausted');
}
export function trustedPublisher(run,receipt,{context}={}) {
 const own=context && context.run===receipt.run && context.attempt===receipt.attempt && context.sha===receipt.sha && run?.status==='in_progress';
 const workflow=run?.path;
 const event=workflow==='.github/workflows/documentation.yml' ? run?.event==='workflow_dispatch' : workflow==='.github/workflows/pages-publish.yml' && ['workflow_dispatch','workflow_run'].includes(run?.event);
 return Boolean(run && run.id===receipt.run && run.run_attempt===receipt.attempt && run.head_sha===receipt.sha && run.head_branch==='main' && run.repository?.full_name===REPOSITORY && run.head_repository?.full_name===REPOSITORY && event && ((run.status==='completed' && run.conclusion==='success') || own));
}

// Failure is recoverable only under this audited publisher workflow contract.
export function classifyFailedWriter(run,job,workflowBlob,attempt) {
 if(!run || run.path!=='.github/workflows/pages-publish.yml' || !['workflow_dispatch','workflow_run'].includes(run.event) || run.head_branch!=='main' || run.repository?.full_name!==REPOSITORY || run.head_repository?.full_name!==REPOSITORY || !hex(run.head_sha,40) || run.status!=='completed' || !['failure','cancelled'].includes(run.conclusion) || run.run_attempt!==attempt || workflowBlob!=='757cc0f56c8edb67cf62306da379c018b5902c65' || job?.name!=='Publish preview snapshot' || job.status!=='completed' || !['failure','cancelled'].includes(job.conclusion) || !Array.isArray(job.steps)) return null;
 const step=name=>{const matches=job.steps.filter(x=>x?.name===name);return matches.length===1 && matches[0].status==='completed'?matches[0].conclusion:null;};
 const deploy=step('Deploy combined snapshot');
 if(deploy==='skipped') return 'not-deployed';
 if(deploy==='success' && step('Run node scripts/pages/writer.mjs finish')==='failure') return 'recover';
 return null;
}

export async function recoverFailedWriter(api,run,job,start,attempt,{snapshotReader=readRecoverySnapshot}={}) {
 const blob=await api.request(`contents/${run.path}?ref=${run.head_sha}`);
 const classification=classifyFailedWriter(run,job,blob?.sha,attempt);
 if(!classification) throw Error('Unverifiable failed writer');
 if(!start || Object.keys(start).sort().join(',')!=='attempt,previous,run,schema,sha' || start.schema!==1 || start.run!==run.id || start.attempt!==attempt || start.sha!==run.head_sha || !(start.previous===null || hex(start.previous,32))) throw Error('Invalid failed writer start');
 if(classification==='not-deployed') return null;
 const receipt=parsePublication(JSON.stringify(await snapshotReader(api,run,attempt)));
 if(receipt.run!==start.run || receipt.attempt!==start.attempt || receipt.sha!==start.sha || receipt.previous!==start.previous) throw Error('Recovered receipt does not match writer start');
 return {start,commit:{...start,receipt},recovered:true};
}

export function verifyWriterLedger(records,receipt,{bootstrap,context}={}) {
 parsePublication(JSON.stringify(receipt));
 if (!Array.isArray(records) || !records.length || records.length>5000 || !bootstrap || !positive(bootstrap.run) || !positive(bootstrap.attempt) || !hex(bootstrap.nonce,32)) throw Error('Invalid ledger bootstrap');
 const identities=new Set(), nonces=new Set(), recoveredNonces=new Set(), children=new Map(); let anchor=null;
 for (const record of records) {
  const {start,commit}=record || {};
  if (!start || Object.keys(start).sort().join(',')!=='attempt,previous,run,schema,sha' || start.schema!==1 || !positive(start.run) || !positive(start.attempt) || !hex(start.sha,40) || !(start.previous===null || hex(start.previous,32))) throw Error('Invalid writer start');
  const key=`${start.run}:${start.attempt}`;
  if(identities.has(key)) throw Error('Duplicate writer');
  identities.add(key);
  if(!commit) {
   if(context && context.run===start.run && context.attempt===start.attempt && context.sha===start.sha && start.previous===receipt.nonce) continue;
   throw Error('Unresolved writer');
  }
  if(Object.keys(commit).sort().join(',')!=='attempt,previous,receipt,run,schema,sha' || commit.schema!==1 || commit.run!==start.run || commit.attempt!==start.attempt || commit.sha!==start.sha || commit.previous!==start.previous) throw Error('Invalid writer commit');
  const r=parsePublication(JSON.stringify(commit.receipt));
  if(r.run!==start.run || r.attempt!==start.attempt || r.sha!==start.sha || r.previous!==start.previous || nonces.has(r.nonce) || children.has(r.previous)) throw Error('Invalid or forked ledger');
  nonces.add(r.nonce); if(record.recovered===true) recoveredNonces.add(r.nonce); children.set(r.previous,r);
  if(r.run===bootstrap.run && r.attempt===bootstrap.attempt && r.nonce===bootstrap.nonce) anchor=r;
 }
 if(!anchor || anchor.previous!==null) throw Error('Missing ledger bootstrap');
 let tip=anchor, count=1;
 while(children.has(tip.nonce)) { const next=children.get(tip.nonce); if(recoveredNonces.has(next.nonce) && next.root!==tip.root) throw Error('Recovered preview changed production root'); tip=next; if(++count>nonces.size) throw Error('Ledger cycle'); }
 if(count!==nonces.size || !samePublication(tip,receipt)) throw Error('Stale or disconnected ledger');
 return true;
}


// The bootstrap is established after draining the writer queue. GitHub and the
// maintainer retain all runs and artifacts throughout the ledger window; deleted
// terminal history cannot be distinguished from an older valid ledger.
export async function readWriterLedger(api,receipt,{bootstrap,context}={}) {
 if(!bootstrap || !positive(bootstrap.run) || !positive(bootstrap.attempt) || !hex(bootstrap.nonce,32)) throw Error('Missing ledger bootstrap');
 const anchor=await api.request(`actions/runs/${bootstrap.run}`);
 const validTime=x=>typeof x==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x) && Number.isFinite(Date.parse(x));
 if(!anchor || anchor.id!==bootstrap.run || !validTime(anchor.created_at)) throw Error('Invalid bootstrap run');
 const workflows=[['documentation.yml','Deploy production snapshot'],['pages-publish.yml','Publish preview snapshot']];
 const records=[], seen=new Set();
 for(const [workflow,jobName] of workflows) {
  const runs=await api.pages(`actions/workflows/${workflow}/runs`,'workflow_runs');
  if(!Array.isArray(runs) || runs.length>5000) throw Error('Incomplete writer runs');
  for(const listed of runs) {
   const run=listed;
   if(!run || !positive(run.id) || !positive(run.run_attempt) || run.run_attempt>100 || !validTime(run.created_at) || seen.has(run.id)) throw Error('Invalid writer run list');
   seen.add(run.id);
   if(run.created_at<anchor.created_at || run.head_branch!=='main') continue;
   if(run.path!==`.github/workflows/${workflow}` || run.head_branch!=='main' || run.repository?.full_name!==REPOSITORY || run.head_repository?.full_name!==REPOSITORY || !hex(run.head_sha,40) || !(workflow==='documentation.yml' ? run.event==='workflow_dispatch' : ['workflow_dispatch','workflow_run','pull_request_target'].includes(run.event))) {
    // Other documentation triggers cannot execute its deploy job; still require its job evidence.
    if(!(workflow==='documentation.yml' && ['push','pull_request'].includes(run.event) && run.path===`.github/workflows/${workflow}` && run.repository?.full_name===REPOSITORY)) throw Error('Untrusted writer run');
   }
   const artifacts=await api.pages(`actions/runs/${run.id}/artifacts`,'artifacts');
   for(let attempt=1;attempt<=listed.run_attempt;attempt++) {
    const run=await api.request(`actions/runs/${listed.id}/attempts/${attempt}`);
    if(!run || run.id!==listed.id || run.run_attempt!==attempt || run.path!==listed.path || run.event!==listed.event || run.head_branch!==listed.head_branch || run.head_sha!==listed.head_sha || run.repository?.full_name!==REPOSITORY || run.head_repository?.full_name!==listed.head_repository?.full_name) throw Error('Invalid writer attempt identity');
    const jobs=await api.pages(`actions/runs/${run.id}/attempts/${attempt}/jobs`,'jobs');
    const selected=jobs.filter(j=>j.name===jobName);
    if(selected.length!==1) throw Error('Missing or ambiguous writer job');
    if(selected[0].status==='completed' && selected[0].conclusion==='skipped') continue;
    if(run.head_repository?.full_name!==REPOSITORY) throw Error('Untrusted writer repository');
    if(run.event==='pull_request_target') throw Error('Signal run activated publisher job');
    const load=async kind=>{
     const matches=artifacts.filter(a=>a.name===`pages-writer-${kind}-${attempt}`);
     if(matches.length!==1 || matches[0].expired || matches[0].workflow_run?.id!==run.id || !positive(matches[0].id) || !positive(matches[0].size_in_bytes) || matches[0].size_in_bytes>65536) throw Error('Missing or invalid writer artifact');
     const bytes=await api.zip(matches[0].id);
     if(!Buffer.isBuffer(bytes) || !bytes.length || bytes.length>65536) throw Error('Invalid writer archive');
     return readLedgerArchive(bytes);
    };
    const own=context && context.run===run.id && context.attempt===attempt && context.sha===run.head_sha;
    if(!own && run.status==='completed' && ['failure','cancelled'].includes(run.conclusion)) {
     const blob=await api.request(`contents/${run.path}?ref=${run.head_sha}`);
     const classification=classifyFailedWriter(run,selected[0],blob?.sha,attempt);
     if(!classification) throw Error('Unverifiable failed writer');
     if(artifacts.some(a=>a.name===`pages-writer-commit-${attempt}`)) throw Error('Unexpected failed writer commit');
     if(classification==='not-deployed') continue;
     const start=await load('start');
     records.push(await recoverFailedWriter(api,run,selected[0],start,attempt));
     continue;
    }
    const start=await load('start');
    let commit=null;
    if(!own || artifacts.some(a=>a.name===`pages-writer-commit-${attempt}`)) commit=await load('commit');
    if(start.run!==run.id || start.attempt!==attempt || start.sha!==run.head_sha || (commit && (run.status!=='completed' || run.conclusion!=='success'))) throw Error('Untrusted writer identity');
    records.push({start,commit});
   }
  }
 }
 return verifyWriterLedger(records,receipt,{bootstrap,context});
}
async function readLedgerArchive(bytes) {
 const temp=await mkdtemp(join(tmpdir(),'puzlwerk-ledger-'));
 try {
  const path=join(temp,'ledger.zip'); await writeFile(path,bytes);
  const script="import sys,zipfile,stat\nz=zipfile.ZipFile(sys.argv[1]); a=z.infolist()\nif len(a)!=1 or a[0].filename!='ledger.json' or a[0].file_size>32768 or stat.S_IFMT(a[0].external_attr>>16) not in (0,stat.S_IFREG): raise ValueError('Invalid ledger archive')\nsys.stdout.buffer.write(z.read(a[0]))";
  const {stdout}=await promisify(execFile)('python3',['-c',script,path],{timeout:10000,maxBuffer:32768,encoding:'utf8'});
  return JSON.parse(stdout);
 } finally {await rm(temp,{recursive:true,force:true});}
}

// Fixed verifier code: archive content is data, never imported or executed.
const verifier=String.raw`
import json, os, stat, sys, zipfile
from pathlib import Path, PurePosixPath
sys.path.insert(0, sys.argv[4])
from baseline import digest
archive, root, expected = sys.argv[1:4]
root=Path(root)
if not root.is_dir() or any(root.iterdir()): raise ValueError('Destination must be empty')
records=[]; seen=set(); total=0
with zipfile.ZipFile(archive) as z:
 if len(z.infolist())>10000: raise ValueError('Too many entries')
 for i in z.infolist():
  name=i.filename.rstrip('/'); p=PurePosixPath(name); mode=i.external_attr>>16
  if not name or name.startswith('/') or '\\' in name or ':' in name or '%' in name or str(p)!=name or any(x in ('.','..') or (x.startswith('.') and not (len(p.parts)==1 and x in ('.puzlwerk-publication.json','.nojekyll'))) for x in p.parts) or name in seen or stat.S_ISLNK(mode) or stat.S_IFMT(mode) not in (0,stat.S_IFREG,stat.S_IFDIR): raise ValueError('Unsafe snapshot entry')
  seen.add(name); total+=i.file_size
  if total>512*1024*1024 or i.file_size>64*1024*1024: raise ValueError('Snapshot exceeds budget')
  records.append(i)
 for i in records:
  path=root/i.filename
  if i.is_dir(): path.mkdir(parents=True,exist_ok=True); continue
  path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(z.read(i))
 receipt_file=root/'.puzlwerk-publication.json'
 if receipt_file.stat().st_size>32768: raise ValueError('Snapshot receipt exceeds budget')
 receipt=json.loads(receipt_file.read_text(encoding='utf-8'))
 expected_value=json.loads(expected)
 if (expected_value is not None and receipt!=expected_value) or digest(root)!=receipt['root'] or digest(root,include_previews=True)!=receipt['snapshot']: raise ValueError('Snapshot receipt or digest mismatch')
 print(json.dumps(receipt,separators=(',',':')))
`;
async function extractSnapshotArtifact(api,run,attempt,destination,expected=null) {
 const artifacts=await api.pages(`actions/runs/${run.id}/artifacts`,'artifacts');
 const matches=artifacts.filter(a=>a.name===`pages-published-snapshot-${attempt}` && !a.expired && a.workflow_run?.id===run.id);
 if(matches.length!==1 || !positive(matches[0].id) || !positive(matches[0].size_in_bytes) || matches[0].size_in_bytes>33554432) throw Error('Invalid publication artifact');
 const bytes=await api.zip(matches[0].id);
 if(!Buffer.isBuffer(bytes) || bytes.length===0 || bytes.length>33554432) throw Error('Invalid snapshot archive');
 const temp=await mkdtemp(join(tmpdir(),'puzlwerk-snapshot-')); let created=false;
 try {
  await mkdir(destination); created=true;
  const zip=join(temp,'snapshot.zip'); await writeFile(zip,bytes);
  const {stdout}=await promisify(execFile)('python3',['-c',verifier,zip,destination,JSON.stringify(expected),dirname(fileURLToPath(import.meta.url))],{timeout:30000,maxBuffer:65536});
  return parsePublication(stdout);
 } catch(error) { if(created) await rm(destination,{recursive:true,force:true}); throw error; }
 finally { await rm(temp,{recursive:true,force:true}); }
}
async function readRecoverySnapshot(api,run,attempt) {
 const temp=await mkdtemp(join(tmpdir(),'puzlwerk-recovered-'));
 try { return await extractSnapshotArtifact(api,run,attempt,join(temp,'snapshot')); }
 finally { await rm(temp,{recursive:true,force:true}); }
}
export async function readVerifiedSnapshot(api,{destination,fetch:request=fetch,context,bootstrap}={}) {
 if(typeof destination!=='string' || !destination) throw Error('Missing snapshot destination');
 const receipt=await readPublication({fetch:request});
 if(!receipt) return null;
 const run=await api.request(`actions/runs/${receipt.run}/attempts/${receipt.attempt}`);
 const failedCandidate=Boolean(run && run.id===receipt.run && run.run_attempt===receipt.attempt && run.head_sha===receipt.sha && run.head_branch==='main' && run.repository?.full_name===REPOSITORY && run.head_repository?.full_name===REPOSITORY && run.path==='.github/workflows/pages-publish.yml' && ['workflow_dispatch','workflow_run'].includes(run.event) && run.status==='completed' && run.conclusion==='failure');
 if(!trustedPublisher(run,receipt,{context}) && !failedCandidate) throw Error('Untrusted publication run');
 await readWriterLedger(api,receipt,{bootstrap,context});
 const recovered=await extractSnapshotArtifact(api,run,receipt.attempt,destination,receipt);
 if(!samePublication(recovered,receipt)) throw Error('Snapshot receipt mismatch');
 try {
  await verifyLiveReceipt(receipt,{fetch:request});
  await readWriterLedger(api,receipt,{bootstrap,context});
  return receipt;
 } catch(error) { await rm(destination,{recursive:true,force:true}); throw error; }
}
