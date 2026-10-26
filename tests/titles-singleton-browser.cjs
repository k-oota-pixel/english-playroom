const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage();let loads=0,release;
  const gate=new Promise(resolve=>release=resolve);
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='titles.test'){
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<meta charset="UTF-8"><div id="learningTitles"><button data-titles-open>称号</button><p data-titles-note></p></div>'});
    const file=path.join(__dirname,'..',url.pathname);
    return route.fulfill({contentType:url.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file,'utf8')});
   }
   if(url.pathname.endsWith('firebase-app.js'))return route.fulfill({contentType:'text/javascript',body:'export const getApps=()=>[{}],getApp=()=>({});'});
   if(url.pathname.endsWith('auth-session.js'))return route.fulfill({contentType:'text/javascript',body:'export const getAuth=()=>({});export function onAuthStateChanged(a,cb){window.subscriptions=(window.subscriptions||0)+1;cb({uid:"student",getIdToken:async()=>"test-token"});}'});
   if(url.pathname==='/api/learning/titles'){
    if(!url.searchParams.has('view')){loads++;await gate;}
    return route.fulfill({contentType:'application/json',body:JSON.stringify({selectedId:'',selectedTitle:'',titles:[]})});
   }
   return route.abort();
  });
  await page.goto('http://titles.test/');
  await page.evaluate(async()=>{await Promise.all([import('/learning-titles.js?entry=one'),import('/learning-titles.js?entry=two')]);});
  await page.waitForFunction(()=>window.subscriptions===1);
  assert.equal(await page.evaluate(()=>window.subscriptions),1,'only one auth subscription across module copies');
  await page.getByRole('button',{name:'称号',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('dialog[open]'));
  assert.equal(await page.locator('dialog[open]').count(),1,'one dialog while loading');
  release();
  await page.getByRole('heading',{name:'実績・称号コレクション'}).waitFor();
  assert.equal(loads,1,'one collection request per click');
  assert.equal(await page.locator('dialog[open]').count(),1);
  await page.getByRole('button',{name:'閉じる',exact:true}).click();
  assert.equal(await page.locator('dialog[open]').count(),0,'close once leaves no hidden second popup');
  await page.getByRole('button',{name:'称号',exact:true}).click();
  await page.getByRole('heading',{name:'実績・称号コレクション'}).waitFor();
  assert.equal(loads,2);assert.equal(await page.locator('dialog[open]').count(),1);
  await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  console.log('PASS duplicate module imports, single subscription/request/dialog, close once, reopen, Escape');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
