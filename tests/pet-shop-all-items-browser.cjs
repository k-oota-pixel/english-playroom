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
 await page.addInitScript(extra=>{
   const equipped=extra?{head:'chef-hat',face:'heart-glasses',neck:'green-scarf',effects:'bubble-effect',backgrounds:'beach-bg'}:{head:'crown',face:'sunglasses',neck:'red-bowtie',effects:'star-effect',backgrounds:'forest-bg'};
   window.petStore.petShop={ownedItems:[...Object.values(equipped),'crown'],equipped:{...equipped,accessories:'crown'}};
 },!!process.env.EQUIPPED_EXTRA);
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto(process.env.CAT_LIVE_URL||'http://127.0.0.1:8765');


 await page.locator('#petVisual svg[data-pet-stage]').waitFor();await page.waitForTimeout(1000);
 const catalog=[];
 for(const file of ['pet-shop.js','pet-shop-expansion-v1533.js']){
   const text=fs.readFileSync(path.join(root,file),'utf8');
   const re=/\{id:'([^']+)',name:'([^']+)',price:\d+,slot:'([^']+)'/g;let m;
   while(m=re.exec(text))catalog.push({id:m[1],name:m[2],slot:m[3]});
 }
 const saved=await page.evaluate(()=>JSON.stringify({coins:window.petStore.coins,shop:window.petStore.petShop}));
 const originalEquipped=JSON.parse(saved).shop.equipped;
 await page.locator('#petShopOpen').click();
 let checks=0;const failures=[];
 for(const [slot,label] of Object.entries({head:'あたま',face:'かお',neck:'くび',effects:'エフェクト',backgrounds:'背景'})){
   await page.locator('.pet-shop-tab').filter({hasText:label}).click();
   const items=catalog.filter(i=>i.slot===slot);
   // Every ordered pair, including repeated selections and base/extra boundaries.
   for(const first of items)for(const next of items){
     for(const item of [first,next]){
       await page.evaluate(name=>[...document.querySelectorAll('.pet-shop-name')].find(el=>el.textContent===name).click(),item.name);
       await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
     }
     const shown=await page.evaluate(slot=>[...document.querySelectorAll('#petShopPreview [data-pet-shop-slot="'+slot+'"],#petShopPreview [data-pet-extra-layer="'+slot+'"]')].map(el=>el.dataset.petShopItem||el.dataset.petExtraItem),slot);
     if(shown.length!==1||shown[0]!==next.id)failures.push({from:first.id,to:next.id,shown});
     const otherSlots=await page.evaluate(slot=>Object.fromEntries(['head','face','neck','effects','backgrounds'].filter(s=>s!==slot).map(s=>[s,[...document.querySelectorAll('#petShopPreview [data-pet-shop-slot="'+s+'"],#petShopPreview [data-pet-extra-layer="'+s+'"]')].map(el=>el.dataset.petShopItem||el.dataset.petExtraItem)])),slot);
     for(const [other,ids] of Object.entries(otherSlots))assert.deepEqual(ids,[originalEquipped[other]],'different slot remains equipped: '+other);
     checks++;
   }
   console.log(slot+': '+items.length+' items, '+items.length**2+' transitions checked');
 }
 assert.deepEqual(await page.evaluate(()=>JSON.stringify({coins:window.petStore.coins,shop:window.petStore.petShop})),saved);
 assert.deepEqual(errors,[]);
 console.log('Total items:',catalog.length,'Total transitions:',checks,'Failures:',failures.length);
 if(failures.length)console.log(JSON.stringify(failures.slice(0,12)));
 assert.equal(failures.length,0);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
