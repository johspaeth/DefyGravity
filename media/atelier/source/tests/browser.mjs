import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auditTextContrast } from './visual-audit.mjs';

const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'evidence/screenshots');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chromium'});
const context=await browser.newContext({viewport:{width:1600,height:1000}});
const page=await context.newPage();
const errors=[],checks=[],visualChecks=[],consoleErrors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const waitReady=()=>page.waitForFunction(()=>window.render_game_to_text && JSON.parse(window.render_game_to_text()).connected);
const idle=()=>page.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).busy);
const click=async selector=>{await page.locator(selector).click();await idle();};
const preview=()=>page.waitForFunction(()=>{
  const s=JSON.parse(window.render_game_to_text()),g=s.ghost;
  return g&&g.x===s.target.x&&g.z===s.target.z&&g.orientation===s.orientation;
});
const log=(name,detail={})=>{checks.push({name,passed:true,...detail});console.log('PASS',name);};
const shot=async name=>{
  await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:90,animations:'disabled'});
  const contrast=await auditTextContrast(page);visualChecks.push({name,...contrast});
  assert.deepEqual(contrast.failures,[],`${name}: low-contrast text`);
};
const bounds=()=>page.evaluate(()=>{
  const s=JSON.parse(window.render_game_to_text()),r=s.rendering;
  return {overflowX:document.documentElement.scrollWidth>innerWidth,
    overflowY:document.documentElement.scrollHeight>innerHeight,
    sharp:r.width===Math.round(r.cssWidth*r.dpr)&&r.height===Math.round(r.cssHeight*r.dpr)};
});
try {
  await page.goto(process.env.TEST_URL||'http://127.0.0.1:8000',{waitUntil:'domcontentloaded'});
  await waitReady();await page.evaluate(()=>document.fonts.ready);
  assert.equal((await state()).count,72);assert.equal((await state()).certificate,true);
  assert.deepEqual(await bounds(),{overflowX:false,overflowY:false,sharp:true});
  assert(await page.evaluate(()=>document.fonts.check('400 16px Switzer')&&document.fonts.check('700 24px "Cabinet Grotesk"')));
  await shot('desktop-build');log('Startup, exact scene, fonts and full-resolution desktop fit');

  await click('#sound-btn');assert.equal((await state()).soundEnabled,false);
  await click('#sound-btn');assert.equal((await state()).soundEnabled,true);
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).audioContextState==='running');
  await click('#help-btn');assert(await page.locator('#help-dialog').isVisible());
  await page.getByText('Keyboard shortcuts',{exact:true}).click();await shot('help-shortcuts');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#help-dialog').isVisible(),false);
  await click('#certificate-btn');
  await page.waitForFunction(()=>document.getElementById('verification-status').textContent.includes('Comparator: passed'));
  await shot('proof-dialog');
  const popupPromise=context.waitForEvent('page');
  await page.locator('a[href="./proof/SPECIFICATION.md"]').click();
  const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  assert(popup.url().endsWith('/proof/SPECIFICATION.md'));await popup.close();
  for(const filename of ['comparator.txt','lake-check.txt']) {
    // The standalone server serves raw log files as attachments.
    const logDownload=page.waitForEvent('download');
    await page.locator(`a[href="./proof/${filename}"]`).click();
    const file=await logDownload;assert.equal(file.suggestedFilename(),filename);
    assert((await readFile(await file.path(),'utf8')).includes('Lean default kernel accepts the solution'));
  }
  await page.keyboard.press('Escape');log('Sound cycle, help, proof report, and real evidence-link navigation');

  await click('#forces-btn');assert.equal((await state()).forcesVisible,true);
  await shot('load-paths');
  await click('[data-preset="overhang"]');
  assert.equal((await state()).count,2);assert.equal((await state()).certificate,false);
  assert.equal((await state()).forcesVisible,false);assert(await page.locator('#forces-btn').isDisabled());
  assert.equal(await page.locator('#certificate-title').textContent(),'Not certified');
  await shot('uncertified-overhang');
  await click('[data-preset="bridge"]');assert.equal((await state()).count,27);assert.equal((await state()).certificate,true);
  await click('[data-preset="domino"]');assert.equal((await state()).count,24);assert.equal((await state()).certificate,true);
  await click('[data-preset="tower"]');log('All four presets, certification distinctions and force-overlay invalidation');

  await click('#steps-btn');assert.equal((await state()).mode,'instructions');
  await click('#step-prev');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).step===71);
  await click('#step-next');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).step===72);
  await page.locator('#step-range').focus();await page.keyboard.press('Home');
  for(let i=0;i<3;i++)await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).step===3);
  assert.equal((await state()).count,3);
  await click('#check-plan-btn');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).planResult.includes('All 72'));
  await shot('construction-sequence');
  let delayed=false,announce;
  const requestSeen=new Promise(resolve=>{announce=resolve;});
  await page.route('**/api/command',async route=>{
    if(route.request().postDataJSON()?.cmd==='prefix'&&!delayed) {
      delayed=true;const response=await route.fetch();announce();
      // A deliberately late response tests that pause invalidates an in-flight step.
      await new Promise(resolve=>setTimeout(resolve,450));await route.fulfill({response});
    } else await route.continue();
  });
  await click('#step-play');await requestSeen;
  await click('#step-play');const stoppedStep=(await state()).step;
  // Real elapsed time must pass to expose a late response or scheduled next step.
  await page.waitForTimeout(850);
  assert.equal((await state()).step,stoppedStep);assert.equal((await state()).stepPlaying,false);
  await page.unroute('**/api/command');await click('#steps-close');
  log('Instruction slider, previous/next, every-prefix checking, and in-flight pause cancellation');

  await click('#new-btn');await preview();assert.equal((await state()).count,0);
  const origin={...(await state()).target};
  for(const [key,axis,delta,reverse] of [
    ['ArrowLeft','x',-2,'ArrowRight'],['ArrowRight','x',2,'ArrowLeft'],
    ['ArrowUp','z',-2,'ArrowDown'],['ArrowDown','z',2,'ArrowUp']]) {
    await page.keyboard.press(key);await preview();assert.equal((await state()).target[axis],origin[axis]+delta);
    await page.keyboard.press(reverse);await preview();assert.deepEqual((await state()).target,origin);
  }
  for(let orientation=0;orientation<6;orientation++) {
    await click(`[data-pose="${Math.floor(orientation/2)*2}"]`);
    if((await state()).orientation!==orientation)await click('#rotate-btn');
    await preview();const ghost=(await state()).ghost;
    await click('#place-btn');
    const s=await state(),last=s.blocks.at(-1);
    assert.equal(s.count,orientation+1);
    for(const key of ['x','y','z','orientation'])assert.equal(last[key],ghost[key]);
  }
  await page.keyboard.press('Control+z');await idle();assert.equal((await state()).count,5);
  await click('#undo-btn');assert.equal((await state()).count,4);
  log('Opposite coordinate inputs, all six orientations, authoritative previews, place and both undo controls');

  await click('#new-btn');await preview();
  await page.mouse.click(800,440);await idle();assert.equal((await state()).count,1);
  await page.keyboard.press('v');
  const beforeOrbit=(await state()).camera;
  await page.mouse.move(760,370);await page.mouse.down();
  await page.mouse.move(900,430,{steps:12});await page.mouse.up();
  await page.waitForFunction(before=>JSON.stringify(JSON.parse(window.render_game_to_text()).camera.position)!==JSON.stringify(before),beforeOrbit.position);
  const zoom=(await state()).camera.zoom;
  await click('#zoom-in-btn');assert((await state()).camera.zoom>zoom);
  await click('#zoom-out-btn');assert(Math.abs((await state()).camera.zoom-zoom)<1e-6);
  await click('#reset-camera-btn');assert.equal((await state()).camera.zoom,1);
  await page.keyboard.press('x');
  // Search the actual visible scene for an instance hover, then click normally.
  let picked=false;
  for(let y=320;y<=600&&!picked;y+=15)for(let x=480;x<=1000&&!picked;x+=15) {
    await page.mouse.move(x,y);
    const hovered=(await state()).hoveredPlankId;
    if(hovered!==null) {
      await page.mouse.click(x,y);await idle();
      if((await state()).count===0)picked=true;
    }
  }
  assert(picked);await click('#undo-btn');assert.equal((await state()).count,1);
  log('Pointer placement and removal, keyboard tools, orbit, zoom cycle and refit');

  await click('[data-preset="bridge"]');
  const downloadPromise=page.waitForEvent('download');await click('#save-btn');
  const download=await downloadPromise;
  const saved=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(saved.count,27);assert.equal(saved.certified,true);
  await click('#new-btn');
  await page.locator('#import-file').setInputFiles({name:'bridge.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).count===27);
  const revision=(await state()).revision;
  const corrupt=structuredClone(saved);corrupt.certificate.scale='0';
  await page.locator('#import-file').setInputFiles({name:'bad-certificate.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
  await page.waitForFunction(()=>Boolean(JSON.parse(window.render_game_to_text()).error));
  assert.equal((await state()).revision,revision);assert.equal((await state()).count,27);assert.equal((await state()).connected,true);
  log('Real JSON download/import round trip and rejection of a tampered certificate without mutation');

  await click('[data-preset="tower"]');
  const canonical=(await state()).blocks;
  await click('#gravity-btn');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='physics');
  assert(await page.evaluate(()=>document.getElementById('toast').getBoundingClientRect().bottom<=document.querySelector('.play-toolbar').getBoundingClientRect().top));
  await shot('physics-hint');
  await click('#quake-btn');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).physicsTime>4);
  const moving=await state();
  assert.equal(moving.certificate,null);assert.equal(moving.bodies.length,72);
  assert(moving.bodies.some(b=>Math.abs(b.position.x)>3||Math.abs(b.position.z)>3));
  assert(moving.fps>=30,`Active FPS was ${moving.fps}`);
  await click('#pause-btn');await page.waitForFunction(()=>document.getElementById('toast').hidden);
  const frozen=await state();await page.evaluate(()=>window.advanceTime(1000));
  const later=await state();assert.deepEqual(later.bodies,frozen.bodies);assert.equal(later.physicsTime,frozen.physicsTime);
  assert(await page.locator('#nudge-btn').isDisabled());assert(await page.locator('#quake-btn').isDisabled());
  await click('#reset-camera-btn');await shot('physics-paused');
  await click('#pause-btn');await click('#slow-btn');
  const slowStart=(await state()).physicsTime;await page.evaluate(()=>window.advanceTime(1000));
  assert(Math.abs((await state()).physicsTime-slowStart-.22)<.03);
  await click('#slow-btn');const normalStart=(await state()).physicsTime;await page.evaluate(()=>window.advanceTime(1000));
  assert(Math.abs((await state()).physicsTime-normalStart-1)<.03);
  await click('#rebuild-btn');assert.deepEqual((await state()).blocks,canonical);assert.equal((await state()).certificate,true);
  log('Real-time quake, null physics certification, exact pause freeze, slow-motion ratio, moving-pose refit and rebuild',{fps:moving.fps});

  await click('[data-preset="domino"]');await click('#play-mode');
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='physics');
  await click('#nudge-btn');await page.evaluate(()=>window.advanceTime(10000));
  const domino=await state(),fallen=domino.bodies.filter(b=>b.position.y<1).length;
  assert(fallen>=12,`Only ${fallen} dominos fell`);
  await click('#pause-btn');await click('#reset-camera-btn');await shot('domino-chain');
  await click('#build-mode');assert.equal((await state()).certificate,true);
  log('Nudge starts a domino chain reaction and Build restores the canonical scene',{fallen});

  await click('[data-preset="tower"]');await page.setViewportSize({width:375,height:812});
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).rendering.cssWidth<400);
  assert.deepEqual(await bounds(),{overflowX:false,overflowY:false,sharp:true});await shot('mobile-build');
  await click('#certificate-btn');await click('#proof-forces-btn');assert.equal((await state()).forcesVisible,true);
  await shot('mobile-load-paths');
  await click('#play-mode');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).mode==='physics');
  await click('#pause-btn');await page.waitForFunction(()=>document.getElementById('toast').hidden);
  assert.equal(await page.locator('.inspector').isVisible(),false);
  await shot('mobile-physics');await click('#rebuild-btn');
  await click('#new-btn');await preview();await click('[data-pose="4"]');await preview();await click('#place-btn');
  assert.equal((await state()).count,1);await preview();
  assert.equal(await page.locator('.inspector').isVisible(),false);
  await click('#placement-status');assert(await page.locator('#proof-dialog').isVisible());
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('toast').hidden);
  await shot('mobile-placement');
  await page.setViewportSize({width:1600,height:1000});
  await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).rendering.cssWidth>1500);
  assert.deepEqual(await bounds(),{overflowX:false,overflowY:false,sharp:true});
  await page.setViewportSize({width:1280,height:600});await click('[data-preset="tower"]');
  await page.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).busy);
  await page.evaluate(()=>scrollTo(0,0));
  assert.equal((await bounds()).overflowX,false);assert.equal((await bounds()).sharp,true);
  await shot('short-window');
  log('Live desktop-mobile-desktop resize, mobile forces and placement, unclipped physics controls, and short-window layout');

  await page.setViewportSize({width:1600,height:1000});
  await page.route('**/api/command',route=>route.abort('failed'));
  await click('#new-btn');assert.equal((await state()).connected,false);
  assert.equal(await page.locator('#certificate-title').textContent(),'Lean disconnected');
  assert(await page.locator('#tool-place').isDisabled());assert(await page.locator('#save-btn').isDisabled());
  await shot('backend-disconnected');await page.unroute('**/api/command');
  await page.reload({waitUntil:'domcontentloaded'});await waitReady();assert.equal((await state()).count,72);
  log('Backend failure disables editing without a stale green status; reload reconnects');
  await click('#tool-place');await preview();
  await page.route('**/api/command',route=>route.abort('failed'));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>!JSON.parse(window.render_game_to_text()).connected);
  assert(await page.locator('#place-btn').isDisabled());
  await click('#certificate-btn');
  assert.match(await page.locator('#proof-scene-status').textContent(),/Lean is disconnected/);
  await page.keyboard.press('Escape');await page.unroute('**/api/command');
  await page.reload({waitUntil:'domcontentloaded'});await waitReady();
  log('Placement-preview transport failure also clears the connection status and disables writes');
  assert.deepEqual(errors,[]);log('No uncaught browser exceptions');
  const unexpectedConsoleErrors=consoleErrors.filter(message=>
    !message.includes('net::ERR_FAILED')&&!message.includes('422 (Unprocessable Entity)'));
  assert.deepEqual(unexpectedConsoleErrors,[]);
  log('Computed small-label contrast at least 4.5:1 in every captured state; no unexpected console errors');
  await writeFile(path.join(root,'evidence/browser-qa.json'),JSON.stringify({
    checkedAt:new Date().toISOString(),passed:true,checks,visualChecks,errors,unexpectedConsoleErrors,
    expectedConsoleErrors:consoleErrors,viewports:['1600×1000','375×812','1280×600'],
  },null,2)+'\n');
  console.log('BROWSER TESTS PASSED');
} finally { await context.close();await browser.close(); }
