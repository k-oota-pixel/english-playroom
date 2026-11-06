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
 assert.match(group[1],/name:'タイピングディフェンス',url:new URL\('pet-typing-defense\/',root\)/);
 assert.equal((group[1].match(/pet-typing-defense\//g)||[]).length,1);
 const hidden=shell.match(/const hiddenMaterials=\[([^;]+)\];/);
 assert.ok(hidden);
 assert.doesNotMatch(hidden[1],/pet-typing-defense/,'the same app should not be both visible and hidden');
});

test('PLAY dialog has the fourth game tile linking to typing defense',()=>{
 const body=play.match(/<div class="games">([\s\S]*?)<\/div>`;/);
 assert.ok(body,'PLAY game menu exists');
 assert.match(body[1],/<a href="\.\/pet-typing-defense\/">⌨️<strong>タイピングディフェンス<\/strong>/);
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
