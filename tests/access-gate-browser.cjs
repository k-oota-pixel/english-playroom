const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
try{
for(const scenario of ['signed-out','legacy','new-google','reset']){
 const context=await browser.newContext();const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.hostname==='www.gstatic.com'&&url.pathname.endsWith('firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[];export const initializeApp=()=>({});export const getApp=()=>({});'});
 if(url.hostname==='www.gstatic.com'&&url.pathname.endsWith('firebase-auth.js')){
 const user=scenario==='signed-out'?'null':'{uid:"legacy",getIdToken:async()=>"test-token"}';
 return route.fulfill({contentType:'text/javascript',body:'export const getAuth=()=>({});export const initializeAuth=()=>({});export const browserLocalPersistence={},indexedDBLocalPersistence={},browserSessionPersistence={},browserPopupRedirectResolver={};export const signOut=async()=>{};export const getIdTokenResult=async()=>({claims:{}});export const onAuthStateChanged=(auth,next)=>{queueMicrotask(()=>next('+user+'));return ()=>{};};'});
 }
 if(url.hostname==='task-quest.onrender.com')return route.fulfill({status:scenario==='new-google'?403:200,contentType:'application/json',body:JSON.stringify(scenario==='new-google'?{error:'新規登録には登録コードが必要です。'}:{registered:false,resetRequired:scenario==='reset'})});
 if(url.pathname.endsWith('/login.html')||url.pathname.endsWith('/account.html'))return route.fulfill({contentType:'text/html; charset=utf-8',body:'<h1>ログイン</h1>'});
 if(url.pathname==='/protected/index.html')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<html><head><style id="monstudy-access-lock">body{visibility:hidden!important}</style><script type="module" src="https://k-oota-pixel.github.io/english-playroom/access-gate.js?v=2.3.1"></script></head><body><h1>教材</h1></body></html>'});
 if(url.pathname.endsWith('access-gate.js')||url.pathname.endsWith('auth-session.js'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(__dirname,'..',url.pathname.split('/').at(-1)),'utf8')});
 return route.abort();
 });
 await page.goto('https://k-oota-pixel.github.io/protected/index.html');
 if(scenario==='signed-out')await page.waitForURL('**/login.html?return=*');
 if(scenario==='legacy'){await page.waitForFunction(()=>!document.getElementById('monstudy-access-lock'));await page.getByRole('heading',{name:'教材'}).waitFor({state:'visible',timeout:3000});assert.equal(await page.getByRole('heading',{name:'教材'}).isVisible(),true);}
 if(scenario==='new-google'){await page.locator('#monstudy-access-message').waitFor();assert.match(await page.locator('#monstudy-access-message').textContent(),/登録コード/);assert.equal(await page.locator('#monstudy-access-lock').count(),1);}
 if(scenario==='reset')await page.waitForURL('**/account.html?mode=password');
 assert.deepEqual(errors,[]);console.log(scenario+': access gate passed');await context.close();
}
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
