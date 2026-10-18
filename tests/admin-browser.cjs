const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});let lists=0,details=0,grants=0;const errors=[];
  await context.addInitScript(()=>{const RealDate=Date;window.testNow=RealDate.now();window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.testNow]));}static now(){return window.testNow;}};});
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?'export const initializeApp=()=>({});':`const u={uid:'admin',email:'admin@example.test',getIdToken:async()=>'token'};const auth={currentUser:u},listeners=new Set();export const getAuth=()=>auth,GoogleAuthProvider=class{setCustomParameters(){}};export const browserLocalPersistence={},setPersistence=async()=>{};export function onAuthStateChanged(a,cb){listeners.add(cb);queueMicrotask(()=>cb(auth.currentUser));}export const signOut=async()=>{auth.currentUser=null;for(const cb of listeners)cb(null);};export const signInWithPopup=async()=>{auth.currentUser=u;for(const cb of listeners)cb(u);};`}));
  await context.route('http://127.0.0.1:8765/**',route=>{const file=path.join(root,new URL(route.request().url()).pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'text/html',body:fs.readFileSync(file,'utf8')});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route('https://task-quest.onrender.com/api/admin/**',async route=>{
   const u=new URL(route.request().url()),fetchedAt=await page.evaluate(()=>Date.now());let body;
   if(u.pathname==='/api/admin/users'){
    lists++;assert.equal(u.searchParams.get('limit'),'10');const start=u.searchParams.get('pageToken')==='next'?10:0;
    body={users:Array.from({length:10},(_,i)=>({uid:'u'+(start+i),nickname:'User '+(start+i),hasNickname:true,coins:7})),nextPageToken:start?null:'next',fetchedAt};
   }else if(u.pathname==='/api/admin/user'){details++;body={uid:u.searchParams.get('uid'),apps:{'english-playroom':{coins:7},ateru:{submissions:2}},fetchedAt};}
   else if(u.pathname==='/api/admin/coins'){grants++;assert.deepEqual(route.request().postDataJSON(),{uid:'u0',amount:10});body={coins:17};}
   else throw Error('unexpected admin endpoint');
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:8765/admin.html');await page.locator('.user').last().waitFor();
  assert.equal(await page.locator('.user').count(),10);assert.equal(lists,1);assert.equal(details,0);
  await page.locator('.user-summary').first().click();await page.locator('.grantBtn').waitFor();assert.equal(details,1);
  await page.locator('.user-summary').first().click();await page.locator('.user-summary').first().click();assert.equal(details,1);
  await page.locator('.grantBtn').click();await page.waitForTimeout(100);assert.equal(grants,1);assert.equal(lists,1);assert.ok((await page.locator('.coin').first().innerText()).includes('17'));
  await page.locator('#next').click();await page.getByText('User 10',{exact:true}).waitFor();assert.equal(lists,2);assert.equal(await page.locator('.user').count(),10);
  await page.locator('#prev').click();await page.getByText('User 0',{exact:true}).waitFor();assert.equal(lists,2);assert.ok((await page.locator('.coin').first().innerText()).includes('17'));
  assert.equal(await page.locator('#refresh').isEnabled(),false);
  await page.evaluate(()=>window.testNow+=61000);await page.waitForTimeout(1100);await page.locator('#refresh').click();await page.waitForTimeout(100);assert.equal(lists,3);
  await page.locator('#search').fill('User 9');assert.equal(await page.locator('.user').count(),1);assert.equal(lists,3);
  await page.screenshot({path:'admin-'+viewport.width+'.png'});
  await page.locator('#logout').click();assert.equal(await page.locator('#panel').isVisible(),false);assert.equal(await page.locator('.user').count(),0);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS admin desktop/mobile: ten-person paging, cached navigation/detail, cooldown, local coin update, scoped search, logout isolation');
}finally{await browser.close();}})();
