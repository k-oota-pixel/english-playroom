import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  buildQuestionBank,createSession,chooseQuestion,submitAnswer,evaluateAttempt,modelAnswer,
  selectReviewQuestions,fourChoices,SCALE_VERSION
} from '../level-diagnostic/model.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {BASIC_GRAMMAR_STAGES} from '../level-diagnostic/basic-grammar-data.js';

const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const grades=['4級','3級','準2級','2級','準1級'];
const retry=grades.flatMap((grade,k)=>Array.from({length:25},(_,i)=>({
  id:'synthetic-'+k+'-'+i,grade,
  question:'He has ____ the project successfully.',
  choices:[{number:1,text:'did'},{number:2,text:'done'},{number:3,text:'doing'},{number:4,text:'do'}],
  answer_number:2
})));
const bank=buildQuestionBank(load('../pet-adventure/online-battle-vocab.json'),retry,
  load('../data/vocab/pre1-advanced.json'),{
    potatoGroups:QUESTION_GROUPS,basicGrammarStages:BASIC_GRAMMAR_STAGES
  });

test('unknown choice explicitly records a wrong answer without guessing',()=>{
  const q=fourChoices(bank.vocabByGrade.get('4級')[0],bank,()=>.13);
  const session=createSession();
  session.lastPrompt=q;
  const correct=submitAnswer(session,q,null);
  assert.equal(correct,false);
  assert.equal(session.answers.length,1);
  assert.equal(session.answers[0].correct,false);
  assert.equal(session.answers[0].unknown,true);
  assert.deepEqual(session.answers[0].selected,[]);
  assert.equal(session.answers[0].id,q.id);
  assert.equal(SCALE_VERSION,'pilot-2-grade2');
  assert.throws(()=>submitAnswer(session,q,null),/回答対象/);
});

test('all four vocabulary alternatives retain original English and Japanese translations',()=>{
  for(const grade of grades.slice(0,4).concat('準1級程度')){
    const entry=bank.vocabByGrade.get(grade)[0];
    for(const rng of [()=>.1,()=>.75]){
      const q=fourChoices(entry,bank,rng);
      assert.equal(q.options.length,4);
      assert.equal(q.optionPairs.length,4);
      assert.equal(new Set(q.options).size,4);
      assert.ok(q.optionPairs.every(pair=>pair.en&&pair.ja));
      for(let i=0;i<4;i++){
        assert.equal(q.options[i],q.direction==='英日'?q.optionPairs[i].ja:q.optionPairs[i].en);
      }
      const key=modelAnswer(q);
      assert.equal(key.correctAnswer,q.options[q.correctIndex]);
      assert.deepEqual(key.optionPairs,q.optionPairs);
      assert.equal(q.optionPairs[q.correctIndex].en,entry.en);
      assert.equal(q.optionPairs[q.correctIndex].ja,entry.ja);
    }
  }
});

test('grammar answer key shows completed English for Potato, Retry and word-order questions',()=>{
  const potato=bank.grammar.find(x=>x.id==='g:potato:be:0');
  const p=fourChoices(potato,bank,()=>.37);
  const answer=modelAnswer(p);
  assert.equal(answer.correctAnswer,'is');
  assert.equal(answer.completedSentence,'He is Chinese.');
  const retryQuestion=fourChoices(bank.grammar.find(x=>x.source==='retry'),bank,()=>.43);
  const retryAnswer=modelAnswer(retryQuestion);
  assert.equal(retryAnswer.correctAnswer,'done');
  assert.equal(retryAnswer.completedSentence,'He has done the project successfully.');
  const order=bank.grammar.find(x=>x.source==='order'&&x.id==='g:order:eigojun-be-001');
  const answerKey=modelAnswer({source:'order',acceptedAnswers:order.acceptedAnswers});
  assert.equal(answerKey.completedSentence,order.english);
});

test('unknown works for ordering, and reading/reviewing cannot change the assessment',()=>{
  const order=bank.grammar.find(x=>x.source==='order');
  const tokens=order.tokens.map((text,id)=>({text,id}));
  const question={id:order.id,kind:'grammar',source:'order',level:order.level,
    tokens,acceptedAnswers:order.acceptedAnswers,guessRate:.02};
  const session=createSession();
  session.lastPrompt=question;
  assert.equal(submitAnswer(session,question,null),false);
  const previousWeights=[...session.weights],previousAnswers=JSON.stringify(session.answers);
  const correct=evaluateAttempt(question,tokens.map(t=>t.id));
  assert.equal(correct,true);
  assert.deepEqual(session.weights,previousWeights);
  assert.equal(JSON.stringify(session.answers),previousAnswers);
});

test('post-test review selects at most two missed questions, both skills if possible',()=>{
  const data=[
    {id:'v1',kind:'vocab',correct:false},
    {id:'g1',kind:'grammar',correct:false},
    {id:'v2',kind:'vocab',correct:false},
    {id:'g2',kind:'grammar',correct:true}
  ];
  const map=new Map(data.map((x)=>[x.id,{id:x.id,kind:x.kind}]));
  assert.deepEqual(selectReviewQuestions(data,map,2).map(q=>q.id),['g1','v2']);
  assert.deepEqual(selectReviewQuestions([data[0]],map,2).map(q=>q.id),['v1']);
  assert.deepEqual(selectReviewQuestions(data.filter(x=>x.correct),map,2),[]);
  assert.ok(selectReviewQuestions(data,map,8).length<=2);
});

test('page offers unknown, model answer and next buttons; review does not add Firebase writes',()=>{
  const app=readFileSync(new URL('../level-diagnostic/app.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../level-diagnostic/index.html',import.meta.url),'utf8');
  assert.match(html,/id="unknownBtn"/);
  assert.match(html,/id="feedback"/);
  assert.match(html,/id="answerPairs"/);
  assert.match(html,/id="nextBtn"/);
  assert.match(app,/reviewMode\?evaluateAttempt\(item,value\):submitAnswer\(session,item,value\)/);
  assert.match(app,/reviewQueue=selectReviewQuestions\(session.answers,askedQuestions,2\)/);
  assert.match(app,/void saveResult\(\)/);
  assert.match(app,/session.finished=true/);
  assert.equal((app.match(/runTransaction\(db\)/g)||[]).length,1);
});

test('diagnostic word-order choices hide capitals and trailing punctuation without changing grading',()=>{
  const item=bank.grammar.find(q=>q.source==='order'&&/^[A-Z]/.test(q.tokens[0])&&/[.!?]$/.test(q.tokens.at(-1)));
  assert.ok(item,'a sentence with an initial capital and closing punctuation is available');
  const session=createSession();
  session.answers.push({id:'previous-vocab',kind:'vocab',correct:true});
  const q=chooseQuestion(session,{grammar:[item]},()=>.3);
  assert.equal(q.source,'order');
  assert.ok(q.tokens.every(t=>t.text===t.text.toLowerCase()));
  assert.ok(q.tokens.every(t=>!/[.!?]$/.test(t.text)||t.id!==item.tokens.length-1));
  assert.equal(evaluateAttempt(q,q.tokens.map(t=>t.id).sort((a,b)=>a-b)),true);
  assert.equal(modelAnswer(q).completedSentence,item.acceptedAnswers[0]);
});
