const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--disable-gpu','--renderer-process-limit=2'],executablePath:process.env.CHROME_PATH});
 console.log('browser ready');try{for(const width of [1100,390]){
 console.log('width',width);const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.setDefaultTimeout(12000);page.on('pageerror',e=>(errors.push(e.message),console.log('PAGE ERROR',e.message)));
 await page.route('https://adventure.test/**',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<button id=petClean>clean</button>'});const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
  let body,type='text/javascript';
  if(file==='coin-reward.js')body="export const auth={currentUser:{uid:'test'}};export const authReady=Promise.resolve();export const walletRef=()=>({});";
  else if(file==='pet-strength.js')body='export const loadStrengthTitles=async()=>6;';
  else if(file==='pet-art.js')body="export const renderPetSVG=()=>'<svg></svg>';";
  else{const target=path.resolve(file.endsWith('/')?file+'index.html':file);if(!target.startsWith(process.cwd())||!fs.existsSync(target))return route.fulfill({status:404,body:''});body=fs.readFileSync(target);type=target.endsWith('.html')?'text/html':target.endsWith('.css')?'text/css':target.endsWith('.svg')?'image/svg+xml':type;}
  await route.fulfill({contentType:type,body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>({petHatched:true,petAdult:false,petName:'テスト',petAppearance:{species:'cat'},petBaseStats:{hp:15,attack:6,defense:6}})});export const setDoc=async()=>{};export const serverTimestamp=()=>0;export const onAuthStateChanged=(a,f)=>f(a.currentUser);"}));
 await page.route('https://k-oota-pixel.github.io/**',r=>r.abort());
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
  await page.locator('#attackGrid button').first().click();
  await page.waitForFunction(()=>document.querySelector('#answerGrid').children.length===4);
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





