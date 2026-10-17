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
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{const context=await browser.newContext();
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const today=new Date();const key=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 async function load(data){await page.addInitScript(data=>window.petStore=data,data);await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1600);}
 await load({petLoginDays:3,petLifeDays:3,petLifecycleVersion:141,petGrowthVersion:1427,petLastLoginDate:key,petLastLifeLoginDate:key,coins:90});
 await page.locator('#petCreate').click();await page.waitForTimeout(1500);
 assert.equal(await page.evaluate(()=>window.petStore.petAppearance),null);assert.equal(await page.locator('dialog[open]').count(),0);assert.ok(await page.locator('#petVisual svg[data-pet-stage=mystery]').count());
 assert.ok(await page.evaluate(()=>window.petStore.coins>=90));
 const newborn=await page.evaluate(()=>window.petStore);
 await load({...newborn,petHatchDate:'2026-01-01',petName:'ふわ',petShop:{ownedItems:['crown'],equipped:{head:'crown'}}});
 await page.waitForSelector('dialog[open] #petMakerTitle');
 for(let i=0;i<3;i++){await page.locator('dialog[open] .pet-choice').first().click();await page.locator('dialog[open] [data-next]').click();}
 assert.equal(await page.locator('#newPetName').inputValue(),'ふわ');
 await page.evaluate(()=>window.failSave=true);await page.locator('dialog[open] [data-next]').click();await page.waitForTimeout(200);assert.equal(await page.locator('dialog[open] #petMakerTitle').count(),1);assert.equal(await page.evaluate(()=>window.petStore.petAdult),false);await page.evaluate(()=>window.failSave=false);await page.locator('dialog[open] [data-next]').click();await page.waitForTimeout(1500);
 const adult=await page.evaluate(()=>window.petStore);assert.equal(adult.petAdult,true);assert.equal(adult.petGrowthPending,false);assert.equal(adult.petName,'ふわ');assert.deepEqual(adult.petShop,newborn.petShop||{ownedItems:['crown'],equipped:{head:'crown'}});
 await load(adult);assert.equal(await page.locator('dialog[open] #petMakerTitle').count(),0);assert.ok(await page.locator('#petVisual svg[data-pet-stage=baby]').count());
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(root,'../../growth-mobile.png'),fullPage:true});
 const legacy={...adult};delete legacy.petGrowthVersion;delete legacy.petAdult;legacy.petAppearance.species='panda';await load(legacy);assert.equal(await page.evaluate(()=>window.petStore.petAdult),true);assert.equal(await page.evaluate(()=>window.petStore.petAppearance.species),'panda');assert.equal(await page.locator('dialog[open] #petMakerTitle').count(),0);
 assert.deepEqual(errors,[]);console.log('Growth browser checks passed: hatch without survey/species, bonus, day seven prompt, answers, name/items preserved, adult reload, no runtime errors.');
 }finally{await browser.close();}
})();
