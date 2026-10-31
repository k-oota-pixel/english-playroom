const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fixture,correct}=require('./royal-guard-browser.cjs');
const out=path.resolve(__dirname,'../../../boss-preview/spoiler-stats');fs.mkdirSync(out,{recursive:true});
async function reachNext(page,mode){for(let i=0;i<20;i++){await correct(page,mode);if(await page.locator('.final-cinematic').isVisible())return;await page.locator('#nextBtn').click();}throw Error('Missing scene');}
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
for(const [mode,width] of [['tower',1100],['dungeon',390]]){
const {page,errors}=await fixture(browser,{mode,width,applyStats:true});assert.match(await page.locator('#petStats').textContent(),/HP 100 · 攻撃力 30 · 防御力 30 · MP 100/);
await page.route('https://k-oota-pixel.github.io/english-playroom/auth-session.js**',r=>r.fulfill({contentType:'text/javascript',body:'export const onAuthStateChanged=(auth,fn)=>{fn(auth.currentUser);return()=>{}};'}));
assert.equal(await page.evaluate(()=>writes.filter(p=>p.petAdminStatsAdjustment).length),1);assert.ok(await page.evaluate(()=>wallet.petAdminGrantedPoints>0));
await page.locator('[data-start-floor="100"]').click();await page.locator('.final-cinematic').waitFor({state:'visible'});
for(let i=0;i<4;i++){assert.equal(await page.locator('.final-kicker').textContent(),'FINAL BATTLE');assert.doesNotMatch(await page.locator('#enemyCount').textContent(),/\d\s*\/\s*7/);assert.doesNotMatch(await page.locator('#bossBadge').textContent(),/\d\s*\/\s*7/);if(i===3)break;await page.locator('.final-cinematic button').click();await reachNext(page,mode);}
assert.equal(await page.locator('.final-cinematic').getAttribute('data-scene'),'allies-2');await page.screenshot({path:path.join(out,mode+'-intro.png')});await page.locator('.final-cinematic button').click();await page.screenshot({path:path.join(out,mode+'-battle.png')});
// The shared strength panel reads the saved adjustment without trimming it to title points.
await page.evaluate(async()=>{Object.assign(wallet,{titleCountSummaryVersion:1,titleCountRevision:0,titleCountSyncedRevision:0,unlockedTitleCount:3});const button=document.createElement('button');button.id='petStrengthOpen';button.textContent='ペット強化';document.body.append(button);await import('/pet-strength.js?v=2.3.23');});
await page.locator('#petStrengthOpen').click();await page.locator('.strength-row').first().waitFor();const values=await page.locator('.strength-row strong').allTextContents();assert.deepEqual(values,['HP　100','攻撃力　30','防御力　30','MP　100']);assert.deepEqual(errors,[]);await page.close();console.log('PASS',mode,width,'no progress spoilers; saved exact admin stats; correct strength panel');
}
const {page,errors}=await fixture(browser,{admin:false,applyStats:true});assert.equal(await page.evaluate(()=>writes.some(p=>p.petAdminStatsAdjustment)),false);assert.equal(await page.evaluate(()=>wallet.petStrength.attack),50);assert.deepEqual(errors,[]);await page.close();console.log('PASS normal users receive no stat adjustment');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

