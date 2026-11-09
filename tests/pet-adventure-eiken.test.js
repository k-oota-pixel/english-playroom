import test from 'node:test';
import assert from 'node:assert/strict';
import {EIKEN_GRADES,buildEikenQuestionBank,createEikenQuestionPicker} from '../pet-adventure/eiken-question-bank.js';

const makeQuestion=(grade,index)=>({
  id:`${grade}-${index}`,grade,question:`Question ${index} (____).`,
  answer_number:1,
  choices:[1,2,3,4].map(number=>({number,text:`Option ${number}`}))
});
const fullBank=(count=20)=>EIKEN_GRADES.flatMap(grade=>Array.from({length:count},(_,index)=>makeQuestion(grade,index)));

test('dungeon validates all five grades, not just overall question count',()=>{
  const bank=buildEikenQuestionBank(fullBank());
  assert.equal(EIKEN_GRADES.length,5);
  for(const grade of EIKEN_GRADES)assert.equal(bank[grade].length,20);
  assert.throws(()=>buildEikenQuestionBank(fullBank().filter(q=>q.grade!=='4級')),/4級/);
});

test('invalid or duplicate questions are excluded from the available pool',()=>{
  const rows=fullBank();
  rows.push({...rows[0]});
  rows.push({...makeQuestion('4級',99),choices:[]});
  const bank=buildEikenQuestionBank(rows);
  assert.equal(bank['4級'].length,20);
});

test('a shuffled deck never repeats within a grade before exhaustion',()=>{
  const bank=buildEikenQuestionBank(fullBank());
  const pick=createEikenQuestionPicker(bank,()=>0.37);
  for(const grade of EIKEN_GRADES){
    const drawn=Array.from({length:20},()=>pick(grade).id);
    assert.equal(new Set(drawn).size,20,grade);
    assert.notEqual(pick(grade).id,drawn[drawn.length-1],`no boundary repeat for ${grade}`);
  }
});

test('switching Eiken grades does not reset their respective decks',()=>{
  const bank=buildEikenQuestionBank(fullBank());
  const pick=createEikenQuestionPicker(bank,()=>0.5);
  const first=pick('4級').id;
  for(let i=0;i<12;i++)pick('準1級');
  const second=pick('4級').id;
  assert.notEqual(first,second);
});
