import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const expectedTitles=['エイゴメーター','ワードウルフ','ワードブレイカー','アテル','並べ替え問題（基礎）','リトライノート','タスク別英会話',
  '長文空所補充','長文概要把握','長文演習','リスニング演習＆ディクテーション','準２級面接対策：質問4・5','準２級面接対策：面接A','テーマ別日常英会話'];

test('homepage cards follow the requested desktop order and exam labels',()=>{
  const cards=html.slice(html.indexOf('<div class="cards">'));
  const titles=[...cards.matchAll(/<div class="title">([^<]+)(?:<span class="eiken-badge">英検対応<\/span>)?<\/div>/g)].map(match=>match[1]);
  assert.deepEqual(titles,expectedTitles);
  assert.equal((cards.match(/class="card(?: [^"]*)?"/g)||[]).length,14);
  assert.match(html,/\.cards\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(html,/\.cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(cards,/href="\.\/listening-training\/"[\s\S]*?<div class="title">リスニング演習＆ディクテーション<span class="eiken-badge">英検対応<\/span><\/div>/);
  assert.match(cards,/href="\.\/reading-training\/"[\s\S]*?<div class="title">長文演習<span class="eiken-badge">英検対応<\/span><\/div>/);
  assert.equal((cards.match(/<span class="eiken-badge">英検対応<\/span>/g)||[]).length,8);
  assert.equal((cards.match(/class="[^"]*interview-card/g)||[]).length,2);
  assert.equal((cards.match(/eiken-pre2-interview-a|準２級面接対策/g)||[]).length>=2,true);
  assert.doesNotMatch(html,/stat-grid|dashRefresh|wordBreakerStat/);
  assert.doesNotMatch(cards,/<(?:a|div) class="play"/);
  assert.equal((cards.match(/<a class="card[^"]*" href=/g)||[]).length,14);
  assert.doesNotMatch(cards,/<div class="card(?: |")/);
});

function coinBoardHarness(fetchImpl=async()=>({ok:true,json:async()=>({coinsToday:0,top3:[]})})){
  const elements={},listeners={};let fetchCalls=0;
  for(const id of ['coinsToday','coinsTodayCaption','coinRankRefresh','coinRankList','coinRankNote']){
    elements[id]={textContent:'',disabled:false,children:[],setAttribute(){},addEventListener(){},
      replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}};
  }
  const context=vm.createContext({...elements,COIN_LEADERBOARD_API:'https://home.test/api/leaderboard',fetch:(...args)=>{fetchCalls++;return fetchImpl(...args);},
    console:{error(){}},window:{addEventListener(type,listener){listeners[type]=listener;}},
    document:{createElement(){return {className:'',innerHTML:'',textContent:'',children:[],
      append(...children){this.children.push(...children);}};}},
    Intl,Number,Math,Array,Promise,AbortSignal});
  const start=html.indexOf('function renderCoinRanking(entries,emptyMessage=');
  const end=html.indexOf('loginBtn.addEventListener("click"',start);
  assert.notEqual(start,-1);assert.notEqual(end,-1);
  vm.runInContext('let coinBoardUser=null;\n'+html.slice(start,end),context);
  return {context,elements,listeners,get fetchCalls(){return fetchCalls;}};
}

test('signed-in zero coin balance is shown as zero with the current empty ranking message',async()=>{
  const h=coinBoardHarness();
  h.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',h.context);
  assert.equal(h.elements.coinsToday.textContent,'0');
  assert.equal(h.elements.coinsTodayCaption.textContent,'今日、教材に取り組んで獲得したコイン');
  assert.match(h.elements.coinRankList.children[0].children[1].textContent,/本日コインを獲得した方はまだいません/);
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

test('failed leaderboard requests show the current error state',async()=>{
  const failed=coinBoardHarness(async()=>({ok:false,json:async()=>({error:'offline'})}));
  failed.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',failed.context);
  assert.equal(failed.elements.coinsToday.textContent,'—');
  assert.equal(failed.elements.coinsTodayCaption.textContent,'本日の獲得数を取得できませんでした。');
});

test('ranking query failures keep the successfully fetched zero coin total visible',async()=>{
  const h=coinBoardHarness(async()=>({ok:true,json:async()=>({coinsToday:0,top3:[],rankingAvailable:false})}));
  h.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',h.context);
  assert.equal(h.elements.coinsToday.textContent,'0');
  assert.match(h.elements.coinRankList.children[0].children[1].textContent,/本日のランキングを取得できませんでした/);
});

test('ranking only loads on demand and never on focus or page restoration',async()=>{
  const h=coinBoardHarness();
  h.context.testUser={uid:'learner',getIdToken:async()=>'token'};
  await vm.runInContext('coinBoardUser=testUser; refreshCoinBoard(testUser)',h.context);
  assert.equal(h.listeners.focus,undefined);assert.equal(h.listeners.pageshow,undefined);
  assert.doesNotMatch(html,/await refreshCoinBoard\(user\)/);
  await vm.runInContext('Promise.resolve()',h.context);
  assert.equal(h.fetchCalls,1);
  await vm.runInContext('refreshCoinBoard(testUser,{force:true})',h.context);
  assert.equal(h.fetchCalls,2);
});
