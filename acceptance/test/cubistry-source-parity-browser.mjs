// Run against an acceptance build: PLAYWRIGHT_MODULE=/absolute/path/index.mjs
// node acceptance/test/cubistry-source-parity-browser.mjs /absolute/build/root
// This compares the pinned native component, not its snap-only original.js wrapper.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(process.argv[2] || '');
assert.ok(process.argv[2] && process.env.PLAYWRIGHT_MODULE, 'supply build root and PLAYWRIGHT_MODULE');
const {chromium} = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = join(root, path === '/' ? 'acceptance/cubistry-playground-classic-2/index.html' : path);
    assert.ok(file.startsWith(root + '/'));
    const target = (await stat(file)).isDirectory() ? join(file, 'index.html') : file;
    res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css'}[extname(target)] || 'application/octet-stream');
    res.end(await readFile(target));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async () => {
    document.body.innerHTML='<style>body{margin:0;display:flex}.testhost{width:500px;height:500px}.cube-appearance{display:none}</style><div id="native" class="testhost"></div><div id="target" class="testhost"></div>';
    const [{CubeViewer},{loadAssets},{parseMove,presentMove},{createCubeStage},{createPlayer}] = await Promise.all([
      import('@cubistry/cube-viewer'), import('@cubistry/cube-assets'), import('@cubistry/cube-mechanics'),
      import('/assets/viewer/index.js'), import('/assets/packages/core-viewer-bridge/src/index.mjs')]);
    const base='/assets/fixtures/cubistry-playground-classic-2/';
    const [native,definition,state,appearance] = await Promise.all(['native.json','definition.json','state.json','appearance.json'].map(async f=>(await fetch(base+f)).json()));
    const assets=await loadAssets(native.assets,[native.print],undefined,base);
    const source=new CubeViewer(document.querySelector('#native')); source.configure(native.print,native.target,assets);
    window.targetView=null;
    // Production defaults are supplied by createCubeStage, never reconstructed
    // in this harness. onViewChanged only records the resulting presentation.
    const made=createCubeStage(document.querySelector('#target'),{
      resolveAsset:async id=>({ok:false,error:{code:'UnresolvedAsset',message:id}}),
      rotationStorageKey:'parity-stage-mode',
      onViewChanged:v=>{window.targetView={...v,t:performance.now()}},
    });
    if (!made.ok) throw Error(JSON.stringify(made));
    const added=made.value.addCube({position:[0,0,0]}); if(!added.ok) throw Error(JSON.stringify(added));
    const scene=added.value, palette=Object.fromEntries(native.assets.images.filter(x=>x.kind==='color').map(x=>[x.id,x.color]));
    const opened=createPlayer(JSON.stringify(definition),JSON.stringify(state),JSON.stringify(appearance),{palette,defaultColor:'#ffffff',core:{center:[0,0,0],halfExtent:1}},scene);
    if (!opened.ok) throw Error(JSON.stringify(opened));
    const player=opened.value, set=await scene.setProjection(player.projection()); if (!set.ok) throw Error(JSON.stringify(set));
    window.parity={source,stage:made.value,scene,player,native,assets,parseMove,presentMove};
  });
  assert.equal(await page.locator('#target select[aria-label="View rotation mode"]').count(),1,"native rotation mode HUD must be present on the real shared stage");
  await page.waitForTimeout(500);
  const canvases=[page.locator('#native canvas'),page.locator('#target canvas')];
  // Compare change across the full frame, rather than a few fixed pixels. Each
  // renderer has its own baseline; fixture, viewport and input distances match.
  async function delta(a,b) {
    return page.evaluate(async ([a,b])=>{
      const images=await Promise.all([a,b].map(async data=>{const i=new Image(); i.src='data:image/png;base64,'+data; await i.decode(); return i;}));
      const c=document.createElement('canvas'); c.width=images[0].width;c.height=images[0].height;
      const x=c.getContext('2d');x.drawImage(images[0],0,0);const p=x.getImageData(0,0,c.width,c.height).data;
      x.clearRect(0,0,c.width,c.height);x.drawImage(images[1],0,0);const q=x.getImageData(0,0,c.width,c.height).data;
      let sum=0;for(let i=0;i<p.length;i+=4) sum+=Math.abs(p[i]-q[i])+Math.abs(p[i+1]-q[i+1])+Math.abs(p[i+2]-q[i+2]);return sum/(c.width*c.height*3);
    },[a.toString('base64'),b.toString('base64')]);
  }
  async function shot(i){return canvases[i].screenshot();}
  const result=[];
  const pose=()=>page.evaluate(()=>({t:performance.now(),source:{q:window.parity.source.presentation.quaternion.toArray(),fov:window.parity.source.camera.fov,distance:window.parity.source.camera.position.length()},target:window.targetView}));
  async function drag(i){const b=await canvases[i].boundingBox();await page.mouse.move(b.x+180,b.y+240);await page.mouse.down();await page.mouse.move(b.x+270,b.y+290,{steps:8});const held=await pose();await page.mouse.up();return held;}
  for(let i=0;i<2;i++){
    const initial=await shot(i);const initialPose=await pose();const heldPose=await drag(i);await page.waitForTimeout(40);const movedPose=await pose();const moved=await shot(i);await page.waitForTimeout(180);const coastPose=await pose();const coast=await shot(i);
    const box=await canvases[i].boundingBox();await page.mouse.move(box.x+250,box.y+250);await page.mouse.wheel(0,150);await page.waitForTimeout(100);const zoomPose=await pose();const zoom=await shot(i);
    result.push({drag:await delta(initial,moved),coast:await delta(moved,coast),zoom:await delta(coast,zoom),initialPose,heldPose,movedPose,coastPose,zoomPose});
  }
  console.log('source and target frame deltas',JSON.stringify(result));
  assert.deepEqual(errors,[]);
  const failures=[];
  for(const name of ['drag','coast','zoom']) if(result[0][name]<=.05 || result[1][name]<=.05) failures.push(`${name}: source or target did not visibly change`);
  const src=result[0], dst=result[1];
  const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0))));
  const sourceDrag=angle(src.initialPose.source.q,src.heldPose.source.q);
  const targetDrag=angle(dst.initialPose.target.orientation,dst.heldPose.target.orientation);
  if(Math.abs(sourceDrag-targetDrag)>.08) failures.push(`drag radians source=${sourceDrag} target=${targetDrag}`);
  const sourceZoom=src.zoomPose.source.distance/src.coastPose.source.distance;
  const targetZoom=dst.zoomPose.target.zoom/dst.coastPose.target.zoom;
  if(Math.abs(sourceZoom-targetZoom)>.02) failures.push(`wheel distance ratio source=${sourceZoom} target=${targetZoom}`);
  if(src.initialPose.source.fov!==dst.initialPose.target.fovDegrees) failures.push(`default FOV source=${src.initialPose.source.fov} target=${dst.initialPose.target.fovDegrees}`);
  console.log('measured presentation poses',JSON.stringify({sourceDrag,targetDrag,source:src.initialPose.source,target:dst.initialPose.target}));

  // One page screenshot samples both viewers on the same paint at native default duration.
  async function pair() {
    const screenshot=(await page.screenshot()).toString('base64');
    return page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();
      return [0,500].map(x=>{const c=document.createElement('canvas');c.width=500;c.height=500;const ctx=c.getContext('2d');ctx.drawImage(i,x,0,500,500,0,0,500,500);return c.toDataURL().split(',')[1];});},screenshot);
  }
  const beforeTurn=await pair();
  await page.evaluate(async()=>{
    const [{PhysicalCubeScene:Source},{PhysicalCubeScene:Target}]=await Promise.all([import('/assets/reference/packages/cube-viewer/src/physical-scene.js'),import('/assets/viewer/physical-scene.js')]);
    const traces={source:[],target:[]};window.turnTraces=traces;
    for(const [kind,Class] of [['source',Source],['target',Target]]){const begin=Class.prototype.beginTurn;Class.prototype.beginTurn=function(...args){const turn=begin.apply(this,args),update=turn.update,pivot=this.bodies.get(args[0][0]).parent;turn.update=progress=>{update(progress);traces[kind].push({progress,pose:pivot.quaternion.toArray()})};return turn;};}
    const p=window.parity,move=p.parseMove('R');p.sourceTurn=p.source.animate(p.presentMove(p.native.target,move));p.targetTurn=p.player.turn('X',[1],-1,250);
    await Promise.all([p.sourceTurn,p.targetTurn]);
  });
  const after=await pair(),traces=await page.evaluate(()=>window.turnTraces);
  for(const [i,kind] of ['source','target'].entries()) {
    assert.equal(traces[kind].at(-1)?.progress,1,`${kind} turn must reach its endpoint`);
    const endpoint=traces[kind].at(-1).pose;assert.ok(traces[kind].some(({progress,pose})=>progress>0 && progress<1 && angle(pose,[0,0,0,1])>1e-4 && angle(pose,endpoint)>1e-4),`${kind} turn must present a real intermediate pose`);
    const changed=await delta(Buffer.from(beforeTurn[i],'base64'),Buffer.from(after[i],'base64'));
    assert.ok(changed>0.05,`${kind} rendered frame must change across the turn`);
  }
  await page.evaluate(()=>{const p=window.parity;p.beforeCancel=p.player.state();p.pendingCancel=p.player.turn('Y',[1],-1,1000);});
  await page.waitForTimeout(100);
  const cancel=await page.evaluate(async()=>{const p=window.parity;p.player.cancel();return {result:await p.pendingCancel,before:p.beforeCancel,after:p.player.state()};});
  assert.equal(cancel.result.error?.code,'Cancelled');assert.equal(cancel.before,cancel.after);
  const hud=await page.evaluate(async()=>{
    const select=document.querySelector('#target select[aria-label="View rotation mode"]');
    const stage=window.parity.stage,initial=select.value;
    const modeResult=stage.setRotationMode('free'),afterApi=select.value;
    stage.setRotationMode('smart');let reject=false;
    const policy=stage.setViewPolicy(()=>{if(reject)throw Error('policy denied');return {distance:12,far:100,groupScale:1}});
    reject=true;select.value='classic';select.dispatchEvent(new Event('change',{bubbles:true}));
    const afterDenied=select.value,storageAfterDenied=localStorage.getItem('parity-stage-mode');
    reject=false;select.value='free';select.dispatchEvent(new Event('change',{bubbles:true}));
    const storedMode=JSON.parse(localStorage.getItem('parity-stage-mode')).mode;
    const fresh=document.createElement('div');fresh.className='testhost';document.body.append(fresh);
    const {createCubeStage}=await import('/assets/viewer/index.js');
    const rebuilt=createCubeStage(fresh,{resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'unused'}}),rotationStorageKey:'parity-stage-mode'});
    const restored=rebuilt.ok?fresh.querySelector('select[aria-label="View rotation mode"]').value:'ERROR';if(rebuilt.ok)rebuilt.value.dispose();fresh.remove();
    const stylesheet=document.querySelector('#target').ownerDocument.querySelector('link[data-puzlwerk-rotation-css]');
    const cssStatus=stylesheet?(await fetch(stylesheet.href)).status:0;
    window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('focus'));
    return {initial,modeOk:modeResult.ok,afterApi,policyOk:policy.ok,afterDenied,storageAfterDenied,storedMode,restored,cssStatus};
  });
  assert.deepEqual(hud,{initial:'smart',modeOk:true,afterApi:'free',policyOk:true,afterDenied:'smart',storageAfterDenied:null,storedMode:'free',restored:'free',cssStatus:200});
  assert.deepEqual(failures,[],failures.join('; '));
  console.log('PASS classic 2x2 drag, coast, wheel, native/target turn and target cancellation');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
