import test from 'node:test';import assert from 'node:assert/strict';
import {learningRows,dayKey} from '../learning-dashboard.js';
test('all twelve contents include cumulative progress and JST daily activity',()=>{
 const rows=learningRows({'ateru':{gamesCompleted:3,questionsSolved:15,lastPlayedDate:'2026-10-20'},'english-playroom':{wordBreakerBests:{basic:{score:50}}}}, {contents:{'ateru':{lastLearningAt:'2026-10-20T15:01:00Z'},'talk-quest':{lastLearningAt:'2026-10-20T14:59:00Z'}}},'2026-10-21');
 assert.equal(rows.length,12);assert.match(rows.find(r=>r.id==='ateru').summary,/クリア回数：3/);assert.equal(rows.find(r=>r.id==='ateru').done,true);
 assert.equal(rows.find(r=>r.id==='talk-quest').done,false);assert.equal(rows.find(r=>r.id==='word-breaker').recorded,true);assert.equal(rows.find(r=>r.id==='word-breaker').done,false);
 assert.equal(rows.find(r=>r.id==='listening-training').recorded,false);
});
test('legacy retry and interview records count without requiring a new activity record',()=>{
 const rows=learningRows({'eiken-retry':{state:{records:{q:{attempts:2,correct:1,updatedAt:Date.parse('2026-10-21T01:00:00Z')}}}},'english-playroom':{pre2InterviewA:{attemptedIds:['1','2'],lastPlayedDate:'2026-10-21'}}},{},'2026-10-21');
 assert.equal(rows.find(r=>r.id==='eiken-retry').done,true);assert.match(rows.find(r=>r.id==='eiken-retry').summary,/解答回数：2/);
 assert.equal(rows.find(r=>r.id==='eiken-pre2-interview-a').done,true);assert.equal(dayKey('invalid'),'');
});
