const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const fixture=html.replace(/<script\b[\s\S]*?<\/script>/g,'');
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    await page.route('http://home.test/**',route=>{
      const pathname=new URL(route.request().url()).pathname;
      return route.fulfill({contentType:pathname.endsWith('.css')?'text/css':'text/html',body:pathname.endsWith('.css')?'':fixture});
    });
    await page.goto('http://home.test/');
    assert.equal(await page.locator('.cards > .card').count(),10);
    assert.equal(await page.locator('.cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),5);
    assert.equal(await page.locator('.cards a[href="./listening-training/"]').count(),1);
    assert.equal(await page.getByText('リスニング教材',{exact:true}).count(),1);
    assert.equal(await page.getByText('並べ替え問題（基礎）',{exact:true}).count(),1);
    assert.equal(await page.getByText('タスク別日常英会話',{exact:true}).count(),1);
    assert.equal(await page.locator('.interview-card a').count(),2);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.cards').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log('Homepage browser: 10 cards, desktop/mobile grid, listening link, current titles and interview links passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
