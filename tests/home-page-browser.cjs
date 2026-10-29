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
    assert.deepEqual(await page.locator('.cards > .card .title').allTextContents(),
      ['エイゴメーター','ワードウルフ','ワードブレイカー','アテル','並べ替え問題（基礎）','並べ替え問題（文法別）',
       'リトライノート英検対応','長文空所補充英検対応','長文概要把握英検対応','長文演習英検対応',
       'リスニング演習＆ディクテーション英検対応','タスク別英会話','テーマ別日常英会話英検対応',
       '準２級質問４/５対策英検対応','準２級面接A練習英検対応','３級面接Q2・Q3対策英検対応','３級面接Q4・Q5対策英検対応']);
    assert.equal(await page.locator('.cards > .card').count(),17);
    assert.equal(await page.locator('.app-version-badge').textContent(),'ver2.1.42');
    assert.equal(await page.locator('.cards').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),4);
    assert.equal(await page.locator('.cards a[href="./listening-training/"]').count(),1);
    assert.equal(await page.locator('.eiken-badge').count(),10);
    assert.equal(await page.locator('.interview-card').count(),4);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('.cards').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    console.log('Homepage browser: current card order, exam labels, listening link and responsive grid passed');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
