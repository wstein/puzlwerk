// Usage: PLAYWRIGHT_MODULE=/absolute/index.mjs [CHROMIUM_PATH=...] node cube-assembler-blocked-browser.mjs <case URL>, for example http://127.0.0.1:8765/puzlwerk/acceptance/cube-assembler-solved-2/
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2] && process.env.PLAYWRIGHT_MODULE,'supply case URL and PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const options={headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
if(process.env.CHROMIUM_PATH) options.executablePath=process.env.CHROMIUM_PATH;
const browser=await chromium.launch(options);
try {
 const page=await browser.newPage();
 await page.goto(new URL(process.argv[2]).href,{waitUntil:'networkidle'});
 await page.locator('#cube-assembler-case output',{hasText:/^BLOCKED: source mesh/}).waitFor({timeout:5000});
 console.log('PASS unsupported CubeAssembler source mesh is visibly blocked');
} finally {await browser.close();}
