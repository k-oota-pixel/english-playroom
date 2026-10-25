const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}});
const appMock='export const initializeApp=()=>({}),getApps=()=>[],getApp=()=>({});';
const authMock=`export const GoogleAuthProvider=class {setCustomParameters(){}};
const auth={currentUser:window.testUser===false?null:{uid:'test-user',displayName:'テスト',getIdToken:async()=>'test-token'}};
auth.authStateReady=async()=>{};export const getAuth=()=>auth;export const browserLocalPersistence={};export const setPersistence=async()=>{};
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
  await context.route('https://www.gstatic.com/firebasejs/**',route=>route.fulfill({contentType:'text/javascript',body:route.request().url().includes('firebase-app-check')?'export const initializeAppCheck=()=>({}),ReCaptchaEnterpriseProvider=class{},getToken=async()=>({token:"test-app-check"});':route.request().url().includes('firebase-app')?appMock:route.request().url().includes('firebase-auth')?authMock:firestoreMock}));
  await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function load(data,user=true){await page.addInitScript(({data,user})=>{window.petStore=data;window.testUser=user;},{data,user});await page.route('**/auth-session.js*',r=>r.fulfill({contentType:'text/javascript',body:"export * from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';"}));
await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>document.getElementById('authSub').textContent!=='端末保存' || window.testUser===false);}
  const today=new Date();const key=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  await load({petLoginDays:2,petLastLoginDate:key});
  await page.waitForFunction(()=>document.getElementById('authSub').textContent==='クラウド同期済み');
  assert.equal(await page.locator('#petCreate').isVisible(),false);
  await load({petLoginDays:2,petLastLoginDate:'2020-01-01'});
  await page.locator('#petCreate').click();
  assert.equal(await page.locator('.pet-choice').count(),5);assert.equal(await page.locator('dialog[open] [data-next]').isEnabled(),false);assert.equal(await page.locator('.pet-preview').count(),0);
  for(const id of ['magical','blue','cool','horns','spots','rose']){await page.locator('dialog[open] [data-value="'+id+'"]').click();if(id!=='rose')await page.locator('dialog[open] [data-next]').click();}
  await page.locator('dialog[open] [data-back]').click();assert.equal(await page.locator('dialog[open] [data-value="spots"]').getAttribute('aria-pressed'),'true');await page.locator('dialog[open] [data-next]').click();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(process.env.PET_SCREENSHOT)await page.screenshot({path:process.env.PET_SCREENSHOT,fullPage:true});
  await page.locator('dialog[open] [data-next]').click();
  assert.equal(await page.locator('dialog[open] [data-next]').isEnabled(),false);
  await page.locator('#newPetName').fill('  ぽんた  ');
  await page.evaluate(()=>window.failSave=true);await page.locator('dialog[open] [data-next]').click();
  await page.locator('dialog[open] .pet-save-status').filter({hasText:'保存できませんでした'}).waitFor();
  assert.equal(await page.locator('dialog:has(#petMakerTitle)').isVisible(),true);
  assert.equal(await page.evaluate(()=>!!window.petStore.petHatched),false);
  await page.evaluate(()=>window.failSave=false);await page.locator('dialog[open] [data-next]').click();
  await page.locator('dialog:has(#petMakerTitle)').waitFor({state:'hidden'});
  assert.equal(await page.locator('#petVisual svg').count(),1);
  const saved=await page.evaluate(()=>window.petStore);assert.ok(['cat','dog','bird','mystery','rabbit','hamster','fox','panda','penguin','dragon'].includes(saved.petAppearance.species));assert.equal(saved.petAppearance.bodyColor,'blue');assert.ok(saved.petHatched);assert.equal(saved.petName,'ぽんた');
  await load(saved);await page.waitForFunction(()=>document.getElementById('petTitle').textContent==='ぽんた');
  assert.equal(await page.locator('#petCreate').isVisible(),false);
  await load({petLoginDays:4,petHatched:true,petLastLoginDate:key});await page.locator('#petCreate').click();await page.locator('dialog[open] [data-close]').click();
  assert.equal(await page.locator('#petCreate').isVisible(),true);
  await page.locator('#petCreate').click();await page.keyboard.press('Escape');assert.equal(await page.locator('dialog:has(#petMakerTitle)').isVisible(),false);
  await page.locator('#petCreate').click();
  for(const id of ['calm','cream','round','classic','none','ivory']){await page.locator('dialog[open] [data-value="'+id+'"]').click();if(id!=='ivory')await page.locator('dialog[open] [data-next]').click();}
  await page.locator('dialog[open] [data-next]').click();await page.locator('#newPetName').fill('別の名前');
  await page.evaluate(saved=>{window.petStore=saved;},saved);
  await page.locator('dialog[open] [data-next]').click();await page.locator('dialog:has(#petMakerTitle)').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>window.petStore.petAppearance.species),saved.petAppearance.species);
  await load({},false);assert.equal(await page.locator('#petCreate').isVisible(),false);
  assert.deepEqual(errors,[]);await load(saved);await page.waitForFunction(()=>document.getElementById('petTitle').textContent==='ぽんた');await page.setViewportSize({width:1200,height:900});
  const petRect=await page.locator('.pet-visual-wrap').boundingBox(),titleRect=await page.locator('h1').boundingBox();assert.equal(petRect.width,220);assert.ok(petRect.x>titleRect.x+titleRect.width);
  if(process.env.PET_SCREENSHOT)await page.screenshot({path:process.env.PET_SCREENSHOT,fullPage:false});
  await page.setViewportSize({width:390,height:844});assert.ok((await page.locator('.pet-card').boundingBox()).y>(await page.locator('h1').boundingBox()).y);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('Browser checks passed: six-question survey, required answers, back navigation, save retry, persisted pet, legacy pet, concurrent save, guest, desktop hero and mobile layout.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
