import {execFileSync} from 'node:child_process';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {reconcile} from './reconcile.mjs';
import {stage} from './stage.mjs';
const receiptScript=fileURLToPath(new URL('./preview-receipt.py',import.meta.url));
export async function preparePreview(api,snapshot,previous,context) {
  if (!previous || !/^[a-f0-9]{32}$/.test(previous.nonce)) throw Error('Verified previous receipt required');
  const temp=await mkdtemp(join(tmpdir(),'puzlwerk-receipt-'));
  try {
    const prior=join(temp,'previous.json'); await writeFile(prior,JSON.stringify(previous));
    execFileSync('python3',[receiptScript,'verify',snapshot,prior]);
    const check=await reconcile(api,snapshot,{stage});
    await check();
    const output=execFileSync('python3',[receiptScript,'issue',snapshot,prior,context.sha,String(context.run),String(context.attempt)],{encoding:'utf8'});
    return {receipt:JSON.parse(output),changed:check.changed,errors:check.errors};
  } finally {await rm(temp,{recursive:true,force:true});}
}
