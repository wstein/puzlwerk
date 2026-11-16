import {stripTypeScriptTypes} from 'node:module';
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
        const result=stripTypeScriptTypes(text,{mode:'transform'}).replace(/([\"'])(\.{1,2}\/[^\"']+)\.ts\1/g, '$1$2.js$1');
        await writeFile(dest,result);
      } else if (path.endsWith('.mjs')) {const dest=join(out,rel); await mkdir(dirname(dest),{recursive:true}); await cp(path,dest);}
    }
  }
  await visit(join(source,'packages'));
  await cp(join(source,'original.js'),join(out,'original.js'));
  for (const name of ['LICENSE','source-manifest.json']) await cp(join(source,name),join(out,name));
  await cp(join(source,'packages/cube-viewer/src/CUBE_ASSEMBLER_LICENSE.txt'),join(out,'CUBE_ASSEMBLER_LICENSE.txt'));
}
