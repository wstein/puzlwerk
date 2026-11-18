// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright module and the demo server running (npm run dev --workspace @puzlwerk/viewer).
// Optional: CHROMIUM_PATH=<browser executable> when Playwright expects another build; SHOT_DIR=<dir> writes one screenshot per size; PERF=1 prints a rough frame-time figure per size.
// Chromium here renders with SwiftShader (CPU): the figures are an upper-bound approximation, not a GPU measurement.
import {pathToFileURL} from 'node:url';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const sizes=(process.env.SIZES??'2,3,7,9,15').split(',').map(Number),origin='http://127.0.0.1:4179/packages/viewer/demo/size-range.html';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 if(process.env.SHOT_DIR)await mkdir(process.env.SHOT_DIR,{recursive:true});
 for(const n of sizes){
  const page=await browser.newPage({viewport:{width:900,height:760},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;window.draws=0;window.tris=0;HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=original.call(this,type,...args);if(gl&&String(type).startsWith('webgl')&&!gl.__counted){gl.__counted=true;for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=gl[name];if(f)gl[name]=function(...a){window.draws++;return f.apply(this,a)}}}return gl}});
  await page.goto(`${origin}?n=${n}`);await page.waitForFunction(()=>window.sizeRange?.child);await page.waitForTimeout(600);
  assert.equal(await page.locator('#stage canvas').count(),1,`n=${n} canvas`);
  // The stage is not empty: some pixel inside the canvas differs from the page background.
  const box=await page.locator('#stage canvas').boundingBox();
  if(process.env.SHOT_DIR)await page.locator('#stage').screenshot({path:`${process.env.SHOT_DIR}/stage-${String(n).padStart(2,'0')}.png`});
  // Presets: the setter reports the pose through onViewChanged; the pose is the preset.
  const preset=await page.evaluate(()=>{const {stage,views}=window.sizeRange,out={};for(const name of ['front','right','up','iso-back']){const before=views.length,r=stage.setViewPreset(name);out[name]={ok:r.ok,reported:views.length>before,pose:views.at(-1)}}return out});
  for(const [name,r] of Object.entries(preset)){assert.equal(r.ok,true,`n=${n} ${name}`);assert.equal(r.reported,true,`n=${n} ${name}`)}
  assert.ok(Math.abs(preset.front.pose[3]-1)<1e-9,`n=${n} front is the identity`);
  // Stickerless from outside; the hidden panel's checkbox follows.
  const sl=await page.evaluate(async()=>{const {stage}=window.sizeRange;const r=await stage.setAppearance({construction:'stickerless',frameColor:null});const box=document.querySelector('input[aria-label="Stickerless"]');return {ok:r.ok,mode:stage.getAppearance().construction,checked:box?.checked,error:r.error}});
  assert.deepEqual([sl.ok,sl.mode,sl.checked],[true,'stickerless',true],`n=${n} stickerless ${JSON.stringify(sl)}`);
  assert.equal((await page.evaluate(()=>window.sizeRange.stage.setAppearance({construction:'nope',frameColor:null}).then(r=>r.ok))),false);
  await page.evaluate(()=>window.sizeRange.stage.setAppearance({construction:'stickered',frameColor:null}));
  // Interaction: Move layers from outside, then an outer-layer drag on the front face commits one turn (picking, layer widths, gesture core, Core move).
  const before=await page.evaluate(()=>window.sizeRange.player.state());
  const mode=await page.evaluate(()=>{const {stage}=window.sizeRange;stage.setViewPreset('front');const r=stage.setInteractionMode('play');return {ok:r.ok,mode:stage.getInteractionMode()}});
  assert.deepEqual(mode,{ok:true,mode:'play'},`n=${n}`);await page.waitForTimeout(300);
  const {x,y,width,height}=box,cx=x+width/2,cy=y+height/2;
  // Shift+drag near the centre of the face: a wide turn from the touched layer to the nearest outer layer, which the outer-wide move policy allows for any size.
  // The centre of an even cube is a seam between stickers, so a few start points around it are tried until one lands on a sticker.
  let played=false;
  for(const [ox,oy] of [[0,0],[-.03,-.03],[.03,-.03],[-.03,.03],[.03,.03],[-.06,0],[.06,0],[0,-.06],[0,.06]]){
   const sx=cx+width*ox,sy=cy+height*oy;await page.mouse.move(sx,sy);await page.keyboard.down('Shift');await page.mouse.down();await page.mouse.move(sx+width*.18,sy,{steps:6});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(450);
   if(await page.evaluate(()=>window.sizeRange.player.state())!==before){played=true;break}
  }
  assert.equal(played,true,`n=${n} the wide drag committed a turn`);
  await page.evaluate(()=>window.sizeRange.stage.setInteractionMode('view'));
  assert.equal(await page.evaluate(()=>window.sizeRange.stage.getInteractionMode()),'view');
  let perf;
  if(process.env.PERF){
   perf=await page.evaluate(async()=>{const {stage}=window.sizeRange;const times=[];let last=performance.now();window.draws=0;for(let i=0;i<60;i++){stage.setViewPreset(i%2?'isometric':'iso-back');stage.invalidate();await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-last);last=now}times.sort((a,b)=>a-b);return {median:times[30],p95:times[57],max:times[59],draws:window.draws/60,loadMs:window.sizeRange.loadMs}});
  }
  assert.deepEqual(errors,[],`n=${n} page errors`);
  report.push({n,played,perf});await page.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify(report));
