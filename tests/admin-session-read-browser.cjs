const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  for(const admin of [false,true,'true',undefined]){
   const page=await browser.newPage();let sessions=0,adminRequests=0;
   const html='<meta charset="utf-8"><section class="pet-card"><div class="pet-visual-wrap"></div></section><script type="module" src="/pet-admin-panel.js?v=2.3.7"></script>';
   await page.route('https://admin-read.test/**',route=>{
    const p=new URL(route.request().url()).pathname;
    if(p==='/')return route.fulfill({contentType:'text/html',body:html});
    if(p==='/pet-model.js')return route.fulfill({contentType:'text/javascript',body:'export const OPTIONS={};export const normalizeAppearance=()=>({});export const validAppearance=()=>true;'});
    if(p==='/pet-art.js')return route.fulfill({contentType:'text/javascript',body:"export const renderPetSVG=()=>'';"});
    return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,p.slice(1)),'utf8')});
   });
   await page.route('https://k-oota-pixel.github.io/english-playroom/auth-session.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'auth-session.js'),'utf8')}));
   await page.route('https://www.gstatic.com/firebasejs/**',route=>{
    const url=route.request().url();let body='';
    if(url.endsWith('firebase-app.js'))body='export const getApps=()=>[{}];export const getApp=()=>({});';
    else if(url.endsWith('firebase-auth.js'))body=`const auth=window.testAuth={currentUser:{uid:'student',getIdToken:async()=> 'test-token'}};export const getAuth=()=>auth;export const initializeAuth=()=>auth;export const browserLocalPersistence={},indexedDBLocalPersistence={},browserSessionPersistence={},browserPopupRedirectResolver={};export const getIdTokenResult=async()=>({claims:{}});export function onAuthStateChanged(auth,next){queueMicrotask(()=>Promise.resolve(next(auth.currentUser)).finally(()=>{window.authCallbackFinished=true;}));return ()=>{};}`;
    else if(url.endsWith('firebase-firestore.js'))body="window.firestoreReads=0;export const getFirestore=()=>({});export const doc=()=>({});export const getDoc=async()=>{window.firestoreReads++;throw Error('unexpected document read');};export const runTransaction=async()=>{throw Error('unexpected write');};export const serverTimestamp=()=>0;";
    else throw Error('Unexpected SDK module '+url);
    return route.fulfill({contentType:'text/javascript',body});
   });
   await page.route('https://task-quest.onrender.com/api/**',route=>{
    if(route.request().url().endsWith('/api/admin/session')){adminRequests++;return route.fulfill({status:403,json:{error:'must not probe admin separately'}});}
    assert.ok(route.request().url().endsWith('/api/account/session'));assert.equal(route.request().headers().authorization,'Bearer test-token');sessions++;
    return route.fulfill({json:{registered:true,resetRequired:false,...(admin===undefined?{}:{admin})}});
   });
   await page.goto('https://admin-read.test/');await page.waitForFunction(()=>window.authCallbackFinished);await page.evaluate(()=>new Promise(requestAnimationFrame));
   assert.equal(await page.locator('.pet-admin-open').count(),admin===true?1:0);assert.equal(sessions,1);assert.equal(adminRequests,0);assert.equal(await page.evaluate(()=>window.firestoreReads),0);
   await page.close();
  }
  console.log('PASS administrator display reuses one login session; student/administrator/missing/malformed hints; zero extra admin probes or document reads');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
