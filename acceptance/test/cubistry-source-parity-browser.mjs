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
await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve));
const browser = await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:1200,height:700},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4177/');
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
      onViewChanged:v=>{window.targetView={...v,t:performance.now()}},
    });
    if (!made.ok) throw Error(JSON.stringify(made));
    const added=made.value.addCube({position:[0,0,0]}); if(!added.ok) throw Error(JSON.stringify(added));
    const scene=added.value, palette=Object.fromEntries(native.assets.images.filter(x=>x.kind==='color').map(x=>[x.id,x.color]));
    const opened=createPlayer(JSON.stringify(definition),JSON.stringify(state),JSON.stringify(appearance),{palette,defaultColor:'#ffffff'},scene);
    if (!opened.ok) throw Error(JSON.stringify(opened));
    const player=opened.value, set=await scene.setProjection(player.projection()); if (!set.ok) throw Error(JSON.stringify(set));
    window.parity={source,scene,player,native,assets,parseMove,presentMove};
  });
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
  async function drag(i){const b=await canvases[i].boundingBox();await page.mouse.move(b.x+180,b.y+240);await page.mouse.down();await page.mouse.move(b.x+270,b.y+290,{steps:8});await page.mouse.up();}
  const result=[];
  const pose=()=>page.evaluate(()=>({t:performance.now(),source:{q:window.parity.source.presentation.quaternion.toArray(),fov:window.parity.source.camera.fov,distance:window.parity.source.camera.position.length()},target:window.targetView}));
  for(let i=0;i<2;i++){
    const initial=await shot(i);const initialPose=await pose();await drag(i);await page.waitForTimeout(40);const movedPose=await pose();const moved=await shot(i);await page.waitForTimeout(180);const coastPose=await pose();const coast=await shot(i);
    const box=await canvases[i].boundingBox();await page.mouse.move(box.x+250,box.y+250);await page.mouse.wheel(0,150);await page.waitForTimeout(100);const zoomPose=await pose();const zoom=await shot(i);
    result.push({drag:await delta(initial,moved),coast:await delta(moved,coast),zoom:await delta(coast,zoom),initialPose,movedPose,coastPose,zoomPose});
  }
  console.log('source and target frame deltas',JSON.stringify(result));
  assert.deepEqual(errors,[]);
  const failures=[];
  for(const name of ['drag','coast','zoom']) if(result[0][name]<=.05 || result[1][name]<=.05) failures.push(`${name}: source or target did not visibly change`);
  const src=result[0], dst=result[1];
  const angle=(a,b)=>2*Math.acos(Math.min(1,Math.abs(a.reduce((sum,v,i)=>sum+v*b[i],0))));
  const sourceDrag=angle(src.initialPose.source.q,src.movedPose.source.q);
  const targetDrag=angle(dst.initialPose.target.orientation,dst.movedPose.target.orientation);
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
  await page.evaluate(()=>{const p=window.parity; const move=p.parseMove('R');p.sourceTurn=p.source.animate(p.presentMove(p.native.target,move));p.targetTurn=p.player.turn('X',[1],-1,250);});
  await page.waitForTimeout(125);const during=await pair();
  await page.waitForTimeout(175);await page.evaluate(async()=>{const p=window.parity;await Promise.all([p.sourceTurn,p.targetTurn]);});
  const after=await pair();
  for(let i=0;i<2;i++) {
    const first=await delta(Buffer.from(beforeTurn[i],'base64'),Buffer.from(during[i],'base64'));
    const second=await delta(Buffer.from(during[i],'base64'),Buffer.from(after[i],'base64'));
    assert.ok(first>0.05 && second>0.05, `${i?'target':'source'} turn must change before and after the shared mid-frame`);
  }
  await page.evaluate(()=>{const p=window.parity;p.beforeCancel=p.player.state();p.pendingCancel=p.player.turn('Y',[1],-1,1000);});
  await page.waitForTimeout(100);
  const cancel=await page.evaluate(async()=>{const p=window.parity;p.player.cancel();return {result:await p.pendingCancel,before:p.beforeCancel,after:p.player.state()};});
  assert.equal(cancel.result.error?.code,'Cancelled');assert.equal(cancel.before,cancel.after);
  assert.deepEqual(failures,[],failures.join('; '));
  console.log('PASS classic 2x2 drag, coast, wheel, native/target turn and target cancellation');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
