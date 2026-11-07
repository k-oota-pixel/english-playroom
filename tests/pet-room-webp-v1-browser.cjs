const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const mime={'.js':'text/javascript;charset=utf-8','.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.webp':'image/webp'};
 const server=http.createServer(async(req,res)=>{
   try{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
     if(!file.startsWith(root+path.sep))throw Error('outside root');
     const data=await fs.readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});res.end(data);
   }catch(err){res.writeHead(404);res.end('Not found');}
 });
 const port=await new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const mock=(route,body)=>route.fulfill({status:200,headers:{'content-type':'text/javascript;charset=utf-8','access-control-allow-origin':'*'},body});
 await page.route('**/firebase-app.js',r=>mock(r,"export const getApps=()=>[];export const initializeApp=()=>({name:'[DEFAULT]'});export const getApp=()=>({name:'[DEFAULT]'});"));
 await page.route('**/firebase-firestore.js',r=>mock(r,"export const getFirestore=()=>({});export const doc=()=>({});export const getDoc=async()=>({exists:()=>true,data:()=>({petHatched:true,petAdult:true,petName:'テストペット',coins:10,petAppearance:{species:'cat'},petShop:{}})});"));
 await page.route('**/auth-session.js?*',r=>mock(r,"export const getAuth=()=>({currentUser:{uid:'webp-phase4-test'},authStateReady:async()=>{}});"));
 await page.route('**/firebase-security.js?*',r=>mock(r,"export const enableAppCheck=()=>{};"));
 await page.route('**/pet-art.js?*',r=>mock(r,"export const renderPetSVG=()=>'<svg viewBox=\"0 0 240 240\" xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"120\" cy=\"120\" r=\"75\" fill=\"#d28e63\"/></svg>';"));
 await page.route('**/access-gate.js?*',r=>mock(r,"document.getElementById('monstudy-access-lock')?.remove();"));
 await page.route('**/shell-bridge.js?*',r=>mock(r,"// Isolated material test: direct-link shell permission checked in Node regression."));
 try{
   await page.goto('http://127.0.0.1:'+port+'/pet-room/room-webp-v1.html',{waitUntil:'domcontentloaded'});
   await page.locator('#objectLayer .object').waitFor({timeout:15000});
   await page.waitForFunction(()=>document.querySelector('.object img')?.naturalWidth===232,{timeout:15000});
   await page.waitForFunction(()=>!document.querySelector('#petActor').hidden,{timeout:15000});
   assert.equal(await page.locator('.object').count(),1,'Only the approved WebP bed should be added');
   assert.equal(await page.locator('.object img').getAttribute('src'),'./assets/webp-v1/bed/bed_0.webp?v=2.4.25');
   assert.equal(await page.locator('.object img').evaluate(el=>el.naturalHeight),348);
   // Inspect raw alpha pixels in Chromium, not just file extensions or existence.
   const coverage=await page.evaluate(async()=>{
     const alphas=[];
     for(let i=0;i<4;i++){
       const sprite=new Image();sprite.src='./assets/webp-v1/bed/bed_'+i+'.webp?v=2.4.25';
       await sprite.decode();
       const c=document.createElement('canvas');c.width=sprite.naturalWidth;c.height=sprite.naturalHeight;
       const data=c.getContext('2d',{willReadFrequently:true});data.drawImage(sprite,0,0);
       const pixels=data.getImageData(0,0,c.width,c.height).data;
       let zeros=0,trace=0,fully=0;
       for(let p=3;p<pixels.length;p+=4){const alpha=pixels[p];if(alpha===0)zeros++;if(alpha>0&&alpha<=10)trace++;if(alpha>=250)fully++;}
       alphas.push({zeros,trace,fully,corner:pixels[3],size:[c.width,c.height]});
     }
     return alphas;
   });
   const minimumClear=[120000,125000,116000,130000];
   for(let i=0;i<4;i++){
     assert.ok(coverage[i].zeros>=minimumClear[i],'Transparent background must be fully cleared: bed_'+i);
     assert.equal(coverage[i].trace,0,'No 1-10 alpha haze must be left around bed_'+i);
     assert.equal(coverage[i].corner,0,'Top-left must be transparent: bed_'+i);
     assert.ok(coverage[i].fully>150000,'Furniture body should remain opaque: bed_'+i);
   }
   await page.locator('#roomBoard').evaluate(el=>el.style.background='#523b31');
   await page.screenshot({path:'webp-room-alpha-on-dark.png',fullPage:true});

   assert.equal(await page.locator('#petActor svg').count(),1,'Original pet display remains active');
   assert.deepEqual(errors,[],'No startup exceptions');
   const initial=await page.locator('.object').evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top),width:parseFloat(el.style.width),height:parseFloat(el.style.height)}));
   assert.ok(Math.abs(initial.width-232/960*100)<.1);
   assert.ok(Math.abs(initial.height-348/960*100)<.1);
   await page.locator('.object').click();
   assert.equal(await page.locator('#editingPanel').isVisible(),true,'Bed opens normal editing panel');
   await page.locator('#rotateItem').click();
   await page.waitForFunction(()=>document.querySelector('.object img')?.naturalWidth===348);
   assert.equal(await page.locator('.object img').getAttribute('src'),'./assets/webp-v1/bed/bed_1.webp?v=2.4.25');
   const rotated=await page.locator('.object').evaluate(el=>({width:parseFloat(el.style.width),height:parseFloat(el.style.height)}));
   assert.ok(Math.abs(rotated.width-348/960*100)<.1);
   assert.ok(Math.abs(rotated.height-232/960*100)<.1);
   await page.locator('#confirmItem').click();
   const key='monstudy-pet-room-webp-v1:webp-phase4-test';
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(saved.bed.rotation,1);assert.equal(saved.bed.placed,true);
   assert.equal(await page.evaluate(()=>localStorage.getItem('monstudy-pet-room-v4:webp-phase4-test')),null,'Existing room save untouched');
   await page.screenshot({path:'webp-room-phase4-desktop.png',fullPage:true});
   await page.reload();
   await page.waitForFunction(()=>document.querySelector('.object img')?.naturalWidth===348,{timeout:15000});
   assert.equal(await page.locator('.object img').getAttribute('src'),'./assets/webp-v1/bed/bed_1.webp?v=2.4.25','Direction restored after refresh');
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'Mobile has no accidental horizontal overflow');
   await page.screenshot({path:'webp-room-phase4-mobile.png',fullPage:true});
   assert.deepEqual(errors,[],'No desktop/mobile page errors');
   console.log('PASS: WebP bed / 2x3→3x2 rotation / real pet / isolated local save / reload / mobile');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
