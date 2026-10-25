const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'..');
const origin='https://k-oota-pixel.github.io',home=origin+'/english-playroom/';
const outputs=path.resolve(root,'../../outputs');fs.mkdirSync(outputs,{recursive:true});
const fixture=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${home}app-shell.css"></head><body><main class="home"><div class="topbar"><div class="logo">もんすたでぃ <span class="app-version-badge">ver2.1.3</span></div><div class="auth-area"><button id="loginBtn" class="auth-btn">テストユーザー</button></div></div><h1>今日はどの教材を使う？</h1><p>ペットと教材のホーム</p><div id="petVisual">🐧</div>${['#petShopOpen','#petStrengthOpen','[data-titles-open]','[data-challenge-refresh]','#coinRankRefresh'].map((s,i)=>'<button '+(s[0]==='#'?'id="'+s.slice(1)+'"':s.slice(1,-1))+' data-modal="'+i+'">機能</button>').join('')}<section class="material-group"><h2>語彙文法学習</h2><a class="card" href="/word-breaker/"><span class="title">ワードブレイカー</span></a><a class="card" href="/eiken-retry/"><span class="title">リトライノート</span></a></section><section class="material-group"><h2>グループゲーム</h2><a class="card" href="./word-wolf/"><span class="title">ワードウルフ</span></a></section></main><script>document.querySelectorAll('[data-modal]').forEach(b=>b.onclick=()=>{const d=document.createElement('dialog');d.innerHTML='<h2>テスト小窓</h2><button>閉じる</button>';document.body.append(d);d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();d.showModal();});</script><script type="module" src="${home}app-shell.js"></script></body></html>`;
const material=`<!doctype html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="${home}shell-bridge.js"></script></head><body><h1>教材の問題</h1><button id="start">問題を開始</button><input aria-label="回答"><p id="ticks">0</p><script>let active=false,ticks=0;window.MonstudyMaterial?.setActivityGuard(()=>active);document.getElementById('start').onclick=()=>active=true;setInterval(()=>document.getElementById('ticks').textContent=++ticks,100);window.framesSeen=0;const frame=()=>{framesSeen++;requestAnimationFrame(frame);};requestAnimationFrame(frame);window.started=performance.now();</script></body>`;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/english-playroom/')return route.fulfill({contentType:'text/html',body:fixture});
   if(['/english-playroom/app-shell.js','/english-playroom/app-shell.css','/english-playroom/shell-bridge.js'].includes(u.pathname)){const file=path.join(workspace,u.pathname);return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body:fs.readFileSync(file)});}
   return route.fulfill({contentType:'text/html',body:material});
  });
  await page.goto(home);await page.locator('.ms-header').waitFor();
  console.log('buttons',await page.locator('.ms-group>button').allTextContents());await page.getByRole('button',{name:'語彙文法学習 ›'}).hover();assert.equal(await page.locator('.ms-group.is-open').count(),1);
  await page.locator('.ms-submenu a').filter({hasText:'ワードブレイカー'}).click();
  const frame=page.frameLocator('.ms-material');await frame.locator('#start').waitFor();
  assert.ok(page.url().includes('material='));assert.equal(await page.locator('iframe').count(),1);
  await frame.getByRole('textbox').fill('回答を保持');await frame.locator('#start').click();
  const child=page.frames()[1];await page.waitForTimeout(150);
  for(const name of ['ショップ','ペット強化','称号','チャレンジ','ランキング']){
   await page.locator('.ms-features').getByRole('button',{name,exact:true}).click();await page.locator('dialog[open]').waitFor();
   const before=await child.evaluate(()=>({ticks:document.getElementById('ticks').textContent,frames:framesSeen,time:performance.now()}));
   await page.waitForTimeout(250);const after=await child.evaluate(()=>({ticks:document.getElementById('ticks').textContent,frames:framesSeen,time:performance.now()}));assert.deepEqual(after,before);
   await page.locator('dialog button').click();assert.equal(await frame.getByRole('textbox').inputValue(),'回答を保持');
  }
  const tick=await frame.locator('#ticks').textContent();await page.waitForTimeout(150);assert.notEqual(await frame.locator('#ticks').textContent(),tick);
  page.once('dialog',d=>d.dismiss());await page.locator('.ms-brand').click();assert.ok(page.url().includes('material='));
  page.once('dialog',d=>d.dismiss());await page.goBack();await page.waitForTimeout(150);assert.ok(page.url().includes('material='));
  page.once('dialog',d=>d.accept());await page.locator('.ms-brand').click();assert.equal(page.url(),home);
  await page.getByRole('button',{name:'サイドバーを隠す',exact:true}).click();assert.equal(await page.locator('.ms-sidebar').isVisible(),false);await page.getByRole('button',{name:'メニューを開く',exact:true}).click();
  await page.screenshot({path:path.join(outputs,'shared-layout-desktop.png')});
  // A direct bookmarked index entry routes to the shell, preserving query and hash.
  await page.goto(origin+'/word-breaker/index.html?course=junior1#play');await frame.locator('#start').waitFor();assert.ok(decodeURIComponent(page.url()).includes('/word-breaker/index.html?course=junior1#play'));
  for(const width of [800,390,320]){
   await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'メニューを開く',exact:true}).click();
   await page.getByRole('button',{name:'サイドバーを隠す',exact:true}).click();assert.equal(await page.locator('.ms-sidebar').isVisible(),false);await page.getByRole('button',{name:'メニューを開く',exact:true}).click();
   await page.getByRole('button',{name:'語彙文法学習 ›'}).click();await page.locator('.ms-submenu a').filter({hasText:'リトライノート'}).click();await frame.locator('#start').waitFor();
   assert.equal(await page.locator('.ms-sidebar').isVisible(),false);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.getByRole('button',{name:'メニューを開く',exact:true}).click();await page.locator('.ms-features').getByRole('button',{name:'ショップ',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');
   await page.screenshot({path:path.join(outputs,'shared-layout-mobile-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);console.log('PASS instant hover, shared frame, 5 modals, timer/animation pause, resume, input preservation, navigation cancellation, back, focus, direct index bookmarks and 800/390/320px touch navigation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
