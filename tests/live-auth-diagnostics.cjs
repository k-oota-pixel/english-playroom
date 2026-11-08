const {chromium}=require('playwright');
const base='https://k-oota-pixel.github.io/english-playroom/';
const errors=[];
const safe=s=>String(s).slice(0,450);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},locale:'ja-JP'});
 page.on('pageerror',e=>errors.push('PAGE:'+safe(e.message)));
 page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE:'+safe(m.text()));});
 page.on('requestfailed',req=>{if(errors.length<70)errors.push('NETWORK:'+safe(new URL(req.url()).hostname+new URL(req.url()).pathname+':'+req.failure()?.errorText));});
 try{
  console.log('SMOKE_START '+new Date().toISOString());
  const loginResponse=await page.goto(base+'login.html',{waitUntil:'domcontentloaded',timeout:40000});
  console.log('LOGIN_PAGE status='+loginResponse?.status()+' title='+await page.title()+' initialSubmit='+await page.locator('#emailSubmit').textContent());
  await page.waitForTimeout(8000);
  console.log('LOGIN_AFTER_8S submit='+await page.locator('#emailSubmit').textContent()+' url='+new URL(page.url()).pathname+' statusVisible='+await page.locator('#status').isVisible());
  await page.screenshot({path:'live-login-page.png',fullPage:true});
  const htmlResponse=await page.goto(base+'pet-room/room-webp-v1.html?v=2.4.25',{waitUntil:'domcontentloaded',timeout:40000}).catch(e=>{console.log('DIRECT_NAV_ERROR '+safe(e.message));return null});
  console.log('DIRECT_ROOM status='+htmlResponse?.status()+' urlPath='+new URL(page.url()).pathname);
  for(let sec=0;sec<30;sec+=5){
   await page.waitForTimeout(5000);
   console.log('AFTER_'+(sec+5)+'S path='+new URL(page.url()).pathname+' title='+safe(await page.title())+' bodyLength='+await page.locator('body').evaluate(x=>x?.innerText?.length||0));
   if(page.url().includes('/login.html'))break;
  }
  console.log('ERR_COUNT '+errors.length);
  for(const e of errors.slice(0,55))console.log('DIAGNOSTIC '+e);
  // GET access to API itself (not an authenticated call)
  try{
   const ac=new AbortController();setTimeout(()=>ac.abort(),25000);
   const start=Date.now();
   const r=await fetch('https://task-quest.onrender.com/',{signal:ac.signal});
   console.log('API_GET status='+r.status+' elapsedMs='+(Date.now()-start));
  }catch(e){console.log('API_GET_FAILED '+safe(e.message));}
  try{
   const ac=new AbortController();setTimeout(()=>ac.abort(),25000);
   const start=Date.now();
   const r=await fetch('https://task-quest.onrender.com/api/account/login',{method:'OPTIONS',headers:{Origin:'https://k-oota-pixel.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'},signal:ac.signal});
   console.log('API_CORS_PREFLIGHT status='+r.status+' allowOrigin='+r.headers.get('access-control-allow-origin')+' elapsedMs='+(Date.now()-start));
  }catch(e){console.log('API_PREFLIGHT_FAILED '+safe(e.message));}
 }finally{await browser.close();}
})().catch(e=>{console.error('SMOKE_FAILURE '+safe(e.stack));process.exitCode=1;});