import {mkdtemp,readFile,rm,writeFile,rename,lstat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {latestCurrentBuild} from './policy.mjs';
import {verifyRecord} from './record.mjs';
const extractor=fileURLToPath(new URL('./extract.py',import.meta.url));
const manifestPath='specs/009-viewer-consolidation/acceptance-routes.json';
async function current(api,number,id,attempt) {
  const pr=await api.request(`pulls/${number}`);
  if (!pr?.head?.sha) throw Error('PR is not current');
  const runs=await api.pages(`actions/workflows/acceptance-preview.yml/runs?event=pull_request&head_sha=${pr.head.sha}`,'workflow_runs');
  const run=latestCurrentBuild(pr,runs,true);
  if (!run || run.id!==id || run.run_attempt!==attempt) throw Error('Build is not current');
  return pr;
}
export async function stage(api,number,id,attempt,destination) {
  if (![number,id,attempt].every(x=>Number.isSafeInteger(x)&&x>0)) throw Error('Invalid staging identity');
  const pr=await current(api,number,id,attempt);
  const source=await api.request(`contents/${manifestPath}?ref=${pr.head.sha}`);
  if (source?.encoding!=='base64' || typeof source.content!=='string' || !Number.isSafeInteger(source.size) || source.size<1 || source.size>4*1024*1024) throw Error('Missing manifest source');
  const manifest=Buffer.from(source.content,'base64');
  if (manifest.length!==source.size) throw Error('Incomplete manifest source');
  const artifact=await api.artifact(id,attempt);
  if (!Number.isSafeInteger(artifact.size_in_bytes) || artifact.size_in_bytes<1 || artifact.size_in_bytes>33554432) throw Error('Invalid artifact size');
  try { await lstat(destination); throw Error('Staging destination exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temp=await mkdtemp(join(dirname(destination),'.puzlwerk-preview-'));
  const extracted=join(temp,'site');
  try {
    const zip=join(temp,'artifact.zip'); await writeFile(zip,await api.zip(artifact.id));
    execFileSync('python3',[extractor,zip,extracted,String(number),pr.head.sha,String(pr.title??'').replace(/[\u0000-\u001f\u007f-\u009f]/g,' ')],{stdio:'pipe'});
    const info=await readFile(join(extracted,'build-record.json'));
    if (info.length>1024*1024 || !verifyRecord(JSON.parse(info),{sha:pr.head.sha,number,manifest})) throw Error('Invalid preview source record');
    const record=JSON.parse(info);
    for (const route of record.routes) { const entry=await lstat(join(extracted,route,'index.html')); if (!entry.isFile() || entry.isSymbolicLink()) throw Error('Missing preview route'); }
    const again=await current(api,number,id,attempt);
    if (again.head.sha!==pr.head.sha) throw Error('Build is not current');
    await writeFile(join(extracted,'preview-info.json'),JSON.stringify({number,sha:pr.head.sha,run:id,attempt}));
    await rename(extracted,destination);
    return {number,sha:pr.head.sha,run:id,attempt};
  } finally { await rm(temp,{recursive:true,force:true}); }
}
