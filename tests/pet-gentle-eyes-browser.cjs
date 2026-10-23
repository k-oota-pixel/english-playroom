const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||undefined});
 try{
 const context=await browser.newContext({viewport:process.env.MOBILE?{width:390,height:844}:{width:1280,height:900}});
 await context.route('http://127.0.0.1:8765/**',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file,'utf8')});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.petStore={petAppearance:{bodyColor:'yellow',eyeStyle:'gentle'},petShop:{}};});
 await context.route('**/nickname-profile.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 await context.route('**/fixture',r=>r.fulfill({contentType:'text/html',body:`<div class="pet-visual-wrap"><div id="petVisual" class="hatched"></div></div><script type="module">import {playCareReaction} from '/pet-care-animation.js';import '/pet-eye-emphasis-v144.js';document.getElementById('petVisual').onclick=e=>playCareReaction(e.currentTarget,'pet');window.ready=true;</script>`}));
 await page.goto('http://127.0.0.1:8765/fixture');await page.waitForFunction(()=>window.ready);
 for(const species of ['bird','hamster','panda','penguin']){
  await page.evaluate(async species=>{
   const {renderPetSVG}=await import('/pet-art.js?v=touch1812');
   const appearance={...window.petStore.petAppearance,species,eyeStyle:'gentle'};
   window.petStore.petAppearance=appearance;
   document.getElementById('petVisual').innerHTML=renderPetSVG(appearance,window.petStore.petShop,'baby');
  },species);
  await page.waitForTimeout(100);
  const read=()=>page.locator('#petVisual g[fill="#40564e"] > ellipse[rx="10.8"]').evaluateAll(eyes=>eyes.map(e=>({cy:e.getAttribute('cy'),transform:e.getAttribute('transform')})));
  const before=await read();assert.equal(before.length,2,species);
  for(let i=0;i<30;i++){
   await page.locator('#petVisual').dispatchEvent('click');await page.waitForTimeout(20);
   assert.deepEqual(await read(),before,species+' touch '+i);
  }
  await page.waitForTimeout(2500);assert.deepEqual(await read(),before,species+' cleanup');
  // Clone only the artwork into a fresh SVG, without its root patch marker.
  await page.evaluate(()=>{const svg=document.querySelector('#petVisual svg');const copy=svg.cloneNode(true);delete copy.dataset.eyeEmphasisV146;svg.replaceWith(copy);});
  await page.waitForTimeout(50);assert.deepEqual(await read(),before,species+' clone');
 }
 assert.deepEqual(errors,[]);console.log('PASS: four gentle-eye species, 30 touches each, reaction cleanup and cloned artwork keep fixed coordinates.');
 }finally{await browser.close();}
})();