const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({}),getApps=()=>[{}],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:{uid:'test-user',displayName:'テスト',getIdToken:async()=>'test-token'}};
const listeners=new Set();auth.authStateReady=async()=>{};export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;for(const cb of listeners)await cb(null);};
export function onAuthStateChanged(a,cb){listeners.add(cb);queueMicrotask(()=>cb(auth.currentUser));return ()=>listeners.delete(cb);}`;
const firestoreMock=`export const getFirestore=()=>({}),doc=(db,...parts)=>parts.join('/'),serverTimestamp=()=>({timestamp:true});
const listeners=[];const snapshot=ref=>({exists:()=>true,data:()=>({...structuredClone(window.petStore||{}),nickname:'テスト'})});export const getDoc=async ref=>snapshot(ref);export function onSnapshot(ref,cb){listeners.push([ref,cb]);queueMicrotask(()=>cb(snapshot(ref)));return ()=>{};}export const setDoc=async()=>{};
export async function runTransaction(db,fn){
if(window.failTransactions)throw Object.assign(Error('test unavailable'),{code:'unavailable'});
if(window.failSave && window.petStore.petLoginDays>=3)throw Object.assign(Error('offline'),{code:'unavailable'});
let staged;const result=await fn({get:async()=>({exists:()=>!!window.petStore,data:()=>structuredClone(window.petStore||{})}),set:(ref,payload)=>{staged={...window.petStore,...payload};}});
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;for(const [ref,cb] of listeners){queueMicrotask(()=>cb(snapshot(ref)));setTimeout(()=>cb(snapshot(ref)),450);setTimeout(()=>cb(snapshot(ref)),1100);}}return result;}`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:900}});
 await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 window.failTransactions=new URLSearchParams(location.search).has('fail-sync');
 const RealDate=Date;const fixed=new RealDate(2026,9,18,0,30).getTime();
 window.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[fixed]));}getHours(){return window.forceDay?12:0;}getMinutes(){return 30;}};
 const d=new Date();const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 window.petStore={petHatched:true,petAdult:true,petGrowthVersion:1427,petLifecycleVersion:141,petLoginDays:7,petLifeDays:7,petLastLoginDate:key,petLastLifeLoginDate:key,petBirthBonusGranted:true,petName:'ふわ',coins:30,petAppearance:{species:'dog',bodyColor:'blue',eyes:'round',feature:'classic',pattern:'none',baseBackground:'sky'},petShop:{ownedItems:['crown'],equipped:{head:'crown'}}};
 });

 const syncErrors=[];page.on('console',msg=>{if(msg.type()==='error'){syncErrors.push(msg.text());console.log('BROWSER ERROR:',msg.text());}});
 await context.route('https://task-quest.onrender.com/api/admin/users',route=>route.fulfill({contentType:'application/json',body:'[]'}));
 await context.route('https://task-quest.onrender.com/api/pet-chat',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({reply:'Hello! What did you enjoy today?',suggestions:['I enjoyed lunch.']})}));
 await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(2200);
 console.log('AUTH:',await page.locator('#authSub').innerText());
 console.log('CHAT HIDDEN:',await page.locator('#petChatModal').getAttribute('hidden'));
 assert.equal(await page.locator('#authSub').innerText(),'クラウド同期済み',JSON.stringify(syncErrors));
 assert.equal(await page.locator('#petChatModal').isVisible(),true);
 assert.ok(await page.locator('.pet-chat-bubble').count()>0);
 await page.locator('#petChatInput').fill('Hello!');await page.locator('#petChatSend').click();
 await page.getByText('Hello! What did you enjoy today?',{exact:true}).waitFor();
 assert.equal(await page.locator('#petChatModal').isVisible(),true);
 await page.goto('http://127.0.0.1:8765?fail-sync');await page.waitForTimeout(2200);
 assert.equal(await page.locator('#authSub').innerText(),'同期未完了');
 assert.equal(await page.locator('#authSub').getAttribute('title'),'unavailable');
 assert.equal(await page.locator('#petChatModal').isVisible(),true,'failed progress transaction must not hide readable chat');
 assert.equal(await page.locator('#petSyncRetry').isVisible(),true);
 await page.locator('#petChatInput').fill('Hello!');await page.locator('#petChatSend').click();
 await page.getByText('Hello! What did you enjoy today?',{exact:true}).waitFor();
 const history=await page.locator('#petChatMessages').innerText();
 await page.evaluate(()=>{window.failTransactions=false;});await page.locator('#petSyncRetry').click();await page.waitForTimeout(500);
 assert.equal(await page.locator('#authSub').innerText(),'クラウド同期済み');
 assert.equal(await page.locator('#petSyncRetry').isVisible(),false);
 assert.equal(await page.locator('#petChatMessages').innerText(),history,'retry retains conversation history');
 await page.locator('#logoutBtn').click();await page.waitForTimeout(150);
 assert.equal(await page.locator('#petChatModal').isVisible(),false);
 assert.equal(await page.locator('#petSyncRetry').isVisible(),false);
 assert.deepEqual(errors,[]);console.log('PASS: normal sync/chat, chat request/reply, transaction failure with readable conversation, retry and history preservation, logout');
 }finally{await browser.close();}
})();
