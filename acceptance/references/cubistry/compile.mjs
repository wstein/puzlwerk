import ts from 'typescript';
import {readdir,readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=fileURLToPath(new URL('./',import.meta.url));
export async function compileReference(out) {
  async function visit(dir) {
    for (const entry of await readdir(dir,{withFileTypes:true})) {
      const path=join(dir,entry.name), rel=relative(source,path);
      if (entry.isDirectory()) await visit(path);
      else if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
        const dest=join(out,rel.replace(/\.ts$/,'.js'));
        await mkdir(dirname(dest),{recursive:true});
        const text=await readFile(path,'utf8');
        const result=ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,rewriteRelativeImportExtensions:true}});
        await writeFile(dest,result.outputText);
      } else if (path.endsWith('.mjs')) {const dest=join(out,rel); await mkdir(dirname(dest),{recursive:true}); await cp(path,dest);}
    }
  }
  await visit(join(source,'packages'));
  await cp(join(source,'original.js'),join(out,'original.js'));
}
