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
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners){queueMicrotask(()=>cb(snapshot(ref)));setTimeout(()=>cb(snapshot(ref)),450);setTimeout(()=>cb(snapshot(ref)),1100);}}return result;}`;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
 try{
 const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:900}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const RealDate=Date;const fixed=new RealDate(2026,9,18,0,30).getTime();
 window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}getHours(){return window.forceDay?12:0;}getMinutes(){return 30;}};
 const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:30,petAppearance:{species:'dog',bodyColor:'blue',eyes:'round',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};
 });

 await page.addInitScript(()=>{const d=new Date(),today=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');window.petStore.petGeneration=1;window.petStore.petHealth={generation:1,checkedDate:today,sick:true,sickDays:0,zeroDays:3,wasteSeen:2,sickSince:today,curedDate:''};window.petStore.coins=10;window.forceDay=true;});
 await context.route('https://task-quest.onrender.com/**',route=>route.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto('http://127.0.0.1:8765');await page.locator('.pet-health-indicator').waitFor();
 const version=fs.readFileSync(path.join(root,'version-badge-v176.js'),'utf8').match(/const APP_VERSION='([^']+)'/)[1];
 assert.equal(await page.locator('.app-version-badge').textContent(),'ver'+version);
 await page.locator('#petShopOpen').click();await page.locator('.pet-shop-tab').filter({hasText:'おくすり'}).click();
 assert.equal(await page.locator('#petInjectionBuy').isEnabled(),true);
 await page.screenshot({path:path.join(process.env.FEED_SCREENSHOT_DIR||'.','health-shop.png')});
 await page.locator('#petInjectionBuy').click();await page.locator('.pet-shop-confirm-ok').click();
 await page.waitForFunction(()=>window.petStore.coins===5&&!window.petStore.petHealth.sick);
 assert.equal(await page.locator('#petInjectionBuy').isDisabled(),true);await page.waitForFunction(()=>!document.querySelector('.pet-health-indicator'));
 await page.locator('#petShopDialog .pet-shop-close').click();
 const before=await page.evaluate(()=>window.petStore.petHealth.checkedDate);
 await page.evaluate(()=>window.authCallback(window.testUser===false?null:{uid:'test-user'}));await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.petStore.petHealth.sick),false);assert.equal(await page.evaluate(()=>window.petStore.coins),5);assert.equal(await page.evaluate(()=>window.petStore.petHealth.checkedDate),before);
 await page.locator('#petFeed').click();await page.locator('[data-food=snack]').click();await page.waitForFunction(()=>window.petStore.petHealth.zeroDays===0);assert.equal(await page.evaluate(()=>window.petStore.coins),4);
 assert.deepEqual(errors,[]);console.log('PASS: version 1.8.1, thermometer, medicine tab, atomic five coin treatment, healthy disabled, no same-day relapse, feeding resets hunger.');
 }finally{await browser.close();}
})();
