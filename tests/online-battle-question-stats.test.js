import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const source=path=>readFileSync(new URL(path,root),'utf8');

test('問題対戦は既存のattack/missリクエストへ問題IDを同梱する',()=>{
 const script=source('pet-adventure/online-battle.js');
 assert.match(script,/body:QUESTION_MODE\?\{questionId:currentQuestion\.card\.id\}:null/);
 assert.doesNotMatch(script,/api\/admin\/online-battle-question-stats/);
});

test('管理画面は合算ランキングだけ表示し、取得はボタン押下時のみ',()=>{
 const admin=source('admin.html'),script=source('admin-retry-stats.js');
 assert.match(admin,/admin-retry-stats\.js\?v=2\.4\.91/);
 assert.doesNotMatch(admin,/admin-online-question-stats\.js/,'対戦の独立ランキングボタンを出さない');
 assert.match(script,/英検問題・難問ランキング（合算）/);
 assert.match(script,/リトライノートとオンライン対戦（問題）の初回回答を合算/);
 assert.match(script,/retry-question-stats\?grade=/);
 assert.match(script,/button\.onclick=\(\)=>\{if\(!dialog\.open\)dialog\.showModal\(\);void render\(\);\}/);
 assert.match(script,/if\(!force&&cache\.has\(grade\)\)return cache\.get\(grade\)/);
 assert.match(script,/r\.retryAttempts/);
 assert.match(script,/r\.battleAttempts/);
 for(const module of ['pet-adventure/online-battle.js','admin-retry-stats.js']){
  execFileSync(process.execPath,['--check',new URL(module,root).pathname]);
 }
});
