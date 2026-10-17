const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({}),getApps=()=>[{}],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト'}};
export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;window.authCallback(null);};
export function onAuthStateChanged(a,cb){window.authCallback=cb;queueMicrotask(()=>cb(auth.currentUser));return ()=>{};}`;
const firestoreMock=`export const getFirestore=()=>({}),doc=(db,...parts)=>parts.join('/'),serverTimestamp=()=>({timestamp:true});
const listeners=[];const snapshot=ref=>({exists:()=>true,data:()=>({...structuredClone(window.petStore||{}),nickname:'テスト'})});export const getDoc=async ref=>snapshot(ref);export function onSnapshot(ref,cb){listeners.push([ref,cb]);queueMicrotask(()=>cb(snapshot(ref)));return ()=>{};}export const setDoc=async()=>{};
export async function runTransaction(db,fn){
if(window.failSave && window.petStore.petLoginDays>=3)throw Object.assign(Error('offline'),{code:'unavailable'});
let staged;const result=await fn({get:async()=>({exists:()=>!!window.petStore,data:()=>structuredClone(window.petStore||{})}),set:(ref,payload)=>{staged={...window.petStore,...payload};}});
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners)queueMicrotask(()=>cb(snapshot(ref)));}return result;}`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext();
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const RealDate=Date;const fixed=new RealDate(2026,9,18,0,30).getTime();
 window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}getHours(){return 0;}getMinutes(){return 30;}};
 const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:30,petAppearance:{species:'dog',bodyColor:'blue',eyes:'round',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};
 });
 await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1800);
 async function sleepingEyes(){assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),'1');assert.equal(await page.locator('#petVisual .pet-sleep-face').count(),1);assert.notEqual(await page.locator('#petVisual .pet-sleep-face').evaluate(el=>getComputedStyle(el).display),'none');}
 await sleepingEyes();
 // Reproduce a wallet redraw while sleeping: the SVG is replaced, state is retained.
 await page.evaluate(()=>{const v=document.getElementById('petVisual');v.innerHTML=v.innerHTML;});await page.waitForTimeout(100);await sleepingEyes();
 for(const food of ['snack','meal','special']){
 await page.locator('#petFeed').click();await page.locator('[data-food='+food+']').click();await page.waitForTimeout(200);
 assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),null);
 assert.equal(await page.locator('#petVisual .pet-care-motion-layer').count(),1);
 const result=await page.evaluate(()=>{
 const v=document.getElementById('petVisual'),layer=v.querySelector('.pet-care-motion-layer');
 return {outerMoving:v.getAnimations().some(a=>a.playState==='running'),bodyMoving:layer.getAnimations().some(a=>a.playState==='running'),backgroundInside:!!layer.querySelector('.pet-background'),eyes:[...v.querySelectorAll('[data-shared-legacy-eyes]')].map(el=>getComputedStyle(el).opacity)};
 });
 assert.equal(result.outerMoving,false);assert.equal(result.bodyMoving,true);assert.equal(result.backgroundInside,false);assert.ok(result.eyes.length);assert.ok(result.eyes.every(opacity=>opacity==='1'));
 }
 await page.waitForTimeout(7400);await sleepingEyes();
 await page.locator('#petVisual').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),1);assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),null);
 assert.equal(await page.evaluate(()=>window.petStore.coins),21);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#petPet').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),2);
 assert.equal(await page.locator('#petVisual').evaluate(v=>v.getAnimations().filter(a=>a.playState==='running').length),0);
 assert.deepEqual(errors,[]);console.log('PASS: sleeping redraw keeps closed eyes; all foods wake with visible eyes; only character animates; sleeping body tap awards friendship; sleep returns; reduced motion honored.');
 }finally{await browser.close();}
})();
