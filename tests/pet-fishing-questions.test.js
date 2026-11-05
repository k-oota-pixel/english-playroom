import test from 'node:test';
import assert from 'node:assert/strict';
import {EIKEN_GRADES,EIKEN_QUESTIONS_URL,validateFishingQuestionBank,pickFishingEikenQuestion,loadFishingEikenBank} from '../pet-fishing/question-bank.js';

const makeBank=()=>EIKEN_GRADES.flatMap(grade=>Array.from({length:5},(_,i)=>({
 id:grade+'-'+i,grade,question:'We (____) every day. '+i,
 choices:[{number:1,text:'play'},{number:2,text:'plays'},{number:3,text:'played'},{number:4,text:'playing'}],
 answer_number:1
})));

test('Eiken bank requires many valid questions in each grade',()=>{
 const bank=makeBank();
 assert.equal(validateFishingQuestionBank(bank).length,25);
 assert.throws(()=>validateFishingQuestionBank([]),/不足/);
 assert.throws(()=>validateFishingQuestionBank(bank.slice(0,5)),/不足/);
 assert.throws(()=>validateFishingQuestionBank(bank.map(q=>({...q,answer_number:9}))),/不足/);
});

test('one question is not repeated immediately for the same grade',()=>{
 const bank=makeBank(),first=pickFishingEikenQuestion(bank,'準2級','',()=>0);
 const second=pickFishingEikenQuestion(bank,'準2級',first.id,()=>0);
 assert.notEqual(first.id,second.id);
 assert.equal(second.grade,'準2級');
 assert.throws(()=>pickFishingEikenQuestion([], '準2級'),/読み込まれていません/);
});

test('loader uses the separate Eiken Retry question-data.js script',async()=>{
 const globals={};
 let requested='',removed=false;
 const documentObject={
  createElement(tag){
   assert.equal(tag,'script');
   return {remove(){removed=true;}};
  },
  head:{append(script){
   requested=script.src;
   globals.RETRY_QUESTIONS=makeBank();
   script.onload();
  }}
 };
 const bank=await loadFishingEikenBank({documentObject,globalObject:globals});
 assert.equal(requested,EIKEN_QUESTIONS_URL);
 assert.equal(bank.length,25);
 assert.equal(removed,true);
});

test('loader reports failure instead of silently using fixed questions',async()=>{
 const globals={},documentObject={
  createElement:()=>({remove(){}}),
  head:{append(script){script.onerror();}}
 };
 await assert.rejects(loadFishingEikenBank({documentObject,globalObject:globals}),/読み込めません/);
});
