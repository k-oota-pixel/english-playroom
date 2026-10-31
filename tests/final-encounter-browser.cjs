const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fixture,correct}=require('./royal-guard-browser.cjs');
const out=path.resolve(__dirname,'../../../boss-preview/final-encounter');fs.mkdirSync(out,{recursive:true});
const number=async(page,id)=>Number((await page.locator(id).textContent()).match(/\d+/)[0]);
const resource=async page=>({hp:await number(page,'#petHpText'),mp:await number(page,'#petMpText')});
async function dismiss(page){await page.locator('.final-cinematic button').click();}
async function attackUntilScene(page,mode){for(let i=0;i<20;i++){await correct(page,mode);if(await page.locator('.final-cinematic').isVisible())return;await page.locator('#nextBtn').click();}throw Error('Missing final transition');}
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
for(const [mode,width] of [['tower',1100],['dungeon',390]]){
 const {page,errors}=await fixture(b,{mode,width});assert.equal(await page.locator('[data-start-floor="105"]').count(),0);await page.locator('[data-start-floor="100"]').click();await page.locator('.final-cinematic[data-scene="king-1"]').waitFor({state:'visible'});
 const initial=await resource(page);await page.clock.runFor(10000);assert.deepEqual(await resource(page),initial,'arrival pauses final clocks');await page.screenshot({path:path.join(out,mode+'-arrival.png')});await dismiss(page);
 await page.clock.runFor(3200);const hurt=await resource(page);assert.equal(hurt.hp,initial.hp-1,'king first form attacks at 3s');
 await page.locator('#magicBtn').click();await page.locator('.battle-action-card').filter({has:page.getByText('ミロゴロ',{exact:true})}).getByRole('button').click();let resources=await resource(page);assert.equal(resources.mp,initial.mp-5);
 const order=[];let screenshotCount=0;
 for(let transition=0;transition<12;transition++){
  await attackUntilScene(page,mode);const scene=await page.locator('.final-cinematic').getAttribute('data-scene');order.push(scene);
  if(scene==='demon-defeated')break;
  assert.deepEqual(await resource(page),resources,'HP/MP carry across final encounters');
  if(scene==='allies-2'||scene==='allies-3'){
   assert.equal(await page.locator('.final-portraits img').count(),2);await page.screenshot({path:path.join(out,mode+'-'+scene+'-intro.png')});await dismiss(page);
   assert.match(await page.locator('#enemyName').textContent(),/闇の魔術師/);assert.equal(await page.locator('.final-other-fighter').isVisible(),true);
   const before=await resource(page);await page.clock.runFor(scene==='allies-2'?(mode==='tower'?3300:20300):4300);resources=await resource(page);
   assert.ok(resources.hp<before.hp-1,'both enemies independently attack');
   if(scene==='allies-2'){assert.match(await page.locator('#enemyMpText').textContent(),mode==='tower'?/990 \/ 1000/:/935 \/ 1000/);assert.match(await page.locator('.final-other-fighter .mp-text').textContent(),/40 \/ 50/);}
   const targetBefore=await number(page,'#enemyHpText'),partnerBefore=await number(page,'.final-other-fighter .hp-text');await page.locator('#magicBtn').click();await page.locator('.battle-action-card').filter({has:page.getByText('ミロゴロ',{exact:true})}).getByRole('button').click();assert.equal(await number(page,'#enemyHpText'),targetBefore-15,'attack magic also targets mage first');assert.equal(await number(page,'.final-other-fighter .hp-text'),partnerBefore,'attack magic never leaks to the other enemy');resources=await resource(page);
   await page.screenshot({path:path.join(out,mode+'-'+scene+'-battle.png')});screenshotCount++;continue;
  }
  if(scene==='target-switch'){assert.match(await page.locator('#enemyName').textContent(),/魔王親衛隊/);assert.equal(await page.locator('.final-other-fighter.final-enemy-defeated').count(),1);}
  if(scene==='king-3'){assert.match(await page.locator('#enemyMpText').textContent(),/10000 \/ 10000/);await page.screenshot({path:path.join(out,mode+'-king-3.png')});}
  await page.clock.runFor(5000);assert.deepEqual(await resource(page),resources,'all transitions pause both clocks');await dismiss(page);
 }
 assert.deepEqual(order,['mage-1','guard-1','allies-2','target-switch','king-2','allies-3','target-switch','king-3','demon-defeated']);assert.equal(screenshotCount,2);
 const fullHp=(await page.locator('#petHpText').textContent()).split('/').map(s=>s.trim());assert.equal(fullHp[0],fullHp[1],'only final victory restores HP');assert.match(await page.locator('#finalSceneTitle').textContent(),/魔王をやっつけた/);await page.screenshot({path:path.join(out,mode+'-demon-defeated.png')});await dismiss(page);
 await page.locator('.final-cinematic[data-scene="game-clear"]').waitFor({state:'visible'});assert.match(await page.locator('#finalSceneTitle').textContent(),/GAME CLEAR/);await page.screenshot({path:path.join(out,mode+'-game-clear.png')});await dismiss(page);await page.locator('#resultCard').waitFor({state:'visible'});
 assert.equal(await page.locator('#resultTitle').textContent(),'GAME CLEAR!');assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'100F':'B100');await page.clock.runFor(15000);assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'100F':'B100');
 assert.equal(await page.evaluate(mode=>wallet[mode==='tower'?'wordTowerCleared':'eikenDungeonCleared'],mode),true);assert.equal(await page.evaluate(mode=>wallet[mode==='tower'?'wordTowerBest':'eikenDungeonBest'],mode),100);assert.equal(await page.evaluate(()=>events.filter(e=>e.kind==='defeat'&&e.floor===100).length),1);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 // Replaying resets the final encounter; the result does not leak its wave into the next run.
 await page.locator('#checkpointBtn').click();await page.locator('[data-start-floor="100"]').click();await page.locator('.final-cinematic[data-scene="king-1"]').waitFor({state:'visible'});assert.match(await page.locator('#enemyVisual img').getAttribute('src'),/final-king-1/);
 await page.close();console.log('PASS',mode,width,'seven waves, two independent enemies, priority targeting, preserved resources, final victory, saved clear, replay, no 101F');
}
const {page,errors}=await fixture(b,{mode:'tower',width:390});await page.locator('[data-start-floor="100"]').click();await page.locator('.final-cinematic[data-scene="king-1"]').waitFor({state:'visible'});await dismiss(page);await page.locator('#exitRunBtn').click();await page.locator('#resultCard').waitFor({state:'visible'});assert.match(await page.locator('#resultTitle').textContent(),/途中終了/);assert.equal(await page.evaluate(()=>wallet.wordTowerCleared),undefined);assert.equal(await page.evaluate(()=>wallet.wordTowerBest),100);assert.deepEqual(errors,[]);await page.close();console.log('PASS leaving mid-final saves reached floor but never awards game clear');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

