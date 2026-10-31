const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
async function correctAnswer(page,mode){
 const index=mode==='dungeon'?0:await page.evaluate(()=>{const word=document.querySelector('#questionText strong').textContent;return [...document.querySelectorAll('.answer-btn')].findIndex(b=>b.textContent.includes('意味'+word.slice(-1)));});
 await page.locator('.answer-btn').nth(index).click();
}
async function minimumAttack(page){
 const index=await page.locator('.attack-card').evaluateAll(nodes=>nodes.map((b,i)=>({i,p:Number(b.querySelector('.attack-sub').lastElementChild.textContent.match(/\d+/)[0]),critical:b.classList.contains('critical')})).filter(b=>!b.critical).sort((a,b)=>a.p-b.p)[0].i);
 await page.locator('.attack-card').nth(index).click();
}
async function realtimeChecks(page,mode){
 const interval=20000;
 const hp=async()=>Number((await page.locator('#petHpText').textContent()).split('/')[0]);
 await page.clock.runFor(100);const initial=await hp();
 await page.clock.runFor(interval+100);
 assert.ok(await hp()<initial,'enemy attacks during attack selection');
 assert.equal(await page.locator('#attackPanel').isVisible(),true);
 await minimumAttack(page);const beforeQuestion=await hp(),question=await page.locator('#questionText').textContent();
 await page.clock.runFor(interval+100);
 assert.ok(await hp()<beforeQuestion,'enemy attacks while reading a question');
 assert.equal(await page.locator('#questionText').textContent(),question);
 const correct=mode==='dungeon'?0:await page.evaluate(()=>{const word=document.querySelector('#questionText strong').textContent;return [...document.querySelectorAll('.answer-btn')].findIndex(b=>b.textContent.includes('意味'+word.slice(-1)));});
 const beforeWrong=await hp();await page.locator('.answer-btn').nth((correct+1)%4).click();
 assert.equal(await hp(),beforeWrong-1,'a wrong answer deals exactly one HP of self damage');
 await page.clock.runFor(1200);assert.equal(await page.locator('#attackPanel').isVisible(),true);
 const beforePause=await hp();await page.locator('#pauseBtn').click();
 await page.clock.runFor(interval*2);assert.equal(await hp(),beforePause);
 await page.locator('#pauseBtn').click();await page.clock.runFor(100);assert.equal(await hp(),beforePause);
 await page.locator('#helpBtn').click();await page.clock.runFor(interval*2);assert.equal(await hp(),beforePause);
 await page.locator('#helpClose').click();await page.clock.runFor(100);assert.equal(await hp(),beforePause);
 await page.evaluate(()=>{const d=document.createElement('dialog');d.className='titles-dialog';document.body.append(d);d.showModal();});
 await page.clock.fastForward(interval*2);assert.equal(await hp(),beforePause,'title award popups pause the battle');
 await page.evaluate(()=>document.querySelector('.titles-dialog').remove());await page.clock.runFor(100);assert.equal(await hp(),beforePause);

 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(interval*2);assert.equal(await hp(),beforePause);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.clock.runFor(100);assert.equal(await hp(),beforePause);
 await minimumAttack(page);await page.clock.runFor(interval*12);
 assert.equal(await hp(),0);assert.equal(await page.locator('#resultCard').isVisible(),true);
 await page.clock.runFor(interval*2);assert.equal(await hp(),0);
 await page.locator('#retryBtn').click();await page.clock.runFor(100);
 assert.equal(await hp(),initial,'retry restores health and does not inherit queued attacks');
 await minimumAttack(page);await correctAnswer(page,mode);await page.locator('#nextBtn').click();
 await minimumAttack(page);await correctAnswer(page,mode);
 assert.equal(await hp(),initial,'two quick correct attacks land before the enemy attacks');
 assert.ok((await page.locator('#enemyHpText').textContent()).startsWith('0 /'));
 await page.clock.runFor(700);
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'2F':'B2');
 assert.equal(await page.locator('#attackPanel').isVisible(),true,'defeated enemies advance automatically');
 // Normal enemies do not heal; the fifth-stage boss heals immediately on defeat.
 const clearEnemy=async()=>{
  for(let attacks=0;attacks<20;attacks++){
   await minimumAttack(page);await correctAnswer(page,mode);
   if((await page.locator('#enemyHpText').textContent()).startsWith('0 /'))return;
   await page.locator('#nextBtn').click();
  }
  assert.fail('enemy should be defeated');
 };
 await page.clock.runFor(interval+150);
 const wounded=await hp();assert.ok(wounded<initial);
 await clearEnemy();assert.equal(await hp(),wounded,'ordinary enemies do not restore HP');
 await page.clock.runFor(700);
 for(const floor of [3,4]){await clearEnemy();await page.clock.runFor(700);}
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'5F':'B5');
 assert.equal(await page.locator('#enemyName').textContent(),'BOSS');
 assert.equal(await page.locator('#bossBadge').isVisible(),true);
 assert.ok(await page.locator('#battlefield').evaluate(el=>el.classList.contains('boss-battle')));
 assert.match(await page.locator('#battleFlash').textContent(),/BOSS BATTLE/);
 await minimumAttack(page);
 assert.equal(await page.locator('#bossBadge').isVisible(),true,'boss badge remains visible during a question');
 await correctAnswer(page,mode);await page.locator('#nextBtn').click();

 await page.clock.runFor(interval+150);
 assert.ok(await hp()<initial);
 await clearEnemy();
 assert.equal(await hp(),initial,'boss defeat immediately restores the actual maximum HP');
 assert.match(await page.locator('#answerFeedback').textContent(),/HP・MP全回復/);
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'5F':'B5');
 await page.clock.runFor(700);
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'6F':'B6');
 const beforeFinishEvents=await page.evaluate(()=>window.adventureTitleEvents.length);
 assert.equal(await page.locator('#enemyName').textContent(),'ENEMY');
 assert.equal(await page.locator('#bossBadge').isVisible(),false);
 const coins=await page.evaluate(()=>window.adventureCoins);assert.equal(coins.filter(c=>c.appId===(mode==='tower'?'word-tower':'eiken-dungeon')).length,mode==='tower'?0:1);if(mode==='dungeon')assert.match(coins[0].label,/5層到達/);
 assert.equal(await page.evaluate(()=>window.adventureTitleEvents.length),beforeFinishEvents,'active-run title events are held until the run ends');
 await page.clock.runFor(interval*12);assert.equal(await hp(),0);assert.equal(await page.locator('#resultCard').isVisible(),true);
 const events=await page.evaluate(()=>window.adventureTitleEvents);
 assert.ok(events.length>0);assert.ok(events.every(e=>e.appId===(mode==='tower'?'word-tower':'eiken-dungeon')&&e.expectedUid==='test'));
 assert.equal(new Set(events.map(e=>e.eventId)).size,events.length);
 assert.ok(events.some(e=>e.kind==='answer'&&e.correct));
 assert.ok(events.some(e=>e.kind==='answer'&&!e.correct));
 assert.ok(events.some(e=>e.kind==='defeat'&&e.floor===5&&e.noDamage===false));

 assert.equal(await page.locator('#resultCard').isVisible(),true);
 console.log('PASS realtime, boss full heal and completion-only title submission',mode);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-gpu','--renderer-process-limit=2'],executablePath:process.env.CHROME_PATH});
 console.log('browser ready');try{for(const [width,height] of [[1100,800],[390,740],[360,640],[320,568]]){
 console.log('width',width);const page=await browser.newPage({viewport:{width,height}}),errors=[];
 let realStrength=false;
 await page.addInitScript(()=>{window.adventureTitleEvents=[];window.adventureCoins=[];window.EnglishPlayroomCoins={awardOncePerDay:(appId,itemId,label)=>{window.adventureCoins.push({appId,itemId,label});},recordTitleEvent:(appId,event)=>{window.adventureTitleEvents.push({appId,...event});}};});
 await page.clock.install();await page.clock.pauseAt(Date.now());
 page.setDefaultTimeout(12000);page.on('pageerror',e=>(errors.push(e.message),console.log('PAGE ERROR',e.message)));
 await page.route('https://adventure.test/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<button id=petClean>clean</button>'});const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
  let body,type='text/javascript';
  if(file==='shell-bridge.js')body='';
  else if(file==='coin-reward.js')body="export const db={};export const auth={currentUser:{uid:'test',getIdToken:async()=>'fixture'}};export const authReady=Promise.resolve();export const walletRef=()=>({});";
  else if(file==='pet-strength.js'&&!realStrength)body='export const loadStrengthTitles=async()=>6;';
  else if(file==='pet-art.js')body=fs.readFileSync('pet-art.js','utf8').replace(/^if\(typeof window.*$/gm,'');
  else{const target=path.resolve(file.endsWith('/')?file+'index.html':file);if(!target.startsWith(process.cwd())||!fs.existsSync(target))return route.fulfill({status:404,body:''});body=fs.readFileSync(target);type=target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':type;}
  await route.fulfill({contentType:type,body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>({petHatched:true,petAdult:true,petName:'テスト',petAppearance:{species:'penguin',bodyColor:'cream',eyes:'sleepy',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['forest-bg','crown'],equipped:{backgrounds:'forest-bg',head:'crown'}},petBaseStats:{hp:15,attack:1,defense:1},petBaseStatsGeneration:1})});export const getDocFromServer=getDoc;export const runTransaction=async()=>{};export const setDoc=async()=>{};export const serverTimestamp=()=>0;export const onAuthStateChanged=(a,f)=>f(a.currentUser);"}));
 await page.route('https://k-oota-pixel.github.io/**',r=>{
  if(r.request().url().includes('word-breaker'))return r.fulfill({json:{levels:Object.fromEntries(['junior1','junior2','junior3','high1','high2'].map(level=>[level,Array.from({length:5},(_,i)=>({id:level+i,word:level+i,answers:['意味'+i]}))]))}});
  const grades=['4級','3級','準2級','2級','準1級'];
  const questions=grades.flatMap(grade=>Array.from({length:5},(_,i)=>({id:grade+i,grade,question:'Although the weather forecast predicted heavy rain, the students decided to (____) their outdoor activities because they had been looking forward to the trip for several weeks.',choices:[{number:1,text:'continue their planned activities'},{number:2,text:'cancel without further discussion'},{number:3,text:'refuse to consider another plan'},{number:4,text:'forget all the necessary equipment'}],answer_number:1})));
  return r.fulfill({contentType:'text/html',body:'<script id="question-data" type="application/json">'+JSON.stringify(questions)+'</script>'});
 });
 await page.route('https://task-quest.onrender.com/**',r=>r.fulfill({json:{}}));
 console.log('selector');await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto('https://adventure.test/pet-adventure/');
 assert.equal(await page.locator('.adventure-card').count(),2);
 assert.equal(await page.locator('#battleView').isVisible(),false);
 assert.ok(await page.locator('.adventure-card img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({animations:'disabled',path:`../selector-${width}.png`,fullPage:true});
 for(const mode of ['tower','dungeon']){console.log('mode',mode);
  await page.locator(`a[href="?mode=${mode}"].adventure-card`).click();
  await page.waitForFunction(()=>document.querySelector('#attackGrid').children.length>0).catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
  assert.equal(await page.locator('#modeTitle').textContent(),mode==='tower'?'魔王の塔':'魔物の巣窟');
  assert.equal(await page.locator('#enemyCount').textContent(),'ENEMY 1 / 1');
  assert.equal(await page.locator('#enemyAtb,#enemyAtbText,.enemy-clock').count(),0);
  if(mode==='dungeon'){
    assert.deepEqual((await page.locator('.attack-name').allTextContents()).sort(),['3級','4級','4級','4級']);
    assert.equal(await page.locator('.attack-card.critical .attack-name').textContent(),'3級');
  }

  if(width===1100){
    await realtimeChecks(page,mode);
    await page.goto(`https://adventure.test/pet-adventure/?mode=${mode}`);
    await page.locator('#startDialog[open]').waitFor();assert.deepEqual(await page.locator('[data-start-floor]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.startFloor))),[1,5]);await page.locator('[data-start-floor]').nth(1).click();
    await page.waitForSelector('#attackGrid button');
  }
  assert.equal(await page.locator('.mode-tabs').count(),0);
  assert.equal(await page.locator('#adventurePetVisual svg > rect').count(),0);
  assert.equal(await page.locator('#adventurePetVisual [data-pet-shop-slot="backgrounds"]').count(),0);
  assert.equal(await page.locator('#adventurePetVisual [data-pet-shop-item="crown"]').count(),1);
  const petBox=await page.locator('#adventurePetVisual svg').boundingBox(),fieldBox=await page.locator('#battlefield').boundingBox();
  assert.ok(petBox.y>=fieldBox.y&&petBox.y+petBox.height<=fieldBox.y+fieldBox.height);

  const before=await page.locator('#attackPanel').boundingBox();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
  await page.locator('#attackGrid .critical').click();
  await page.waitForFunction(()=>document.querySelector('#answerGrid').children.length===4);
  const quiz=await page.locator('#quizPanel').boundingBox();
  assert.ok(await page.locator('#questionText').evaluate(el=>el.scrollHeight<=el.clientHeight+1),'question should fit');
  assert.ok(await page.locator('.answer-btn').evaluateAll(nodes=>nodes.every(el=>el.scrollHeight<=el.clientHeight+1)),'answers should fit');
  assert.ok(Math.abs(quiz.y-before.y)<1&&Math.abs(quiz.height-before.height)<1);
  assert.match(await page.locator('#attackBadge').textContent(),/CRITICAL/);
  assert.doesNotMatch(await page.locator('#attackBadge').textContent(),/×2/);
  assert.equal(await page.locator('#petVisual').count(),0);
  await page.evaluate(async()=>{const {renderPetVisual}=await import('/pet-art.js');renderPetVisual(document.getElementById('petVisual'),{petHatched:true,petAppearance:{species:'penguin'}});});
  assert.equal(await page.locator('#adventurePetVisual svg > rect').count(),0);
  if(mode==='tower'){
    const word=await page.locator('#questionText strong').textContent();
    const correct='意味'+word.slice(-1);
    await page.locator('#answerGrid button').filter({hasText:correct}).click();
  }else await page.locator('#answerGrid button').first().click();
  assert.match(await page.locator('#battleFlash').textContent(),/CRITICAL HIT!/);
  const next=await page.locator('#nextBtn').boundingBox();
  assert.ok(next.y+next.height<=height,JSON.stringify({width,height,next}));
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({animations:'disabled',path:`../battle-${mode}-${width}.png`,fullPage:true});
  for(let tick=0;tick<4;tick++)await page.clock.runFor(250);
  await page.waitForSelector('#attackPanel:not([hidden])');
  assert.equal(await page.evaluate(()=>scrollY),0);
 page.once('dialog',dialog=>dialog.accept());await page.locator('a.back[href="./"]').click();
 }
 // Exercise the actual replacement PLAY module and pet-state gating.
 console.log('play');await page.goto('https://adventure.test/');
 await page.addScriptTag({type:'module',url:'https://adventure.test/pet-play-menu-v164.js'});
 await page.waitForSelector('#petPlayOpen');
 assert.equal(await page.locator('#petPlayOpen').isDisabled(),true);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('pet-state-updated',{detail:{petHatched:true,petAdult:false,petName:'テスト',petAppearance:{species:'cat'}}})));
 assert.equal(await page.locator('#petPlayOpen').isEnabled(),true);
 await page.locator('#petPlayOpen').click();
 assert.equal(await page.locator('#petGameMenu a').count(),2);
 assert.equal(await page.locator('#petGameMenu a[href="./pet-catch/"]').count(),1);
 await page.locator('#petGameMenu a[href="./pet-catch/"]').click();
 await page.waitForSelector('#startBtn:not([disabled])');
 await page.locator('#startBtn').click();
 await page.waitForSelector('#drops > *');
 assert.equal(await page.locator('#endBtn').isEnabled(),true);
 await page.goto('https://adventure.test/');
 await page.addScriptTag({type:'module',url:'https://adventure.test/pet-play-menu-v164.js'});
 await page.waitForSelector('#petPlayOpen');
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('pet-state-updated',{detail:{petHatched:true,petAdult:false}})));
 await page.locator('#petPlayOpen').click();
 await page.locator('#petGameMenu a[href="./pet-adventure/"]').click();
 await page.waitForURL('**/pet-adventure/');await page.waitForSelector('.adventure-card');
 assert.equal(await page.locator('.adventure-card').count(),2);
 if(width===1100){
  realStrength=true;
  await page.route('https://task-quest.onrender.com/api/learning/titles',r=>r.fulfill({json:{titles:[]}}));
  await page.goto('https://adventure.test/');
  await page.evaluate(()=>{const b=document.createElement('button');b.id='petStrengthOpen';b.textContent='ペット強化';document.body.append(b);});
  await page.addScriptTag({type:'module',url:'https://adventure.test/pet-strength.js?fixture=real'});
  await page.locator('#petStrengthOpen').click();
  await page.waitForSelector('.strength-row');
  assert.equal(await page.locator('.strength-born').count(),0);
  assert.doesNotMatch(await page.locator('.strength-dialog').textContent(),/生まれつきの個体差/);
  assert.match(await page.locator('.strength-row').first().textContent(),/HP　15/);
  console.log('PASS strength bonuses remain effective without the birth-bonus label');
 }
 assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS desktop/mobile selector, art, PLAY gating, both battle modes and quiz choices');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});