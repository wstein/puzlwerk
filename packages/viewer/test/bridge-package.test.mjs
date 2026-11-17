import {test} from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
const dist=new URL('../dist/bridge/',import.meta.url);
test('the packaged bridge is self-contained: no import leaves dist/bridge except three, the ReScript runtime and the viewer',()=>{
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(new URL(e.name+'/',dir)):[new URL(e.name,dir)]);
  const files=walk(dist);
  assert.ok(files.some(f=>f.pathname.endsWith('/core/PwCodec.res.mjs')));assert.ok(files.some(f=>f.pathname.endsWith('/cube-state.mjs')));
  for(const file of files.filter(f=>/\.m?js$/.test(f.pathname))){
    for(const match of readFileSync(file,'utf8').matchAll(/(?:from|import\()\s*['"]([^'"]+)['"]/g)){
      const spec=match[1],inCore=file.pathname.includes('/bridge/core/');
      if(spec.startsWith('.')){
        const target=new URL(spec,file);
        assert.ok(target.href.startsWith(dist.href)||(!inCore&&target.href.startsWith(new URL('../',dist).href)),`${file.pathname} escapes dist: ${spec}`);
        assert.ok(readFileSync(target,'utf8').length>0,`${spec} missing`);
      }else assert.ok(/^(three($|\/)|@rescript\/runtime\/)/.test(spec),`${file.pathname} imports ${spec}`);
    }
  }
});
test('the packaged bridge translates a CubeState and opens it as a projection',async()=>{
  const bridge={...await import('../dist/bridge/index.mjs'),...await import('../dist/bridge/cube-state.mjs')};
  const face=c=>Array(9).fill(c),cube={u:face('W'),r:face('R'),f:face('G'),d:face('Y'),l:face('O'),b:face('B')};
  const made=bridge.cubeStateDocuments(3,cube,{W:'#ffffff',R:'#ff0000',G:'#00ff00',Y:'#ffff00',O:'#ff8800',B:'#0000ff'});
  assert.equal(made.ok,true);
  const opened=bridge.open(made.value.definition,made.value.state,made.value.appearance,made.value.options);
  assert.equal(opened.ok,true,JSON.stringify(opened));assert.equal(opened.value.projection.pieces.length,26);
  assert.deepEqual(bridge.cubeStateFromWire(3,made.value.state,made.value.appearance).value,cube);
});
