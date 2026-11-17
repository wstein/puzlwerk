import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile,writeFile,mkdir,mkdtemp,symlink} from 'node:fs/promises';
import {compileTypeScript} from '../compile-typescript.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,dirname,join} from 'node:path';
import {compileReference} from '../references/cubistry/compile.mjs';
import {pictureDocuments,comparePictureState,pictureMove} from '../runtime/picture-mapping.mjs';
import {createPlayer} from '../../packages/core-viewer-bridge/src/index.mjs';
import {createSceneForTest} from '../../packages/viewer/dist/scene.js';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
test('all 18 native face actions match Core positions, normals and up',async()=>{
 if(!process.env.REFERENCE_SCRATCH)throw Error('Set REFERENCE_SCRATCH to an existing writable directory');
 const scratch=await mkdtemp(join(resolve(process.env.REFERENCE_SCRATCH),'picture-turns-'));await compileReference(join(scratch,'native'));await symlink(join(repo,'node_modules'),join(scratch,'node_modules'));
 for(const file of ['calendar/model','picture3/model']){const source=await readFile(join(repo,'acceptance/references/cubistry-picture/src/apps',file+'.ts'),'utf8');const code=compileTypeScript(source).replace('"@cubistry/cube-core"',JSON.stringify(pathToFileURL(join(scratch,'native/packages/cube-core/src/index.js')).href));const dest=join(scratch,'src',file+'.js');await mkdir(dirname(dest),{recursive:true});await writeFile(dest,code)}
 const {createCube3Design,apply,moveInfo}=await import(pathToFileURL(join(scratch,'src/picture3/model.js')));const design=createCube3Design(),docs=pictureDocuments(design);const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:{width:256,height:256}})},{now:()=>0,request:()=>1,cancel(){}},{render(){},dispose(){}});const opened=createPlayer(JSON.stringify(docs.definition),JSON.stringify(docs.state),JSON.stringify(docs.appearance),{palette:{},defaultColor:'#ffffff'},scene);assert.equal(opened.ok,true);const player=opened.value;assert.equal((await scene.setProjection(player.projection())).ok,true);let source=design.printing;
 try{for(const face of ['U','D','F','B','L','R'])for(const suffix of ['',"'",'2']){const token=face+suffix;source=apply(source,token);const move=pictureMove(moveInfo(token)),result=await player.turn(move.axis,move.layers,move.turns,0);assert.equal(result.ok,true,`${token}: ${JSON.stringify(result)}`);assert.equal(comparePictureState(source,docs.definition,JSON.parse(player.state())),true,`${token}: positions/normals/up`);}}finally{player.dispose();scene.dispose()}
});
