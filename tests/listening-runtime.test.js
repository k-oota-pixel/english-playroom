import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateQuestions} from '../listening-training/loader.js';
const questions=JSON.parse(readFileSync(new URL('../listening-training/questions.json',import.meta.url)));
class Element {
 constructor(){this.children=[];this.listeners={};this.style={};this.dataset={};this.hidden=true;this.classes=new Set();this.classList={add:(...a)=>a.forEach(x=>this.classes.add(x)),remove:(...a)=>a.forEach(x=>this.classes.delete(x))};this.readyState=1;this.src='';this.paused=true;}
 addEventListener(k,f){this.listeners[k]=f} removeEventListener(k){delete this.listeners[k]}
 append(...nodes){this.children.push(...nodes)} replaceChildren(...nodes){this.children=nodes}
 setAttribute(k,v){this[k]=v} querySelectorAll(selector){return this.children.filter(x=>x.className?.split(' ').includes(selector.slice(1)))}
 pause(){this.paused=true} async play(){this.paused=false} load(){}
}
async function page(blocked=false){
 const html=readFileSync(new URL('../listening-training/index.html',import.meta.url),'utf8');
 const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'');
 const elements=new Map(),storage=new Map();const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 const context=vm.createContext({document:{querySelector:get,querySelectorAll:()=>[],createElement:()=>new Element(),createTextNode:text=>({textContent:text})},
  fetch:async()=>({ok:true,json:async()=>structuredClone(questions)}),validateQuestions,console,
  localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v)}},
  IMG_2020_2:'',IMG_2020_3:'',IMG_2021_1:'',IMG_2021_2:'',IMG_2021_3:''});
 const api=await vm.runInContext(`(async()=>{${script};return {state,selectLevel,nextQuestion,renderQuestion,answerPractice,checkDictation,makeMask,playClip,stopAudio}})()`,context);
 return {api,get};
}
test('each level and both modes complete a cycle without duplicates, including blocked storage',async()=>{
 for(const blocked of [false,true]){
  const {api,get}=await page(blocked);
  assert.equal(get('#levelScreen').hidden,false);
  for(const level of ['3','pre2','2','pre1'])for(const mode of ['practice','dictation']){
   api.selectLevel(level);Object.assign(api.state,{mode,diff:'normal'});const seen=new Set();
   const pool=questions.filter(q=>q.level===level);
   for(let i=0;i<pool.length;i++){api.nextQuestion();assert.ok(!seen.has(api.state.q.id));seen.add(api.state.q.id);}
   assert.equal(seen.size,pool.length);
   const last=api.state.q.id;api.nextQuestion();assert.notEqual(api.state.q.id,last);
  }
 }
});
test('all questions render and score; dictation uses dialogue only at all three difficulties',async()=>{
 const {api,get}=await page();
 for(const q of questions){
  Object.assign(api.state,{level:q.level,mode:'practice',q,answered:false});api.renderQuestion(0);
  const choices=get('#practiceHost').children[0];assert.equal(choices.children.length,q.choiceMode==='spoken'?3:4);
  api.answerPractice(q.answer,choices.children[q.answer-1],choices);
  assert.ok(choices.children[q.answer-1].classes.has('correct'));assert.match(get('#feedbackHost').innerHTML,/Correct!/);
  let previous=0;
  for(const diff of ['easy','normal','hard']){
   Object.assign(api.state,{mode:'dictation',diff,answered:false});api.renderQuestion(0);
   assert.ok(api.state.masked.length>=previous);previous=api.state.masked.length;
   for(const input of api.state.masked){assert.ok(q.dialogue.some(line=>line.includes(input.dataset.answer)));input.value=input.dataset.answer;}
   api.checkDictation();assert.match(get('#feedbackHost').innerHTML,/Perfect!/);
  }
 }
});
test('audio replay and ending restore the play control',async()=>{
 const {api,get}=await page();Object.assign(api.state,{q:questions[0]});await api.playClip();
 assert.equal(get('#player').paused,false);get('#player').listeners.ended();assert.equal(get('#player').paused,true);
 assert.equal(get('#listenBtn').textContent,'▶ もう一度聞く');
});
