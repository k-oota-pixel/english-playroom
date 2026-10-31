const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fixture,clearForm}=require('./royal-guard-browser.cjs');
const out=path.resolve(__dirname,'../../../boss-preview/dark-mage');fs.mkdirSync(out,{recursive:true});
async function castSpell(page,name){await page.locator('#magicBtn').click();await page.locator('.battle-action-card').filter({has:page.getByText(name,{exact:true})}).getByRole('button').click();}
const hp=async page=>Number((await page.locator('#enemyHpText').textContent()).split('/')[0]);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
for(const [mode,width] of [['tower',1100],['dungeon',390]]){
 const {page,errors}=await fixture(b,{mode,width});await page.locator('[data-start-floor="50"]').click();
 await page.locator('.guard-cinematic[data-scene="arrival"][data-boss="mage"]').waitFor({state:'visible'});
 assert.match(await page.locator('#guardCinematicTitle').textContent(),/大ボス・闇の魔術師が現れた！/);assert.match(await page.locator('#enemyMpText').textContent(),/500 \/ 500/);
 const initialHealth=await page.locator('#petHpText').textContent();await page.clock.runFor(10000);assert.equal(await page.locator('#petHpText').textContent(),initialHealth);
 await page.screenshot({path:path.join(out,mode+'-arrival.png')});await page.locator('.guard-cinematic button').click();
 await page.clock.runFor(1200);assert.notEqual(await page.locator('#petHpText').textContent(),initialHealth,'weak normal attack still occurs');
 await castSpell(page,'ミロゴロ');const wounded=await hp(page);await page.clock.runFor(1100);assert.ok(await hp(page)>wounded,'first form quickly heals damage');assert.match(await page.locator('#enemyMpText').textContent(),/495 \/ 500/);assert.match(await page.locator('#battleFlash').textContent(),/ミムロス/);
 await page.clock.runFor(1100);assert.match(await page.locator('#enemyMpText').textContent(),/490 \/ 500/,'healing can repeat on consecutive actions');
 await page.screenshot({path:path.join(out,mode+'-battle.png')});
 await clearForm(page,mode,'magic');assert.match(await page.locator('#guardCinematicTitle').textContent(),/闇の魔術師が第2形態に進化！/);assert.match(await page.locator('#enemyVisual img').getAttribute('src'),/dark-mage-2/);assert.match(await page.locator('#enemyMpText').textContent(),/1000 \/ 1000/);
 assert.notEqual(await page.locator('#petHpText').textContent(),initialHealth,'first form is not a full clear');await page.screenshot({path:path.join(out,mode+'-evolve.png')});
 const evolveHealth=await page.locator('#petHpText').textContent();await page.clock.runFor(10000);assert.equal(await page.locator('#petHpText').textContent(),evolveHealth);await page.locator('.guard-cinematic button').click();
 await page.clock.runFor(1700);assert.match(await page.locator('#enemyMpText').textContent(),/990 \/ 1000/);assert.match(await page.locator('#battleFlash').textContent(),/ミロゴロン/);
 await castSpell(page,'ミロゴロン');const secondWounded=await hp(page);await page.clock.runFor(1600);assert.ok(await hp(page)>secondWounded);assert.match(await page.locator('#enemyMpText').textContent(),/980 \/ 1000/);assert.match(await page.locator('#battleFlash').textContent(),/ミムローズ/);
 await clearForm(page,mode,'magic');assert.match(await page.locator('#guardCinematicTitle').textContent(),/闇の魔術師をやっつけた！/);await page.screenshot({path:path.join(out,mode+'-victory.png')});
 await page.locator('.guard-cinematic button').click();await page.clock.runFor(700);assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'51F':'B51');await page.locator('#exitRunBtn').click();await page.locator('#resultCard').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>events.filter(e=>e.kind==='defeat'&&e.floor===50).length),1);
 await page.locator('#checkpointBtn').click();await page.locator('[data-start-floor="45"]').click();assert.equal(await page.locator('#enemyName').textContent(),'BOSS');assert.equal(await page.locator('.guard-cinematic').isVisible(),false);assert.equal(await page.locator('#enemyVisual img').count(),0);
 await page.locator('#exitRunBtn').click();await page.locator('#resultCard').waitFor({state:'visible'});await page.locator('#checkpointBtn').click();await page.locator('[data-start-floor="30"]').click();assert.equal(await page.locator('#enemyName').textContent(),'マグマンダー');assert.match(await page.locator('#enemyVisual img').getAttribute('src'),/magmander/);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close();console.log('PASS',mode,width,'30F magma / 45F ordinary / 50F fast repeat healing / MP500→1000 / advanced-only form / cinematics / single defeat / 51F');
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

