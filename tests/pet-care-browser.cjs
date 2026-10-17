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
 const browser=await chromium.launch({headless:true,channel:"msedge"});
 try{
 const context=await browser.newContext();
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:20,petAppearance:{species:'cat',bodyColor:'cream',eyes:'round',feature:'classic',pattern:'none',baseBackground:'ivory'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};});
 await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1800);
 await page.locator('#petFeed').click();assert.equal(await page.locator('[data-food]').count(),3);
 await page.locator('[data-food=snack]').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),19);
 for(const [food,coins] of [['meal',16],['special',11]]){await page.locator('#petFeed').click();await page.locator('[data-food='+food+']').click();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),coins);}
 for(let i=0;i<4;i++){await page.locator('#petPet').click();await page.waitForTimeout(100);}
 assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),3);assert.equal(await page.evaluate(()=>window.petStore.coins),11);
 await page.locator('#petVisual').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.petStore.petCare.petCount),3);
 const saved=await page.evaluate(()=>window.petStore);assert.deepEqual(saved.petShop,{ownedItems:['crown'],equipped:{head:'crown'}});
 await page.locator('#petShopOpen').click();assert.equal(await page.locator('#petShopDialog').evaluate(el=>el.open),true);await page.locator('#petShopClose').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'care-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>window.failSave=true);await page.locator('#petPet').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),3);
  await page.evaluate(()=>window.failSave=false);
 await page.addInitScript(data=>window.petStore=data,{...saved,coins:0});await page.reload();await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),3);await page.locator('#petFeed').click();assert.equal(await page.locator('[data-food]:disabled').count(),3);await page.keyboard.press('Escape');
 await page.locator('#petVisual').focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),3);
 await page.addInitScript(data=>window.petStore=data,{...saved,petCare:{...saved.petCare,date:'2000-01-01'}});await page.reload();await page.waitForTimeout(1200);await page.locator('#petPet').click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),4);
 assert.deepEqual(errors,[]);console.log('Care browser checks passed: all food costs, PET cap, body tap, shop, owned items, mobile, failure rollback.');
 } finally{await browser.close();}
})();



