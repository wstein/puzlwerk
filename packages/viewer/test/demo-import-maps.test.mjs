import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,dirname,resolve,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
const demo=fileURLToPath(new URL('../demo/',import.meta.url)),repo=resolve(demo,'../../..');
function bareImports(entry){
 const seen=new Set(),bare=new Set();
 (function visit(file){
  if(seen.has(file))return;seen.add(file);
  assert.ok(existsSync(file),`missing module ${file}`);
  const source=readFileSync(file,'utf8');
  for(const m of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)){
   const spec=m[1];
   if(spec.startsWith('.'))visit(resolve(dirname(file),spec));
   else if(spec.startsWith('/'))visit(join(repo,spec));
   else bare.add(spec);
  }
 })(entry);
 return bare;
}
for(const page of readdirSync(demo).filter(n=>n.endsWith('.html'))){
 test(`demo page ${page} import map resolves every bare import of its module graph`,()=>{
  const html=readFileSync(join(demo,page),'utf8');
  const map=JSON.parse(/<script type="importmap">(.*?)<\/script>/s.exec(html)[1]).imports,keys=Object.keys(map);
  const entry=/<script type="module" src="([^"]+)"/.exec(html)[1];
  const missing=[...bareImports(resolve(demo,entry))].filter(s=>!keys.some(k=>k===s||(k.endsWith('/')&&s.startsWith(k))));
  assert.deepEqual(missing,[]);
 });
}
