const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const taskRoot=path.resolve(root,'../task-quest');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
  try{
    for(const patch of ['pet-lion-v148.js','pet-lion-v149.js']){
      const page=await browser.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.route('https://task-quest.onrender.com/**',r=>r.fulfill({contentType:'application/json',body:'{"ready":true}'}));
      const html=fs.readFileSync(path.join(taskRoot,'index.html'),'utf8')
        .replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/g,'')
        .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g,'');
      await page.route('http://127.0.0.1:8765/',r=>r.fulfill({contentType:'text/html',body:html}));
      await page.goto('http://127.0.0.1:8765/');
      await page.addScriptTag({content:fs.readFileSync(path.join(root,patch),'utf8')});
      // Check initial labels, then repeated DOM updates watched by the pet patch.
      assert.equal(await page.locator('.taskbtn').nth(20).innerText(),'21\nパンダの場所\n○');
      for(const index of [20,19,20])await page.locator('.taskbtn').nth(index).click();
      await page.locator('#translation summary').click();
      assert.equal(await page.locator('#title').innerText(),'パンダの場所');
      assert.equal(await page.locator('#task').innerText(),'Ask where the pandas are.');
      assert.equal(await page.locator('#jaTask').innerText(),'パンダがどこにいるか尋ねよう。');
      for(let i=0;i<3;i++)await page.locator('#hintbtn').click();
      assert.match(await page.locator('#hint').innerText(),/Where are the pandas/);
      assert.equal(await page.locator('body').innerText().then(s=>s.includes('ライオン')),false);
      assert.deepEqual(errors,[]);
      await page.close();
      console.log(patch+': initial list, repeated task selection, translation and hints preserved');
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
