const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..'),outputs=path.resolve(root,'../../outputs');
const origin='https://k-oota-pixel.github.io',home=origin+'/english-playroom/';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
  await page.route(origin+'/**',route=>{
   const u=new URL(route.request().url());let file=path.resolve(workspace,'.'+decodeURIComponent(u.pathname));if(u.pathname.endsWith('/'))file=path.join(file,'index.html');
   if(!file.startsWith(workspace+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg'};
   return route.fulfill({contentType:types[ext]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  // Real Firebase SDK, guest identity. No production writes or signed-in profile.
  await page.route('https://task-quest.onrender.com/**',r=>r.fulfill({json:{}}));
  await page.goto(home,{waitUntil:'domcontentloaded'});await page.locator('.ms-header').waitFor();await page.waitForTimeout(2000);
  assert.equal(await page.locator('.ms-group').count(),7);assert.ok(await page.locator('.ms-home-content .card').count()>=14);
  await page.screenshot({path:path.join(outputs,'monstudy-2.1.1-home-desktop.png')});
  await page.getByRole('button',{name:'語彙文法学習 ›'}).hover();await page.screenshot({path:path.join(outputs,'monstudy-2.1.1-menu-desktop.png')});
  const urls=await page.locator('.ms-submenu a').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.href))]);
  for(const url of urls){
   console.log('material',new URL(url).pathname,new URL(url).search);
   await page.evaluate(url=>window.MonstudyShell.navigate(url),url);
   await page.waitForFunction(url=>{const f=document.querySelector('.ms-material');const actual=new URL(f.contentWindow.location.href);actual.searchParams.delete('monstudy-release');return actual.href===url&&f.contentWindow?.MonstudyMaterial&&f.contentDocument?.body&&f.contentDocument.readyState==='complete';},url);
   await page.waitForTimeout(250);const state=await page.evaluate(()=>{const f=document.querySelector('.ms-material');return {text:f.contentDocument.body.innerText,active:f.contentWindow.MonstudyMaterial.isActive(),nested:f.contentDocument.querySelectorAll('#monstudyShell').length};});
   assert.ok(state.text.trim().length>15,url);assert.equal(state.nested,0,url);
   // Exit only in this isolated browser test; navigation guard itself is covered separately.
   await page.evaluate(()=>document.querySelector('iframe').contentWindow.MonstudyMaterial.setActivityGuard(()=>false));
  }
  await page.evaluate(()=>MonstudyShell.navigate('https://k-oota-pixel.github.io/english-playroom/'));
  for(const width of [390,320]){await page.setViewportSize({width,height:844});await page.screenshot({path:path.join(outputs,'monstudy-2.1.1-home-mobile-'+width+'.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('button',{name:'メニューを開く',exact:true}).click();await page.getByRole('button',{name:'語彙文法学習 ›'}).click();await page.screenshot({path:path.join(outputs,'monstudy-2.1.1-menu-mobile-'+width+'.png')});await page.getByRole('button',{name:'メニューを閉じる',exact:true}).first().click();}
  assert.deepEqual(errors,[]);console.log('PASS real home, all material entry points, no nested shell, desktop and mobile screenshots');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
