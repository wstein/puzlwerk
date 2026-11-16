import {readPublication,waitForLiveReceipt,parsePublication} from './publication.mjs';
const positive=n=>Number.isSafeInteger(n)&&n>0;
function validContext(c){return c && positive(c.run) && positive(c.attempt) && /^[a-f0-9]{40}$/.test(c.sha);}
export async function begin(mode,gate,context,{read=readPublication,legacyAllowed=async()=>false,bootstrapRequest=null,bootstrapConfigured=false}={}) {
  if (!['production','preview'].includes(mode) || !validContext(context)) throw Error('Invalid writer context');
  if (mode==='preview' && gate!=='true') throw Error('Preview publication disabled');
  const previous=await read();
  if (!previous) {
    if (mode==='preview') throw Error('Verified baseline required');
    if (!await legacyAllowed()) throw Error('Missing receipt with ledger state');
    if (bootstrapRequest) {
      const r=bootstrapRequest;
      if (r.attested!==true || !positive(r.run) || r.run===context.run || r.attempt!==1 || !positive(r.artifact) || !/^[a-f0-9]{64}$/.test(r.root??'') || !/^[a-f0-9]{64}$/.test(r.snapshot??'')) throw Error('Invalid bootstrap authorization');
      return {legacy:false,bootstrap:r,previous:null,start:{schema:1,...context,previous:null}};
    }
    return {legacy:true};
  }
  if (bootstrapRequest) throw Error('Bootstrap requires missing receipt');
  if (!bootstrapConfigured) throw Error('Missing bootstrap identity');
  parsePublication(JSON.stringify(previous));
  return {legacy:false,previous,start:{schema:1,...context,previous:previous.nonce}};
}
export async function finish(start,receipt,{verify=waitForLiveReceipt,previous=null}={}) {
  parsePublication(JSON.stringify(receipt));
  if (!start || receipt.sha!==start.sha || receipt.run!==start.run || receipt.attempt!==start.attempt || receipt.previous!==start.previous) throw Error('Writer identity mismatch');
  await verify(receipt,{previous});
  return {...start,receipt};
}
export async function legacyAllowed(api,bootstrap) {
  if (bootstrap) return false;
  for (const workflow of ['documentation.yml','pages-publish.yml']) {
    const runs=await api.pages(`actions/workflows/${workflow}/runs?event=workflow_dispatch`,'workflow_runs');
    const more=workflow==='pages-publish.yml'?await api.pages(`actions/workflows/${workflow}/runs?event=workflow_run`,'workflow_runs'):[];
    for (const run of [...runs,...more]) {
      if (!positive(run?.id)) throw Error('Invalid writer inventory');
      const artifacts=await api.pages(`actions/runs/${run.id}/artifacts`,'artifacts');
      if (artifacts.some(a=>typeof a?.name==='string' && /^pages-(?:writer-(?:start|commit)|published-snapshot)-/.test(a.name))) return false;
    }
  }
  return true;
}

async function cli() {
  const {mkdir,readFile,writeFile,rename,appendFile}=await import('node:fs/promises');
  const {execFileSync}=await import('node:child_process');
  const {GitHub}=await import('./api.mjs');
  const {readVerifiedSnapshot,samePublication}=await import('./publication.mjs');
  const {preparePreview}=await import('./preview.mjs');
  const {validateChanges}=await import('./reconcile.mjs');
  const {fileURLToPath}=await import('node:url');
  const api=new GitHub(), mode=process.env.WRITER_MODE;
  const context={run:Number(process.env.GITHUB_RUN_ID),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),sha:process.env.GITHUB_SHA};
  const output=process.env.GITHUB_OUTPUT;
  const values=[process.env.PAGES_BOOTSTRAP_RUN,process.env.PAGES_BOOTSTRAP_ATTEMPT,process.env.PAGES_BOOTSTRAP_NONCE];
  const bootstrap=values.every(Boolean)?{run:Number(values[0]),attempt:Number(values[1]),nonce:values[2]}:null;
  if (values.some(Boolean) && !bootstrap) throw Error('Incomplete bootstrap identity');
  const requested=process.env.BOOTSTRAP_REQUESTED==='true';
  const bootstrapRequest=requested?{run:Number(process.env.BOOTSTRAP_SOURCE_RUN),attempt:Number(process.env.BOOTSTRAP_SOURCE_ATTEMPT),artifact:Number(process.env.BOOTSTRAP_SOURCE_ARTIFACT),root:process.env.BOOTSTRAP_EXPECTED_ROOT,snapshot:process.env.BOOTSTRAP_EXPECTED_SNAPSHOT,attested:process.env.BOOTSTRAP_ATTESTED==='true'}:null;
  const statePath='writer-state.json', command=process.argv[2];
  if (command==='begin') {
    const result=await begin(mode,process.env.PAGES_PREVIEWS_ENABLED,context,{legacyAllowed:()=>legacyAllowed(api,bootstrap),bootstrapRequest,bootstrapConfigured:Boolean(bootstrap && positive(bootstrap.run) && positive(bootstrap.attempt) && /^[a-f0-9]{32}$/.test(bootstrap.nonce??''))});
    await writeFile(statePath,JSON.stringify(result));
    if (!result.legacy) {await mkdir('writer-start',{recursive:true}); await writeFile('writer-start/ledger.json',JSON.stringify(result.start));}
    await appendFile(output,`legacy=${result.legacy}\n`);
  } else if (command==='prepare') {
    const state=JSON.parse(await readFile(statePath,'utf8'));
    if (state.legacy) throw Error('Legacy writer cannot prepare combined publication');
    let receipt,changed=[];
    if (state.bootstrap) {
      if (mode!=='production' || await readPublication()!==null) throw Error('Bootstrap source changed');
      const {sourceArtifact}=await import('./bootstrap.mjs');
      const bytes=await sourceArtifact(api,state.bootstrap); await writeFile('bootstrap-artifact.zip',bytes);
      const script=fileURLToPath(new URL('./bootstrap.py',import.meta.url));
      execFileSync('python3',[script,'bootstrap-artifact.zip','combined-site',state.bootstrap.root,state.bootstrap.snapshot],{stdio:'inherit'});
      receipt=JSON.parse(await readFile('combined-site/.puzlwerk-publication.json','utf8'));
    } else {
    const verified=await readVerifiedSnapshot(api,{destination:'current-site',bootstrap,context});
    if (!samePublication(verified,state.previous)) throw Error('Publication changed after writer start');
    if (mode==='production') {
      const script=fileURLToPath(new URL('./production.py',import.meta.url));
      execFileSync('python3',[script,'--source','production-source','--destination','combined-site','--snapshot','current-site','--previous',verified.nonce],{stdio:'inherit'});
      receipt=JSON.parse(await readFile('combined-site/.puzlwerk-publication.json','utf8'));
    } else if (mode==='preview') {
      const result=await preparePreview(api,'current-site',verified,context);
      receipt=result.receipt; changed=result.changed;
      if (result.errors.length) console.error(`Preview staging failures: ${JSON.stringify(result.errors)}`);
      await rename('current-site','combined-site');
    } else throw Error('Invalid writer mode');
    }
    parsePublication(JSON.stringify(receipt));
    await writeFile(statePath,JSON.stringify({...state,receipt,changed}));
  } else if (command==='check') {
    const state=JSON.parse(await readFile(statePath,'utf8'));
    if (state.legacy || !state.receipt) throw Error('Combined publication not prepared');
    await validateChanges(api,state.changed);
  } else if (command==='finish') {
    const state=JSON.parse(await readFile(statePath,'utf8'));
    const commit=await finish(state.start,state.receipt,{previous:state.previous});
    await mkdir('writer-commit',{recursive:true}); await writeFile('writer-commit/ledger.json',JSON.stringify(commit));
  } else throw Error('Invalid writer operation');
}
if (process.argv[1] && new URL(import.meta.url).pathname===process.argv[1]) await cli();
