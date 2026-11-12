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

test('オンライン難問一覧は管理画面でのみ明示的に読み込む',()=>{
 const admin=source('admin.html'),script=source('admin-online-question-stats.js');
 assert.match(admin,/admin-online-question-stats\.js\?v=2\.4\.90/);
 assert.match(script,/online-battle-question-stats\?grade=/);
 assert.match(script,/button\.onclick=\(\)=>\{if\(!dialog\.open\)dialog\.showModal\(\);void render\(\);\}/);
 assert.match(script,/if\(!force&&cache\.has\(grade\)\)return cache\.get\(grade\)/);
 for(const module of ['pet-adventure/online-battle.js','admin-online-question-stats.js']){
  execFileSync(process.execPath,['--check',new URL(module,root).pathname]);
 }
});
