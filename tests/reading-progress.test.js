import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {GRADES,judge,validFeedback} from '../reading-training/model.js';
const source=readFileSync(new URL('../reading-training/app.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/gm,'').replace(/^const coinsReady=.*\r?\n/m,'const coinsReady=Promise.resolve();\n').replace(/\nload\(\);\s*$/,'');
const p=JSON.parse(readFileSync(new URL('../reading-training/passages.json',import.meta.url))).passages[0];
const good={verdict:'good',scores:{main_idea:3,key_points:2,accuracy:3,concision:2},total:10,feedback:'要点を捉えています。',example:'要約の例。',good_points:['主題が明確です。'],improvements:[],language_notes:[]};
function harness(response={ok:true,json:async()=>good}){
 const storage=new Map(),elements=new Map();
 function element(id){if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'本文の要点をまとめました。',style:{},focus(){},querySelectorAll(){return [];},querySelector(sel){return element(sel.slice(1));},addEventListener(type,fn){this[type]=fn;}});return elements.get(id);}
 const context=vm.createContext({apiHeaders:async()=>({}),GRADES,judge,validFeedback,passageFixture:p,window:{EnglishPlayroomCoins:{awardReading:()=>({awarded:true})}},document:{getElementById:element},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},AbortController,setTimeout,clearTimeout,fetch:async()=>response,matchMedia:()=>({matches:false}),console});
 vm.runInContext(source,context);vm.runInContext('passage=passageFixture;',context);return {context,storage,elements,element};
}
test('all questions visible before batch grading; incomplete attempts never complete',()=>{
 const h=harness();vm.runInContext('renderExercise()',h.context);const html=h.element('work').innerHTML;
 assert.equal((html.match(/class="exercise-question"/g)||[]).length,p.questions.length);assert.doesNotMatch(html,/正解：|PRACTICE COMPLETE/);
 vm.runInContext('answers=[1];',h.context);h.element('gradeExercise').click();assert.equal(h.storage.size,0);
 h.context.correctAnswers=p.questions.map(q=>q.answer);vm.runInContext('answers=correctAnswers;',h.context);h.element('gradeExercise').click();
 assert.match(h.element('work').innerHTML,/PRACTICE COMPLETE/);assert.equal((h.element('work').innerHTML.match(/正解：/g)||[]).length,p.questions.length);
 assert.equal(vm.runInContext("completed(passage,'exercise')",h.context),true);assert.equal(vm.runInContext("completed(passage,'summary')",h.context),false);
});
test('summary completion is saved only after validated feedback',async()=>{
 const success=harness();await vm.runInContext('submitSummary()',success.context);assert.equal(vm.runInContext("completed(passage,'summary')",success.context),true);assert.equal(vm.runInContext("completed(passage,'exercise')",success.context),false);
 for(const response of [{ok:false,json:async()=>({error:'混雑中'})},{ok:true,json:async()=>({verdict:'good'})}]){const h=harness(response);await vm.runInContext('submitSummary()',h.context);assert.equal(vm.runInContext("completed(passage,'summary')",h.context),false);assert.equal(h.element('summaryInput').value,'本文の要点をまとめました。');}
});
test('previous exercise records are recognized independently of summary and malformed records',()=>{
 const h=harness();h.storage.set('monstudy-reading-v1:completed:'+p.id,JSON.stringify({correct:0,total:p.questions.length,at:1}));assert.equal(vm.runInContext("completed(passage,'exercise')",h.context),true);
 h.storage.set('monstudy-reading-v1:summary-completed:'+p.id,'broken');assert.equal(vm.runInContext("completed(passage,'summary')",h.context),false);
});
