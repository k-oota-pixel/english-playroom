import test from 'node:test';import assert from 'node:assert/strict';
import {ADMIN_CONTENTS,adminContentRows} from '../admin-content-model.js';
test('all fourteen learning activities have a visible card, including those without records',()=>{
 const rows=adminContentRows();assert.equal(rows.length,14);assert.equal(new Set(rows.map(r=>r.id)).size,14);assert.ok(rows.every(r=>!r.recorded&&r.lines.length===0));
 for(const id of ['word-breaker','listening-training','pre2-interview-questions','talk-quest','pet-catch'])assert.ok(ADMIN_CONTENTS.some(c=>c[0]===id));
});
test('wallet-based results and separate exercise records populate their own cards',()=>{
 const apps={'english-playroom':{coins:20,wordBreakerBests:{junior1:{score:42,combo:12},junior2:{score:9,combo:7}},petCatchGames:3,petCatchBestScore:18,petCatchCorrectTotal:30,pre2InterviewA:{attemptedIds:['1','2']}},'basic-quest':{completedStages:[1,2,3]},'eiken-cloze':{submissions:4},'task-quest':{submissions:8}};
 const rows=adminContentRows(apps),get=id=>rows.find(r=>r.id===id);
 assert.deepEqual(get('word-breaker').lines,['最高スコア：42','最高コンボ：12','学習したコース：2']);assert.ok(get('pet-catch').lines.includes('プレイ回数：3'));assert.ok(get('basic-quest').lines.includes('クリアしたステージ：3'));assert.ok(get('eiken-pre2-interview-a').lines.includes('取り組んだ問題：2'));assert.equal(get('talk-quest').recorded,false);
});
test('per-content timestamps and historic reward records do not leak into other content cards',()=>{
 const rows=adminContentRows({'english-playroom':{coinRewardClaims:['talk-quest:theme-1'],coinRewardDate:'2026-10-21'}},{contents:{'listening-training':{lastLearningAt:'2026-10-21T08:00:00Z'}}});
 assert.ok(rows.find(r=>r.id==='talk-quest').recorded);assert.ok(rows.find(r=>r.id==='listening-training').recorded);assert.equal(rows.find(r=>r.id==='task-quest').recorded,false);
});
test('retry notebook nested records are summarized without exposing or discarding its saved answers',()=>{
 const apps={'eiken-retry':{state:{records:{q1:{attempts:3,correct:1,pending:false,updatedAt:10000},q2:{attempts:1,correct:0,pending:true,updatedAt:20000}}}}};const before=JSON.stringify(apps),row=adminContentRows(apps).find(r=>r.id==='eiken-retry');assert.deepEqual(row.lines,['取り組んだ問題：2','解答回数：4','正解数：1','復習が必要な問題：1']);assert.equal(row.lastLearningAt,20000);assert.equal(JSON.stringify(apps),before);
});

test('both dungeon records use their own best progress and activity dates',()=>{
 const rows=adminContentRows({'english-playroom':{wordTowerBest:23,eikenDungeonBest:7}},{contents:{'word-tower':{lastLearningAt:123}}});
 assert.deepEqual(rows.find(r=>r.id==='word-tower').lines,['最高到達階：23']);
 assert.deepEqual(rows.find(r=>r.id==='eiken-dungeon').lines,['最高到達層：7']);
 assert.equal(rows.find(r=>r.id==='word-tower').lastLearningAt,123);
});
