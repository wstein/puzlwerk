// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright module and the demo server on 127.0.0.1:4179.
// Without a user choice the installed appearance controls must keep the projection's own construction:
// the 7x7 Names demo projection is stickerless, so its cube is not drawn with the stickered default.
import {pathToFileURL} from 'node:url';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const options={headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
if(process.env.CHROMIUM_PATH) options.executablePath=process.env.CHROMIUM_PATH;
const browser=await chromium.launch(options);
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4179/packages/viewer/demo/stage.html');await page.waitForFunction(()=>window.stages?.length===3);await page.waitForTimeout(250);
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-stage-names-pixels.json',import.meta.url)));
 const png=(await page.screenshot()).toString('base64');
 const [x,y,...expected]=fixture.samples[0];
 const actual=await page.evaluate(async({png,x,y})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3);},{png,x,y});
 for(let c=0;c<3;c++)assert.ok(Math.abs(actual[c]-expected[c])<=fixture.maxChannelDifference,`stickerless 7x7 sample channel ${c}: ${actual[c]} vs ${expected[c]}`);
 assert.deepEqual(errors,[]);console.log('PASS 7x7 Names projection keeps its stickerless construction without a user choice');
}finally{await browser.close();}
