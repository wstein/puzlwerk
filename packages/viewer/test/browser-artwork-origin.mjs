// Run with PLAYWRIGHT_MODULE and the demo server, as for browser-smoke.mjs.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:600,height:300},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/packages/viewer/demo/index.html');
 const result=await page.evaluate(async()=>{
  const THREE=await import('three'),{createSceneForTest}=await import('/packages/viewer/dist/scene.js');
  const c=document.createElement('canvas');c.width=c.height=16;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,16,8);ctx.fillStyle='#0000ff';ctx.fillRect(0,8,16,8);
  const flipped=document.createElement('canvas');flipped.width=flipped.height=16;const f=flipped.getContext('2d');f.translate(0,16);f.scale(1,-1);f.drawImage(c,0,0);
  const bitmap=await createImageBitmap(c,{imageOrientation:'flipY'});const sources=[flipped,bitmap],pixels=[];
  for(const image of sources){const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,preserveDrawingBuffer:true});renderer.setSize(128,128,false);const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);let cb;
   const scene=createSceneForTest({resolveAsset:async()=>({ok:true,value:image})},{now:()=>0,request:f=>{cb=f;return 1},cancel(){}},{render:s=>renderer.render(s,camera),dispose:()=>renderer.dispose()});
   const s={id:'s',transform:{position:[0,0,.502],rotation:[0,0,0,1]},size:[.87,.87],color:'#ffffff',sourceFace:{normal:[0,0,1],up:[0,1,0]},picture:{face:'F',layerIndex:[0,0,0]}};
   const result=await scene.setProjection({pieces:[{id:'p',transform:{position:[0,0,0],rotation:[0,0,0,1]},stickers:[s]}],picture:{widths:[1],faces:{U:'x',R:'x',F:'x',D:'x',L:'x',B:'x'}}});if(!result.ok)throw Error(result.error.message);cb(0);
   const out=new Uint8Array(128*128*4);renderer.getContext().readPixels(0,0,128,128,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,out);pixels.push([...out]);scene.dispose();}
  bitmap.close();let difference=0;for(let i=0;i<pixels[0].length;i++)if(pixels[0][i]!==pixels[1][i])difference++;return {difference,distinct:new Set(pixels[0]).size};
 });
 assert.equal(result.difference,0);assert.ok(result.distinct>5);assert.deepEqual(errors,[]);console.log('PASS bottom-left Canvas and ImageBitmap produce identical asymmetric pixels');await page.close();
} finally {await browser.close();}
