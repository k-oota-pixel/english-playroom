import {TASK_SAMPLES} from './task-samples.js';
import {WORD_POOLS} from './words.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {GRAMMAR_BANK} from '../pet-fishing/grammar-mode.js';

export const STAGE_NAMES=['単語の森','タスク別英会話','ポテトマンの畑','文法の砦'];
export const PHASE_NAMES=[
 ['中学1年','中学2年','中学3年','高校1年','高校2年'],
 ['会話 1','会話 2','会話 3','会話 4','会話 5'],
 ['be動詞','一般動詞','助動詞','混合文法','総合問題'],
 ['be動詞','一般動詞','完了形・不定詞','分詞・関係詞','総合文法']
];
export const STAGE_COUNT=4, PHASES_PER_STAGE=5, QUESTIONS_PER_PHASE=5;
const GRAMMAR_UNITS=[['be'],['general','mixed'],['perfect','infinitive'],['participle','relative'],['question','svoo','svoc','indirect','conjunction']];
const VOCAB_KEYS=['junior1','junior2','junior3','high1','high2'];
function shuffle(list, random=Math.random){const arr=[...list];for(let i=arr.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr;}
export function normalizedTyping(input){
 return String(input||'').normalize('NFKC').replace(/[\u2018\u2019\u02bc]/g,"'").toLowerCase().replace(/[.,!?;:。！？]/g,'').replace(/\s+/g,' ').trim();
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
 const template=String(q.answer).replace(filled[0],'_____').replace(/\s+([.,!?])/g,'$1').replace(/\.\.$/,'.').trim();
 if(!template.includes('_____')||!q.japanese||!normalizedTyping(answer))return null;
 return {id,topic:'空欄を推測',hint:q.japanese,template,answer};
}
export function grammarGap(row){
 if(!Array.isArray(row)||!String(row[2]).includes('____'))return null;
 const [id,unit,text,answer,ja]=row;
 if(!normalizedTyping(answer)||!/^[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*$/.test(answer))return null;
 return {id:'grammar-'+id,topic:unit,hint:ja,template:text.replace(/____+/g,'_____'),answer};
}
export function createCampaign(random=Math.random){
 const stage1=VOCAB_KEYS.map((level,i)=>{
  const pool=WORD_POOLS[level].filter(w=>normalizedTyping(w.word)&&w.ja);
  return unique(shuffle(pool,random).map(w=>({id:w.id,topic:PHASE_NAMES[0][i],hint:w.ja,template:'スペルを入力',answer:w.word})),5);
 });
 const conversation=unique(shuffle(TASK_SAMPLES.filter(q=>q.answer&&q.mission),random)
  .map(q=>({id:q.id,topic:q.title,hint:q.mission,subhint:q.situation,template:'英文をすべて入力',answer:q.answer})),25);
 const stage2=Array.from({length:5},(_,i)=>conversation.slice(i*5,(i+1)*5));
 const potato=QUESTION_GROUPS.flatMap(group=>(group.questions||[]).map((q,i)=>({...q,group:group.id,key:group.id+'-'+i})));
 const usedPotato=new Set(), stage3=[];
 for(let phase=0;phase<5;phase++){
  const id=phase===4?null:['be','general','modal','mixed'][phase];
  const candidates=shuffle(potato.filter(q=>!id||q.group===id),random)
   .map(q=>potatoGap(q,q.key)).filter(Boolean).filter(q=>!usedPotato.has(q.id));
  const selected=unique(candidates,5);
  selected.forEach(q=>usedPotato.add(q.id));
  stage3.push(selected);
 }
 const usedGrammar=new Set(),stage4=[];
 for(let phase=0;phase<5;phase++){
  const candidates=shuffle(GRAMMAR_BANK.filter(row=>GRAMMAR_UNITS[phase].includes(row[1])),random)
   .map(grammarGap).filter(Boolean).filter(q=>!usedGrammar.has(q.id));
  const selected=unique(candidates,5);
  selected.forEach(q=>usedGrammar.add(q.id));
  stage4.push(selected);
 }
 const campaign=[stage1,stage2,stage3,stage4];
 if(campaign.some(stage=>stage.length!==5||stage.some(phase=>phase.length!==5)))throw Error('問題データが不足しています。');
 return campaign;
}
