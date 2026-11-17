import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// The acceptance pages serve only packages/core-viewer-bridge/src and the compiled Core next to the viewer build;
// a static import of anything else from the bridge entry is a 404 in the browser and breaks every case (cube-state.mjs is its own entry).
test('the bridge entry imports only its own files, compiled Core and three',()=>{
  const entry=new URL('../packages/core-viewer-bridge/src/index.mjs',import.meta.url);
  const seen=new Set(),walk=url=>{
    if(seen.has(url.href))return;seen.add(url.href);
    for(const m of readFileSync(fileURLToPath(url),'utf8').matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*from\s*['"]([^'"]+)['"]/g)){
      const spec=m[1];
      if(!spec.startsWith('.')){assert.equal(spec,'three');continue}
      const target=new URL(spec,url).href;
      assert.ok(target.startsWith(new URL('../packages/core-viewer-bridge/src/',import.meta.url).href)||target.startsWith(new URL('../core/res/',import.meta.url).href),`${fileURLToPath(url)} imports ${spec}`);
      if(target.includes('/core-viewer-bridge/src/'))walk(new URL(target));
    }
  };
  walk(entry);assert.ok(seen.size>=2);
});
