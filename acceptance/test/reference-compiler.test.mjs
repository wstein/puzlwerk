import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('source references compile when Node rejects transform mode',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'puzlwerk-reference-'));
 try{
  await symlink(join(process.cwd(),'node_modules'),join(dir,'node_modules'));
  const program=`import module from 'node:module';import {syncBuiltinESMExports} from 'node:module';module.stripTypeScriptTypes=(_text,options)=>{if(options?.mode==='transform')throw new Error('simulated Node rejects transform');return ''};syncBuiltinESMExports();const {compileReference}=await import('./acceptance/references/cubistry/compile.mjs');await compileReference(${JSON.stringify(dir)});await import(${JSON.stringify('file://'+dir+'/packages/cube-core/src/index.js')});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:process.cwd(),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('compiler emits working enums and constructor parameter properties',async()=>{
 const {compileTypeScript}=await import('../compile-typescript.mjs');const js=compileTypeScript('export enum Mode { Off, On }\nexport class Model { constructor(public mode: Mode) {} }');
 const result=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);assert.equal(new result.Model(result.Mode.On).mode,1);assert.equal(result.Mode[1],'On');
});

test('acceptance build compiles app references without Node transform mode',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'puzlwerk-app-reference-'));
 try{
  const program=`import module from 'node:module';import {syncBuiltinESMExports} from 'node:module';module.stripTypeScriptTypes=(_text,options)=>{if(options?.mode==='transform')throw new Error('simulated Node rejects transform');return ''};syncBuiltinESMExports();const {build}=await import('./acceptance/build.mjs');await build('/',${JSON.stringify(dir)});`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:process.cwd(),encoding:'utf8'});assert.equal(result.status,0,result.stderr);
 }finally{await rm(dir,{recursive:true,force:true})}
});
