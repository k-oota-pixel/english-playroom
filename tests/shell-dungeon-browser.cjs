const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='https://k-oota-pixel.github.io',home=origin+'/english-playroom/';
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1100,height:860}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});
 await page.clock.install();
 await page.route(origin+'/**',route=>{
  const u=new URL(route.request().url()),file=u.pathname.replace('/english-playroom/','');
  if(u.pathname==='/english-playroom/')return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="app-shell.css"><main class="home"><div class="topbar"><div class="logo">もんすたでぃ</div><div class="auth-area"></div></div><button id="petStrengthOpen">ペット強化</button><section class="material-group"><h2>冒険</h2><a class="card" href="pet-adventure/?mode=tower"><span class="title">魔王の塔</span></a></section></main><script>window.wallet={petHatched:true,petAdult:true,petName:'テスト',petGeneration:1,petBaseStatsGeneration:1,petBaseStats:{hp:15,attack:1,defense:1,mp:6},petStrength:{hp:0,attack:0,defense:0,mp:0},petAppearance:{species:'penguin',bodyColor:'cream',eyes:'sleepy',feature:'classic',pattern:'none',baseBackground:'sky'}};document.getElementById('petStrengthOpen').onclick=()=>{const d=document.createElement('dialog');d.innerHTML='<h2>ペット強化</h2><button id="allocate">攻撃力を強化</button><button id="close">閉じる</button>';document.body.append(d);d.querySelector('#allocate').onclick=()=>{wallet.petStrength.attack=1;wallet.petStrengthLevelPoints=1;};d.querySelector('#close').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();};</script><script type="module" src="app-shell.js"></script>`});
  if(file==='coin-reward.js')return route.fulfill({contentType:'text/javascript',body:"export const db={};export const auth={currentUser:{uid:'fixture'}};export const authReady=Promise.resolve();export const walletRef=()=>({});"});
  if(file==='pet-strength.js')return route.fulfill({contentType:'text/javascript',body:'export const loadStrengthTitles=async()=>6;'});
  if(u.pathname.startsWith('/word-breaker/'))return route.fulfill({json:{levels:Object.fromEntries(['junior1','junior2','junior3','high1','high2'].map(level=>[level,Array.from({length:5},(_,i)=>({word:'test'+i,answers:['意味'+i]}))]))}});
  const target=path.resolve(root,file.endsWith('/')?file+'index.html':file);if(!target.startsWith(root+path.sep)||!fs.existsSync(target))return route.fulfill({status:404,body:''});
  let body=fs.readFileSync(target);if(file==='pet-art.js')body=body.toString('utf8').replace(/^if\(typeof window.*$/gm,'');
  return route.fulfill({contentType:target.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript',body});
 });
 await page.route('https://www.gstatic.com/**',r=>r.fulfill({contentType:'text/javascript',body:"export const getDoc=async()=>({exists:()=>true,data:()=>structuredClone(parent.wallet)});export const setDoc=async()=>{};export const runTransaction=async()=>{};export const serverTimestamp=()=>0;"}));
 await page.route('https://task-quest.onrender.com/**',r=>r.fulfill({json:{}}));
 await page.goto(home+'?material='+encodeURIComponent('/english-playroom/pet-adventure/?mode=tower'));
 const frame=page.frameLocator('iframe');await frame.locator('#attackGrid button').first().waitFor({timeout:10000}).catch(async e=>{console.log('BODY',await frame.locator('body').innerText());throw e;});
 const stats=await frame.locator('#petStats').textContent();assert.match(stats,/攻撃力 1/);
 await page.locator('.ms-features').getByRole('button',{name:'ペット強化',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.locator('#allocate').click();
 const hp=await frame.locator('#petHpText').textContent();await page.clock.runFor(60000);assert.equal(await frame.locator('#petHpText').textContent(),hp);assert.equal(await frame.locator('#battleStatus').textContent(),'PAUSED');
 await page.locator('#close').click();assert.equal(await frame.locator('#petStats').textContent(),stats);assert.equal(await frame.locator('#battleStatus').textContent(),'LIVE');
 await page.clock.runFor(9000);assert.notEqual(await frame.locator('#petHpText').textContent(),hp);
 // Finish this run, then retry without reloading the material document.
 await page.clock.runFor(300000);await frame.locator('#retryBtn').waitFor();await frame.locator('#retryBtn').click();await page.waitForFunction(()=>document.querySelector('iframe').contentDocument.getElementById('petStats').textContent.includes('攻撃力 2'));
 assert.deepEqual(errors,[]);console.log('PASS real dungeon shell: one-minute modal pause, resume without catch-up damage, in-run stat snapshot and next-run strength refresh');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
