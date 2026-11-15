import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTarget1000Questions} from '../data/vocab/idiom-questions.js';

const json=JSON.parse(readFileSync(new URL('../data/vocab/target1000.json',import.meta.url),'utf8'));
const questions=buildTarget1000Questions(json.entries,{random:()=>0.42});

test('TARGET1000 keeps all original 1,000 numbered idioms',()=>{
  assert.equal(json.count,1000);
  assert.equal(json.entries.length,1000);
  assert.equal(new Set(json.entries.map(row=>row.id)).size,1000);
  assert.equal(json.entries[0].en,'a piece of ～');
  assert.equal(json.entries.at(-1).en,'to date');
  for(const [index,row] of json.entries.entries()){
    assert.equal(row.no,index+1);
    assert.equal(row.id,'t1000_'+String(index+1).padStart(4,'0'));
  }
});

test('all TARGET1000 entries produce four-choice completion questions',()=>{
  assert.equal(questions.length,1000);
  assert.equal(new Set(questions.map(row=>row.id)).size,1000);
  for(const row of questions){
    assert.ok(row.question.includes('(____)'));
    assert.equal(row.options.length,4);
    assert.equal(new Set(row.options).size,4);
    assert.equal(row.options[row.correctIndex],row.answer);
    assert.equal(row.choices[row.correctIndex].text,row.answer);
    assert.equal(row.answer_number,row.correctIndex+1);
    assert.ok(row.tip.includes(row.phrase));
  }
});
