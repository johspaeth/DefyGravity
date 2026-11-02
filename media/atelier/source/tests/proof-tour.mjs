import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditTextContrast } from './visual-audit.mjs';
import { lessons } from '../web/theorems.js';

const root=path.resolve(import.meta.dirname,'..');
export async function testProofTour(page,{screenshots=true}={}) {
  const checks=[],visual=[],errors=[],responses=[];
  const onError=e=>errors.push(e.message);
  const onResponse=r=>{if(r.url().endsWith('/api/command'))responses.push(r.status());};
  page.on('pageerror',onError);page.on('response',onResponse);
  const state=()=>page.evaluate(()=>JSON.parse(render_game_to_text()));
  const idle=()=>page.waitForFunction(()=>!JSON.parse(render_game_to_text()).busy);
  const click=async s=>{await page.locator(s).click();await idle();};
  const tourReady=()=>page.waitForFunction(()=>{const s=JSON.parse(render_game_to_text());return s.mode==='proof-tour'&&!s.busy&&s.proofTour?.record;});
  const select=async i=>{await click(`[data-lesson="${i}"]`);await tourReady();};
  const shot=async name=>{
    if(!screenshots)return;
    await mkdir(path.join(root,'evidence/tour'),{recursive:true});
    await page.screenshot({path:path.join(root,'evidence/tour',name+'.jpg'),type:'jpeg',quality:85});
    const contrast=await auditTextContrast(page);assert.equal(contrast.failures.length,0,JSON.stringify(contrast.failures));
    visual.push({name,...contrast});
  };
  const sharp=async()=>assert(await page.evaluate(()=>{
    const s=JSON.parse(render_game_to_text()),r=s.rendering;
    return document.querySelectorAll('canvas').length===1&&r.width===Math.round(r.cssWidth*r.dpr)&&
      r.height===Math.round(r.cssHeight*r.dpr)&&document.documentElement.scrollWidth<=innerWidth;
  }));
  try {
    await page.waitForFunction(()=>window.render_game_to_text&&JSON.parse(render_game_to_text()).connected);
    if((await state()).mode==='proof-tour')await click('#tour-close');
    await page.setViewportSize({width:1600,height:1000});
    await click('#new-btn');
    await page.waitForFunction(()=>!!JSON.parse(render_game_to_text()).ghost);
    await click('#place-btn');await click('#tool-view');await click('#forces-btn');
    const original=await state();assert.equal(original.count,1);assert(original.canUndo);
    await click('#tour-open');await tourReady();
    await page.waitForFunction(()=>document.getElementById('tour-evidence-status').textContent.includes('Comparator: passed'));
    for(let i=0;i<6;i++){
      await select(i);
      const s=await state();assert.equal(s.proofTour.theorem,lessons[i].name);
      for(const key of ['meaning','so','provides','how','why','boundary'])assert((await page.locator(`#tour-${key}`).innerText()).length>30);
      await page.locator('#tour-source summary').click();
      assert((await page.locator('#tour-statement').innerText()).startsWith(`theorem ${lessons[i].name} `));
      await page.locator('#tour-source summary').click();
      await page.mouse.move(4,4);await page.mouse.wheel(0,-4000);
      await page.waitForFunction(()=>scrollY===0);
      await sharp();await shot(`theorem-${i+1}`);
      if(i===0){
        const raised=s.ghost.y;await click('#tour-action');assert.equal((await state()).ghost.y,raised-20);
        await click('#tour-action');assert.equal((await state()).ghost.y,raised);
      }else if(i===1){
        await click('#tour-action');
        assert.equal((await state()).proofTour.resultKind,'rejected');assert.equal((await state()).count,2);
        assert.match((await page.locator('#tour-result').innerText()),/Overlapping planks/);
        await shot('rejected-overlap');
      }else if(i===2){
        await page.locator('#tour-range').focus();await page.keyboard.press('End');
        assert.equal((await state()).ghost.y,50);
        await page.keyboard.press('Home');assert.equal((await state()).ghost.y,30);
        await click('#tour-action');assert.equal((await state()).ghost.y,50);
      }else if(i===3){
        await click('#tour-action');assert.equal((await state()).count,3);
        await click('#tour-action');assert.equal((await state()).count,3);
        assert.equal((await state()).proofTour.resultKind,'rejected');
        assert.match(await page.locator('#tour-result').innerText(),/box is empty/);
      }else if(i===4){
        await page.locator('#tour-range').focus();await page.keyboard.press('End');await idle();
        assert.equal((await state()).count,27);
        await page.keyboard.press('Home');await idle();assert.equal((await state()).count,0);
        await click('#tour-action');assert.equal((await state()).count,27);
        await shot('complete-replay');
      }else{
        assert.equal(s.proofTour.certificateAccepted,true);assert(s.forcesVisible);
        await click('#tour-action');assert.equal((await state()).proofTour.certificateAccepted,false);
        assert.equal((await state()).forcesVisible,false);assert.equal((await state()).count,3);
        await shot('rejected-force');
        await click('#tour-action');assert.equal((await state()).proofTour.certificateAccepted,true);
        assert.equal((await state()).forcesVisible,true);
      }
      checks.push(`Theorem ${i+1}: exact statement, explanation and interactive example`);
    }
    assert(responses.filter(status=>status===422).length>=2,'Expected real Lean rejections were not observed');
    const camera=(await state()).camera;
    const rect=await page.locator('#workshop').boundingBox();
    await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();
    await page.mouse.move(rect.x+rect.width/2+80,rect.y+rect.height/2+40,{steps:8});await page.mouse.up();
    assert.notEqual(JSON.stringify((await state()).camera.position),JSON.stringify(camera.position));
    await click('#tour-fit');
    await page.setViewportSize({width:375,height:812});
    await page.waitForFunction(()=>JSON.parse(render_game_to_text()).rendering.cssWidth<400);
    await sharp();
    await page.mouse.move(2,2);await page.mouse.wheel(0,-5000);await page.waitForFunction(()=>scrollY===0);
    await shot('mobile-start');
    await page.locator('#tour-viewport').scrollIntoViewIfNeeded();await shot('mobile-scene');
    await page.locator('#tour-source summary').click();
    await page.locator('#tour-statement').scrollIntoViewIfNeeded();await shot('mobile-statement');
    await page.setViewportSize({width:1600,height:1000});
    await page.waitForFunction(()=>JSON.parse(render_game_to_text()).rendering.cssWidth>500);
    await sharp();checks.push('Orbit/refit, desktop-mobile-desktop, sharp single canvas and scrollable exact statement');
    await click('#tour-close');
    const restored=await state();
    assert.equal(JSON.stringify(restored.blocks),JSON.stringify(original.blocks));
    assert.equal(restored.revision,original.revision);assert.equal(restored.canUndo,original.canUndo);
    assert.equal(restored.forcesVisible,original.forcesVisible);
    await click('#undo-btn');assert.equal((await state()).count,0);
    checks.push('Original construction, revision, forces and Undo history preserved');
    await click('#certificate-btn');await click('#tour-from-proof');await tourReady();
    await page.route('**/api/command',route=>route.abort('failed'));
    await click('#tour-reset');
    assert.equal((await state()).proofTour.resultKind,'error');assert.equal((await state()).forcesVisible,false);
    await page.unroute('**/api/command');
    await click('#tour-reset');await tourReady();
    let drainedResolve;
    const drained=new Promise(resolve=>{drainedResolve=resolve;});
    await page.route('**/api/command',async route=>{
      await new Promise(resolve=>setTimeout(resolve,500));
      try{await route.continue();}catch{/* Request was deliberately aborted by closing. */}
      finally{drainedResolve();}
    });
    await page.locator('#tour-reset').click();
    await page.waitForFunction(()=>JSON.parse(render_game_to_text()).proofTour?.busy);
    await page.locator('#tour-close').click();await drained;
    await page.unroute('**/api/command');
    assert.equal((await state()).mode,'build');assert.equal((await state()).count,0);
    await click('#tour-open');await tourReady();await page.keyboard.press('Escape');
    assert.equal((await state()).mode,'build');
    checks.push('Proof-dialog entry, network failure without false acceptance, close during request and safe reopen');
    await click('[data-preset="tower"]');
    assert.equal(errors.length,0,errors.join('\n'));
    const report={checkedAt:new Date().toISOString(),passed:true,checks,visualChecks:visual,pageErrors:errors,
      expectedHttpRejections:responses.filter(status=>status===422).length,
      boundary:'Examples and UI are tested, not formally proved. Frozen Lean theorem sources are unchanged.'};
    await writeFile(path.join(root,'evidence/proof-tour-qa.json'),JSON.stringify(report,null,2)+'\n');
    return report;
  }finally{page.off('pageerror',onError);page.off('response',onResponse);}
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true,channel:'chromium'});
  try{
    const context=await browser.newContext({viewport:{width:1600,height:1000}});
    const page=await context.newPage();
    await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});
    const report=await testProofTour(page);for(const check of report.checks)console.log('PASS',check);
  }finally{await browser.close();}
}
