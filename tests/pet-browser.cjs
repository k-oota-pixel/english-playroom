const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト'}};
export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
export const signInWithPopup=async()=>{};export const signOut=async()=>{auth.currentUser=null;window.authCallback(null);};
export function onAuthStateChanged(a,cb){window.authCallback=cb;cb(auth.currentUser);}`;
const firestoreMock=`export const getFirestore=()=>({}),doc=(db,...parts)=>parts.join('/'),serverTimestamp=()=>({timestamp:true});
export const getDoc=async()=>({exists:()=>false,data:()=>({})});export const setDoc=async()=>{};
export async function runTransaction(db,fn){
if(window.failSave && window.petStore.petLoginDays>=3)throw Object.assign(Error('offline'),{code:'unavailable'});
let staged;const result=await fn({get:async()=>({exists:()=>!!window.petStore,data:()=>structuredClone(window.petStore||{})}),set:(ref,payload)=>{staged={...window.petStore,...payload};}});
if(staged){window.petStore=staged;window.writeCount=(window.writeCount||0)+1;}return result;}`;
(async()=>{
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const context=await browser.newContext();
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function load(data,user=true){await page.addInitScript(({data,user})=>{window.petStore=data;window.testUser=user;},{data,user});await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>document.getElementById('authSub').textContent!=='端末保存' || window.testUser===false);}
  const today=new Date();const key=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  await load({petLoginDays:2,petLastLoginDate:key});
  await page.waitForFunction(()=>document.getElementById('authSub').textContent==='クラウド同期済み');
  assert.equal(await page.locator('#petCreate').isVisible(),false);
  await load({petLoginDays:2,petLastLoginDate:'2020-01-01'});
  await page.locator('#petCreate').click();
  assert.equal(await page.locator('.pet-choice').count(),25);
  await page.locator('[data-value="mystery"]').click();await page.locator('[data-value="blue"]').click();await page.locator('[data-value="horns"]').click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.PET_SCREENSHOT)await page.screenshot({path:process.env.PET_SCREENSHOT,fullPage:true});
  await page.evaluate(()=>window.failSave=true);await page.locator('[data-save]').click();
  await page.locator('.pet-save-status').filter({hasText:'保存できませんでした'}).waitFor();
  assert.equal(await page.locator('dialog').isVisible(),true);
  assert.equal(await page.evaluate(()=>!!window.petStore.petHatched),false);
  await page.evaluate(()=>window.failSave=false);await page.locator('[data-save]').click();
  await page.locator('dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#petVisual svg').count(),1);
  const saved=await page.evaluate(()=>window.petStore);assert.equal(saved.petAppearance.species,'mystery');assert.equal(saved.petAppearance.bodyColor,'blue');assert.ok(saved.petHatched);
  await load(saved);await page.waitForFunction(()=>document.getElementById('petTitle').textContent==='わたしのペット');
  assert.equal(await page.locator('#petCreate').isVisible(),false);
  await load({petLoginDays:4,petHatched:true,petLastLoginDate:key});await page.locator('#petCreate').click();await page.locator('[data-close]').click();
  assert.equal(await page.locator('#petCreate').isVisible(),true);
  await page.locator('#petCreate').click();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);
  await page.locator('#petCreate').click();
  await page.evaluate(saved=>{window.petStore=saved;},saved);
  await page.locator('[data-save]').click();await page.locator('dialog').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.petStore.petAppearance.species),'mystery');
  await load({},false);assert.equal(await page.locator('#petCreate').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Browser checks passed: day gating, 25 choices, responsive dialog, retry, persistence, legacy hatch, guest.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
