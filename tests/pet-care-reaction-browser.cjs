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
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners){queueMicrotask(()=>cb(snapshot(ref)));setTimeout(()=>cb(snapshot(ref)),450);setTimeout(()=>cb(snapshot(ref)),1100);}}return result;}`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:900}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const RealDate=Date;const fixed=new RealDate(2026,9,18,0,30).getTime();
 window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}getHours(){return window.forceDay?12:0;}getMinutes(){return 30;}};
 const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:30,petAppearance:{species:'dog',bodyColor:'blue',eyes:'round',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};
 });
 await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1800);
 async function sleepingEyes(){assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),'1');assert.equal(await page.locator('#petVisual .pet-sleep-face').count(),1);assert.notEqual(await page.locator('#petVisual .pet-sleep-face').evaluate(el=>getComputedStyle(el).display),'none');}
 await sleepingEyes();
 // Reproduce a wallet redraw while sleeping: the SVG is replaced, state is retained.
 await page.evaluate(()=>{const v=document.getElementById('petVisual');v.innerHTML=v.innerHTML;});await page.waitForTimeout(100);await sleepingEyes();
 assert.equal(await page.locator('#petPet').count(),0);
 assert.equal(await page.locator('#petFriendship').count(),0);
 for(const food of ['snack','meal','special']){
 await page.locator('#petFeed').click();await page.locator('[data-food='+food+']').click();await page.waitForTimeout(200);
 assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),null);
 assert.equal(await page.locator('#petVisual .pet-care-motion-layer').count(),1);
 assert.equal(await page.locator('.pet-care-feedback').count(),1);
 const result=await page.evaluate(()=>{
 const v=document.getElementById('petVisual'),layer=v.querySelector('.pet-care-motion-layer');
 return {outerMoving:v.getAnimations().some(a=>a.playState==='running'),bodyMoving:layer.getAnimations().some(a=>a.playState==='running'),backgroundInside:!!layer.querySelector('.pet-background'),eyes:[...v.querySelectorAll('[data-shared-legacy-eyes]')].map(el=>getComputedStyle(el).opacity)};
 });
 assert.equal(result.outerMoving,false);assert.equal(result.bodyMoving,true);assert.equal(result.backgroundInside,false);assert.ok(result.eyes.length);assert.ok(result.eyes.every(opacity=>opacity==='1'));
 const effective=await page.locator('#petVisual [data-pet-eyes]').evaluateAll(eyes=>eyes.map(eye=>{
   let opacity=1;for(let node=eye;node&&node.id!=='petVisual';node=node.parentElement)opacity*=Number(getComputedStyle(node).opacity);return opacity;
 }));
 assert.ok(effective.length>0);assert.ok(effective.every(opacity=>opacity===1),'cloned nested eyes must actually be visible');
 }
 await page.waitForTimeout(7400);await sleepingEyes();
 await page.locator('#petVisual').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),undefined);assert.equal(await page.locator('#petVisual').getAttribute('data-pet-sleeping'),null);
 assert.equal(await page.evaluate(()=>window.petStore.coins),21);

 async function motionSurvives(action,label){
   await page.evaluate(()=>{
     const v=document.getElementById('petVisual'),svg=v.querySelector('svg');
     window.motionSamples=[];
     window.motionTimer=setInterval(()=>{
       const c=v.querySelector('.pet-character'),layer=v.querySelector('.pet-care-motion-layer'),rect=svg.querySelector('rect').getBoundingClientRect(),b=c.getBoundingClientRect();
       window.motionSamples.push({sameSvg:svg===v.querySelector('svg'),x:b.x,y:b.y,height:b.height,bgx:rect.x,bgy:rect.y,motion:layer?getComputedStyle(layer).transform:null});
     },80);
   });
   await action();await page.waitForTimeout(1700);
   const samples=await page.evaluate(()=>{clearInterval(window.motionTimer);return window.motionSamples;});
   assert.ok(samples.length>=12,label+' has enough frames');
   assert.ok(samples.every(s=>s.sameSvg),label+' must retain SVG through wallet/lifecycle/server updates');
   assert.ok(samples.every(s=>Math.abs(s.bgx-samples[0].bgx)<.2&&Math.abs(s.bgy-samples[0].bgy)<.2),label+' background stays fixed');
   const active=samples.slice(1,12);
   const travel=Math.max(...active.map(s=>s.y))-Math.min(...active.map(s=>s.y));
   assert.ok(travel>4,label+' visibly moves vertically, not only sideways: '+travel);
   assert.ok(samples.every(s=>s.height>30),label+' character stays visible');
   const poses=new Set(samples.slice(1,12).map(s=>s.motion).filter(Boolean));
   assert.ok(poses.size>=4,label+' visible character transform changes over time');
 }
 // Daytime is also exercised: several renderers send the same saved state.
 await page.evaluate(()=>{window.forceDay=true;document.dispatchEvent(new Event('visibilitychange'));});
 for(const food of ['snack','meal','special']){
   await motionSurvives(async()=>{await page.locator('#petFeed').click();await page.locator('[data-food='+food+']').click();},food);
 }

 // Verify recovery from an actual SVG redraw during the reaction.
 await page.locator('#petVisual').click();await page.waitForTimeout(250);
 await page.evaluate(()=>{const v=document.getElementById('petVisual');v.querySelector('svg').outerHTML=v.querySelector('svg').outerHTML;});
 await page.waitForTimeout(250);
 assert.equal(await page.locator('#petVisual .pet-care-motion-layer').count(),1);
 assert.notEqual(await page.locator('#petVisual .pet-care-motion-layer').evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.equal(await page.locator('.pet-care-feedback').count(),1);
 const beforeTap=await page.evaluate(()=>JSON.stringify(window.petStore));
 for(let i=0;i<4;i++)await motionSurvives(()=>page.locator('#petVisual').click(),'body tap '+i);
 assert.equal(await page.evaluate(()=>JSON.stringify(window.petStore)),beforeTap,'tapping never writes rewards or any other saved data');

 await page.screenshot({path:process.env.MOBILE?'feed-mobile.png':'feed-desktop.png'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#petVisual').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.petStore.petCare.friendship),undefined);
 assert.equal(await page.locator('#petVisual').evaluate(v=>v.getAnimations().filter(a=>a.playState==='running').length),0);
 assert.equal(await page.locator('.pet-care-feedback').count(),1,'reduced motion still shows visible feedback');
 assert.ok((await page.locator('.pet-care-feedback').innerText()).includes('うれしい'));
 await page.screenshot({path:process.env.MOBILE?'feed-mobile-reduced.png':'feed-desktop-reduced.png'});
 await page.waitForTimeout(2500);assert.equal(await page.locator('.pet-care-feedback').count(),0);
 assert.equal(await page.locator('#petVisual .pet-care-motion-layer').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: sleeping redraw keeps closed eyes; all foods wake with visible eyes; only character animates; sleeping body tap is free with no saved changes; sleep returns; reduced motion honored.');
 }finally{await browser.close();}
})();
