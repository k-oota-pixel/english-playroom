import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const shell=read('app-shell.js');
const play=read('pet-play-menu-v164.js');
const loader=read('version-badge-v176.js');
const home=read('index.html');

test('Eigo Dungeons sidebar exposes the typing defense exactly once',()=>{
 const group=shell.match(/groups\.push\(\{name:'エイゴダンジョンズ',items:\[([\s\S]*?)\]\}\);/);
 assert.ok(group,'Eigo Dungeons nav group exists');
 assert.match(group[1],/name:'もんすた城の防衛',url:new URL\('pet-typing-defense\/',root\)/);
 assert.equal((group[1].match(/pet-typing-defense\//g)||[]).length,1);
 const hidden=shell.match(/const hiddenMaterials=\[([^;]+)\];/);
 assert.ok(hidden);
 assert.doesNotMatch(hidden[1],/pet-typing-defense/,'the same app should not be both visible and hidden');
});

test('PLAY dialog has the fourth game tile linking to typing defense',()=>{
 const body=play.match(/<div class="games">([\s\S]*?)<\/div>`;/);
 assert.ok(body,'PLAY game menu exists');
 assert.match(body[1],/<a href="\.\/pet-typing-defense\/">⌨️<strong>もんすた城の防衛<\/strong>/);
 assert.equal((body[1].match(/<a href="/g)||[]).length,4);
 assert.match(play,/#petGameMenu \.games\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('homepage loads updated PLAY menu and sidebar module',()=>{
 const version=loader.match(/const APP_VERSION='([^']+)'/)?.[1];
 assert.ok(version,'release version must exist');
 assert.ok(loader.includes("import './pet-play-menu-v164.js?v="+version+"';"));
 assert.ok(home.includes('app-shell.js?v='+version));
 assert.ok(home.includes('<script type="module" src="./pet-play-menu-v164.js?v='+version+'"></script>'));
 assert.ok(home.includes('version-badge-v176.js?v='+version));
});

test('each adventure card has its own ranking button directly underneath',()=>{
 const page=read('pet-adventure/index.html');
 const cards=page.split('<div class="adventure-choice">').slice(1);
 assert.equal(cards.length,3);
 for(const [index,game] of ['tower','dungeon','defense'].entries()){
  assert.match(cards[index],new RegExp('class="adventure-card '+game+'-card"'));
  assert.match(cards[index],/class="secondary-btn adventure-ranking-button"/);
 }
 assert.match(cards[0],/data-ranking="tower"/);
 assert.match(cards[1],/data-ranking="dungeon"/);
 assert.match(cards[2],/id="defenseRankingOpen"/);
 assert.match(page,/class="ranking-actions adventure-online-actions"/);
});

test('defense ranking dialog shows easy, normal and hard together on demand with cached GETs',()=>{
 const page=read('pet-adventure/index.html');
 const rankings=read('pet-adventure/rankings.js');
 assert.match(page,/id="defenseRankingEasyList"/);
 assert.match(page,/id="defenseRankingNormalList"/);
 assert.match(page,/id="defenseRankingHardList"/);
 assert.doesNotMatch(page,/data-defense-ranking=/);
 assert.match(rankings,/Promise\.allSettled\(defenseModes\.map/);
 assert.match(rankings,/defense-rankings\?mode=/);
 assert.match(rankings,/encodeURIComponent\(board\.key\)/);
 assert.match(rankings,/defenseCacheMs=3\*60\*1000/);
 assert.match(rankings,/defenseReload\.addEventListener\('click'/);
});

test('both 100th-floor leaderboards show saved full-clear state, not arrival alone',()=>{
 const rankings=read('pet-adventure/rankings.js');
 const styles=read('pet-adventure/styles.css');
 assert.match(rankings,/if\(Number\(entry\.floor\)===100\)/);
 assert.match(rankings,/entry\.cleared===true\?'★ 完全制覇':'挑戦中'/);
 assert.match(styles,/\.adventure-clear-state\.is-cleared/);
});

test('in-game typing-defense mode buttons use lifetime best-stage standings',()=>{
 const ui=read('material-ranking-ui.js');
 assert.match(ui,/DEFENSE_BEST_ENDPOINT/);
 assert.match(ui,/defense-rankings/);
 assert.match(ui,/最高クリアステージ TOP3/);
 assert.match(ui,/String\(item\.rank\|\|i\+1\)\+'位'/);
 assert.match(ui,/Number\(item\.floor\)===5/);
});
