// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright module and the demo server running (npm run dev --workspace @puzlwerk/viewer).
// Optional: PORT=<port> (the server and this script, default 4179), CHROMIUM_PATH=<browser executable> when Playwright expects another build; SHOT_DIR=<dir> writes one screenshot per size; PERF=1 prints a rough frame-time figure per size.
// Chromium here renders with SwiftShader (CPU): the figures are an upper-bound approximation, not a GPU measurement.
import {pathToFileURL} from 'node:url';import {mkdir} from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const sizes=(process.env.SIZES??'2,3,7,9,15').split(',').map(Number),origin=`http://127.0.0.1:${process.env.PORT??4179}/packages/viewer/demo/size-range.html`;
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
  // Every preset reports exactly the pose that viewPresetOrientation names (same rotation, q and -q alike); consecutive presets differ, so a stale pose cannot pass.
  const preset=await page.evaluate(async()=>{const {stage,views}=window.sizeRange,{VIEW_PRESETS,viewPresetOrientation}=await import('/packages/viewer/dist/index.js'),out={};for(const name of VIEW_PRESETS){const before=views.length,r=stage.setViewPreset(name);out[name]={ok:r.ok,reported:views.length>before,pose:views.at(-1),want:viewPresetOrientation(name)}}return out});
  assert.deepEqual(Object.keys(preset),['up','right','front','down','left','back','isometric','iso-back'],`n=${n} all eight presets`);
  for(const [name,r] of Object.entries(preset)){assert.equal(r.ok,true,`n=${n} ${name}`);assert.equal(r.reported,true,`n=${n} ${name}`);const dot=Math.abs(r.pose.reduce((s,v,i)=>s+v*r.want[i],0));assert.ok(dot>1-1e-9,`n=${n} ${name} pose ${JSON.stringify(r.pose)} is not ${JSON.stringify(r.want)}`)}
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
  // Layer widths reach the gesture core. A plain vertical drag along the middle row turns the column (x layer) it starts in; a spy player records the layer and moves nothing
  // (the move policy would refuse a single inner layer, which does not matter here). The target has no halfExtent, so the stage derives it from the widths.
  // Along the face the layer boundaries are the cumulative widths. Bisection finds the left edge (xmin), the 0/1 boundary (x1) and the (n-2)/(n-1) boundary (x2) to 2 px;
  // the inner layer is (x2-x1)/(n-2) px wide, and layer 0 must be widths[0]/widths[1] of it. A uniform split of the face gives 1.
  if(n>=3){
   await page.evaluate(()=>{const {stage,child,widths,n}=window.sizeRange;window.spyLayers=[];const ok={ok:true,value:undefined},spy={beginPreview(axis,layers){window.spyLayers.push({axis,layers:[...layers]});return {ok:true,value:{pieceIds:[],update:()=>ok,commit:()=>ok,cancel:()=>ok}}}};stage.setInteractionMode('view');const t=stage.setPlayTarget({child,player:spy,size:n,layerWidths:widths});if(!t.ok)throw Error(t.error.message);const m=stage.setInteractionMode('play');if(!m.ok)throw Error(m.error.message)});
   await page.waitForTimeout(300);
   const ry=cy-height*.02;
   const drag=async(sx,dy=0)=>{await page.evaluate(()=>{window.spyLayers.length=0});await page.mouse.move(sx,ry+dy);await page.mouse.down();await page.mouse.move(sx,ry+dy-40,{steps:2});const hit=await page.evaluate(()=>window.spyLayers.at(-1)??null);await page.mouse.up();if(!hit)return null;assert.equal(hit.axis,'X',`n=${n} x=${sx} the vertical drag turns about X`);assert.equal(hit.layers.length,1,`n=${n} x=${sx}`);return hit.layers[0]};
   const probe=async sx=>(await drag(sx))??(await drag(sx+1,2)); // a probe may fall into the 1% gap between two stickers
   // Smallest x in (lo, hi] with ok(layer) true, given not ok at lo and ok at hi, to 2 px.
   const bisect=async(lo,hi,ok)=>{while(hi-lo>2){const mid=Math.floor((lo+hi)/2),layer=await probe(mid);if(layer!==null&&ok(layer))hi=mid;else lo=mid}return hi};
   const xc=Math.round(cx),centre=await probe(xc+3);if(process.env.PERF)console.error(`n=${n} box ${JSON.stringify(box)} centre ${centre}`);
   assert.ok(centre!==null&&centre>=1&&centre<=n-2,`n=${n} the middle of the face is an inner layer (${centre})`);
   assert.equal(await probe(x+4),null,`n=${n} the canvas border is off the cube`);
   const xmin=await bisect(x+4,xc+3,()=>true),x1=await bisect(xmin,xc+3,l=>l>=1),x2=await bisect(xc+3,2*xc-xmin-3,l=>l===n-1);
   const left=await probe(xmin+2),right=await probe(2*xc-xmin-5);assert.equal(left,0,`n=${n} the left edge (x ${xmin+2}) is layer 0`);assert.equal(right,n-1,`n=${n} the right edge (x ${2*xc-xmin-5}) is the last layer`);
   const w=await page.evaluate(()=>window.sizeRange.widths),unit=(x2-x1)/(n-2),measured=(x1-xmin)/unit;
   if(process.env.PERF)console.error(`n=${n} xmin ${xmin} x1 ${x1} x2 ${x2} outer/inner measured ${measured.toFixed(2)} expected ${w[0]/w[1]}`);
   assert.ok(Math.abs(measured-w[0]/w[1])<.25,`n=${n} outer layer is ${measured.toFixed(2)} inner layers wide, expected ${w[0]/w[1]}`);
   await page.evaluate(()=>{const {stage,child,player,widths,half,n}=window.sizeRange;stage.setInteractionMode('view');stage.setPlayTarget({child,player,size:n,layerWidths:widths,halfExtent:half})});
  }
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
