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
 const context=await browser.newContext({viewport:{width:1280,height:950},reducedMotion: 'no-preference'});
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
 if(process.env.JUVENILE)await page.addInitScript(()=>{window.petStore.petAdult=false;delete window.petStore.petAppearance;});
 await page.goto(process.env.CAT_LIVE_URL||'http://127.0.0.1:8765');


 let requests=0;
 await page.route('https://task-quest.onrender.com/api/shop/rename',async route=>{
   requests++;const {kind,name}=route.request().postDataJSON();
   if(name==='Taken')return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'そのニックネームはすでに使われています。'})});
   const result=await page.evaluate(({kind,name})=>{window.petStore.coins-=30;window.petStore[kind==='pet'?'petName':'nickname']=name;return {name,coins:window.petStore.coins};},{kind,name});
   await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.locator('#petVisual svg[data-pet-stage]').waitFor();await page.waitForTimeout(1000);
 await page.locator('#petShopOpen').click();await page.locator('.pet-shop-tab').filter({hasText:'名前変更'}).click();
 assert.equal(await page.locator('.pet-name-product').count(),2);
 assert.deepEqual(await page.locator('.pet-name-product .pet-shop-price').allTextContents(),['🪙 30','🪙 30']);
 const pet=page.locator('[data-name-kind="pet"]'),user=page.locator('[data-name-kind="user"]');
 await pet.locator('input').fill('Luna');await pet.locator('button').click();await page.locator('#petShopConfirmCancel').click();assert.equal(requests,0);
 await pet.locator('input').fill('');await pet.locator('button').click();assert.equal(requests,0);
 await pet.locator('input').fill('Luna');await pet.locator('button').click();await page.locator('#petShopConfirmOk').click();
 await page.waitForFunction(()=>window.petStore.petName==='Luna'&&document.querySelector('#petShopBalance').textContent.includes('60 コイン'));assert.equal(await page.evaluate(()=>window.petStore.coins),60);
 await user.locator('input').fill('Taken');await user.locator('button').click();await page.locator('#petShopConfirmOk').click();
 await page.waitForFunction(()=>document.querySelector('#petShopToast').textContent.includes('すでに'));assert.equal(await page.evaluate(()=>window.petStore.coins),60);
 await user.locator('input').fill('Haru');await user.locator('button').click();await page.locator('#petShopConfirmOk').click();
 await page.waitForFunction(()=>window.EnglishPlayroomProfile.nickname==='Haru');assert.equal(await page.evaluate(()=>window.petStore.coins),30);
 await pet.locator('input').fill('Momo');await pet.locator('button').click();await page.locator('#petShopConfirmOk').click();
 await page.waitForFunction(()=>document.querySelector('#petShopBalance').textContent.includes('0 コイン'));
 assert.equal(await page.locator('.pet-name-product button:disabled').count(),2);assert.equal(requests,4);assert.deepEqual(errors,[]);
 console.log('Two 30-coin name products: validation, cancellation, duplicate failure, successful charges and insufficient balance OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
