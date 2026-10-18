import test from 'node:test';
import assert from 'node:assert/strict';
import {judge,normalize,cleanEntries,Round,LIMIT_MS,WARNING_MS} from '../word-breaker-engine.js';
import {DEMO} from '../word-breaker-data.js';
const important=DEMO.find(e=>e.word==='important'),light=DEMO.find(e=>e.word==='light');
test('Japanese normalization and grammatical variants, with semantic boundaries',()=>{
  for(const answer of ['重要な','大事','だいじ','とても大切です','重要なこと','　大切、です！'])assert.ok(judge(important,answer),answer);
  for(const answer of ['必要','重要ではない','大事じゃない','不重要','大事ではありません','大切さはない','観光',''])assert.equal(judge(important,answer),false,answer);
  for(const answer of ['光','ひかり','明かり','軽い','軽く','かるく'])assert.ok(judge(light,answer),answer);
  for(const answer of ['観光','日光浴','重い','軽くない','光らない'])assert.equal(judge(light,answer),false,answer);
  assert.equal(normalize(' アカリ！ '),'あかり');
});
test('cleanup deduplicates within course and excludes unknown nat',()=>{
  const result=cleanEntries(['human ～','human','usual ～','nat','elderly （失礼な場合olderの形容詞を使う）'].map(word=>({word,answers:['訳']})));
  assert.deepEqual(result.map(e=>e.word),['human','usual','elderly']);
});
test('wrong answers are retryable, deadlines are strict and only one life is lost',()=>{
  const round=new Round([important]);round.next(100);
  assert.equal(round.resolve('必要',200).type,'wrong');assert.equal(round.life,2);
  assert.equal(round.resolve('だいじ',17099).type,'correct');assert.equal(round.score,1);
  assert.equal(round.resolve('重要',17100).type,'ignored');
  round.next(20000);assert.equal(round.resolve('重要',20000+LIMIT_MS).type,'timeout');
  assert.equal(round.life,1);assert.equal(round.combo,0);assert.equal(round.timeout().type,'ignored');
  round.next(40000);assert.equal(round.timeout().type,'over');assert.equal(round.life,0);
  assert.equal(LIMIT_MS-WARNING_MS,5000);
});
test('endless bag and reward thresholds include a single score-ten reward',()=>{
  const round=new Round([important]);
  const correct=()=>{round.next(0);return round.resolve('大切',1);};
  for(let i=1;i<=80;i++){const r=correct();assert.equal(r.reward,i===10||i%20===0?1:0);}
  assert.equal(round.rewards,5);assert.equal(round.bestCombo,80);
  round.next(0);round.timeout();assert.equal(round.combo,0);
  for(let i=0;i<20;i++)correct();assert.equal(round.rewards,6);assert.equal(round.score,100);assert.equal(round.bestCombo,80);
});
test('shuffle cycles continue without adjacent duplicate at cycle boundaries',()=>{
  const round=new Round(DEMO,()=>0.2);let previous;
  for(let i=0;i<DEMO.length*3;i++){round.next(i);assert.notEqual(round.current,previous);previous=round.current;round.active=false;}
});
