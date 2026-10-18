const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const declarations=html.slice(html.indexOf('const dashRefresh='),html.indexOf('let signingIn='));
 const functions=html.slice(html.indexOf('function dateKeyFromMs'),html.indexOf('loginBtn.addEventListener("click"'));
 const script="import {readDashboardCache,writeDashboardCache} from './dashboard-cache.js';\nimport {extraDashboard} from './dashboard-extra.js';\n"+declarations+
 "let dashboardUser={uid:'tester'};let petDataUid=null,petData={};const db={};\n"+
 "const localDateKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};\n"+
 "const doc=(db,...parts)=>parts.join('/');\n"+
 "const getDoc=async name=>({exists:()=>true,data:()=>name.endsWith('/english-playroom')?{wordBreakerBests:{junior1:{score:28,combo:24}},wordBreakerLastPlayedDate:localDateKey(),pre2InterviewA:{attemptedIds:['1','2','3'],lastPlayedDate:localDateKey()}}:{}});\n"+
 functions+"\nawait refreshDashboard();window.logoutDashboard=()=>{dashboardUser=null;resetDashboard();};";
 const fixture=html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace('</body>','<script type="module">'+script+'</script></body>');
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('http://dashboard.test/**',route=>{
 const file=new URL(route.request().url()).pathname.slice(1);
 return route.fulfill({contentType:file==='index.html'?'text/html':file.endsWith('.js')?'text/javascript':'text/css',body:file==='index.html'?fixture:['dashboard-extra.js','dashboard-cache.js'].includes(file)?fs.readFileSync(path.join(root,file),'utf8'):''});
 });
 await page.goto('http://dashboard.test/index.html');await page.locator('#wordBreakerStat').filter({hasText:'28 SCORE'}).waitFor();
 assert.equal(await page.locator('.dashboard .stat').count(),8);assert.equal(await page.locator('.today-pill').count(),8);
 assert.equal(await page.locator('#interviewStat').textContent(),'3 / 20');assert.match(await page.locator('#dashNote').textContent(),/2 \/ 8/);
 assert.equal(await page.locator('#todayInterview').evaluate(el=>el.classList.contains('done')),true);
 assert.equal(await page.locator('.stat-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.stat-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('#dashRefresh').click();assert.equal(await page.locator('#wordBreakerStat').textContent(),'28 SCORE');
 await page.evaluate(()=>window.logoutDashboard());assert.equal(await page.locator('#interviewStat').textContent(),'— / 20');
 assert.equal(await page.locator('.today-pill.done').count(),0);
 assert.deepEqual(errors,[]);console.log('Dashboard browser: 8 subjects, cloud summaries, daily count, refresh/logout, four desktop columns and mobile layout passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
