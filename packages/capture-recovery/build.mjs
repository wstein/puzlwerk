// Private build artifact only; no registry publication.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const pkg=dirname(fileURLToPath(import.meta.url)),root=resolve(pkg,'../..');
execFileSync('rescript',['build'],{cwd:root,stdio:'inherit'});
const lib=resolve(pkg,'lib'),source=resolve(pkg,'source');
mkdirSync(lib,{recursive:true});mkdirSync(source,{recursive:true});
const visited=new Set();
function copyModule(name){
 if(visited.has(name))return; visited.add(name);
 const path=resolve(root,'core/res',name),text=readFileSync(path,'utf8');
 copyFileSync(path,resolve(lib,name));
 for(const match of text.matchAll(/from ['"]\.\/(\w+\.res\.mjs)['"]/g))copyModule(match[1]);
 for(const extension of ['.res','.resi']){const src=path.replace(/\.res\.mjs$/,extension);if(existsSync(src))copyFileSync(src,resolve(source,name.replace(/\.res\.mjs$/,extension)));}
}
copyModule('PwCapture.res.mjs');
copyFileSync(resolve(root,'core/res/PwCapture.gen.ts'),resolve(lib,'PwCapture.gen.ts'));
writeFileSync(resolve(lib,'index.ts'),"export * from './PwCapture.gen.js';\n");
execFileSync('tsc',['--strict','--allowJs','--checkJs','false','--declaration','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--outDir',resolve(pkg,'lib-compiled'),resolve(lib,'index.ts')],{cwd:root,stdio:'inherit'});
// tsc copies the reachable JavaScript closure and generates its declarations.
for(const name of ['index.js','index.d.ts','PwCapture.gen.js','PwCapture.gen.d.ts'])copyFileSync(resolve(pkg,'lib-compiled',name),resolve(lib,name));
unlinkSync(resolve(lib,'index.ts'));unlinkSync(resolve(lib,'PwCapture.gen.ts'));
const files=[...visited].sort().flatMap(name=>['.res','.resi'].map(ext=>name.replace(/\.res\.mjs$/,ext))).filter(name=>existsSync(resolve(source,name)));
const hashes=Object.fromEntries(files.map(name=>[name,createHash('sha256').update(readFileSync(resolve(source,name))).digest('hex')]));
const dirty=files.some(name=>{try{return !readFileSync(resolve(source,name)).equals(execFileSync('git',['show','HEAD:core/res/'+name],{cwd:root,stdio:['ignore','pipe','ignore']}));}catch{return true;}});
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
writeFileSync(resolve(pkg,'provenance.json'),JSON.stringify({schemaVersion:1,sourceRevision:dirty?null:head,workingTreeBase:head,dirty,sourceHashes:hashes,runtimeHashes:Object.fromEntries([...visited].sort().map(name=>[name,createHash('sha256').update(readFileSync(resolve(lib,name))).digest('hex')])),modules:[...visited].sort(),license:'EUPL-1.2',licenseDecision:'specs/006-shared-model/plan.md#sm11',upstream:{repository:'https://github.com/wstein/cube-assembler',revision:'91fc2144cbcf2734f84ee3a93c70b8ed503a5151',license:'MIT'},publication:'not authorized'},null,2)+'\n');
console.log(`Capture package: ${visited.size} compiled ReScript modules; generated TypeScript bindings`);
