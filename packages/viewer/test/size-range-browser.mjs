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
  // setShadowOpacity reaches the engine through createCubeStage: valid values pass, an invalid one is rejected by the engine (a stub would not).
  const shadow=await page.evaluate(()=>{const {stage}=window.sizeRange,bad=stage.setShadowOpacity(1.5),ok=[stage.setShadowOpacity(.62).ok,stage.setShadowOpacity(.34).ok];stage.setShadowOpacity(.3);return {ok,bad:bad.ok===false&&bad.error.code}});
  assert.deepEqual(shadow,{ok:[true,true],bad:'InvalidLighting'},`n=${n} setShadowOpacity ${JSON.stringify(shadow)}`);
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
  // onPlayEvent reaches the stage: the drag reports turn-begin then a committed turn-end, and a turn-end handler that switches the play target does not redirect the commit hook of the target the turn began on.
  const events=await page.evaluate(()=>window.sizeRange.playEvents.map(e=>e.type+(e.outcome?`:${e.outcome}`:"")).filter(t=>t!=="hover"));
  assert.equal(events.at(0),"turn-begin",`n=${n} ${events}`);assert.equal(events.at(-1),"turn-end:committed",`n=${n} ${events}`);
  await page.evaluate(()=>{const {stage,child,player,widths,half,n,hooks}=window.sizeRange;window.commits={a:0,b:0};stage.setInteractionMode("view");const mk=key=>({child,player,size:n,layerWidths:widths,halfExtent:half,onCommit:()=>{window.commits[key]++}});stage.setPlayTarget(mk("a"));hooks.onTurnEnd=()=>{stage.setPlayTarget(mk("b"))};stage.setInteractionMode("play")});
  await page.waitForTimeout(300);
  for(const [ox,oy] of [[0,0],[-.03,-.03],[.03,-.03],[-.03,.03],[.03,.03],[-.06,0],[.06,0],[0,-.06],[0,.06]]){
   const sx=cx+width*ox,sy=cy+height*oy;await page.mouse.move(sx,sy);await page.keyboard.down("Shift");await page.mouse.down();await page.mouse.move(sx+width*.18,sy,{steps:6});await page.mouse.up();await page.keyboard.up("Shift");await page.waitForTimeout(450);
   if(await page.evaluate(()=>window.commits.a+window.commits.b)>0)break
  }
  assert.deepEqual(await page.evaluate(()=>{window.sizeRange.hooks.onTurnEnd=undefined;return window.commits}),{a:1,b:0},`n=${n} the commit hook of the target at turn-begin runs once, the switched target gets none`);
  await page.evaluate(()=>{const {stage,child,player,widths,half,n}=window.sizeRange;stage.setInteractionMode("view");stage.setPlayTarget({child,player,size:n,layerWidths:widths,halfExtent:half});stage.setInteractionMode("play")});
  // Every probe that misses a sticker is a vertical 40 px view drag that turns the cube by about 18 degrees about X, and smart or free then keep moving the view (the smart
  // mode returns it to its anchor over time, free coasts), so the edge and the layer ratio were measured on whichever face was under the row (the flaky 221 against 225).
  // The probe therefore sets the front preset before each press and holds the mode at free (no return animation). The mode of the demo is restored afterwards. Not caught here:
  // a derived half extent that is a few percent too small (only gross errors such as size/2 fail the comparison below).
  // Layer widths reach the gesture core. A plain vertical drag along the middle row turns the column (x layer) it starts in; a spy player records the layer and moves nothing
  // (the move policy would refuse a single inner layer, which does not matter here). The target has no halfExtent, so the stage derives it from the widths.
  // Along the face the layer boundaries are the cumulative widths. Bisection finds the left edge (xmin), the 0/1 boundary (x1) and the (n-2)/(n-1) boundary (x2); the gaps
  // between stickers pick nothing, so a boundary is the middle between the last probe below it and the first above it. The inner layer is (x2-x1)/(n-2) px wide and
  // layer 0 must be widths[0]/widths[1] of it. A uniform split of the face gives 1.
  if(n>=3){
   await page.evaluate(()=>{const {stage,child,widths,n}=window.sizeRange;window.spyLayers=[];const ok={ok:true,value:undefined},spy={beginPreview(axis,layers){window.spyLayers.push({axis,layers:[...layers]});return {ok:true,value:{pieceIds:[],update:()=>ok,commit:()=>ok,cancel:()=>ok}}}};window.spyPlayer=spy;stage.setRotationMode('free');stage.setInteractionMode('view');const t=stage.setPlayTarget({child,player:spy,size:n,layerWidths:widths});if(!t.ok)throw Error(t.error.message);const m=stage.setInteractionMode('play');if(!m.ok)throw Error(m.error.message)});
   await page.waitForTimeout(300);
   let ry=cy; // the gaps between sticker rows pick nothing: use a row that picks at the middle column
   const drag=async sx=>{const pose=await page.evaluate(()=>{window.spyLayers.length=0;window.sizeRange.stage.setViewPreset('front');return window.sizeRange.views.at(-1)?.map(v=>Math.abs(v)<1e-9?0:v)});assert.deepEqual(pose,[0,0,0,1],`n=${n} every probe starts in the front pose`);await page.mouse.move(sx,ry);await page.mouse.down();await page.mouse.move(sx,ry-40,{steps:2});const hit=await page.evaluate(()=>window.spyLayers.at(-1)??null);await page.mouse.up();if(!hit)return null;assert.equal(hit.axis,'X',`n=${n} x=${sx} the vertical drag turns about X`);assert.equal(hit.layers.length,1,`n=${n} x=${sx}`);return hit.layers[0]};
   // The first sticker hit at sx, sx+1, ... below limit (1 px steps: the edge is measured to 1 px, the comparison below allows 2): [x, layer], or null.
   const near=async(sx,limit)=>{for(let d=0;d<=12&&sx+d<limit;d+=1){const layer=await drag(sx+d);if(layer!==null)return [sx+d,layer]}return null};
   // Boundary between the layers where ok is false and true, given a probe below (lo, not ok or off the cube) and above (hi, ok) it: [last not-ok hit or undefined, first ok hit].
   const bisect=async(lo,hi,ok)=>{let low;while(hi-lo>1){const mid=Math.floor((lo+hi)/2),r=await near(mid,hi);if(r===null)lo=mid;else if(ok(r[1])){hi=r[0]}else{lo=r[0];low=r[0]}}return [low,hi]};
   const xc=Math.round(cx);let centre=null;for(const dy of [0,9,-9,18,-18,27]){ry=cy+dy;centre=await near(xc+3,xc+20);if(centre)break}
   assert.ok(centre!==null&&centre[1]>=1&&centre[1]<=n-2,`n=${n} the middle of the face is an inner layer (${centre})`);
   assert.equal(await drag(x+4),null,`n=${n} the canvas border is off the cube`);
   const [,xmin]=await bisect(x+4,centre[0],()=>true),[l1,h1]=await bisect(xmin,centre[0],l=>l>=1),[l2,h2]=await bisect(centre[0],2*xc-xmin-3,l=>l===n-1);
   const left=await near(xmin,xmin+13),right=await near(2*xc-xmin-15,2*xc-xmin);
   assert.equal(left?.[1],0,`n=${n} the left edge (x ${xmin}) is layer 0`);assert.equal(right?.[1],n-1,`n=${n} the right edge (x ${2*xc-xmin}) is the last layer`);
   const x1=(l1+h1)/2,x2=(l2+h2)/2,w=await page.evaluate(()=>window.sizeRange.widths),unit=(x2-x1)/(n-2),measured=(x1-xmin)/unit;
   if(process.env.PERF)console.error(`n=${n} xmin ${xmin} x1 ${x1} x2 ${x2} outer/inner measured ${measured.toFixed(2)} expected ${w[0]/w[1]} q ${JSON.stringify((await page.evaluate(()=>window.sizeRange.views.at(-1)))?.map(v=>+v.toFixed(3)))}`);
   assert.ok(Math.abs(measured-w[0]/w[1])<.3,`n=${n} outer layer is ${measured.toFixed(2)} inner layers wide, expected ${w[0]/w[1]}`);
   // The same face edge with the half extent given explicitly (the demo's own value): the derived default must put the edge where it puts it. A half extent that is too small cuts the face.
   await page.evaluate(()=>{const {stage,child,widths,half,n}=window.sizeRange;stage.setInteractionMode('view');const t=stage.setPlayTarget({child,player:window.spyPlayer,size:n,layerWidths:widths,halfExtent:half});if(!t.ok)throw Error(t.error.message);stage.setInteractionMode('play')});
   await page.waitForTimeout(300);
   const [,xminGiven]=await bisect(x+4,centre[0],()=>true);
   assert.ok(Math.abs(xminGiven-xmin)<=2,`n=${n} the face edge is at x ${xmin} with the derived half extent and at x ${xminGiven} with the given one`);
   // seamWide reaches the pick through setPlayTarget: a vertical swipe leaning left that starts just inside layer 1 next to the boundary 0/1 turns the block of layers 0 and 1; without the option it turns layer 1 only.
   const seamSwipe=async(shares=[.12,.15,.18,.22])=>{for(const share of shares){await page.evaluate(()=>{window.spyLayers.length=0;window.sizeRange.stage.setViewPreset('front')});const sx=x1+share*unit;await page.mouse.move(sx,ry);await page.mouse.down();await page.mouse.move(sx-12,ry-40,{steps:3});const hit=await page.evaluate(()=>window.spyLayers.at(-1)??null);await page.mouse.up();if(hit)return hit.layers}return null};
   for(const [seamWide,expected] of [[false,[1]],[true,[0,1]]]){
    await page.evaluate(([seamWide])=>{const {stage,child,widths,half,n}=window.sizeRange;stage.setInteractionMode('view');const t=stage.setPlayTarget({child,player:window.spyPlayer,size:n,layerWidths:widths,halfExtent:half,...(seamWide?{seamWide:true}:{})});if(!t.ok)throw Error(t.error.message);stage.setInteractionMode('play')},[seamWide]);
    await page.waitForTimeout(300);ry=cy;let swiped=null;for(const dy of [0,9,-9,18,-18]){ry=cy+dy;swiped=await seamSwipe();if(swiped)break}
    assert.deepEqual(swiped,expected,`n=${n} seamWide ${seamWide}: the swipe next to the boundary 0/1 turns layers ${expected}`);
   }
   // minPx is a screen length: 0.3 of an inner layer is more than the default tolerance (0.25) and less than half a layer, so the middle of layer 1 stays one layer; a minPx that is not divided by halfExtent
   // is larger by the factor halfExtent (more than 1.7 for n>=7) and reaches the half-layer cap, which makes the middle the seam.
   if(n>=7){
    const minPx=Math.round(3*unit)/10;
    await page.evaluate(minPx=>{const {stage,child,widths,half,n}=window.sizeRange;stage.setInteractionMode('view');const t=stage.setPlayTarget({child,player:window.spyPlayer,size:n,layerWidths:widths,halfExtent:half,seamWide:{minPx}});if(!t.ok)throw Error(t.error.message);stage.setInteractionMode('play')},minPx);
    await page.waitForTimeout(300);let middle=null;for(const dy of [0,9,-9,18,-18]){ry=cy+dy;middle=await seamSwipe([.42,.4,.45]);if(middle)break}
    assert.deepEqual(middle,[1],`n=${n} seamWide minPx ${minPx}: a swipe on the middle of layer 1 turns that layer only`);
   }
   await page.evaluate(()=>{const {stage,child,player,widths,half,n}=window.sizeRange;stage.setInteractionMode('view');stage.setPlayTarget({child,player,size:n,layerWidths:widths,halfExtent:half})});
  }
  await page.evaluate(()=>{window.sizeRange.stage.setRotationMode('smart');window.sizeRange.stage.setInteractionMode('view')});
  assert.equal(await page.evaluate(()=>window.sizeRange.stage.getInteractionMode()),'view');
  // setAutoRotate reaches the engine through createCubeStage: the settings read back, an invalid value is an InvalidView result and the orientation reported to onViewChanged differs after 600 ms.
  const auto=await page.evaluate(async()=>{const {stage,views}=window.sizeRange;const set=stage.setAutoRotate(true,{radiansPerMs:.0005,resumeDelayMs:0}),bad=stage.setAutoRotate('yes'),read=stage.getAutoRotate(),before=JSON.stringify(views.at(-1));await new Promise(r=>setTimeout(r,600));const turned=JSON.stringify(views.at(-1))!==before&&views.length>0;stage.setAutoRotate(false);return {set:set.ok,bad:bad.error?.code,read,turned,off:stage.getAutoRotate().enabled}});
  assert.deepEqual({...auto,read:undefined},{set:true,bad:'InvalidView',read:undefined,turned:true,off:false},`n=${n} auto-rotate ${JSON.stringify(auto)}`);assert.deepEqual(auto.read,{enabled:true,radiansPerMs:.0005,resumeDelayMs:0},`n=${n}`);
  let perf;
  if(process.env.PERF){
   perf=await page.evaluate(async()=>{const {stage}=window.sizeRange;const times=[];let last=performance.now();window.draws=0;for(let i=0;i<60;i++){stage.setViewPreset(i%2?'isometric':'iso-back');stage.invalidate();await new Promise(r=>requestAnimationFrame(r));const now=performance.now();times.push(now-last);last=now}times.sort((a,b)=>a-b);return {median:times[30],p95:times[57],max:times[59],draws:window.draws/60,loadMs:window.sizeRange.loadMs}});
  }
  assert.deepEqual(errors,[],`n=${n} page errors`);
  report.push({n,played,perf});await page.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify(report));
