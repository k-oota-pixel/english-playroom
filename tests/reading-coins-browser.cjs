const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({}),getApps=()=>[{}],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト',getIdToken:async()=>'test-token'}};
auth.authStateReady=async()=>{};export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;window.authCallback(null);};
export function onAuthStateChanged(a,cb){window.authCallback=cb;(window.authCallbacks||=[]).push(cb);queueMicrotask(()=>cb(auth.currentUser));return ()=>{};}`;
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
 window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed+(window.dayOffset||0)*86400000]));}getHours(){return window.forceDay?12:0;}getMinutes(){return 30;}};
 const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:30,petAppearance:{species:'dog',bodyColor:'blue',eyes:'round',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};
 });

 const feedback={verdict:'good',scores:{main_idea:2,key_points:2,accuracy:2,concision:2},total:8,feedback:'よくできました',example:'要約の例',good_points:[],improvements:[],language_notes:[]};
 let summaryFails=true;
 await context.route('https://eiken-title.onrender.com/api/reading/summary',route=>route.fulfill({status:summaryFails?500:200,contentType:'application/json',body:JSON.stringify(summaryFails?{error:'test error'}:feedback)}));
 await context.route('https://task-quest.onrender.com/**',route=>route.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto('http://127.0.0.1:8765/reading-training/index.html');
 const readingData=JSON.parse(fs.readFileSync(path.join(root,'reading-training/passages.json'),'utf8')).passages;
 let activePassage=await page.locator('[data-passage]').first().getAttribute('data-passage');
 await page.locator('[data-passage]').first().click();
 assert.equal(await page.locator('#gradeExercise').isDisabled(),true);
 async function complete(allCorrect=true){const questions=readingData.find(p=>p.id===activePassage).questions;for(let i=0;i<questions.length;i++){const answer=allCorrect?questions[i].answer:(questions[i].answer===1?2:1);await page.locator('.choices').nth(i).locator('[data-answer="'+answer+'"]').click();}await page.locator('#gradeExercise').click();}
 await complete(false);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),30,'initial incorrect answers earn no coins');
 await page.locator('#retry').click();await complete(true);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),30,'correct retry earns no coins');
 await page.locator('#toSummary').click();await page.locator('#summaryInput').fill('This passage explains an interesting topic.');await page.locator('#checkSummary').click();await page.locator('#summaryStatus .error').waitFor();assert.equal(await page.evaluate(()=>window.petStore.coins),30);
 summaryFails=false;await page.locator('#checkSummary').click();await page.locator('.ai-result').waitFor();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),30,'exercise and summary share the first attempt');
 await page.locator('#back').click();await page.locator('[data-route=exercise]').click();activePassage=await page.locator('[data-passage]').nth(1).getAttribute('data-passage');await page.locator('[data-passage]').nth(1).click();await complete(true);await page.waitForFunction(()=>window.petStore.coins===31);
 await page.evaluate(()=>{window.dayOffset=1;});await page.locator('#retry').click();await complete(true);await page.waitForFunction(()=>window.petStore.coins===32);
 await page.locator('#back').click();await page.locator('[data-route=summary]').click();activePassage=await page.locator('[data-passage]').nth(2).getAttribute('data-passage');await page.locator('[data-passage]').nth(2).click();await page.locator('#summaryInput').fill('This passage explains another interesting topic.');await page.locator('#checkSummary').click();await page.waitForFunction(()=>window.petStore.coins===33);
 await page.evaluate(()=>window.authCallbacks.forEach(cb=>cb(null)));await page.locator('#back').click();await page.locator('[data-route=exercise]').click();activePassage=await page.locator('[data-passage]').nth(3).getAttribute('data-passage');await page.locator('[data-passage]').nth(3).click();await complete(true);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.petStore.coins),33,'signed out learners get no coins');
 assert.deepEqual(errors,[]);console.log('PASS: first wrong, correct retry, failed summary, shared attempt, perfect first, next day, good summary, signed out.');
 }finally{await browser.close();}
})();
