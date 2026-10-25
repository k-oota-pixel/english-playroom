const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-gpu','--renderer-process-limit=2'],executablePath:process.env.CHROME_PATH});
 console.log('browser ready');try{for(const [width,height] of [[1100,800],[390,740],[360,640],[320,568]]){
 console.log('width',width);const page=await browser.newPage({viewport:{width,height}}),errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>(errors.push(e.message),console.log('PAGE ERROR',e.message)));
 await page.route('https://adventure.test/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<button id=petClean>clean</button>'});const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
  let body,type='text/javascript';
  if(file==='coin-reward.js')body="export const auth={currentUser:{uid:'test'}};export const authReady=Promise.resolve();export const walletRef=()=>({});";
  else if(file==='pet-strength.js')body='export const loadStrengthTitles=async()=>6;';
  else if(file==='pet-art.js')body=fs.readFileSync('pet-art.js','utf8').replace(/^if\(typeof window.*$/gm,'');
  else{const target=path.resolve(file.endsWith('/')?file+'index.html':file);if(!target.startsWith(process.cwd())||!fs.existsSync(target))return route.fulfill({status:404,body:''});body=fs.readFileSync(target);type=target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':type;}
  await route.fulfill({contentType:type,body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>({petHatched:true,petAdult:true,petName:'テスト',petAppearance:{species:'penguin',bodyColor:'cream',eyes:'sleepy',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['forest-bg','crown'],equipped:{backgrounds:'forest-bg',head:'crown'}},petBaseStats:{hp:15,attack:1,defense:1},petBaseStatsGeneration:1})});export const setDoc=async()=>{};export const serverTimestamp=()=>0;export const onAuthStateChanged=(a,f)=>f(a.currentUser);"}));
 await page.route('https://k-oota-pixel.github.io/**',r=>{
  if(r.request().url().includes('word-breaker'))return r.fulfill({json:{levels:Object.fromEntries(['junior1','junior2','junior3','high1','high2'].map(level=>[level,Array.from({length:5},(_,i)=>({id:level+i,word:level+i,answers:['意味'+i]}))]))}});
  const grades=['4級','3級','準2級','2級','準1級'];
  const questions=grades.flatMap(grade=>Array.from({length:5},(_,i)=>({id:grade+i,grade,question:'Although the weather forecast predicted heavy rain, the students decided to (____) their outdoor activities because they had been looking forward to the trip for several weeks.',choices:[{number:1,text:'continue their planned activities'},{number:2,text:'cancel without further discussion'},{number:3,text:'refuse to consider another plan'},{number:4,text:'forget all the necessary equipment'}],answer_number:1})));
  return r.fulfill({contentType:'text/html',body:'<script id="question-data" type="application/json">'+JSON.stringify(questions)+'</script>'});
 });
 console.log('selector');await page.goto('https://adventure.test/pet-adventure/');
 assert.equal(await page.locator('.adventure-card').count(),2);
 assert.equal(await page.locator('#battleView').isVisible(),false);
 assert.ok(await page.locator('.adventure-card img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0)));
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`../selector-${width}.png`,fullPage:true});
 for(const mode of ['tower','dungeon']){console.log('mode',mode);
  await page.locator(`a[href="?mode=${mode}"].adventure-card`).click();
  await page.waitForFunction(()=>document.querySelector('#attackGrid').children.length>0).catch(async e=>{console.log(await page.locator('body').innerText());throw e;});
  assert.equal(await page.locator('#modeTitle').textContent(),mode==='tower'?'魔王の塔':'魔物の巣窟');
  assert.equal(await page.locator('#enemyCount').textContent(),'ENEMY 1 / 1');
  assert.equal(await page.locator('.mode-tabs').count(),0);
  assert.equal(await page.locator('#petVisual svg > rect').count(),0);
  assert.equal(await page.locator('#petVisual [data-pet-shop-slot="backgrounds"]').count(),0);
  assert.equal(await page.locator('#petVisual [data-pet-shop-item="crown"]').count(),1);
  const petBox=await page.locator('#petVisual svg').boundingBox(),fieldBox=await page.locator('#battlefield').boundingBox();
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
  if(mode==='tower'){
    const word=await page.locator('#questionText strong').textContent();
    const correct='意味'+word.slice(-1);
    await page.locator('#answerGrid button').filter({hasText:correct}).click();
  }else await page.locator('#answerGrid button').first().click();
  assert.match(await page.locator('#battleFlash').textContent(),/CRITICAL HIT!/);
  const next=await page.locator('#nextBtn').boundingBox();
  assert.ok(next.y+next.height<=height,JSON.stringify({width,height,next}));
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.screenshot({path:`../battle-${mode}-${width}.png`,fullPage:true});
  await page.locator('#nextBtn').click();
  await page.waitForSelector('#attackPanel:not([hidden])');
  assert.equal(await page.evaluate(()=>scrollY),0);
  await page.locator('a[href="./"]').click();
 }
 // Exercise the actual replacement PLAY module and pet-state gating.
 console.log('play');await page.goto('https://adventure.test/');
 await page.addScriptTag({type:'module',url:'https://adventure.test/pet-play-menu-v164.js'});
 await page.waitForSelector('#petPlayOpen');
 assert.equal(await page.locator('#petPlayOpen').isDisabled(),true);
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('pet-state-updated',{detail:{petHatched:true,petAdult:false,petName:'テスト',petAppearance:{species:'cat'}}})));
 assert.equal(await page.locator('#petPlayOpen').isEnabled(),true);
 await page.locator('#petPlayOpen').click();
 await page.waitForURL('**/pet-adventure/');await page.waitForSelector('.adventure-card');
 assert.equal(await page.locator('.adventure-card').count(),2);
 assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS desktop/mobile selector, art, PLAY gating, both battle modes and quiz choices');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
