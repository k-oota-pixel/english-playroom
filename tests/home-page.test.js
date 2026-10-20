import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('homepage shows the current learning cards in a five-by-two desktop grid',()=>{
  const cards=html.slice(html.indexOf('<div class="cards">'));
  assert.equal((cards.match(/class="card(?: [^"]*)?"/g)||[]).length,10);
  assert.match(html,/\.cards\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(html,/\.cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(cards,/href="\.\/listening-training\/"[\s\S]*?<div class="title">リスニング教材<\/div>/);
  assert.match(cards,/<div class="title">並べ替え問題（基礎）<\/div>/);
  assert.match(cards,/<div class="title">タスク別日常英会話<\/div>/);
  assert.equal((cards.match(/class="[^"]*interview-card/g)||[]).length,1);
  assert.equal((cards.match(/eiken-pre2-interview-a|準2級面接/g)||[]).length>=2,true);
  assert.doesNotMatch(html,/stat-grid|dashRefresh|wordBreakerStat/);
});

function coinBoardHarness(fetchImpl=async()=>({ok:true,json:async()=>({coinsToday:0,top3:[]})})){
  const elements={};
  for(const id of ['coinsToday','coinsTodayCaption','coinRankRefresh','coinRankList','coinRankNote']){
    elements[id]={textContent:'',disabled:false,children:[],addEventListener(){},
      replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}};
  }
  const context=vm.createContext({...elements,COIN_LEADERBOARD_API:'https://home.test/api/leaderboard',fetch:fetchImpl,
    console:{error(){}},window:{addEventListener(){}},
    document:{createElement(){return {className:'',innerHTML:'',textContent:'',children:[],
      append(...children){this.children.push(...children);}};}},
    Intl,Number,Math,Array,Promise});
  const start=html.indexOf('function renderCoinRanking(entries){');
  const end=html.indexOf('loginBtn.addEventListener("click"',start);
  assert.notEqual(start,-1);assert.notEqual(end,-1);
  vm.runInContext('let coinBoardUser=null;\n'+html.slice(start,end),context);
  return {context,elements};
}

test('signed-in zero coin balance is shown as zero with the current empty ranking message',async()=>{
  const h=coinBoardHarness();
  h.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',h.context);
  assert.equal(h.elements.coinsToday.textContent,'0');
  assert.equal(h.elements.coinsTodayCaption.textContent,'今日、教材に取り組んで獲得したコイン');
  assert.match(h.elements.coinRankList.children[0].innerHTML,/本日コインを獲得した方はまだいません/);
  assert.equal(h.elements.coinRankRefresh.disabled,false);
});

test('daily ranking displays up to three pet names and their coin totals',async()=>{
  const rows=[{petName:'えまめん',coinsToday:18},{petName:'ルル',coinsToday:12},{petName:'ポチ',coinsToday:4},{petName:'対象外',coinsToday:1}];
  const h=coinBoardHarness(async()=>({ok:true,json:async()=>({coinsToday:18,top3:rows})}));
  h.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',h.context);
  assert.equal(h.elements.coinRankList.children.length,3);
  assert.deepEqual(Array.from(h.elements.coinRankList.children,li=>li.children[1].textContent),['えまめん','ルル','ポチ']);
  assert.deepEqual(Array.from(h.elements.coinRankList.children,li=>li.children[2].textContent),['🪙 18','🪙 12','🪙 4']);
});

test('signed-out and failed requests keep clear current-state messages',async()=>{
  const signedOut=coinBoardHarness();
  await vm.runInContext('refreshCoinBoard()',signedOut.context);
  assert.equal(signedOut.elements.coinsToday.textContent,'—');
  assert.equal(signedOut.elements.coinsTodayCaption.textContent,'ログイン後に表示');
  assert.match(signedOut.elements.coinRankNote.textContent,/ログインすると/);

  const failed=coinBoardHarness(async()=>({ok:false,json:async()=>({error:'offline'})}));
  failed.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('refreshCoinBoard(testUser)',failed.context);
  assert.equal(failed.elements.coinsToday.textContent,'—');
  assert.equal(failed.elements.coinsTodayCaption.textContent,'本日の獲得数を取得できませんでした。');
});
