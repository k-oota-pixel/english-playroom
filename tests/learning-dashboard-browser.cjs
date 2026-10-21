const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const ranking=html.slice(html.indexOf('function renderCoinRanking(entries,emptyMessage='),html.indexOf('loginBtn.addEventListener("click"'));
 const fixture=html.replace(/<script\b[\s\S]*?<\/script>/g,'')+`<script type="module">
 import {createLearningDashboard} from '/learning-dashboard.js';
 window.calls=0;window.failNext=false;window.pending=null;window.user={uid:'learner',getIdToken:async()=>'token'};
 const getUser=()=>window.user;
 window.dashboard=createLearningDashboard({button:document.getElementById('learningShow'),list:document.getElementById('learningList'),note:document.getElementById('learningNote'),getUser,load:async()=>{window.calls++;if(window.failNext){window.failNext=false;throw Error('通信エラー');}if(window.waitForData)await new Promise(resolve=>window.pending=resolve);return {apps:{ateru:{gamesCompleted:3,questionsSolved:15,lastPlayedDate:'2026-10-21'}},activity:{}};}});
 dashboard.reset();let coinBoardUser=window.user;
 const coinsToday=document.getElementById('coinsToday'),coinsTodayCaption=document.getElementById('coinsTodayCaption'),coinRankRefresh=document.getElementById('coinRankRefresh'),coinRankList=document.getElementById('coinRankList'),coinRankNote=document.getElementById('coinRankNote');
 const COIN_LEADERBOARD_API='/ranking';${ranking}
 resetCoinBoard('表示するを押してください',true);window.ready=true;
 </script>`;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1000}});let rankingCalls=0;
  await page.route('http://home.test/**',route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/ranking'){rankingCalls++;return route.fulfill({json:{coinsToday:11,top3:[{petName:'テストペット',coinsToday:11}]}});}
   if(pathname.endsWith('.js'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,pathname.slice(1)),'utf8')});
   return route.fulfill({contentType:pathname.endsWith('.css')?'text/css':'text/html',body:pathname.endsWith('.css')?'':fixture});
  });
  await page.goto('http://home.test/');await page.waitForFunction(()=>window.ready);
  assert.equal(await page.evaluate(()=>window.calls),0);assert.equal(rankingCalls,0);
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'));});assert.equal(rankingCalls,0);
  assert.equal(await page.locator('#learningList').isVisible(),false);assert.equal(await page.locator('#coinRankList').isVisible(),false);
  await page.locator('#coinRankRefresh').click();await page.waitForFunction(()=>document.getElementById('coinRankRefresh').textContent==='↻ 更新');assert.equal(rankingCalls,1);assert.match(await page.locator('#coinRankList').textContent(),/テストペット/);
  await page.locator('#learningShow').click();await page.waitForSelector('.learning-item');assert.equal(await page.locator('.learning-item').count(),12);assert.match(await page.locator('#learningList').textContent(),/クリア回数：3/);
  await page.evaluate(()=>window.failNext=true);await page.locator('#learningShow').click();await page.waitForFunction(()=>document.getElementById('learningShow').textContent==='再試行');assert.equal(await page.locator('#learningList').isVisible(),false);
  await page.locator('#learningShow').click();await page.waitForSelector('.learning-item:visible');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>{window.waitForData=true;dashboard.refresh();});await page.waitForFunction(()=>!!window.pending);
  await page.evaluate(()=>{window.user=null;dashboard.reset();window.pending();});await page.waitForTimeout(50);
  assert.equal(await page.locator('#learningList').isVisible(),false);assert.equal(await page.locator('#learningList').textContent(),'');assert.equal(await page.locator('#learningShow').isDisabled(),true);
  console.log('On-demand ranking and dashboard: no automatic reads, twelve contents, retry, mobile, and stale logout response checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
