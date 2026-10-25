const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});let lists=0,details=0,grants=0,resets=0;const errors=[];
  await context.addInitScript(()=>{const RealDate=Date;window.testNow=RealDate.now();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.testNow]));}static now(){return window.testNow;}};});
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?'export const initializeApp=()=>({}),getApps=()=>[],getApp=()=>({});':`const u={uid:'admin',email:'admin@example.test',getIdToken:async()=>'token'};const auth={currentUser:u,authStateReady:async()=>{}},listeners=new Set();export const getAuth=()=>auth,GoogleAuthProvider=class{setCustomParameters(){}};export const browserLocalPersistence={},setPersistence=async()=>{};export function onAuthStateChanged(a,cb){listeners.add(cb);queueMicrotask(()=>cb(auth.currentUser));}export const signOut=async()=>{auth.currentUser=null;for(const cb of listeners)cb(null);};export const signInWithPopup=async()=>{auth.currentUser=u;for(const cb of listeners)cb(u);};`}));
  await context.route('https://k-oota-pixel.github.io/english-playroom/auth-session.js**',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
  await context.route('http://127.0.0.1:8765/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(file,'utf8')});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route('https://task-quest.onrender.com/api/admin/**',async route=>{
   const u=new URL(route.request().url()),fetchedAt=await page.evaluate(()=>Date.now());let body;
   if(u.pathname==='/api/admin/users'){
    lists++;assert.equal(u.searchParams.get('limit'),'10');const start=u.searchParams.get('pageToken')==='next'?10:0;
    body={users:Array.from({length:10},(_,i)=>({uid:'u'+(start+i),nickname:'User '+(start+i),hasNickname:true,petName:'Pet '+(start+i),coins:7,lastLearningAt:1700000000000-(start+i)*60000,lastLoginAt:1700000000000+(start+i)*60000})),nextPageToken:start?null:'next',fetchedAt};
   }else if(u.pathname==='/api/admin/user'){details++;body={uid:u.searchParams.get('uid'),apps:{'english-playroom':{coins:7,wordBreakerBests:{junior1:{score:42,combo:12}},petCatchGames:3,petCatchBestScore:18},ateru:{submissions:2}},activity:{contents:{'listening-training':{lastLearningAt:'2026-10-21T08:00:00Z'}}},fetchedAt};}
   else if(u.pathname==='/api/admin/pet-name-reset'){resets++;assert.deepEqual(route.request().postDataJSON(),{uid:'u0'});body={ok:true};}
   else if(u.pathname==='/api/admin/coins'){grants++;assert.deepEqual(route.request().postDataJSON(),{uid:'u0',amount:10});body={coins:17};}
   else throw Error('unexpected admin endpoint');
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });

  await page.route('https://task-quest.onrender.com/api/admin/users?search=**',async route=>{lists++;await route.fulfill({contentType:'application/json',body:JSON.stringify({users:[{uid:'u9',nickname:'User 9',petName:'Pet 9',coins:7,lastLearningAt:1700000000000}],total:1,fetchedAt:Date.now()})});});
  await page.goto('http://127.0.0.1:8765/admin.html');await page.locator('.user').last().waitFor();
  assert.equal(await page.locator('.user').count(),10);assert.equal(lists,1);assert.equal(details,0);
  assert.equal(await page.locator('.nickname').first().textContent(),'User 0');
  assert.equal(await page.locator('.pet-name').first().textContent(),'ペット：Pet 0');
  assert.ok((await page.locator('.summary-meta').first().textContent()).includes('最終学習日時'));assert.ok(!(await page.locator('#users').textContent()).includes('最終ログイン'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
  await page.locator('.user-summary').first().click();await page.locator('.grantBtn').waitFor();assert.equal(details,1);
  assert.equal(await page.locator('.apps .app').count(),14);
  for(const id of ['word-breaker','listening-training','pre2-interview-questions','talk-quest','pet-catch','word-tower','eiken-dungeon'])assert.equal(await page.locator('[data-content-id="'+id+'"]').count(),1);
  assert.ok((await page.locator('[data-content-id="word-breaker"] .mini').textContent()).includes('最高スコア：42'));
  assert.ok((await page.locator('[data-content-id="listening-training"] .mini').textContent()).includes('最終学習日時'));
  assert.equal(await page.locator('[data-content-id="talk-quest"] .mini').textContent(),'記録なし');
  await page.locator('.grantBtn').click();await page.waitForFunction(()=>document.querySelector('.coin').textContent.includes('17'));assert.equal(grants,1);assert.equal(lists,1);assert.equal(await page.locator('.pet-name').first().textContent(),'ペット：Pet 0');
  await page.locator('.resetPetNameBtn').click();await page.waitForFunction(()=>document.querySelector('.pet-name').textContent==='ペット：ペット名未設定');assert.equal(resets,1);assert.ok((await page.locator('.coin').first().textContent()).includes('17'));
  await page.locator('#next').click();await page.getByText('User 10',{exact:true}).waitFor();assert.equal(lists,2);assert.equal(await page.locator('.user').count(),10);
  await page.locator('#prev').click();await page.getByText('User 0',{exact:true}).waitFor();assert.equal(lists,2);assert.ok((await page.locator('.coin').first().textContent()).includes('17'));
  await page.waitForTimeout(1000);assert.equal(lists,2,'no background refresh');
  await page.locator('#search').fill('User 9');await page.waitForFunction(()=>document.querySelectorAll('.user').length===1);assert.equal(lists,3);assert.equal(await page.locator('.pet-name').textContent(),'ペット：Pet 9');
  await page.locator('#search').fill('');await page.waitForFunction(()=>document.querySelectorAll('.user').length===10);assert.equal(lists,3);
  await page.locator('#logout').click();assert.equal(await page.locator('#panel').isVisible(),false);assert.equal(await page.locator('.user').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Admin desktop/mobile: learning order, both names, ten-person paging, cached navigation, unchanged coin grants and logout isolation OK');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
