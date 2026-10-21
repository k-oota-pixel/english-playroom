import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRADES,validatePassages,judge,nextRandom,validFeedback} from '../reading-training/model.js';
const data=JSON.parse(readFileSync(new URL('../reading-training/passages.json',import.meta.url)));
test('all five grades have complete narrative passages and four-choice questions',()=>{
 const ps=validatePassages(data);assert.equal(ps.length,126);assert.equal(ps.reduce((n,p)=>n+p.questions.length,0),526);
 for(const grade of GRADES)assert.ok(ps.some(p=>p.grade===grade));
 for(const p of ps){assert.ok(p.text.split(/\s+/).length>=100);assert.doesNotMatch(p.text,/From:|Subject:|Read each passage|copyright|\(\s*\d+\s*\)|\(\s*\)/);assert.ok(p.title.length>2);for(const q of p.questions){for(let answer=1;answer<=4;answer++)assert.equal(judge(q,answer),answer===q.answer);assert.ok(['official','external_key'].includes(q.answer_status));}}
});
test('random selection respects grade pool and avoids immediate repeat',()=>{
 for(const g of GRADES){const pool=data.passages.filter(p=>p.grade===g);const first=nextRandom(pool,null,()=>0);const second=nextRandom(pool,first.id,()=>0);assert.equal(first.grade,g);assert.equal(second.grade,g);assert.notEqual(first.id,second.id);}
 assert.equal(nextRandom([],null),null);assert.throws(()=>judge(data.passages[0].questions[0],0));
});
test('AI feedback rejects incomplete or inconsistent scores',()=>{
 const good={verdict:'good',scores:{main_idea:3,key_points:2,accuracy:3,concision:2},total:10,feedback:'feedback',good_points:['good'],improvements:[],language_notes:[],example:'summary'};
 assert.ok(validFeedback(good));assert.ok(!validFeedback({...good,total:12}));assert.ok(!validFeedback({...good,example:''}));assert.ok(!validFeedback({...good,scores:{}}));
});
