const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..');const {renderPetSVG}=await import('../pet-art.js');
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try {for(const species of ['cat','dog']){
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[2026,9,24,2,0]));}static now(){return new RealDate(2026,9,24,2,0).getTime();}};});
 const art=style=>renderPetSVG({species,eyeStyle:style});
 await page.route('http://sleep.test/**',route=>{const p=new URL(route.request().url()).pathname;if(p==='/')return route.fulfill({contentType:'text/html',body:`<style>svg{width:240px}.pet-visual-wrap{display:inline-block}</style><div class="pet-visual-wrap"><div id="petVisual" class="hatched">${art('round')}</div></div><div id="reference">${art('sleepy')}</div><script type="module" src="/pet-sleep-mode.js"></script>`});return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,p),'utf8')});});
 await page.goto('http://sleep.test/');await page.waitForSelector('[data-pet-sleeping="1"]');
 const result=await page.evaluate(()=>{const overlay=document.querySelector('.pet-sleep-face'),ref=document.querySelector('#reference [data-pet-eyes]'),native=document.querySelector('#petVisual [data-pet-eyes]');return {paths:[...overlay.querySelectorAll('path')].map(x=>x.outerHTML),expected:[...ref.querySelectorAll('path')].map(x=>x.outerHTML),transform:overlay.firstElementChild.getAttribute('transform'),referenceTransform:ref.firstElementChild.getAttribute('transform'),sameParent:overlay.parentNode===native.parentNode,opacity:native.style.opacity};});
 assert.deepEqual(result.paths,result.expected);assert.equal(result.transform,species==='cat'?result.referenceTransform:null);assert.equal(result.sameParent,true);assert.equal(result.opacity,'0');
 await page.locator('#petVisual').click();await page.waitForFunction(()=>document.querySelector('#petVisual').dataset.petGrumpy==='1');await page.waitForFunction(()=>!document.querySelector('#petVisual').dataset.petGrumpy);
 assert.equal(await page.locator('#petVisual [data-pet-eyes]').evaluate(el=>el.style.opacity),'');assert.equal(await page.locator('.pet-sleep-face').evaluate(el=>el.style.display),'none');assert.deepEqual(errors,[]);
 await page.close();console.log(species+': sleepy artwork, local coordinates, hidden awake eyes, wake restoration passed');
 }} finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
