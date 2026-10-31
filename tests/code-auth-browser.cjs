const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),origin='https://k-oota-pixel.github.io';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
 try{
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1200,height:900}});
 const page=await context.newPage();let submitted;
 const authModule='export const browserLocalPersistence={};export const getAuth=()=>({currentUser:{uid:"legacy",getIdToken:async()=>"token"}});export const setPersistence=async()=>{};export const signInWithEmailAndPassword=async()=>{};export const signInWithCustomToken=async()=>{};export const signInWithPopup=async()=>{};export class GoogleAuthProvider{};export const signOut=async()=>{};export const onAuthStateChanged=(auth,next)=>next(location.pathname.endsWith("account.html")?{uid:"legacy",getIdToken:async()=>"token"}:null);export const accountSession=async()=>JSON.parse(sessionStorage.getItem("session")||"{\\"registered\\":false,\\"resetRequired\\":false}");';
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.gstatic.com')return route.fulfill({contentType:'text/javascript',body:'export const initializeApp=()=>({});export const getApps=()=>[];'});
  if(url.pathname.endsWith('/auth-session.js'))return route.fulfill({contentType:'text/javascript',body:authModule});
  if(url.pathname.endsWith('/firebase-security.js'))return route.fulfill({contentType:'text/javascript',body:'export const enableAppCheck=()=>{};'});
  if(url.hostname==='task-quest.onrender.com'){submitted=route.request().postDataJSON();return route.fulfill({contentType:'application/json',body:JSON.stringify({token:'custom-token'})});}
  if(url.origin===origin&&url.pathname.startsWith('/english-playroom/')){
   const relative=url.pathname.slice('/english-playroom/'.length)||'index.html';
   try{return route.fulfill({contentType:relative.endsWith('.js')?'text/javascript':'text/html',body:await fs.readFile(path.join(root,relative),'utf8')});}catch{}
  }
  return route.abort();
 });
 await page.goto(origin+'/english-playroom/login.html');
 await page.getByRole('tab',{name:'新規登録',exact:true}).click();
 assert.equal(await page.locator('#registrationCode').isVisible(),true);
 await page.locator('#email').fill('student01');await page.locator('#password').fill('password123');await page.locator('#confirmPassword').fill('password123');await page.locator('#registrationCode').fill('AB3D7K');
 await page.locator('#emailSubmit').click();await page.waitForTimeout(100);
 assert.equal(submitted.loginId,'student01');assert.equal(submitted.code,'AB3D7K');
 await page.goto(origin+'/english-playroom/account.html');
 assert.equal(await page.locator('#codeField').isVisible(),true);assert.match(await page.locator('#note').textContent(),/任意/);
 await page.locator('#code').fill('AB3D7K');await page.locator('#loginId').fill('student01');await page.locator('#password').fill('password123');await page.locator('#confirm').fill('password123');await page.locator('#save').click();
 await page.waitForFunction(()=>document.getElementById('form').hidden);
 assert.equal(submitted.loginId,'student01');
 await page.evaluate(()=>sessionStorage.setItem('session',JSON.stringify({registered:true,resetRequired:true})));
 await page.reload();await page.waitForFunction(()=>document.getElementById('currentPassword').required);
 assert.equal(await page.locator('#codeField').isVisible(),false);assert.equal(await page.locator('#currentField').isVisible(),true);
 await page.locator('#currentPassword').fill('temporary123');await page.locator('#password').fill('new-password123');await page.locator('#confirm').fill('new-password123');await page.locator('#save').click();await page.waitForFunction(()=>document.getElementById('form').hidden);
 assert.equal(submitted.currentPassword,'temporary123');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log((mobile?'mobile':'desktop')+': registration, optional link, password reset passed');await context.close();
 }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
