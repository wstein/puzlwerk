// Copies the Core-to-viewer bridge and the compiled Core modules it imports into dist/bridge, so that the packed
// viewer carries them (subpath `@puzlwerk/viewer/bridge`). Run after `tsc` and after `rescript build` at the root.
import {copyFileSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const here=new URL('../',import.meta.url),root=new URL('../../../',import.meta.url),path=(base,name)=>fileURLToPath(new URL(name,base));
const source=path(root,'packages/core-viewer-bridge/src/'),out=path(here,'dist/bridge/'),core=path(root,'core/res/');
rmSync(out,{recursive:true,force:true});mkdirSync(path(here,'dist/bridge/core/'),{recursive:true});
// Bridge files import `../../../core/res/` and `../../viewer/(src|dist)/`; in the package they are `./core/` and `../`.
const rewrite=text=>text.replaceAll('../../../core/res/','./core/').replaceAll(/\.\.\/\.\.\/viewer\/(?:src|dist)\//g,'../');
const modules=new Set(),pending=[];
for(const name of readdirSync(source)){
 const text=rewrite(readFileSync(source+name,'utf8'));
 if(/\.\.\/\.\.\//.test(text))throw Error(`Unrewritten relative import in ${name}`);
 writeFileSync(out+name,text);
 for(const match of text.matchAll(/from '\.\/core\/(\w+\.res\.mjs)'/g))pending.push(match[1]);
}
while(pending.length){
 const name=pending.pop();if(modules.has(name))continue;modules.add(name);
 if(!existsSync(core+name))throw Error(`Missing compiled Core module ${name}; run \`rescript build\` at the repository root first`);
 copyFileSync(core+name,out+'core/'+name);
 for(const match of readFileSync(core+name,'utf8').matchAll(/from ['"]\.\/(\w+\.res\.mjs)['"]/g))pending.push(match[1]);
}
console.log(`Bridge: ${readdirSync(source).length} files, ${modules.size} compiled Core modules`);
