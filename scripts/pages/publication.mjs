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
 if (!r || Array.isArray(r) || Object.keys(r).sort().join(',')!=='attempt,nonce,root,run,schema,sha,snapshot' || r.schema!==1 || !positive(r.run) || !positive(r.attempt) || !hex(r.sha,40) || !hex(r.nonce,32) || !hex(r.root,64) || !hex(r.snapshot,64)) throw Error('Invalid publication receipt');
 return r;
}
export function samePublication(a,b) { return Boolean(a && b && ['schema','sha','run','attempt','nonce','root','snapshot'].every(k=>a[k]===b[k])); }
export async function readPublication({fetch:request=fetch}={}) {
 const response=await request(`${PUBLICATION_URL}?receipt=${randomUUID()}`,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(response.status===404) return null;
 if(!response.ok || response.redirected) throw Error('Public receipt request failed');
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
export function trustedPublisher(run,receipt,{context}={}) {
 const own=context && context.run===receipt.run && context.attempt===receipt.attempt && context.sha===receipt.sha && run?.status==='in_progress';
 const workflow=run?.path;
 const event=workflow==='.github/workflows/documentation.yml' ? run?.event==='workflow_dispatch' : workflow==='.github/workflows/pages-publish.yml' && ['workflow_dispatch','workflow_run'].includes(run?.event);
 return Boolean(run && run.id===receipt.run && run.run_attempt===receipt.attempt && run.head_sha===receipt.sha && run.head_branch==='main' && run.repository?.full_name===REPOSITORY && run.head_repository?.full_name===REPOSITORY && event && ((run.status==='completed' && run.conclusion==='success') || own));
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
 receipt=json.loads((root/'.puzlwerk-publication.json').read_text(encoding='utf-8'))
 if receipt!=json.loads(expected) or digest(root)!=receipt['root'] or digest(root,include_previews=True)!=receipt['snapshot']: raise ValueError('Snapshot receipt or digest mismatch')
`;
// verifyCurrentDeployment must independently prove this exact receipt is the latest
// deployed writer, including its run, attempt and nonce. Missing or ambiguous proof
// is failure; checking the public receipt or source SHA alone is insufficient.
export async function readVerifiedSnapshot(api,{destination,fetch:request=fetch,context,verifyCurrentDeployment}={}) {
 if(typeof destination!=='string' || !destination) throw Error('Missing snapshot destination');
 const receipt=await readPublication({fetch:request});
 if(!receipt) return null;
 const run=await api.request(`actions/runs/${receipt.run}`);
 if(!trustedPublisher(run,receipt,{context})) throw Error('Untrusted publication run');
 if(typeof verifyCurrentDeployment!=='function' || await verifyCurrentDeployment(receipt,run)!==true) throw Error('Current deployment proof unavailable');
 const artifacts=await api.pages(`actions/runs/${receipt.run}/artifacts`,'artifacts');
 const matches=artifacts.filter(a=>a.name===`pages-published-snapshot-${receipt.attempt}` && !a.expired && a.workflow_run?.id===receipt.run);
 if(matches.length!==1 || !positive(matches[0].id) || !positive(matches[0].size_in_bytes) || matches[0].size_in_bytes>33554432) throw Error('Invalid publication artifact');
 const bytes=await api.zip(matches[0].id);
 if(!Buffer.isBuffer(bytes) || bytes.length===0 || bytes.length>33554432) throw Error('Invalid snapshot archive');
 const temp=await mkdtemp(join(tmpdir(),'puzlwerk-snapshot-'));
 let created=false;
 try {
  await mkdir(destination); created=true;
  const zip=join(temp,'snapshot.zip'); await writeFile(zip,bytes);
  await promisify(execFile)('python3',['-c',verifier,zip,destination,JSON.stringify(receipt),dirname(fileURLToPath(import.meta.url))],{timeout:30000,maxBuffer:65536});
  await verifyLiveReceipt(receipt,{fetch:request});
  if(await verifyCurrentDeployment(receipt,run)!==true) throw Error('Current deployment proof changed');
  return receipt;
 } catch(error) { if(created) await rm(destination,{recursive:true,force:true}); throw error; }
 finally { await rm(temp,{recursive:true,force:true}); }
}
