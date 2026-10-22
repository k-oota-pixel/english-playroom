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
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
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

 const artRequests=[];page.on('request',r=>{if(r.url().includes('/pet-art.js'))artRequests.push(r.url());});
 await page.addInitScript(()=>{window.forceDay=true;});
 await page.goto('http://127.0.0.1:8765');await page.waitForTimeout(1800);
 for(const sick of [false,true])for(const fraction of [.12,.5,.78]){
 const result=await page.evaluate(({sick,fraction})=>{
 const v=document.getElementById('petVisual');v.toggleAttribute('data-pet-sick',sick);const c=v.querySelector('.pet-character');const walk=c.getAnimations().find(a=>(a.animationName||'').startsWith('petWaddle'));walk.currentTime=walk.effect.getTiming().duration*fraction;
 const before=c.getBoundingClientRect();v.click();const after=c.getBoundingClientRect();return {dx:after.x-before.x,dy:after.y-before.y};
 },{sick,fraction});
 assert.ok(Math.abs(result.dx)<.5&&Math.abs(result.dy)<.5,JSON.stringify({sick,fraction,...result}));
 assert.equal(await page.locator('.pet-care-particles>.pet-motif').count(),10);
 assert.ok(await page.locator('.pet-care-particles>.pet-motif-heart').count()>=3);
 await page.waitForTimeout(150);
 await page.evaluate(()=>{const v=document.getElementById('petVisual');v.querySelector('svg').outerHTML=v.querySelector('svg').outerHTML;});
 await page.waitForTimeout(2400);
 assert.equal(await page.locator('.pet-care-motion-layer').count(),0);
 assert.equal(await page.locator('#petVisual .pet-character').evaluate(e=>e.style.getPropertyValue('transform')),'');
 }
 assert.ok(artRequests.every(url=>url.includes('v=touch1812')),JSON.stringify(artRequests));
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#petVisual').click();await page.waitForTimeout(100);assert.equal(await page.locator('.pet-care-motion-layer').evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS: healthy/sick at three walk positions, ten happy particles, redraw cleanup, single art module, reduced motion.');
 }finally{await browser.close();}
})();