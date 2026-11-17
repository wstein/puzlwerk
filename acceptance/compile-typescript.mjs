import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const require=createRequire(import.meta.url);
const compiler=join(dirname(require.resolve('typescript/package.json')),'bin/tsc');
/** Compile a source reference with the installed TypeScript compiler. */
export function compileTypeScript(source) {
  const directory=mkdtempSync(join(tmpdir(),'puzlwerk-ts-'));
  try {
    const input=join(directory,'reference.ts'),output=join(directory,'out');
    writeFileSync(input,source);
    execFileSync(process.execPath,[compiler,'--target','ES2022','--module','ESNext','--noCheck','--noResolve','--skipLibCheck','--rewriteRelativeImportExtensions','--outDir',output,input],{stdio:'pipe'});
    return readFileSync(join(output,'reference.js'),'utf8');
  } finally { rmSync(directory,{recursive:true,force:true}); }
}
