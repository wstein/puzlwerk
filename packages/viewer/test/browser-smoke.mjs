// Run with PLAYWRIGHT_MODULE pointing to the installed Playwright module.
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  for(const [viewport,reduced] of [[{width:1024,height:768},false],[{width:390,height:844},false],[{width:390,height:844},true]]) {
    const page=await browser.newPage({viewport,reducedMotion:reduced?'reduce':'no-preference'}); const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4179/packages/viewer/demo/index.html');
    await page.locator('#status').getByText('Ready').waitFor();
    assert.equal(await page.locator('canvas').count(),1);
    await page.evaluate(() => { const original=window.pilot.scene.transition.bind(window.pilot.scene); window.pilot.scene.transition=t=>{window.pilot.duration=t.durationMs; return original(t);}; });
    await page.locator('#turn').click(); await page.locator('#status').getByText('Turn complete').waitFor();
    assert.equal(await page.evaluate(()=>window.pilot.duration),reduced?0:700);
    assert.deepEqual(errors,[]); console.log(`PASS viewport ${viewport.width}x${viewport.height} reduced=${reduced}`); await page.close();
  }
} finally {await browser.close();}
