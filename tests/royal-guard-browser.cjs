const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../..','boss-preview/royal-guard');fs.mkdirSync(out,{recursive:true});
const origin='https://guard.test';
async function fixture(browser,{mode='tower',admin=true,width=1100,applyStats=false}={}){
 const page=await browser.newPage({viewport:{width,height:780},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.addInitScript(({admin,applyStats})=>{window.testAdmin=admin;window.events=[];window.writes=[];window.publishRequests=0;window.wallet={petHatched:true,petAdult:true,petName:'えまゆん',petGeneration:1,petBaseStatsGeneration:1,petBaseStats:{hp:10,attack:1,defense:1,mp:6},petStrength:{hp:100,attack:50,defense:50,mp:200},petStrengthLevelPoints:400,petAppearance:{species:'dog',bodyColor:'cream',eyes:'sleepy',feature:'classic',pattern:'none',baseBackground:'sky'},wordTowerBest:32,eikenDungeonBest:32,petAdminStatsAdjustment:applyStats?undefined:'2026-11-01-hp100-atk30-def30-mp100'};window.EnglishPlayroomCoins={recordTitleEvents:(appId,events)=>window.events.push(...events.map(e=>({appId,...e}))),awardOncePerDay:()=>{}};Math.random=()=>.1;},{admin,applyStats});
 await page.clock.install();await page.clock.pauseAt(Date.now());
 await page.route(origin+'/**',async route=>{
 const u=new URL(route.request().url()),p=u.pathname.slice(1);
 if(p==='auth-session.js')return route.fulfill({contentType:'text/javascript',body:'export const accountSession=async()=>({admin:window.testAdmin,resetRequired:false});export const onAuthStateChanged=(auth,fn)=>{fn(auth.currentUser);return()=>{}};'});
 if(p==='coin-reward.js')return route.fulfill({contentType:'text/javascript',body:"export const db={};export const auth={currentUser:{uid:'fixture',getIdToken:async()=>'token'}};export const authReady=Promise.resolve();export const walletRef=()=>({});"});
 if(p==='shell-bridge.js')return route.fulfill({contentType:'text/javascript',body:''});
 if(p==='pet-art.js')return route.fulfill({contentType:'text/javascript',body:"export const renderPetSVG=()=>'<svg viewBox=\"0 0 100 100\"><text x=\"5\" y=\"80\" font-size=\"76\">🐶</text></svg>';"});
 const target=path.resolve(root,p.endsWith('/')?p+'index.html':p);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))return route.fulfill({status:404,body:''});
 let body=fs.readFileSync(target);if(target.endsWith('.html'))body=body.toString('utf8').replace(/<style id="monstudy-access-lock">[\s\S]*?<\/style>/,'');
 return route.fulfill({contentType:target.endsWith('.html')?'text/html; charset=utf-8':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':'text/javascript',body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>structuredClone(window.wallet)});export const setDoc=async(ref,patch)=>{window.writes.push(patch);Object.assign(window.wallet,patch)};export const runTransaction=async(db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(window.wallet)}),set:(ref,patch)=>{window.writes.push(patch);Object.assign(window.wallet,patch)}});export const serverTimestamp=()=>0;export const getDocFromServer=getDoc;"}));
 await page.route('https://k-oota-pixel.github.io/english-playroom/access-gate.js**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await page.route('https://k-oota-pixel.github.io/word-breaker/**',r=>r.fulfill({json:Object.fromEntries(['junior1','junior2','junior3','high1','high2'].map(id=>[id,Array.from({length:8},(_,i)=>({id:id+i,word:'word'+i,answers:['意味'+i]}))]))}));
 await page.route('https://k-oota-pixel.github.io/eiken-retry/**',r=>r.fulfill({contentType:'text/html',body:'<script id="question-data" type="application/json">'+JSON.stringify(['4級','3級','準2級','2級','準1級'].flatMap(grade=>Array.from({length:5},(_,i)=>({id:grade+i,grade,question:'I (____) English.',choices:[{number:1,text:'study'},{number:2,text:'studies'},{number:3,text:'studied'},{number:4,text:'studying'}],answer_number:1}))))+'</script>'}));
 await page.route('https://task-quest.onrender.com/**',r=>{return r.fulfill({json:{ok:true,leaders:[]}})});
 await page.goto(origin+'/pet-adventure/?mode='+mode);await page.locator('#startDialog[open]').waitFor({timeout:10000}).catch(async e=>{console.log('BODY',await page.locator('body').innerText());throw e;});
 return {page,errors};
}
async function correct(page,mode){await page.locator('.attack-card.critical').click();let index=0;if(mode==='tower')index=await page.evaluate(()=>{const word=document.querySelector('#questionText strong').textContent;return [...document.querySelectorAll('.answer-btn')].findIndex(b=>b.textContent.includes('意味'+word.slice(-1)));});await page.locator('.answer-btn').nth(index).click();}
async function cast(page){await page.locator('#magicBtn').click();await page.locator('.battle-action-card').filter({has:page.getByText('ミロゴロン',{exact:true})}).getByRole('button').click();}
async function clearForm(page,mode,kind){for(let i=0;i<20;i++){
 if(kind==='magic')await cast(page);else await correct(page,mode);
 if(await page.locator('.guard-cinematic').isVisible())return;
 if(kind!=='magic')await page.locator('#nextBtn').click();
}throw Error('Form did not end');}
module.exports={fixture,correct,cast,clearForm};
if(require.main===module)(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
for(const [mode,width] of [['tower',1100],['dungeon',390]]){
 const {page,errors}=await fixture(b,{mode,width});
 assert.equal(await page.evaluate(()=>wallet.wordTowerBest),90);assert.equal(await page.evaluate(()=>wallet.eikenDungeonBest),90);
 assert.match(await page.locator('#startBest').textContent(),/ランキング対象外/);await page.locator('[data-start-floor="90"]').click();
 await page.locator('.guard-cinematic[data-scene="arrival"]').waitFor({state:'visible'});
 assert.match(await page.locator('#guardCinematicTitle').textContent(),/大ボス・魔王親衛隊が現れた！/);
 assert.match(await page.locator('#enemyMpText').textContent(),/50 \/ 50/);
 const health=await page.locator('#petHpText').textContent();await page.clock.runFor(15000);assert.equal(await page.locator('#petHpText').textContent(),health);
 await page.screenshot({path:path.join(out,mode+'-arrival.png')});await page.locator('.guard-cinematic button').click();
 await page.clock.runFor(mode==='tower'?3300:20300);assert.match(await page.locator('#enemyMpText').textContent(),/40 \/ 50/);assert.match(await page.locator('#battleFlash').textContent(),/ミロゴロン/);
 await clearForm(page,mode,mode==='tower'?'answer':'magic');
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'90F':'B90');assert.match(await page.locator('#enemyVisual img').getAttribute('src'),/royal-guard-lion-2/);
 assert.match(await page.locator('#enemyMpText').textContent(),/40 \/ 50/);assert.notEqual(await page.locator('#petHpText').textContent(),health,'first-form defeat must not heal the player');
 const before=await page.locator('#petHpText').textContent();await page.clock.runFor(15000);assert.equal(await page.locator('#petHpText').textContent(),before);
 await page.screenshot({path:path.join(out,mode+'-evolve.png')});await page.locator('.guard-cinematic button').click();
 await clearForm(page,mode,mode==='tower'?'magic':'answer');
 assert.match(await page.locator('#guardCinematicTitle').textContent(),/魔王親衛隊をやっつけた！/);assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'90F':'B90');
 const parts=(await page.locator('#petHpText').textContent()).split('/').map(s=>s.trim());assert.equal(parts[0],parts[1]);
 assert.ok(await page.locator('.guard-cinematic button').isVisible());await page.screenshot({path:path.join(out,mode+'-victory.png')});await page.locator('.guard-cinematic button').click();await page.clock.runFor(700);
 assert.equal(await page.locator('#stageLabel').textContent(),mode==='tower'?'91F':'B91');await page.locator('#exitRunBtn').click();await page.locator('#resultCard').waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>events.filter(e=>e.kind==='defeat'&&e.floor===90).length),1);
 assert.ok((await page.evaluate(()=>writes)).every(p=>!Object.keys(p).some(k=>['coins','petStrength'].includes(k))));
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.close();console.log('PASS',mode,width,'arrival, timed spell, both damage paths, evolution, victory, single defeat credit, 91F');
}
const {page,errors}=await fixture(b,{admin:false});assert.equal(await page.locator('[data-start-floor="90"]').count(),0);assert.equal(await page.evaluate(()=>wallet.wordTowerBest),32);assert.deepEqual(errors,[]);await page.close();console.log('PASS normal players retain actual best and cannot start at 90F');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});



