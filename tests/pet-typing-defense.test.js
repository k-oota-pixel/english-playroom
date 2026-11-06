import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createCampaign,normalizedTyping,normalizedDefenseTyping,revealedWord,enemySpawnInterval,
 characterCount,hasApostrophe,POTATO_MEAN_CHARACTER_COUNT,potatoGap,grammarGap,
 scrambledTokens,TOTAL_QUESTIONS,STAGE_COUNT,STAGE_NAMES,PHASE_NAMES,GRAMMAR_SECTION_COUNT
} from '../pet-typing-defense/data.js';
import {TASK_SAMPLES} from '../pet-typing-defense/task-samples.js';
import {TASK_TRANSLATIONS} from '../pet-typing-defense/task-translations.js';
import {WORD_POOLS} from '../pet-typing-defense/words.js';
import {EIKEN2_WORDS} from '../pet-typing-defense/eiken2-words.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {GRAMMAR_BANK} from '../pet-fishing/grammar-mode.js';
import {GRAMMAR_SECTIONS} from '../pet-typing-defense/grammar-sections.js';

test('Five stages and 125 valid translated questions per mode',()=>{
 assert.equal(STAGE_COUNT,5);assert.equal(TOTAL_QUESTIONS,125);assert.equal(PHASE_NAMES.length,5);
 assert.deepEqual(STAGE_NAMES,['単語の森','ポテトマンの畑','文法の砦','タスク別英会話','文法別の試練']);
 for(const mode of ['normal','hard'])for(let run=0;run<100;run++){
  const campaign=createCampaign(Math.random,mode);
  assert.equal(campaign.length,5);
  const all=campaign.flat(2);
  assert.equal(all.length,125);
  assert.equal(new Set(all.map(q=>q.id)).size,125);
  for(const stage of campaign){assert.equal(stage.length,5);for(const phase of stage)assert.equal(phase.length,5);}
  for(const q of all){
   assert.ok(q.answer&&q.ja&&q.template&&q.hint,JSON.stringify(q));
   assert.equal(q.template,q.answer);
   assert.ok(normalizedTyping(q.answer));
   assert.equal(hasApostrophe(q.answer),false,'apostrophe: '+q.answer);
  }
 }
});
test('Normal stage one uses five grade-level word pools',()=>{
 const keys=['junior1','junior2','junior3','high1','high2'],camp=createCampaign();
 keys.forEach((key,i)=>{
  const ids=new Set(WORD_POOLS[key].map(q=>q.id));
  assert.ok(camp[0][i].every(q=>ids.has(q.id)));
 });
});
test('Hard stage one draws 25 distinct Eiken grade 2 correct-answer words',()=>{
 assert.ok(EIKEN2_WORDS.length>=25);
 const bank=new Set(EIKEN2_WORDS.map(q=>q.id));
 for(let i=0;i<100;i++){
  const wordQuestions=createCampaign(Math.random,'hard')[0].flat();
  assert.equal(wordQuestions.length,25);
  assert.ok(wordQuestions.every(q=>bank.has(q.id)&&q.ja));
 }
});
test('Potato Man uses shorter-than-average-character and apostrophe-free sentences',()=>{
 const all=QUESTION_GROUPS.flatMap(group=>group.questions.map((q,i)=>potatoGap(q,group.id+'-'+i)).filter(Boolean));
 const eligibleSource=all.filter(q=>!hasApostrophe(q.answer));
 const mean=eligibleSource.reduce((sum,q)=>sum+characterCount(q.answer),0)/eligibleSource.length;
 assert.equal(POTATO_MEAN_CHARACTER_COUNT,mean);
 assert.ok(eligibleSource.filter(q=>characterCount(q.answer)<mean).length>=25);
 for(let i=0;i<100;i++)for(const q of createCampaign()[1].flat()){
  assert.ok(characterCount(q.answer)<mean);
  assert.equal(hasApostrophe(q.answer),false);
 }
});
test('Base grammar, Task Quest and grammar-specific source data are reused',()=>{
 assert.equal(GRAMMAR_SECTION_COUNT,72);
 assert.equal(GRAMMAR_SECTIONS.length,72);
 const grammar=new Set(GRAMMAR_BANK.map(row=>grammarGap(row)?.id));
 const task=new Map(TASK_SAMPLES.map(q=>[q.id,q.answer]));
 const sections=new Set(GRAMMAR_SECTIONS.flatMap(section=>section.questions.map((q,i)=>'section-'+section.number+'-'+i)));
 for(const [stage,source] of [[2,grammar],[4,sections]])for(const q of createCampaign()[stage].flat())assert.ok(source.has(q.id),q.id);
 for(const q of createCampaign()[3].flat()){
  assert.equal(q.answer,task.get(q.id));
  assert.equal(q.ja,TASK_TRANSLATIONS[q.id]);
 }
});
test('All sentence stages compare without spaces, including final grammar-specific stage',()=>{
 const sentence='I have been to Hawaii.';
 for(let stage=1;stage<=4;stage++){
  assert.equal(normalizedDefenseTyping(sentence,stage),normalizedDefenseTyping('IhavebeentoHawaii',stage));
  assert.notEqual(normalizedDefenseTyping(sentence,stage),normalizedDefenseTyping('IhasbeentoHawaii',stage));
 }
 assert.notEqual(normalizedDefenseTyping(sentence,0),normalizedDefenseTyping('IhavebeentoHawaii',0));
});
test('Normal shows a complete English answer while hard may scramble English tokens',()=>{
 assert.equal(revealedWord('apple',1999),'');
 assert.equal(revealedWord('apple',2000),'a');
 assert.equal(revealedWord('apple',3999),'a');
 assert.equal(revealedWord('apple',4000),'apple');
 const a='We should drink clean water every day.';
 const tokens=scrambledTokens(a,()=>0);
 assert.notDeepEqual(tokens,['We','should','drink','clean','water','every','day']);
 assert.deepEqual(tokens.slice().sort(),['We','should','drink','clean','water','every','day'].sort());
});
test('Normal mode keeps 1.65 / 3 / 4 / 5 / 7 second intervals',()=>{
 assert.deepEqual(Array.from({length:5},(_,i)=>enemySpawnInterval(i)),[1.65,3,4,5,7]);
 assert.deepEqual(Array.from({length:5},(_,i)=>enemySpawnInterval(i,'normal')),[1.65,3,4,5,7]);
});
test('Hard mode spawns enemies at 3 / 5 / 7 / 9 / 11 second intervals',()=>{
 const expected=[3,5,7,9,11];
 assert.deepEqual(Array.from({length:5},(_,i)=>enemySpawnInterval(i,'hard')),expected);
 for(let stage=0;stage<5;stage++){
  const times=Array.from({length:5},(_,i)=>i*enemySpawnInterval(stage,'hard'));
  assert.deepEqual(times,[0,expected[stage],2*expected[stage],3*expected[stage],4*expected[stage]]);
 }
});
test('Case and punctuation remain optional but letter sequence must match',()=>{
 assert.equal(normalizedTyping("  Could I have a menu, please?  "),"could i have a menu please");
 assert.equal(normalizedTyping("I’m happy."),"i'm happy");
 assert.notEqual(normalizedTyping('was'),normalizedTyping('were'));
});
