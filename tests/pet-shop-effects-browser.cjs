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
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto(process.env.CAT_LIVE_URL||'http://127.0.0.1:8765');

 await page.locator('#petVisual svg[data-pet-stage]').waitFor();
 await page.waitForTimeout(1000);
 const savedShop=await page.evaluate(()=>({coins:window.petStore.coins,shop:structuredClone(window.petStore.petShop)}));
 await page.locator('#petShopOpen').click();
 await page.locator('.pet-shop-tab').filter({hasText:'エフェクト'}).click();
 const preview=page.locator('#petShopPreview');
 const base=['星のエフェクト','キラキラエフェクト','ハートエフェクト','音符エフェクト','紙吹雪'];
 const extras=['bubble-effect','snowflake-effect','leaf-effect','lightning-effect','flower-effect','candy-effect'];
 for(const name of base){
   await page.locator('.pet-shop-name').filter({hasText:name}).click();
   await page.waitForTimeout(80);
   for(const id of extras){
     await page.locator('[data-item-id="'+id+'"] .pet-shop-name').click();
     await page.waitForTimeout(100);
     assert.equal(await preview.locator('.pet-motif-effect,.pet-confetti-effect,.pet-rainbow-effect').count(),0,name+' -> '+id);
     assert.equal(await preview.locator('[data-pet-extra-layer="effects"]').count(),1,name+' -> '+id+' '+errors.join(';'));
     assert.ok(await preview.locator('.pet-extra-particle').count()>1);
     if(id==='flower-effect')assert.equal(await preview.locator('.pet-extra-particle circle').first().getAttribute('fill'),'#f2a0b7');
     const frameHandle=await page.waitForFunction(()=>{
       const a=document.querySelector('#petShopPreview .pet-extra-particle')?.getAnimations()[0];return a?.effect.getKeyframes().map(k=>({opacity:k.opacity,transform:k.transform}));
     });
     const motion=await frameHandle.jsonValue();
     assert.equal(motion[0].opacity,'0');assert.equal(motion.at(-1).opacity,'0');
     assert.ok(motion[0].transform.includes('-65px'));assert.ok(motion.at(-1).transform.includes('100px'));
   }
 }
 await page.locator('.pet-shop-name').filter({hasText:'紙吹雪'}).click();
 await page.waitForTimeout(100);
 assert.equal(await preview.locator('.pet-confetti-particle').count(),14);
 assert.equal(await preview.locator('[data-pet-extra-layer="effects"]').count(),0);
 await page.locator('.pet-shop-name').filter({hasText:'虹エフェクト'}).click();
 await page.waitForTimeout(100);
 assert.equal(await preview.locator('.pet-rainbow-effect').getAttribute('transform'),'translate(0 -40)');
 assert.equal(await preview.locator('.pet-confetti-effect').count(),0);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-item-id="bubble-effect"] .pet-shop-name').click();
 await page.waitForTimeout(100);
 assert.equal(await preview.locator('.pet-extra-particle').first().evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.deepEqual(await page.evaluate(()=>({coins:window.petStore.coins,shop:window.petStore.petShop})),savedShop,'preview never purchases');
 assert.deepEqual(errors,[]);
 console.log('SHOP effect switching, downward motion, confetti, rainbow OK');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
