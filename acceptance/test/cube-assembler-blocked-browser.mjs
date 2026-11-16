// Run against the local acceptance server: PLAYWRIGHT_MODULE=/absolute/index.mjs node ... http://127.0.0.1:4178
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
assert.ok(process.argv[2] && process.env.PLAYWRIGHT_MODULE,'supply local base URL and PLAYWRIGHT_MODULE');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage();
 await page.goto(new URL('/acceptance/cube-assembler-solved-2/',process.argv[2]).href,{waitUntil:'networkidle'});
 await page.getByText(/BLOCKED.*source mesh/i).waitFor({timeout:5000});
 console.log('PASS unsupported CubeAssembler source mesh is visibly blocked');
} finally {await browser.close();}
