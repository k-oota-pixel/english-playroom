import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {buildQuestionBank,createSession,chooseQuestion,submitAnswer,isFinished,summarize,scoreFromAbility,
  levelLabel,MIN_QUESTIONS,MAX_QUESTIONS,SCALE_VERSION} from '../level-diagnostic/model.js';

const load=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const vocab=load('../pet-adventure/online-battle-vocab.json');
const advanced=load('../data/vocab/pre1-advanced.json');
const gradeNames=['4級','3級','準2級','2級','準1級'];
const makeGrammar=()=>gradeNames.flatMap((grade,index)=>Array.from({length:80},(_,j)=>({
  id:'grammar-'+index+'-'+j,grade,
  question:'Which form correctly completes the following English sentence, number '+j+'?',
  choices:[{number:1,text:'answer '+j+'A'},{number:2,text:'answer '+j+'B'},{number:3,text:'answer '+j+'C'},{number:4,text:'answer '+j+'D'}],
  answer_number:3
})));
const bank=buildQuestionBank(vocab,makeGrammar(),advanced);

test('bank reuses graded local vocabulary and upper-level dictionary',()=>{
  assert.ok(bank.vocab.length>1600);
  assert.equal(bank.vocabByGrade.get('準1級程度').length,399);
  assert.equal(bank.grammar.filter(x=>x.grade==='準1級程度').length,80);
  for(const grade of ['4級','3級','準2級','2級','準1級程度']){
    assert.ok(bank.vocabByGrade.get(grade).length>=30);
    const word=bank.vocabByGrade.get(grade)[0];
    assert.ok(word.en&&word.ja);
  }
});
test('all generated questions have four distinct options and one correct answer',()=>{
  let seed=42;
  const rng=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const session=createSession();
  while(!isFinished(session)){
    const q=chooseQuestion(session,bank,rng);
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options).size,4);
    assert.ok(q.correctIndex>=0&&q.correctIndex<=3);
    submitAnswer(session,q,q.correctIndex);
    assert.ok(session.answers.length<=MAX_QUESTIONS);
  }
  assert.ok(session.answers.length>=MIN_QUESTIONS&&session.answers.length<=MAX_QUESTIONS);
  assert.equal(new Set(session.answers.map(a=>a.id)).size,session.answers.length);
  assert.ok(session.answers.filter(a=>a.kind==='vocab').length>=8);
  assert.ok(session.answers.filter(a=>a.kind==='grammar').length>=8);
});
test('right and wrong answers drive adaptive posterior in different directions',()=>{
  const allRight=createSession(),allWrong=createSession(),seed=()=>.11;
  for(let i=0;i<10;i++){
    const q1=chooseQuestion(allRight,bank,seed),q2=chooseQuestion(allWrong,bank,seed);
    submitAnswer(allRight,q1,q1.correctIndex);
    submitAnswer(allWrong,q2,(q2.correctIndex+1)%4);
  }
  const a=summarize(allRight),b=summarize(allWrong);
  assert.ok(a.score>b.score);
  assert.ok(a.vocabCorrect>b.vocabCorrect);
  assert.ok(a.grammarCorrect>b.grammarCorrect);
});
test('previously seen IDs avoided when other nearby questions remain',()=>{
  const first=bank.vocabByGrade.get('4級')[0];
  const session=createSession([first.id]);
  const q=chooseQuestion(session,bank,()=>0);
  assert.notEqual(q.id,first.id);
});
test('score never exceeds 1000 and provisional scale label is stable',()=>{
  assert.equal(scoreFromAbility(15),1000);
  assert.equal(scoreFromAbility(12.1),1000);
  assert.equal(scoreFromAbility(0),0);
  assert.equal(SCALE_VERSION,'pilot-2-grade2');
  assert.equal(levelLabel(2),'4級標準');
  assert.equal(levelLabel(14),'準1級程度');
});
test('diagnostic is linked from the shell and keeps actual data separate from Firestore',()=>{
  const shell=fs.readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../level-diagnostic/index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../level-diagnostic/app.js',import.meta.url),'utf8');
  assert.match(shell,/data-adaptive-diagnostic-card/);
  assert.match(shell,/level-diagnostic\//);
  assert.match(html,/もんすた実力診断/);
  assert.match(app,/assessmentHistoryPreview/);
  assert.match(app,/writeBatch\(db\)/);
  assert.match(app,/https:\/\/k-oota-pixel\.github\.io\/eiken-retry\/assets\/question-data\.js/);
});
