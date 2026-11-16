import test from 'node:test';
import assert from 'node:assert/strict';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {BASIC_GRAMMAR_STAGES} from '../level-diagnostic/basic-grammar-data.js';
import {
  SCALE_VERSION,MIN_QUESTIONS,MAX_QUESTIONS,GRADE2_MASTERY_THETA,
  buildQuestionBank,createSession,chooseQuestion,submitAnswer,isFinished,summarize,
  scoreFromAbility,fourChoices
} from '../level-diagnostic/model.js';
import {readFileSync} from 'node:fs';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const gradeNames=['4級','3級','準2級','2級','準1級'];
const retry=gradeNames.flatMap((grade,k)=>Array.from({length:60},(_,i)=>({
  id:'synthetic-'+k+'-'+i,grade,
  question:'Complete the correct grammar sentence for the proposed topic and relevant situation number '+i,
  choices:[{number:1,text:'will be'},{number:2,text:'have been'},{number:3,text:'had been'},{number:4,text:'should be'}],
  answer_number:3
})));
const bank=buildQuestionBank(load('../pet-adventure/online-battle-vocab.json'),retry,
  load('../data/vocab/pre1-advanced.json'),{
    potatoGroups:QUESTION_GROUPS,basicGrammarStages:BASIC_GRAMMAR_STAGES
  });

function seeded(seed=23){
  return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
}
function run(correctForLevel,seed=11){
  const rng=seeded(seed),session=createSession(),chosen=[];
  for(let i=0;i<20;i++){
    assert.equal(isFinished(session),false);
    const q=chooseQuestion(session,bank,rng);
    assert.ok(q,'question available');
    const correct=correctForLevel(q);
    const attempt=q.source==='order'
      ? (correct?q.tokens.map(t=>t.id).sort((a,b)=>a-b):q.tokens.map(t=>t.id).sort((a,b)=>b-a))
      : (correct?q.correctIndex:(q.correctIndex+1)%4);
    const graded=submitAnswer(session,q,attempt);
    assert.equal(graded,correct);
    chosen.push(q);
  }
  assert.equal(isFinished(session),true);
  assert.equal(chooseQuestion(session,bank,rng),null);
  return {result:summarize(session),chosen,session};
}
test('source repository contains all 204 basic-grammar ordering problems',()=>{
  assert.equal(BASIC_GRAMMAR_STAGES.length,12);
  assert.equal(BASIC_GRAMMAR_STAGES.reduce((s,x)=>s+x.questions.length,0),204);
  assert.ok(bank.sources.order>=180);
  assert.ok(bank.sources.potato>=150);
  assert.equal(bank.sources.retry,retry.length);
});
test('Potato questions are exact four-choice cloze with Japanese support',()=>{
  const pool=bank.grammar.filter(q=>q.source==='potato');
  for(const q of pool){
    const display=fourChoices(q,bank,seeded(q.id.length));
    assert.equal(display.options.length,4);
    assert.equal(new Set(display.options).size,4);
    assert.ok(display.prompt.includes('\n'));
    assert.ok(display.correctIndex>=0&&display.correctIndex<=3);
    assert.equal(display.options[display.correctIndex],q.choices.find(c=>c.number===q.answer_number).text);
  }
});
test('basic grammar ordering requires every token and accepts the source sentence',()=>{
  const q=bank.grammar.find(q=>q.source==='order'&&q.id==='g:order:eigojun-be-001');
  assert.ok(q);
  const probe=createSession();
  const generated=chooseQuestion(probe,{
    vocab:bank.vocab,grammar:[q],vocabByGrade:bank.vocabByGrade
  },seeded(7)); // first item is always vocabulary
  assert.equal(generated.kind,'vocab');
  const sentence=q.tokens.map((text,id)=>({id,text}));
  const order={id:q.id,kind:'grammar',source:'order',level:q.level,
    tokens:sentence.reverse(),acceptedAnswers:q.acceptedAnswers,guessRate:.02};
  probe.lastPrompt=order;
  assert.throws(()=>submitAnswer(probe,order,[0]),/すべての語句/);
  assert.equal(submitAnswer(probe,order,q.tokens.map((_,i)=>i)),true);
});
test('all runs finish at exactly 20 with 10 vocabulary and 10 grammar items',()=>{
  for(const seed of [1,4,13,31]){
    const {result,chosen}=run(q=>q.level<=6,seed);
    assert.equal(result.total,20);
    assert.equal(result.vocabTotal,10);
    assert.equal(result.grammarTotal,10);
    assert.equal(new Set(chosen.map(q=>q.id)).size,20);
    assert.ok(chosen.every((q,i)=>q.kind===(i%2===0?'vocab':'grammar')));
    assert.ok(chosen.every(q=>q.source==='order'||(q.options.length===4&&new Set(q.options).size===4)));
  }
});
test('grade 2 mastery anchors at 1000 even when higher-level questions are missed',()=>{
  const result=run(q=>q.level<=12).result;
  assert.equal(GRADE2_MASTERY_THETA,11.6);
  assert.equal(scoreFromAbility(11.6),1000);
  assert.equal(result.score,1000);
  assert.ok(result.grade2Evidence>=2);
  assert.equal(SCALE_VERSION,'pilot-2-grade2');
  assert.ok(result.vocabCorrect<=10&&result.grammarCorrect<=10);
});
test('a single latent ability places 4, 3, pre-2 and 2 in order',()=>{
  const levels=[3,6,9,12];
  const scores=levels.map(max=>run(q=>q.level<=max).result.score);
  for(let i=1;i<scores.length;i++)assert.ok(scores[i]>scores[i-1],scores.join(','));
  const wrong=run(()=>false).result.score;
  assert.ok(wrong<scores[0]);
});
test('history is versioned and shows only comparable scores on current trend',()=>{
  const app=readFileSync(new URL('../level-diagnostic/app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../level-diagnostic/index.html',import.meta.url),'utf8');
  assert.match(app,/assessmentScaleVersion:SCALE_VERSION/);
  assert.match(app,/r\?\.scaleVersion===SCALE_VERSION/);
  assert.match(app,/previousBest=summaryData.assessmentBest\?\.scaleVersion===SCALE_VERSION/);
  assert.match(app,/writeBatch\(db\)/);
  assert.match(html,/id="orderPanel"/);
  assert.match(html,/20問・単語10問/);
});
