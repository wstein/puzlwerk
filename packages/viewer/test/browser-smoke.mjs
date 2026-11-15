// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright module.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  for(const viewport of [{width:1024,height:768},{width:390,height:844}]) {
    const page=await browser.newPage({viewport}); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4179/packages/viewer/demo/index.html');
    await page.locator('#status').getByText('Ready').waitFor();
    assert.equal(await page.locator('canvas').count(),1);
    await page.locator('#turn').click(); await page.locator('#status').getByText('Turn complete').waitFor();
    assert.deepEqual(errors,[]); console.log(`PASS viewport ${viewport.width}x${viewport.height}`); await page.close();
  }
} finally {await browser.close();}
