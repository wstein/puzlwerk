import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runNative} from '../references/cubistry-clock/harness.mjs';
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
await runNative(repo,join(repo,'acceptance/references/cubistry-clock'),async({browser,base,output})=>{
 for(const file of ['picture3/model','picture3/images','picture3/editor','picture3/presets','calendar/model','calendar/viewer','calendar/artwork','calendar7/schemes']){
  const source=await readFile(join(repo,`acceptance/references/cubistry-picture/src/apps/${file}.ts`),'utf8');
  const dest=join(output,`src/apps/${file}.js`);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,stripTypeScriptTypes(source,{mode:'transform'}).replace(/(["'])(\.{1,2}\/[^"']+)\.ts\1/g,'$1$2.js$1'));
 }
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.waitForFunction(()=>window.baseline);
 const evidence=await page.evaluate(async()=>{
  const {PictureEditor}=await import('/src/apps/picture3/editor.js'),{FACE_FRAMES,createCube3Design,apply}=await import('/src/apps/picture3/model.js'),{presetSvg}=await import('/src/apps/picture3/presets.js');
  const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const editor=new PictureEditor();await editor.preset('coast');const art=editor.artwork('picture'),design=createCube3Design(),faces=[];
  for(const [index,{face}] of FACE_FRAMES.entries()){
   const r=editor.faces.get(face),ctx=r.canvas.getContext('2d');let correct=0;
   for(let tile=0;tile<9;tile++){const expected=ctx.getImageData((tile%3)*256,Math.floor(tile/3)*256,256,256).data,actual=art.get(index*9+tile).getContext('2d').getImageData(0,0,256,256).data;if(expected.every((x,i)=>x===actual[i]))correct++;}
   faces.push({face,svg:await digest(new TextEncoder().encode(presetSvg('coast',face))),png:await digest(await r.blob.arrayBuffer()),crop:r.crop,width:r.source.width,height:r.source.height,correct});
  }
  const moved=apply(design.printing,'R');const retained=moved.every(s=>art.has(s.id)&&design.printing[s.id].image===s.image);editor.dispose();return {faces,tiles:art.size,retained};
 });
 assert.equal(new Set(evidence.faces.map(x=>x.svg)).size,6);assert.equal(new Set(evidence.faces.map(x=>x.png)).size,6);assert.equal(evidence.tiles,54);assert.ok(evidence.retained);for(const f of evidence.faces){assert.deepEqual(f.crop,{zoom:1,x:0,y:0});assert.equal(f.width,768);assert.equal(f.height,768);assert.equal(f.correct,9);}assert.deepEqual(errors,[]);console.log('PASS native coast source',JSON.stringify(evidence));await page.close();
});
