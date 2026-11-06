import {TASK_SAMPLES} from './task-samples.js';
import {WORD_POOLS} from './words.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {GRAMMAR_BANK} from '../pet-fishing/grammar-mode.js';

export const STAGE_NAMES=['単語の森','ポテトマンの畑','文法の砦','タスク別英会話'];
export const PHASE_NAMES=[
 ['中学1年','中学2年','中学3年','高校1年','高校2年'],
 ['be動詞','一般動詞','助動詞','混合文法','総合問題'],
 ['be動詞','一般動詞','完了形・不定詞','分詞・関係詞','総合文法'],
 ['会話 1','会話 2','会話 3','会話 4','会話 5']
];
export const STAGE_COUNT=4, PHASES_PER_STAGE=5, QUESTIONS_PER_PHASE=5;
export function enemySpawnInterval(stageIndex){ return stageIndex===0?1.65:5; }
const GRAMMAR_UNITS=[['be'],['general','mixed'],['perfect','infinitive'],['participle','relative'],['question','svoo','svoc','indirect','conjunction']];
const VOCAB_KEYS=['junior1','junior2','junior3','high1','high2'];
function shuffle(list, random=Math.random){const arr=[...list];for(let i=arr.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr;}
export function normalizedTyping(input){
 return String(input||'').normalize('NFKC').replace(/[\u2018\u2019\u02bc]/g,"'").toLowerCase().replace(/[.,!?;:。！？]/g,'').replace(/\s+/g,' ').trim();
}
// Sentence stages 2–4 all accept continuous typing without spaces.
export function normalizedDefenseTyping(input,stageIndex){
 const value=normalizedTyping(input);
 return stageIndex>=1&&stageIndex<STAGE_COUNT?value.replace(/\s/g,''):value;
}
// A new word starts with its Japanese meaning, then reveals one letter and finally the full spelling.
export function revealedWord(word,elapsedMs){
 const answer=String(word||'');
 if(elapsedMs<2000)return '';
 if(elapsedMs<4000)return answer.slice(0,1);
 return answer;
}
export function wordCount(sentence){
 return String(sentence||'').trim().split(/\s+/).filter(Boolean).length;
}
function unique(pool,limit){
 const seen=new Set();
 return pool.filter(item=>{
  const key=item.id||item.template+'|'+item.answer;
  if(seen.has(key))return false;
  seen.add(key);
  return true;
 }).slice(0,limit);
}
export function potatoGap(q,id){
 const filled=String(q?.answer||'').match(/\(\s*([^()]*?\S)\s*\)/);
 if(!filled)return null;
 const answer=filled[1].trim();
 if(!/^[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*$/.test(answer))return null;
 const sentence=String(q.answer).replace(filled[0],answer).replace(/\s+([.,!?])/g,'$1').replace(/\.\.+$/g,'.').replace(/\s+/g,' ').trim();
 if(!sentence||sentence.includes('_____')||!normalizedTyping(sentence))return null;
 return {id,topic:'英文タイピング',hint:sentence,template:sentence,answer:sentence};
}
export function grammarGap(row){
 if(!Array.isArray(row)||!String(row[2]).includes('____'))return null;
 const [id,unit,text,answer,ja]=row;
 if(!normalizedTyping(answer)||!/^[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*$/.test(answer))return null;
 const sentence=text.replace(/____+/g,answer).replace(/\s+([.,!?])/g,'$1').trim();
 if(!sentence||sentence.includes('_____'))return null;
 return {id:'grammar-'+id,topic:unit,hint:sentence,template:sentence,answer:sentence};
}
// The threshold is calculated from every eligible, fully completed Potato Man sentence.
// Restricting each group after this calculation preserves all five grammar phases.
const POTATO_POOL=QUESTION_GROUPS.flatMap(group=>(group.questions||[])
 .map((q,i)=>potatoGap(q,group.id+'-'+i))
 .filter(Boolean)
 .map(q=>({...q,group:group.id})));
export const POTATO_MEAN_WORD_COUNT=POTATO_POOL.reduce((total,q)=>total+wordCount(q.answer),0)/POTATO_POOL.length;
const POTATO_SHORT_POOL=POTATO_POOL.filter(q=>wordCount(q.answer)<POTATO_MEAN_WORD_COUNT);

export function createCampaign(random=Math.random){
 const words=VOCAB_KEYS.map((level,i)=>{
  const pool=WORD_POOLS[level].filter(w=>normalizedTyping(w.word)&&w.ja);
  return unique(shuffle(pool,random).map(w=>({id:w.id,topic:PHASE_NAMES[0][i],hint:w.ja,template:w.word,answer:w.word})),5);
 });
 const usedPotato=new Set(),potato=[];
 for(let phase=0;phase<5;phase++){
  const group=phase===4?null:['be','general','modal','mixed'][phase];
  const candidates=shuffle(POTATO_SHORT_POOL.filter(q=>!group||q.group===group),random)
   .filter(q=>!usedPotato.has(q.id));
  const selected=unique(candidates,5);
  selected.forEach(q=>usedPotato.add(q.id));
  potato.push(selected);
 }
 const usedGrammar=new Set(),grammar=[];
 for(let phase=0;phase<5;phase++){
  const candidates=shuffle(GRAMMAR_BANK.filter(row=>GRAMMAR_UNITS[phase].includes(row[1])),random)
   .map(grammarGap).filter(Boolean).filter(q=>!usedGrammar.has(q.id));
  const selected=unique(candidates,5);
  selected.forEach(q=>usedGrammar.add(q.id));
  grammar.push(selected);
 }
 const conversation=unique(shuffle(TASK_SAMPLES.filter(q=>q.answer&&q.mission),random)
  .map(q=>({id:q.id,topic:q.title,hint:q.answer,template:q.answer,answer:q.answer})),25);
 const task=Array.from({length:5},(_,i)=>conversation.slice(i*5,(i+1)*5));
 const campaign=[words,potato,grammar,task];
 if(campaign.some(stage=>stage.length!==5||stage.some(phase=>phase.length!==5)))throw Error('問題データが不足しています。');
 return campaign;
}
