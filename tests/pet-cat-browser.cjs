const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const appMock='export const initializeApp=()=>({}),getApps=()=>[{}],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト',getIdToken:async()=> 'test-token'}};
auth.authStateReady=async()=>{};export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;window.authCallback(null);};
export function onAuthStateChanged(a,cb){window.authCallback=cb;queueMicrotask(()=>cb(auth.currentUser));return ()=>{};}`;
const firestoreMock=`export const getFirestore=()=>({}),doc=(db,...parts)=>parts.join('/'),serverTimestamp=()=>({timestamp:true});
const listeners=[];const snapshot=ref=>({exists:()=>true,data:()=>({...structuredClone(window.petStore||{}),nickname:'テスト'})});export const getDoc=async ref=>snapshot(ref);export function onSnapshot(ref,cb){listeners.push([ref,cb]);queueMicrotask(()=>cb(snapshot(ref)));return ()=>{};}export const setDoc=async()=>{};
export async function runTransaction(db,fn){
if(window.failSave && window.petStore.petLoginDays>=3)throw Object.assign(Error('offline'),{code:'unavailable'});
let staged;const result=await fn({get:async()=>({exists:()=>!!window.petStore,data:()=>structuredClone(window.petStore||{})}),set:(ref,payload)=>{staged={...window.petStore,...payload};}});
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners)queueMicrotask(()=>cb(snapshot(ref)));}return result;}`;

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:1280,height:950}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('https://task-quest.onrender.com/**',route=>route.fulfill({contentType:'application/json',body:'{}'}));
 if(!process.env.CAT_LIVE_URL)await context.route('http://127.0.0.1:8765/**',route=>{
  const file=path.join(root,new URL(route.request().url()).pathname==='/'?'index.html':new URL(route.request().url()).pathname);
  return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file)});
 });
 const screenshotDir=path.resolve(root,'cat-test-artifacts');fs.mkdirSync(screenshotDir,{recursive:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const RealDate=Date,fixed=new RealDate(2026,9,19,12,0).getTime();
  window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}getHours(){return window.forceNight?0:12;}getMinutes(){return 0;}};
  window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:'2026-10-19',petLastLifeLoginDate:'2026-10-19',petBirthBonusGranted:true,petName:'ねこ',coins:90,learningMarker:{keep:true},petAppearance:{species:'cat',bodyColor:'orange',eyes:'round',eyeStyle:'round',feature:'classic',pattern:'none',baseBackground:'rose'},petShop:{ownedItems:['crown','forest-bg'],equipped:{head:'crown'}}};
 });
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto(process.env.CAT_LIVE_URL||'http://127.0.0.1:8765');
 await page.locator('#petVisual [data-pet-cat-art="editable"]').waitFor();
 await page.locator('.pet-admin-open').waitFor();
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('#petVisual [data-pet-redesign]').count(),0,'legacy observers must leave new cat alone');
 const before=await page.evaluate(()=>structuredClone(window.petStore));
 await page.locator('.pet-admin-open').click();
 await page.locator('#petAdminDialog[open]').waitFor();
 await page.locator('#petAdminDialog [data-stage="adult"]').click();
 const colors=['cream','pink','blue','mint','lavender','orange'],eyes=['round','gentle','watery','smile','sleepy','sparkle'];
 for(const color of colors)for(const eye of eyes){
  await page.locator('#petAdminGrid [data-key="bodyColor"]').selectOption(color);
  await page.locator('#petAdminGrid [data-key="eyeStyle"]').selectOption(eye);
  assert.equal(await page.locator('#petAdminPreview [data-cat-eye-style]').getAttribute('data-cat-eye-style'),eye);
  const ink=await page.locator('#petAdminPreview [data-pet-cat-art] > g > g[id$="cat-body"] > path').first().getAttribute('fill');
  assert.equal(ink,{'cream':'#f5d99b','pink':'#f3b5c4','blue':'#a4cce9','mint':'#a9d9bc','lavender':'#c6b8e3','orange':'#efb478'}[color]);
 }
 assert.deepEqual(await page.evaluate(()=>window.petStore),before,'previewing 36 combinations must not save');
 await page.locator('#petAdminGrid [data-key="bodyColor"]').selectOption('blue');
 await page.locator('#petAdminGrid [data-key="eyeStyle"]').selectOption('watery');
 await page.screenshot({path:path.join(screenshotDir,'cat-admin-implemented.png')});
 await page.locator('#petAdminDialog [data-save]').click();
 await page.waitForFunction(()=>window.petStore.petAppearance.bodyColor==='blue'&&window.petStore.petAppearance.eyeStyle==='watery');
 await page.locator('#petAdminDialog').waitFor({state:'hidden'});
 await page.waitForFunction(()=>document.querySelector('#petVisual [data-cat-eye-style]')?.dataset.catEyeStyle==='watery');
 const after=await page.evaluate(()=>window.petStore);
 for(const field of ['coins','petName','petShop','learningMarker','petLifeDays','petLoginDays'])assert.deepEqual(after[field],before[field],field+' is preserved');
 // Save through the real admin UI so lifecycle/shop subscribers receive the same state.
 async function saveAppearance(color,eye){
  await page.locator('.pet-admin-open').click();
  await page.locator('#petAdminDialog[open]').waitFor();
  await page.locator('#petAdminGrid [data-key="bodyColor"]').selectOption(color);
  await page.locator('#petAdminGrid [data-key="eyeStyle"]').selectOption(eye);
  await page.locator('#petAdminDialog [data-save]').click();
  await page.locator('#petAdminDialog').waitFor({state:'hidden'});
  await page.waitForFunction(({color,eye})=>window.petStore.petAppearance.bodyColor===color&&document.querySelector('#petVisual [data-cat-eye-style]')?.dataset.catEyeStyle===eye,{color,eye});
 }
 // Main renderer exercises the same 36 combinations with all legacy observers active.
 for(const color of colors)for(const eye of eyes){
  await saveAppearance(color,eye);
  assert.equal(await page.locator('#petVisual [data-cat-eye-style]').getAttribute('data-cat-eye-style'),eye);
  assert.equal(await page.locator('#petVisual [data-pet-cat-art]').count(),1);
 }
 await saveAppearance('orange','round');
 await page.waitForTimeout(200);
 await page.screenshot({path:path.join(screenshotDir,'cat-desktop-implemented.png')});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(screenshotDir,'cat-mobile-implemented.png'),fullPage:true});
 await page.evaluate(()=>{window.forceNight=true;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>document.getElementById('petVisual').dataset.petSleeping==='1');
 assert.equal(await page.locator('#petVisual [data-pet-eyes]').evaluate(el=>getComputedStyle(el).opacity),'0');
 assert.equal(await page.locator('#petVisual .pet-sleep-face').evaluate(el=>getComputedStyle(el).display),'inline');
 await page.evaluate(()=>{window.forceNight=false;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>!document.getElementById('petVisual').dataset.petSleeping);
 assert.equal(await page.locator('#petVisual [data-pet-eyes]').evaluate(el=>getComputedStyle(el).opacity),'1');
 const refs=await page.evaluate(()=>{const svg=document.querySelector('#petVisual svg');return [...svg.querySelectorAll('[clip-path]')].every(el=>{const id=el.getAttribute('clip-path').slice(5,-1);return !!document.getElementById(id);});});assert.ok(refs);
 assert.deepEqual(errors,[]);
 console.log('PASS: 36 admin and 36 main combinations, admin save, other data preserved, legacy observer coexistence, equipment/background, desktop/mobile and sleep/wake.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
