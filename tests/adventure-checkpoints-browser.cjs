const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1100,320]){
const page=await browser.newPage({viewport:{width,height:740}}),errors=[];let realStrength=false,fixtureUid='test',towerBest=37,dungeonBest=20;
 await page.addInitScript(()=>{window.adventureTitleEvents=[];window.EnglishPlayroomCoins={recordTitleEvent:(appId,event)=>{window.adventureTitleEvents.push({appId,...event});}};});
 await page.clock.install();await page.clock.pauseAt(Date.now());
 page.setDefaultTimeout(12000);page.on('pageerror',e=>(errors.push(e.message),console.log('PAGE ERROR',e.message)));
 await page.route('https://adventure.test/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<button id=petClean>clean</button>'});const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
  let body,type='text/javascript';
  if(file==='shell-bridge.js')body='';else if(file==='coin-reward.js')body="export const db={};export const auth={currentUser:{uid:'"+fixtureUid+"',getIdToken:async()=>'fixture'}};export const authReady=Promise.resolve();export const walletRef=()=>({});";
  else if(file==='pet-strength.js'&&!realStrength)body='export const loadStrengthTitles=async()=>6;';
  else if(file==='pet-art.js')body=fs.readFileSync('pet-art.js','utf8').replace(/^if\(typeof window.*$/gm,'');
  else{const target=path.resolve(file.endsWith('/')?file+'index.html':file);if(!target.startsWith(process.cwd())||!fs.existsSync(target))return route.fulfill({status:404,body:''});body=fs.readFileSync(target);type=target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':type;}
  await route.fulfill({contentType:type,body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>({wordTowerBest:"+towerBest+",eikenDungeonBest:"+dungeonBest+",petHatched:true,petAdult:true,petName:'テスト',petAppearance:{species:'penguin',bodyColor:'cream',eyes:'sleepy',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['forest-bg','crown'],equipped:{backgrounds:'forest-bg',head:'crown'}},petBaseStats:{hp:15,attack:1,defense:1},petBaseStatsGeneration:1})});export const runTransaction=async()=>{};export const setDoc=async()=>{};export const serverTimestamp=()=>0;export const onAuthStateChanged=(a,f)=>f(a.currentUser);"}));
 await page.route('https://k-oota-pixel.github.io/**',r=>{
  if(r.request().url().includes('word-breaker'))return r.fulfill({json:{levels:Object.fromEntries(['junior1','junior2','junior3','high1','high2'].map(level=>[level,Array.from({length:5},(_,i)=>({id:level+i,word:level+i,answers:['意味'+i]}))]))}});
  const grades=['4級','3級','準2級','2級','準1級'];
  const questions=grades.flatMap(grade=>Array.from({length:5},(_,i)=>({id:grade+i,grade,question:'Although the weather forecast predicted heavy rain, the students decided to (____) their outdoor activities because they had been looking forward to the trip for several weeks.',choices:[{number:1,text:'continue their planned activities'},{number:2,text:'cancel without further discussion'},{number:3,text:'refuse to consider another plan'},{number:4,text:'forget all the necessary equipment'}],answer_number:1})));
  return r.fulfill({contentType:'text/html',body:'<script id="question-data" type="application/json">'+JSON.stringify(questions)+'</script>'});
 });
 await page.route('https://task-quest.onrender.com/**',r=>r.fulfill({json:{}}));

for(const mode of ['tower','dungeon']){
 await page.goto('https://adventure.test/pet-adventure/?mode='+mode);await page.waitForSelector('#startDialog[open]');
 assert.deepEqual(await page.locator('[data-start-floor]').evaluateAll(bs=>bs.map(b=>Number(b.dataset.startFloor))),mode==='tower'?[1,10,20,30]:[1,10,20]);
 await page.screenshot({path:'../checkpoints-'+mode+'-'+width+'.png'});await page.clock.runFor(30000);assert.equal(await page.evaluate(()=>adventureTitleEvents.length),0);assert.equal(await page.locator('#startDialog').evaluate(d=>d.scrollWidth>d.clientWidth),false);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#startDialog').isVisible(),true);
 const floor=mode==='tower'?30:20;await page.locator('[data-start-floor="'+floor+'"]').click();assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'30F':'B20');assert.equal(await page.locator('#bossBadge').isVisible(),true);
 const hp=await page.locator('#petHpText').textContent();assert.equal(hp.split('/')[0].trim(),hp.split('/')[1].trim());assert.equal(await page.evaluate(()=>adventureTitleEvents[0].floor),floor);
 await page.clock.runFor(240000);await page.waitForSelector('#resultCard:not([hidden])');await page.locator('#checkpointBtn').click();await page.waitForSelector('#startDialog[open]');await page.locator('[data-start-floor="10"]').click();assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'10F':'B10');
 await page.goto('https://adventure.test/pet-adventure/?mode='+mode);await page.waitForSelector('#startDialog[open]');await page.locator('[data-start-floor="1"]').click();assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'1F':'B1');
}
towerBest=9;await page.goto('https://adventure.test/pet-adventure/?mode=tower');await page.waitForSelector('.attack-card');assert.equal(await page.locator('#startDialog').isVisible(),false);
towerBest=10;await page.goto('https://adventure.test/pet-adventure/?mode=tower');await page.waitForSelector('#startDialog[open]');assert.deepEqual(await page.locator('[data-start-floor]').evaluateAll(bs=>bs.map(b=>Number(b.dataset.startFloor))),[1,10]);
await page.evaluate(()=>{localStorage.setItem('monstudy-pet-adventure-v1-test',JSON.stringify({towerBest:30,dungeonBest:1}));localStorage.setItem('monstudy-pet-adventure-v1',JSON.stringify({towerBest:99}));});
towerBest=1;await page.goto('https://adventure.test/pet-adventure/?mode=tower');await page.waitForSelector('#startDialog[open]');assert.equal(await page.locator('[data-start-floor="30"]').count(),1);
fixtureUid='other';await page.goto('https://adventure.test/pet-adventure/?mode=tower');await page.waitForSelector('.attack-card');assert.equal(await page.locator('#startDialog').isVisible(),false);
assert.deepEqual(errors,[]);await page.close();}console.log('PASS both modes: saved checkpoint choices, full HP, boss floors, no pre-start attacks, retry choice, thresholds and account isolation');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
