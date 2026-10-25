const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({}),getApps=()=>[{}],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト',getIdToken:async()=>'test-token'}};
auth.authStateReady=async()=>{};export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;window.authCallback(null);};
export function onAuthStateChanged(a,cb){window.authCallback=cb;queueMicrotask(()=>cb(auth.currentUser));return ()=>{};}`;
const firestoreMock=`export const getFirestore=()=>({}),doc=(db,...parts)=>parts.join('/'),serverTimestamp=()=>({timestamp:true});
const listeners=[];const snapshot=ref=>({exists:()=>true,data:()=>({...structuredClone(window.petStore||{}),nickname:'テスト'})});export const getDoc=async ref=>snapshot(ref);export function onSnapshot(ref,cb){listeners.push([ref,cb]);queueMicrotask(()=>cb(snapshot(ref)));return ()=>{};}export const setDoc=async()=>{};
export async function runTransaction(db,fn){
if(window.failSave && window.petStore.petLoginDays>=3)throw Object.assign(Error('offline'),{code:'unavailable'});
let staged;const result=await fn({get:async()=>({exists:()=>!!window.petStore,data:()=>structuredClone(window.petStore||{})}),set:(ref,payload)=>{staged={...window.petStore,...payload};}});
if(staged){if(JSON.stringify(staged.petCare)!==JSON.stringify(window.petStore.petCare))window.careWriteCount=(window.careWriteCount||0)+1;window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners)queueMicrotask(()=>cb(snapshot(ref)));}return result;}`;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"msedge"});
 try{
 const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:900}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:20,petAppearance:{species:'cat',bodyColor:'cream',eyes:'round',feature:'classic',pattern:'none',baseBackground:'ivory'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};});
 await page.clock.install();
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1800);
 await page.locator('#petFeed').click();assert.equal(await page.locator('[data-food]').count(),3);
 await page.locator('[data-food=snack]').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),19);
 for(const [food,coins] of [['meal',16],['special',11]]){await page.locator('#petFeed').click();await page.locator('[data-food='+food+']').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),coins);}
 assert.equal(await page.locator('#petHappyGauge').getAttribute('aria-valuenow'),'9');
 await page.locator('#petFeed').click();await page.locator('[data-food=snack]').click();await page.waitForTimeout(200);
 assert.equal(await page.locator('#petHappyGauge').getAttribute('aria-valuenow'),'10');
 assert.equal(await page.locator('#petVisual').getAttribute('data-care-reacting'),'max');
 assert.match(await page.locator('.pet-care-feedback').innerText(),/HAPPY \+1.*MAX HAPPY!/);
 assert.equal(await page.locator('.pet-care-particles>.pet-motif').count(),12);
 await page.waitForTimeout(2900);assert.equal(await page.locator('.pet-care-feedback').count(),0);
 const equipped=await page.evaluate(()=>JSON.stringify(window.petStore.petShop));
 await page.locator('#petShopOpen').click();assert.ok(await page.locator('#petShopDialog').evaluate(el=>el.open));await page.locator('#petShopClose').click();
 if(!await page.locator('#petClean').isDisabled()){await page.locator('#petClean').click();await page.waitForTimeout(1800);}
 assert.equal(await page.evaluate(()=>window.petStore.coins),10);assert.equal(await page.evaluate(()=>JSON.stringify(window.petStore.petShop)),equipped);
 assert.equal(await page.evaluate(()=>window.petStore.petCare.happy),10);
 // Other daily features can write at midnight; HAPPY itself must not write.
 const writes=await page.evaluate(()=>window.careWriteCount);
 await page.clock.setSystemTime(new Date(Date.now()+86400000));await page.clock.runFor(1100);
 assert.equal(await page.locator('#petHappyGauge').getAttribute('aria-valuenow'),'0');
 assert.equal(await page.evaluate(()=>window.careWriteCount),writes);
 assert.equal(await page.evaluate(()=>window.petStore.petCare.happy),10);
 await page.locator('#petFeed').click();await page.locator('[data-food=meal]').click();await page.clock.runFor(200);
 assert.equal(await page.evaluate(()=>window.petStore.petCare.happy),3);
 assert.equal(await page.evaluate(()=>window.petStore.coins),7);
 assert.equal(await page.evaluate(()=>window.careWriteCount),writes+1);

 const beforeFailure=await page.evaluate(()=>JSON.stringify(window.petStore));
 await page.evaluate(()=>{window.failSave=true;});
 await page.locator('#petFeed').click();await page.locator('[data-food=snack]').click();await page.clock.runFor(200);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.petStore)),beforeFailure);
 assert.match(await page.locator('#petFeedStatus').innerText(),/offline/);
 await page.locator('#petFeedDialog .pet-shop-close').click();await page.evaluate(()=>{window.failSave=false;});
 assert.equal(await page.locator('#petPet').count(),0);
 const saved=await page.evaluate(()=>JSON.stringify(window.petStore));
 for(let i=0;i<5;i++){await page.locator('#petVisual').click();await page.waitForTimeout(100);}
 assert.equal(await page.evaluate(()=>JSON.stringify(window.petStore)),saved);
 assert.deepEqual(errors,[]);console.log('PASS: food costs, HAPPY gauge and cap, MAX feedback, midnight without writes, next FEED persistence, SHOP, CLEAN and free body taps.');
 } finally{await browser.close();}
})();



