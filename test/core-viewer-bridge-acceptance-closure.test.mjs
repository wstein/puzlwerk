import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// The acceptance pages serve only packages/core-viewer-bridge/src and the compiled Core next to the viewer build;
// a static or dynamic import of anything else from the bridge entry is a 404 in the browser and breaks every case
// (cube-state.mjs is its own entry).
export const specifiers=text=>[
  ...text.matchAll(/\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g),
  ...text.matchAll(/\bimport\s*['"]([^'"]+)['"]/g),
  ...text.matchAll(/\bimport\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g),
].map(m=>m[1]);
export function escapes(entry,allowed){
  const seen=new Set(),bad=[],walk=url=>{
    if(seen.has(url.href))return;seen.add(url.href);
    for(const spec of specifiers(readFileSync(fileURLToPath(url),'utf8'))){
      if(!spec.startsWith('.')){if(spec!=='three')bad.push(`${fileURLToPath(url)} imports ${spec}`);continue}
      const target=new URL(spec,url);
      if(!allowed.some(prefix=>target.href.startsWith(prefix))){bad.push(`${fileURLToPath(url)} imports ${spec}`);continue}
      if(target.href.includes('/core-viewer-bridge/src/'))walk(target);
    }
  };
  walk(entry);return {bad,seen};
}
const allowed=[new URL('../packages/core-viewer-bridge/src/',import.meta.url).href,new URL('../core/res/',import.meta.url).href];
test('the bridge entry imports only its own files, compiled Core and three',()=>{
  const {bad,seen}=escapes(new URL('../packages/core-viewer-bridge/src/index.mjs',import.meta.url),allowed);
  assert.deepEqual(bad,[]);assert.ok(seen.size>=2);
});
test('the scan sees single-line, multi-line, side-effect, re-export and dynamic imports',()=>{
  const dir=mkdtempSync(join(tmpdir(),'closure-')),src=join(dir,'core-viewer-bridge/src');mkdirSync(src,{recursive:true});
  const out=pathToFileURL(join(dir,'x')).href;
  for(const [name,code] of Object.entries({single:"import {a} from '../../x.js';",multi:"import {\n a,\n b\n} from '../../x.js';",side:"import '../../x.js';",reexport:"export * from '../../x.js';",dynamic:"const m = await import('../../x.js');",dynamic2:"import(\n '../../x.js'\n)"})){
    const file=join(src,`${name}.mjs`);writeFileSync(file,code);
    assert.equal(escapes(pathToFileURL(file),[pathToFileURL(src+'/').href]).bad.length,1,name);
  }
  const ok=join(src,'ok.mjs');writeFileSync(ok,"import * as T from 'three';\nimport {\n a\n} from './ok.mjs';");
  assert.equal(escapes(pathToFileURL(ok),[pathToFileURL(src+'/').href]).bad.length,0);void out;
});
