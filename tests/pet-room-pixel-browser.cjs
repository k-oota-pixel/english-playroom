const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),types={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(root+path.sep))throw Error('bad path');res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});res.end(await fs.readFile(f))}catch{res.writeHead(404);res.end('Not found')}});
(async()=>{
const port=await new Promise(ok=>server.listen(0,'127.0.0.1',()=>ok(server.address().port)));
const browser=await chromium.launch({args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1200,height:920}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const mock=(route,body)=>route.fulfill({status:200,headers:{'content-type':'text/javascript','access-control-allow-origin':'*'},body});
await page.route('**/firebase-app.js',r=>mock(r,'export const initializeApp=()=>({});export const getApps=()=>[];export const getApp=()=>({});'));
await page.route('**/firebase-firestore.js',r=>mock(r,'export const getFirestore=()=>({});export const doc=()=>({});export const getDoc=async()=>({exists:()=>false});export const setDoc=async()=>{};export const serverTimestamp=()=>null;'));
await page.route('**/auth-session.js?*',r=>mock(r,'export const getAuth=()=>({currentUser:null});export const onAuthStateChanged=(a,cb)=>{queueMicrotask(()=>cb(null));return()=>{}};'));
await page.route('**/firebase-security.js?*',r=>mock(r,'export const enableAppCheck=()=>{};'));
await page.route('**/pet-art.js?*',r=>mock(r,'export const renderPetSVG=()=>"<svg xmlns=\\"http://www.w3.org/2000/svg\\" viewBox=\\"0 0 72 72\\"><circle cx=\\"36\\" cy=\\"36\\" r=\\"30\\" fill=\\"#fff\\"/></svg>";'));
await page.route('**/access-gate.js?*',r=>mock(r,"document.getElementById('monstudy-access-lock')?.remove();"));
await page.route('**/shell-bridge.js?*',r=>mock(r,'// disabled in standalone test'));
try{
 await page.goto('http://127.0.0.1:'+port+'/pet-room/room-pixel.html');
 await page.waitForFunction(()=>document.querySelectorAll('#furnitureLayer .furniture').length===8,{timeout:15000});
 assert.equal(await page.locator('#roomBackdrop').evaluate(e=>e.naturalWidth>0),true);
 assert.equal(await page.locator('#catalog .catalog-item').count(),14);
 assert.deepEqual(errors,[]);
 await page.locator('.furniture').first().click();
 const a=await page.locator('.furniture').first().locator('img').getAttribute('src');
 await page.locator('#rotateBtn').click();
 const b=await page.locator('.furniture').first().locator('img').getAttribute('src');
 assert.notEqual(a,b,'Bed direction sprite must change');
 await page.locator('.catalog-item').filter({hasText:'ごはんのお皿'}).click();
 await page.locator('.tile').last().click();
 assert.equal(await page.locator('.furniture').count(),9);
 await page.screenshot({path:'pixel-room-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'pixel-room-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: pixel room render / placement / rotation / mobile browser');
}finally{await browser.close();server.close();}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
