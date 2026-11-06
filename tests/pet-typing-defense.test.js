import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign, normalizedTyping, normalizedDefenseTyping, revealedWord, enemySpawnInterval, characterCount, hasApostrophe, POTATO_MEAN_CHARACTER_COUNT, potatoGap, grammarGap, STAGE_NAMES, PHASE_NAMES} from '../pet-typing-defense/data.js';
import {TASK_SAMPLES} from '../pet-typing-defense/task-samples.js';
import {WORD_POOLS} from '../pet-typing-defense/words.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {GRAMMAR_BANK} from '../pet-fishing/grammar-mode.js';

test('Four stages, five phases each, five distinct questions per phase',()=>{
 for(let i=0;i<30;i++){
  const campaign=createCampaign();
  assert.equal(campaign.length,4);
  for(const stage of campaign){
   assert.equal(stage.length,5);
   for(const phase of stage)assert.equal(phase.length,5);
  }
  const all=campaign.flat(2);
  assert.equal(all.length,100);
  assert.equal(new Set(all.map(q=>q.id)).size,100);
  for(const q of all){
   assert.ok(q.hint && q.answer && q.template);
   assert.ok(normalizedTyping(q.answer).length);
  }
 }
});
test('Stage one draws five original words per grade level',()=>{
 const keys=['junior1','junior2','junior3','high1','high2'];
 const campaign=createCampaign();
 keys.forEach((key,phase)=>{
  const pool=new Set(WORD_POOLS[key].map(w=>w.id));
  assert.equal(campaign[0][phase].length,5);
  assert.ok(campaign[0][phase].every(q=>pool.has(q.id)));
 });
});
test('Task Quest stage uses original sample answers from 50 missions',()=>{
 assert.equal(TASK_SAMPLES.length,50);
 const all=new Map(TASK_SAMPLES.map(q=>[q.id,q.answer]));
 const questions=createCampaign()[3].flat();
 assert.equal(questions.length,25);
 for(const q of questions)assert.equal(q.answer,all.get(q.id));
});
test('Stage order is word, potato, grammar and task conversation',()=>{
 assert.deepEqual(STAGE_NAMES,['単語の森','ポテトマンの畑','文法の砦','タスク別英会話']);
 assert.deepEqual(PHASE_NAMES[1],['be動詞','一般動詞','助動詞','混合文法','総合問題']);
 assert.deepEqual(PHASE_NAMES[2],['be動詞','一般動詞','完了形・不定詞','分詞・関係詞','総合文法']);
 assert.deepEqual(PHASE_NAMES[3],['会話 1','会話 2','会話 3','会話 4','会話 5']);
});
test('Potato Man stage draws only sentences strictly shorter than its source average',()=>{
 const all=QUESTION_GROUPS.flatMap(group=>group.questions.map((q,i)=>potatoGap(q,group.id+'-'+i)).filter(Boolean));
 const apostropheFree=all.filter(q=>!hasApostrophe(q.answer));
 const mean=apostropheFree.reduce((sum,q)=>sum+characterCount(q.answer),0)/apostropheFree.length;
 assert.equal(POTATO_MEAN_CHARACTER_COUNT,mean);
 const eligible=apostropheFree.filter(q=>characterCount(q.answer)<mean);
 assert.ok(eligible.length>=25);
 const groups=['be','general','modal','mixed'];
 for(let i=0;i<4;i++){
  const eligibleGroup=QUESTION_GROUPS.find(g=>g.id===groups[i]);
  assert.ok(eligibleGroup.questions.filter((q,j)=>characterCount(potatoGap(q,groups[i]+'-'+j)?.answer||'')<mean&&potatoGap(q,groups[i]+'-'+j)&&!hasApostrophe(potatoGap(q,groups[i]+'-'+j).answer)).length>=5);
 }
 for(let i=0;i<100;i++){
  const stage=createCampaign()[1];
  for(const q of stage.flat())assert.ok(characterCount(q.answer)<mean,'Long potato prompt: '+q.answer);
 }
});

test('Stages two through four display full English text for typing',()=>{
 for(let i=0;i<30;i++){
  const campaign=createCampaign();
  for(const q of campaign.slice(1).flat(2)){
   assert.equal(q.template,q.answer,'The visible sentence must match the typing target');
   assert.equal(q.hint,q.answer,'The English prompt must be the answer, not Japanese');
   assert.match(q.answer,/[A-Za-z]/);
   assert.doesNotMatch(q.answer,/____|\(\s*\)/);
  }
 }
});
test('Potato and PET FISHING sources yield completed English sentences rather than missing words',()=>{
 const campaign=createCampaign();
 const p=campaign[1].flat(),g=campaign[2].flat();
 for(const q of [...p,...g]){
  assert.ok(q.answer.includes(' '));
  assert.doesNotMatch(q.answer,/____/);
 }
 for(const q of p)assert.ok(QUESTION_GROUPS.some(group=>group.questions.some((raw,i)=>potatoGap(raw,group.id+'-'+i)?.id===q.id)));
 for(const q of g)assert.ok(GRAMMAR_BANK.some(row=>grammarGap(row)?.id===q.id));
});
test('Words begin with Japanese meaning, then reveal an initial at 2 seconds and the full spelling at 4 seconds',()=>{
 const campaign=createCampaign();
 const all=campaign[0].flat();
 for(const q of all){
  assert.ok(q.hint&&q.hint!==q.answer,'The initially visible hint must be Japanese');
  assert.equal(q.template,q.answer);
  assert.equal(revealedWord(q.answer,0),'');
  assert.equal(revealedWord(q.answer,1999),'');
  assert.equal(revealedWord(q.answer,2000),q.answer.slice(0,1));
  assert.equal(revealedWord(q.answer,3999),q.answer.slice(0,1));
  assert.equal(revealedWord(q.answer,4000),q.answer);
 }
});
test('All three sentence stages ignore typed spaces but reject wrong letters',()=>{
 const target='I have been to Hawaii.';
 for(const stage of [1,2,3]){
  assert.equal(normalizedDefenseTyping(target,stage),normalizedDefenseTyping('IhavebeentoHawaii',stage));
  assert.equal(normalizedDefenseTyping(target,stage),normalizedDefenseTyping('I  have been   toHawaii',stage));
  assert.notEqual(normalizedDefenseTyping(target,stage),normalizedDefenseTyping('IhasbeentoHawaii',stage));
 }
 assert.notEqual(normalizedDefenseTyping(target,0),normalizedDefenseTyping('IhavebeentoHawaii',0));
 assert.equal(normalizedDefenseTyping("I  have been",3),'ihavebeen');
});

test('Enemy spawns are 1.65, 3, 4 and 5 seconds apart by stage',()=>{
 const intervals=[1.65,3,4,5];
 for(let stage=0;stage<4;stage++){
  assert.equal(enemySpawnInterval(stage),intervals[stage]);
  const times=Array.from({length:5},(_,i)=>i*enemySpawnInterval(stage));
  for(let i=0;i<5;i++)assert.ok(Math.abs(times[i]-i*intervals[stage])<1e-9);
 }
});
test('Apostrophe questions are never present in any stage or campaign',()=>{
 for(const sample of ["I'd like a ticket.","don't","it’s","mother’s","＇quote","'quote","ʼquote"]){
  assert.ok(hasApostrophe(sample),'must recognize '+sample);
 }
 assert.equal(hasApostrophe('I would like a ticket.'),false);
 const allSources=[
  ...TASK_SAMPLES.map(q=>q.answer),
  ...GRAMMAR_BANK.map(row=>grammarGap(row)?.answer).filter(Boolean),
  ...QUESTION_GROUPS.flatMap(g=>g.questions.map((q,i)=>potatoGap(q,g.id+'-'+i)?.answer).filter(Boolean))
 ];
 assert.ok(allSources.some(hasApostrophe),'ensure source content actually contains contractions');
 for(let i=0;i<200;i++){
  for(const q of createCampaign().flat(2))assert.equal(hasApostrophe(q.answer),false,'apostrophe in '+q.answer);
 }
});

test('Case and punctuation forgiving typing; word form remains meaningful',()=>{
 assert.equal(normalizedTyping("  Could I have a menu, please?  "),"could i have a menu please");
 assert.equal(normalizedTyping("I’m happy."),"i'm happy");
 assert.notEqual(normalizedTyping('was'),normalizedTyping('were'));
 assert.equal(STAGE_NAMES.length,4);
});
