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

test('4枚の問題カードには正答率と正解時倍率だけが表示され、問題文は選択後に出す',()=>{
 const js=source('pet-adventure/online-battle.js');
 const html=source('pet-adventure/online-battle-questions.html');
 const css=source('pet-adventure/online-battle.css');
 assert.match(js,/function difficultyFor\(card,room\)/);
 assert.match(js,/if\(QUESTION_MODE\)\{[\s\S]*?classList\.add\('online-accuracy-card'\)/);
 assert.match(js,/初回正答率/);
 assert.match(js,/正解時 ダメージ＋/);
 assert.match(js,/button\.addEventListener\('click',\(\)=>openQuestion\(card,room\)\)/);
 assert.match(js,/els\.questionText\.innerHTML=QUESTION_MODE\?esc\(card\.question\)/);
 assert.match(js,/new URL\('\.\.\/online-question-accuracy\.json',import\.meta\.url\)/);
 assert.match(html,/online-battle\.css\?v=2\.4\.92/);
 assert.match(html,/online-battle\.js\?v=2\.4\.92/);
 assert.match(css,/online-accuracy-number/);
});

test('正答率データはJSONを毎朝生成し、対戦中はFirestoreを読まない',async()=>{
 const workflow=source('.github/workflows/today-daily.yml');
 const script=source('today/update-online-accuracy.mjs');
 const battle=source('pet-adventure/online-battle.js');
 const placeholder=JSON.parse(source('online-question-accuracy.json'));
 assert.match(workflow,/accuracy:\s*\n\s*runs-on:/);
 assert.match(workflow,/node today\/update-online-accuracy\.mjs/);
 assert.match(script,/api\/online-battle\/accuracy\/export/);
 assert.match(script,/online-question-accuracy\.json/);
 assert.match(battle,/fetch\(url\.href,\{cache:'no-store'/);
 assert.equal(placeholder.updatedAt,null,'初回の集計前に推測した倍率を配信しない');
 assert.ok(Object.keys(placeholder.grades['4']).length>=4);
 const {validExport}=await import('../today/update-online-accuracy.mjs');
 assert.equal(validExport(placeholder),false);
 assert.equal(validExport({...placeholder,updatedAt:'2026-11-13T00:00:00Z'}),true);
});
