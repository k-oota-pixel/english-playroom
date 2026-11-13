import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const source=path=>readFileSync(new URL(path,root),'utf8');

test('Lv20 MP8 反射1回・時間制限なしは共通魔法カタログから取得',()=>{
 const battle=source('pet-adventure/online-battle.js'),spells=source('pet-dungeons-model.js');
 assert.match(spells,/id:'mirogoturn',name:'ミロゴターン',level:20,kind:'reflect',base:0,mpCost:8/);
 assert.match(spells,/時間制限なし/);
 assert.match(battle,/for\(const spell of ONLINE_MAGIC_SPELLS\)/);
 assert.match(battle,/const ONLINE_MAGIC_SPELLS=MAGIC_SPELLS/,'両モードで共通の魔法カタログを使う');
 assert.match(battle,/reflectActive=spell.kind==='reflect'/);
 assert.match(battle,/online-reflect-active/);
 assert.match(battle,/ev.kind==='reflected'/);
});
test('単語・問題の両方で同じ告知を読み込む',()=>{
 const js=source('pet-adventure/online-battle.js');
 for(const page of ['pet-adventure/online-battle.html','pet-adventure/online-battle-questions.html']){
  assert.match(source(page),/online-battle.js\?v=2\.4\.96/);
 }
 assert.match(js,/installMirogoturnNews\(user.uid\)/);
 assert.match(js,/online-mirogoturn-news.js\?v=2\.4\.95/);
 const notice=source('pet-adventure/online-mirogoturn-news.js'),css=source('pet-adventure/online-mirogoturn-news.css');
 assert.match(notice,/mirogoturn-new-spell.webp/);
 assert.match(notice,/次回以降表示しない/);
 assert.match(notice,/localStorage/);
 assert.match(notice,/online-mirogoturn-poster-ok/);
 assert.match(notice,/時間制限なく/);
 assert.match(notice,/オンライン対戦 新魔法ミロゴターン/);
 assert.match(css,/online-mirogoturn-dialog/);
 assert.doesNotMatch(notice,/firestore|databaseURL|runTransaction|getDoc/);
});
test('告知画像は実際のWebPファイルで配信される',()=>{
 const fs=source('pet-adventure/online-mirogoturn-news.js');
 assert.match(fs,/mirogoturn-new-spell.webp/);
 const image=readFileSync(new URL('pet-adventure/mirogoturn-new-spell.webp',root));
 assert.equal(image.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(image.subarray(8,12).toString('ascii'),'WEBP');
});
test('既存バトルコードと告知JSに文法エラーがない',()=>{
 for(const p of ['pet-adventure/online-battle.js','pet-adventure/online-mirogoturn-news.js']){
  execFileSync(process.execPath,['--check',new URL(p,root).pathname]);
 }
});
