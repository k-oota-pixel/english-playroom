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
   await page.locator('#objectLayer .object').first().waitFor({timeout:15000});
   await page.waitForFunction(()=>document.querySelector('.object[data-item-id="bed"] img')?.naturalWidth===464,{timeout:15000});
   await page.waitForFunction(()=>!document.querySelector('#petActor').hidden,{timeout:15000});
   const betaBackdrop=await page.locator('#roomArt svg').evaluate(svg=>({
     window:!!svg.querySelector('rect[x="361"][y="105"]'),
     curtains:[...svg.querySelectorAll('path')].some(p=>p.getAttribute('d')?.startsWith('M351 109')),
     wall:!!svg.querySelector('rect[x="124"][y="101"]'),
     floor:!!svg.querySelector('rect[x="132"][y="202"][width="696"]'),
     outerFrame:!!svg.querySelector('rect[x="93"][y="73"]')
   }));
   assert.equal(betaBackdrop.window,false,'WebP beta has no window');
   assert.equal(betaBackdrop.curtains,false,'WebP beta has no curtains');
   assert.ok(betaBackdrop.wall&&betaBackdrop.floor&&betaBackdrop.outerFrame,'Keep wall, tiles and wooden frame');
   await page.screenshot({path:'webp-room-windowless.png',fullPage:true});
   assert.equal(await page.locator('.object').count(),4,'Four WebP furniture items: bed, sofa, bookshelf and desk');
   assert.equal(await page.locator('.object[data-item-id="desk"] img').getAttribute('src'),'./assets/webp-v1/desk/desk_0.webp?v=2.4.42');
   assert.equal(await page.locator('.object[data-item-id="bookshelf"] img').getAttribute('src'),'./assets/webp-v1/bookshelf/bookshelf_0.webp?v=2.4.37');
   assert.equal(await page.locator('.object[data-item-id="sofa"] img').getAttribute('src'),'./assets/webp-v1/sofa/sofa_0.webp?v=2.4.34');
   assert.equal(await page.locator('.object[data-item-id="bed"] img').getAttribute('src'),'./assets/webp-v1/bed/bed_0.webp?v=2.4.25');
   assert.equal(await page.locator('.object[data-item-id="bed"] img').evaluate(el=>el.naturalHeight),696);
   // Test genuine per-direction WebP assets and cleaned transparency on a dark background.
   const shelfImages=await page.evaluate(async()=>{
     const expected=[[550,456],[228,483],[549,457],[229,485]];
     const arr=[];
     for(let i=0;i<4;i++){
       const im=new Image();im.src='./assets/webp-v1/bookshelf/bookshelf_'+i+'.webp?v=2.4.37';
       await im.decode();
       const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
       const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(im,0,0);
       const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
       let transparent=0,opaque=0;
       for(let j=3;j<pixels.length;j+=4){if(pixels[j]===0)transparent++;if(pixels[j]===255)opaque++;}
       arr.push({dims:[im.naturalWidth,im.naturalHeight],transparent,opaque,corner:pixels[3],expected:expected[i]});
     }
     return arr;
   });
   shelfImages.forEach((im,i)=>{
     assert.deepEqual(im.dims,im.expected,'All four bookshelf images have correct independent aspect ratios: '+i);
     assert.ok(im.transparent>10000,'No checkerboard should remain behind shelf '+i);
     assert.ok(im.opaque>30000,'Visible bookshelf is opaque, not a translucent placeholder: '+i);
     assert.equal(im.corner,0,'Sprite corner is completely transparent: '+i);
   });
   // Four real transparent WebP sprites, with independently drawn opposing side views.
   const deskPixels=await page.evaluate(async()=>{
     const expected=[[549,421],[464,671],[565,433],[448,662]];
     const output=[];
     for(let i=0;i<4;i++){
       const im=new Image();im.src='./assets/webp-v1/desk/desk_'+i+'.webp?v=2.4.42';await im.decode();
       const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
       const context=c.getContext('2d',{willReadFrequently:true});context.drawImage(im,0,0);
       const p=context.getImageData(0,0,c.width,c.height).data;
       let transparent=0,solid=0;
       for(let n=3;n<p.length;n+=4){if(p[n]===0)transparent++;if(p[n]>=250)solid++;}
       output.push({dims:[c.width,c.height],expected:expected[i],corner:p[3],transparent,solid});
     }
     return output;
   });
   for(const [i,record] of deskPixels.entries()){
     assert.deepEqual(record.dims,record.expected,'desk WebP dimensions match expected orientation '+i);
     assert.equal(record.corner,0,'desk transparent top-left corner '+i);
     assert.ok(record.transparent>30000,'desk has transparent background, no baked checkerboard '+i);
     assert.ok(record.solid>60000,'desk furniture remains visible and opaque '+i);
   }
   // Verify actual transparent sofa WebP images, not screenshots or rotated SVG.
   const sofaAssets=await page.evaluate(async()=>{
     const result=[];
     for(let i=0;i<4;i++){
       const im=new Image(); im.src='./assets/webp-v1/sofa/sofa_'+i+'.webp?v=2.4.34';await im.decode();
       const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
       const cx=canvas.getContext('2d',{willReadFrequently:true});cx.drawImage(im,0,0);
       const pixels=cx.getImageData(0,0,canvas.width,canvas.height).data;
       let transparent=0,opaque=0;for(let k=3;k<pixels.length;k+=4){if(pixels[k]===0)transparent++;if(pixels[k]>245)opaque++;}
       result.push({w:canvas.width,h:canvas.height,transparent,opaque,corner:pixels[3]});
     }return result;
   });
   sofaAssets.forEach((s,i)=>{
     assert.deepEqual([s.w,s.h],(i%2)?[330,530]:[530,330],'Sofa artwork is correctly oriented at view '+i);
     assert.ok(s.transparent>25000,'Sofa has full-alpha transparent background '+i);
     assert.ok(s.opaque>70000,'Sofa has opaque visible artwork '+i);
     assert.equal(s.corner,0,'Sofa transparent corners '+i);
   });
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
       const probes=[[388,82],[550,90],[112,118],[98,48]]; const [px,py]=probes[i]; const matteProbe=pixels[(py*c.width+px)*4+3];
       alphas.push({zeros,trace,fully,matteProbe,corner:pixels[3],size:[c.width,c.height]});
     }
     return alphas;
   });
   const minimumClear=[120000,125000,116000,130000];
   for(let i=0;i<4;i++){
     assert.ok(coverage[i].zeros>=minimumClear[i],'Transparent background must be fully cleared: bed_'+i);
     assert.equal(coverage[i].trace,0,'No 1-10 alpha haze must be left around bed_'+i);
     assert.equal(coverage[i].corner,0,'Top-left must be transparent: bed_'+i);
     assert.equal(coverage[i].matteProbe,0,'Old nearly-opaque background speck must be fully transparent: bed_'+i);
     assert.ok(coverage[i].fully>150000,'Furniture body should remain opaque: bed_'+i);
   }
   await page.locator('#roomBoard').evaluate(el=>el.style.background='#523b31');
   await page.screenshot({path:'webp-room-alpha-on-dark.png',fullPage:true});

   assert.equal(await page.locator('#petActor svg').count(),1,'Original pet display remains active');
   assert.deepEqual(errors,[],'No startup exceptions');
   const initial=await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top),width:parseFloat(el.style.width),height:parseFloat(el.style.height)}));
   assert.ok(Math.abs(initial.width-116/960*100)<.1,'Portrait bed must occupy 1 tile across');
   assert.ok(Math.abs(initial.height-232/960*100)<.1,'Portrait bed must occupy 2 tiles long');
   const overhang=await page.locator('.object[data-item-id="bed"]').evaluate(el=>{
     const art=el.querySelector('.webp-bed-sprite');const e=el.getBoundingClientRect(),i=art.getBoundingClientRect();
     return{ratioX:i.width/e.width,ratioY:i.height/e.height};
   });
   assert.ok(Math.abs(overhang.ratioX-1.28)<.015,'Allow 14% overhang on each horizontal side');
   assert.ok(Math.abs(overhang.ratioY-1.28)<.015,'Allow centered sprite box while preserving ratio');
   assert.equal(await page.locator('.object[data-item-id="bed"] img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
   const bedAnchor=await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:el.style.left,top:el.style.top}));
   await page.locator('.object[data-item-id="bed"]').click();
   assert.equal(await page.locator('#editingPanel').isVisible(),true,'Bed opens normal editing panel');
   await page.locator('#rotateItem').click();
   await page.waitForFunction(()=>document.querySelector('.object[data-item-id="bed"] img')?.naturalWidth===696);
   assert.equal(await page.locator('.object[data-item-id="bed"] img').getAttribute('src'),'./assets/webp-v1/bed/bed_1.webp?v=2.4.25');
   const rotated=await page.locator('.object[data-item-id="bed"]').evaluate(el=>({width:parseFloat(el.style.width),height:parseFloat(el.style.height)}));
   assert.ok(Math.abs(rotated.width-232/960*100)<.1,'Landscape bed is two tiles wide');
   assert.ok(Math.abs(rotated.height-116/960*100)<.1,'Landscape bed is one tile tall');
   assert.deepEqual(await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:el.style.left,top:el.style.top})),bedAnchor,'Bed did not move after first rotation');
   // Check camera-fixed artwork and the correct 1x2 / 2x1 tile footprint for every orientation.
   for(const i of [2,3,0,1]){
     await page.locator('#rotateItem').click();
     await page.waitForFunction(i=>document.querySelector('.object[data-item-id="bed"] img')?.getAttribute('src')?.includes('bed_'+i+'.webp'),i);
     const sizing=await page.locator('.object[data-item-id="bed"]').evaluate(el=>({w:parseFloat(el.style.width),h:parseFloat(el.style.height)}));
     assert.ok(Math.abs(sizing.w-((i%2)?232:116)/960*100)<.1,'Bed width matches rotation: '+i);
     assert.ok(Math.abs(sizing.h-((i%2)?116:232)/960*100)<.1,'Bed height matches rotation: '+i);
     assert.equal(await page.locator('.object[data-item-id="bed"] img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
     assert.deepEqual(await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:el.style.left,top:el.style.top})),bedAnchor,'Bed anchor never drifts at direction '+i);
   }
   // Repeating three more complete turns must not shift the tile origin.
   for(let n=0;n<12;n++){
     await page.locator('#rotateItem').click();
     assert.deepEqual(await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:el.style.left,top:el.style.top})),bedAnchor,'Bed location after repeated turn '+n);
   }
   await page.locator('#confirmItem').click();
   const key='monstudy-pet-room-webp-v1:webp-phase4-test';
   const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(saved.bed.rotation,1);assert.equal(saved.bed.placed,true);
   assert.deepEqual([saved.bed.x,saved.bed.y],[2,1],'Bed did not change grid coordinates on rotation');
   assert.equal(await page.evaluate(()=>localStorage.getItem('monstudy-pet-room-v4:webp-phase4-test')),null,'Existing room save untouched');
   // Test 2x1 -> 1x2 -> 2x1 through all four authored views.
   const sofaAnchor=await page.locator('.object[data-item-id="sofa"]').evaluate(el=>({left:el.style.left,top:el.style.top}));
   await page.locator('.object[data-item-id="sofa"]').click();
   assert.equal(await page.locator('#editingPanel').isVisible(),true,'Sofa can be edited');
   const sofaStart=await page.locator('.object[data-item-id="sofa"]').evaluate(el=>({w:parseFloat(el.style.width),h:parseFloat(el.style.height)}));
   assert.ok(Math.abs(sofaStart.w-232/960*100)<.1&&Math.abs(sofaStart.h-116/960*100)<.1,'Sofa begins 2x1');
   for(const i of [1,2,3,0,1]){
     await page.locator('#rotateItem').click();
     await page.waitForFunction(i=>document.querySelector('.object[data-item-id="sofa"] img')?.getAttribute('src')?.includes('sofa_'+i+'.webp'),i);
     const d=await page.locator('.object[data-item-id="sofa"]').evaluate(el=>({w:parseFloat(el.style.width),h:parseFloat(el.style.height)}));
     assert.ok(Math.abs(d.w-((i%2)?116:232)/960*100)<.1,'Sofa width at view '+i);
     assert.ok(Math.abs(d.h-((i%2)?232:116)/960*100)<.1,'Sofa height at view '+i);
     assert.equal(await page.locator('.object[data-item-id="sofa"] img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
     assert.deepEqual(await page.locator('.object[data-item-id="sofa"]').evaluate(el=>({left:el.style.left,top:el.style.top})),sofaAnchor,'Sofa anchor never drifts at direction '+i);
   }
   for(let n=0;n<12;n++){
     await page.locator('#rotateItem').click();
     assert.deepEqual(await page.locator('.object[data-item-id="sofa"]').evaluate(el=>({left:el.style.left,top:el.style.top})),sofaAnchor,'Sofa location after repeated turn '+n);
   }
   await page.locator('#confirmItem').click();
   const sofaSaved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(sofaSaved.sofa.rotation,1);
   assert.deepEqual([sofaSaved.sofa.x,sofaSaved.sofa.y],[0,2],'Sofa did not change grid coordinates on rotation');
   assert.equal(sofaSaved.sofa.placed,true);
   assert.equal(sofaSaved.bed.rotation,1,'Sofa editing does not affect bed');
   await page.screenshot({path:'webp-room-sofa-four-views-integration.png',fullPage:true});
   // Bookshelf has four truly distinct WebP images: face, right side, back, left side.
   const bookshelfEl='.object[data-item-id="bookshelf"]';
   const shelfAnchor=await page.locator(bookshelfEl).evaluate(el=>({left:el.style.left,top:el.style.top}));
   // Bed and sofa keep their original 100% scale; the bookshelf is reduced in every view.
   for(const itemId of ['bed','sofa']){
     const scale=await page.locator('.object[data-item-id="'+itemId+'"] img').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
     assert.ok(Math.abs(scale-1)<.01,itemId+' must retain its original scale');
   }
   await page.locator(bookshelfEl).click();
   assert.equal(await page.locator('#editingPanel').isVisible(),true,'Bookshelf opens the common furniture editor');
   for(const i of [1,2,3,0,1]){
     await page.locator('#rotateItem').click();
     await page.waitForFunction(i=>document.querySelector('.object[data-item-id="bookshelf"] img')?.getAttribute('src')?.includes('bookshelf_'+i+'.webp'),i);
     const rect=await page.locator(bookshelfEl).evaluate(el=>({w:parseFloat(el.style.width),h:parseFloat(el.style.height),left:el.style.left,top:el.style.top}));
     assert.ok(Math.abs(rect.w-((i%2)?116:232)/960*100)<.1,'Bookshelf occupies correct tile width '+i);
     assert.ok(Math.abs(rect.h-((i%2)?232:116)/960*100)<.1,'Bookshelf occupies correct tile depth '+i);
     assert.deepEqual({left:rect.left,top:rect.top},shelfAnchor,'Bookshelf cannot drift on rotation '+i);
     assert.equal(await page.locator(bookshelfEl+' img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
     const scale=await page.locator(bookshelfEl+' img').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
     assert.ok(Math.abs(scale-(i%2===1?0.42:0.7))<0.01,'Bookshelf must be 70% of previous size ('+i+'); scale='+scale);
     const topRatio=await page.locator(bookshelfEl+' img').evaluate(el=>parseFloat(getComputedStyle(el).top)/el.parentElement.getBoundingClientRect().height);
     assert.ok(Math.abs(topRatio-(i%2===1?0.5:0.42))<0.01,'Front/back bookshelf moves deeper into its tile '+i);
   }
   for(let n=0;n<12;n++){
     await page.locator('#rotateItem').click();
     assert.deepEqual(await page.locator(bookshelfEl).evaluate(el=>({left:el.style.left,top:el.style.top})),shelfAnchor,'Repeated shelf rotation stays anchored '+n);
   }
   await page.locator('#confirmItem').click();
   const shelfSaved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(shelfSaved.bookshelf.rotation,1);
   assert.deepEqual([shelfSaved.bookshelf.x,shelfSaved.bookshelf.y],[4,0],'Shelf stays on its top-wall tile');
   assert.equal(shelfSaved.bed.rotation,1,'Shelf editing does not change bed');
   assert.equal(shelfSaved.sofa.rotation,1,'Shelf editing does not change sofa');
   // Desk: 2x1 when front/back, 1x1 when side-on, without progressive drift.
   // Original bed/sofa/bookshelf positions and rotations must remain untouched.
   const deskEl='.object[data-item-id="desk"]';
   const deskAnchor=await page.locator(deskEl).evaluate(el=>({left:el.style.left,top:el.style.top}));
   await page.locator(deskEl).click();
   assert.equal(await page.locator('#editingPanel').isVisible(),true,'Desk has shared editing controls');
   for(const i of [1,2,3,0,1]){
     await page.locator('#rotateItem').click();
     await page.waitForFunction(i=>document.querySelector('.object[data-item-id="desk"] img')?.getAttribute('src')?.includes('desk_'+i+'.webp'),i);
     const d=await page.locator(deskEl).evaluate(el=>({w:parseFloat(el.style.width),h:parseFloat(el.style.height),left:el.style.left,top:el.style.top}));
     assert.ok(Math.abs(d.w-((i%2)?116:232)/960*100)<0.1,'desk width '+i);
     assert.ok(Math.abs(d.h-116/960*100)<0.1,'desk height '+i);
     assert.deepEqual({left:d.left,top:d.top},deskAnchor,'Desk must stay anchored '+i);
     assert.equal(await page.locator(deskEl+' img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
     const scale=await page.locator(deskEl+' img').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
     assert.ok(Math.abs(scale-(i%2===1?0.7:1))<.01,'Desk side sprite keeps its 70% visual scale '+i);
   }
   for(let n=0;n<12;n++){
     await page.locator('#rotateItem').click();
     assert.deepEqual(await page.locator(deskEl).evaluate(el=>({left:el.style.left,top:el.style.top})),deskAnchor,'Desk repeats full rotations without drift '+n);
   }
   await page.locator('#confirmItem').click();
   const deskSaved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.deepEqual([deskSaved.desk.x,deskSaved.desk.y,deskSaved.desk.rotation,deskSaved.desk.placed],[2,4,1,true]);
   assert.equal(deskSaved.bed.rotation,1,'Bed untouched by desk rotations');
   assert.equal(deskSaved.sofa.rotation,1,'Sofa untouched by desk rotations');
   assert.equal(deskSaved.bookshelf.rotation,1,'Bookshelf untouched by desk rotations');
   await page.screenshot({path:'webp-room-desk-four-furniture.png',fullPage:true});
   await page.screenshot({path:'webp-room-bookshelf-three-furniture.png',fullPage:true});
   await page.screenshot({path:'webp-room-phase4-desktop.png',fullPage:true});
   await page.reload();
   await page.waitForFunction(()=>document.querySelector('.object[data-item-id="bed"] img')?.naturalWidth===696,{timeout:15000});
   assert.equal(await page.locator('.object[data-item-id="bed"] img').getAttribute('src'),'./assets/webp-v1/bed/bed_1.webp?v=2.4.25','Direction restored after refresh');
   assert.equal(await page.locator('.object[data-item-id="sofa"] img').getAttribute('src'),'./assets/webp-v1/sofa/sofa_1.webp?v=2.4.34','Sofa restored after refresh');
   assert.equal(await page.locator('.object[data-item-id="bookshelf"] img').getAttribute('src'),'./assets/webp-v1/bookshelf/bookshelf_1.webp?v=2.4.37','Bookshelf restored after refresh');
   assert.equal(await page.locator('.object[data-item-id="desk"] img').getAttribute('src'),'./assets/webp-v1/desk/desk_1.webp?v=2.4.42','Desk restored after refresh');
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'Mobile has no accidental horizontal overflow');
   await page.screenshot({path:'webp-room-phase4-mobile.png',fullPage:true});
   // At the right wall a 1x2 bed cannot turn into 2x1: refuse the
   // rotation instead of silently clamping/moving its position.
   await page.setViewportSize({width:1200,height:900});
   await page.evaluate(key=>{
     const data=JSON.parse(localStorage.getItem(key));
     data.bed={...data.bed,x:5,y:1,rotation:0,placed:true};
     localStorage.setItem(key,JSON.stringify(data));
   },key);
   await page.reload();
   await page.waitForFunction(()=>document.querySelector('.object[data-item-id="bed"] img')?.getAttribute('src')?.includes('bed_0.webp'),{timeout:15000});
   await page.locator('.object[data-item-id="bed"]').click();
   await page.locator('#rotateItem').click();
   assert.ok((await page.locator('.object[data-item-id="bed"] img').getAttribute('src')).includes('bed_0.webp'),'Do not rotate into the wall');
   assert.ok((await page.locator('#roomStatus').textContent()).includes('壁際'),'Explain why edge rotation was rejected');
   const boundary=await page.locator('.object[data-item-id="bed"]').evaluate(el=>({left:parseFloat(el.style.left),top:parseFloat(el.style.top)}));
   assert.ok(Math.abs(boundary.left-(132+5*116)/960*100)<.1,'Rejected turn must not move the furniture');
   assert.ok(Math.abs(boundary.top-(202+1*116)/960*100)<.1,'Rejected turn must not shift vertically');
   assert.deepEqual(errors,[],'No desktop/mobile/boundary page errors');
   console.log('PASS: bed, sofa, bookshelf and desk: 16 RGBA WebP sprites, correct 4-way rotation, stable tiles, isolated save/reload, mobile');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
