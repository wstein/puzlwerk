import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const options={headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
if(process.env.CHROMIUM_PATH) options.executablePath=process.env.CHROMIUM_PATH;
const browser=await chromium.launch(options), page=await browser.newPage({viewport:{width:1440,height:900}});
try {
 const url=process.argv[2]; if(!url)throw Error('Usage: node cube-assembler-browser.mjs <case URL>');
 const origin=new URL(url).origin;
 await page.context().addCookies([{name:'cube-assembler-stickerless',value:'true',url:origin},{name:'cube-assembler-auto-rotate',value:'true',url:origin},{name:'sentinel',value:'keep',url:origin}]);
 const before=await page.context().cookies(), errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(url);const root=page.locator('#cube-assembler-case');await root.locator('output').waitFor();try{await page.waitForFunction(()=>document.querySelector('#cube-assembler-case output')?.textContent==='Visible facelets match at start');}catch(e){throw Error(`${e.message}\nstatus: ${await root.locator('output').textContent()}\nbrowser errors: ${JSON.stringify(errors)}`);}
 assert.equal(await root.locator('canvas').count(),1);const frame=root.locator('iframe');assert.equal(await frame.count(),1);assert.equal(await page.frameLocator('#cube-assembler-case iframe').locator('canvas').count(),1);
 const frameObject=await frame.elementHandle().then(e=>e.contentFrame());assert.equal(await frameObject.evaluate(()=>document.cookie),'');
 await page.waitForTimeout(500);const originalCanvas=page.frameLocator('#cube-assembler-case iframe').locator('canvas'), candidateCanvas=root.locator('canvas');const beforeOriginal=await originalCanvas.screenshot(), beforeCandidate=await candidateCanvas.screenshot();
 for(const token of ['R','U',"R'","U'"]){await root.getByRole('button',{name:token,exact:true}).click();await page.waitForFunction(expected=>document.querySelector('#cube-assembler-case output')?.textContent===expected,`Visible facelets match after ${token}`);if(token==='R'){await page.waitForTimeout(300);assert.ok(!beforeOriginal.equals(await originalCanvas.screenshot()),'original canvas changes');assert.ok(!beforeCandidate.equals(await candidateCanvas.screenshot()),'candidate canvas changes');}}
 assert.deepEqual(await page.context().cookies(),before);assert.deepEqual(errors,[]);console.log('PASS: 2 production canvases, 4 native/Core moves, isolated preferences, 0 browser errors');
} finally {await browser.close();}
