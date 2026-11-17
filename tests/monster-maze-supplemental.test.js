import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {courses,correctOrdering,orderTokens,prepareQuestions,question} from '../monster-maze/model.js';

const supplemental=JSON.parse(readFileSync(new URL('../monster-maze/supplemental-question-bank.json',import.meta.url),'utf8'));
const expected=['4','3','pre2','2','pre1'];
const allQuestions=expected.flatMap(grade=>[
  ...(supplemental.grades[grade]?.ordering||[]),...(supplemental.grades[grade]?.potato||[])
]);

test('grade-specific supplementary pools have unique IDs and usable answers',()=>{
  assert.equal(supplemental.schemaVersion,1);
  assert.deepEqual(Object.keys(supplemental.grades).sort(),expected.sort());
  assert.equal(new Set(allQuestions.map(row=>row.id)).size,allQuestions.length);
  for(const grade of expected){
    const pool=supplemental.grades[grade];
    assert.ok(Array.isArray(pool.ordering));
    assert.ok(Array.isArray(pool.potato));
    for(const row of pool.ordering){
      assert.ok(row.prompt&&row.answer);
      assert.ok(['基礎','基本文法','文法別'].includes(row.source));
      assert.ok(orderTokens(row.answer).length>=3);
      assert.ok(orderTokens(row.answer).length<=22);
      assert.ok(correctOrdering({...row,type:'ordering'},orderTokens(row.answer).join(' ')));
    }
    for(const row of pool.potato){
      assert.ok(row.prompt&&row.answer);
      assert.equal(row.options.length,4);
      assert.equal(new Set(row.options).size,4);
      assert.ok(row.options.includes(row.answer));
    }
  }
  assert.equal(supplemental.grades.pre1.ordering.length,0);
  assert.equal(supplemental.grades.pre1.potato.length,0);
});

test('all three word-order variants are used, without easier units leaking into 2級',()=>{
  const sources=new Set(expected.flatMap(grade=>supplemental.grades[grade].ordering.map(row=>row.source)));
  assert.deepEqual([...sources].sort(),['基礎','基本文法','文法別'].sort());
  assert.ok(supplemental.grades['4'].potato.length>0);
  assert.ok(supplemental.grades['3'].potato.length>0);
  assert.ok(supplemental.grades['2'].ordering.every(row=>row.source==='文法別'));
});

test('ordering checks word sequence without punctuation/capitalization hints',()=>{
  const quiz={type:'ordering',answer:'I like my English class.',acceptedAnswers:[]};
  assert.equal(correctOrdering(quiz,'i like my english class'),true);
  assert.equal(correctOrdering(quiz,'my i like english class'),false);
  assert.equal(correctOrdering(quiz,''),false);
  assert.equal(correctOrdering({...quiz,type:'potato'},'i like my english class'),false);
});

test('supplementary pools join existing courses without changing base question bank',()=>{
  const words=Array.from({length:5},(_,i)=>({word:'word'+i,answers:['日本語'+i]}));
  const wordBank=Object.fromEntries(courses.map(c=>[c.grade,{words}]));
  const retryRows=courses.flatMap(c=>[1,2].map(i=>({
    id:c.grade+'-'+i,grade:c.name.slice(2),question:'Choose one',
    answer_number:1,choices:[1,2,3,4].map(n=>({number:n,text:'option'+n}))
  })));
  const pools=prepareQuestions(wordBank,retryRows,[],supplemental);
  for(const course of courses){
    const pool=pools[course.grade];
    assert.equal(pool.words,words);
    assert.equal(pool.grammar.length,2);
    assert.deepEqual(pool.ordering,supplemental.grades[course.grade].ordering);
    assert.deepEqual(pool.potato,supplemental.grades[course.grade].potato);
  }
});

test('battle question selection can draw both ordering and potato without mutating cached data',()=>{
  const pool={
    words:Array.from({length:5},(_,i)=>({word:'word'+i,answers:['日本語'+i]})),
    grammar:[{id:'grammar',prompt:'Q',answer:'A',options:['A','B','C','D']}],
    ordering:supplemental.grades['4'].ordering,
    potato:supplemental.grades['4'].potato,
    idioms:[]
  };
  const ordering=question(pool,null,()=>0.52);
  assert.equal(ordering.type,'ordering');
  assert.ok(ordering.tokens.length>=3);
  assert.ok(correctOrdering(ordering,ordering.tokens.join(' ')));
  const potato=question(pool,null,()=>0.99);
  assert.equal(potato.type,'potato');
  assert.equal(potato.options.length,4);
  assert.ok(potato.options.includes(potato.answer));
});
