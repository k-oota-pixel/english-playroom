import {TASK_SAMPLES} from './task-samples.js';
import {TASK_TRANSLATIONS} from './task-translations.js';
import {WORD_POOLS} from './words.js';
import {EIKEN2_WORDS} from './eiken2-words.js';
import {QUESTION_GROUPS} from '../potato-harvest/questions.js';
import {GRAMMAR_BANK} from '../pet-fishing/grammar-mode.js';
import {GRAMMAR_SECTIONS} from './grammar-sections.js';

export const STAGE_NAMES=['単語の森','ポテトマンの畑','文法の砦','タスク別英会話','文法別の試練'];
export const PHASE_NAMES=[
 ['中学1年','中学2年','中学3年','高校1年','高校2年'],
 ['be動詞','一般動詞','助動詞','混合文法','総合問題'],
 ['be動詞','一般動詞','完了形・不定詞','分詞・関係詞','総合文法'],
 ['会話 1','会話 2','会話 3','会話 4','会話 5'],
 ['文法別 1','文法別 2','文法別 3','文法別 4','文法別 5']
];
export const STAGE_COUNT=5, PHASES_PER_STAGE=5, QUESTIONS_PER_PHASE=5;
export const TOTAL_QUESTIONS=STAGE_COUNT*PHASES_PER_STAGE*QUESTIONS_PER_PHASE;
export function enemySpawnInterval(stageIndex,mode='normal'){
 const intervals=mode==='hard'?[3,5,7,9,11]:[1.65,3,4,5,7];
 return intervals[stageIndex]??intervals[intervals.length-1];
}
const GRAMMAR_UNITS=[['be'],['general','mixed'],['perfect','infinitive'],['participle','relative'],['question','svoo','svoc','indirect','conjunction']];
const VOCAB_KEYS=['junior1','junior2','junior3','high1','high2'];
function shuffle(list,random=Math.random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function normalizedTyping(input){return String(input||'').normalize('NFKC').replace(/[\u2018\u2019\u02bc]/g,"'").toLowerCase().replace(/[.,!?;:。！？]/g,'').replace(/\s+/g,' ').trim();}
export function normalizedDefenseTyping(input,stageIndex){const value=normalizedTyping(input);return stageIndex>=1&&stageIndex<STAGE_COUNT?value.replace(/\s/g,''):value;}
export function revealedWord(word,elapsedMs){const answer=String(word||'');return elapsedMs<2000?'':elapsedMs<4000?answer.slice(0,1):answer;}
export function characterCount(sentence){return [...String(sentence||'')].length;}
export function hasApostrophe(sentence){return /['\u2018\u2019\u02bc\uff07\u2032]/u.test(String(sentence||''));}
function unique(pool,limit){const seen=new Set();return pool.filter(q=>{const id=q.id||q.answer;if(seen.has(id))return false;seen.add(id);return true;}).slice(0,limit);}
function complete(id,topic,answer,ja){const en=String(answer||'').trim(),translation=String(ja||'').trim();if(!en||!translation||hasApostrophe(en)||!normalizedTyping(en))return null;return {id,topic,answer:en,template:en,hint:en,ja:translation};}
export function potatoGap(q,id){
 const filled=String(q?.answer||'').match(/\(\s*([^()]*?\S)\s*\)/);if(!filled)return null;
 const word=filled[1].trim();if(!/^[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*$/.test(word))return null;
 const en=String(q.answer).replace(filled[0],word).replace(/\s+([.,!?])/g,'$1').replace(/\.\.+$/g,'.').replace(/\s+/g,' ').trim();
 if(en.includes('_____'))return null;
 return complete(id,'英文タイピング',en,q.japanese);
}
export function grammarGap(row){
 if(!Array.isArray(row)||!String(row[2]).includes('____'))return null;
 const [id,unit,text,answer,ja]=row;
 if(!normalizedTyping(answer)||!/^[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*$/.test(answer))return null;
 const en=text.replace(/____+/g,answer).replace(/\s+([.,!?])/g,'$1').trim();
 if(en.includes('_____'))return null;
 const translation=String(ja||'').replace(/\[×([^\]]+)\]/g,'').trim();
 return complete('grammar-'+id,unit,en,translation);
}
const POTATO_POOL=QUESTION_GROUPS.flatMap(group=>(group.questions||[]).map((q,i)=>potatoGap(q,group.id+'-'+i)).filter(Boolean).map(q=>({...q,group:group.id})));
export const POTATO_MEAN_CHARACTER_COUNT=POTATO_POOL.reduce((sum,q)=>sum+characterCount(q.answer),0)/POTATO_POOL.length;
const POTATO_SHORT_POOL=POTATO_POOL.filter(q=>characterCount(q.answer)<POTATO_MEAN_CHARACTER_COUNT);
export const GRAMMAR_SECTION_COUNT=GRAMMAR_SECTIONS.length;
const GRAMMAR_SECTION_POOL=GRAMMAR_SECTIONS.map((section,i)=>({section:section.number??i+1,title:section.word,questions:(section.questions||[])
 .map((q,j)=>complete('section-'+(section.number??i+1)+'-'+j,section.word,q.en,q.ja)).filter(Boolean)}));
export function scrambledTokens(sentence,random=Math.random){
 const words=String(sentence||'').replace(/[.,!?;:。！？]/g,'').split(/\s+/).filter(Boolean);
 if(words.length<2)return words;
 let shuffled=shuffle(words,random);
 if(shuffled.every((w,i)=>w===words[i]))shuffled=[...words.slice(1),words[0]];
 return shuffled;
}
function wave(pool,phase,random,seen){
 const list=shuffle(pool,random).filter(q=>!seen.has(q.id)),selected=unique(list,QUESTIONS_PER_PHASE);
 for(const q of selected)seen.add(q.id);
 return selected;
}
export function createCampaign(random=Math.random,mode='normal'){
 const hard=mode==='hard';
 const words=hard
  ? Array.from({length:PHASES_PER_STAGE},(_,i)=>[]) // populate once from a shared grade-2 pool below
  : VOCAB_KEYS.map((level,i)=>unique(shuffle(WORD_POOLS[level].filter(w=>normalizedTyping(w.word)&&w.ja&&!hasApostrophe(w.word)),random)
    .map(w=>({id:w.id,topic:PHASE_NAMES[0][i],hint:w.ja,ja:w.ja,template:w.word,answer:w.word})),QUESTIONS_PER_PHASE));
 if(hard){
  const valid=shuffle(EIKEN2_WORDS.filter(w=>normalizedTyping(w.word)&&w.ja&&!hasApostrophe(w.word)),random);
  for(let phase=0;phase<PHASES_PER_STAGE;phase++){
   words[phase]=valid.slice(phase*QUESTIONS_PER_PHASE,(phase+1)*QUESTIONS_PER_PHASE)
    .map(w=>({id:w.id,topic:'英検2級',hint:w.ja,ja:w.ja,template:w.word,answer:w.word}));
  }
 }
 const usedPotato=new Set(),potato=[];
 for(let phase=0;phase<5;phase++){
  const group=phase===4?null:['be','general','modal','mixed'][phase];
  potato.push(wave(POTATO_SHORT_POOL.filter(q=>!group||q.group===group),phase,random,usedPotato));
 }
 const usedGrammar=new Set(),grammar=[];
 for(let phase=0;phase<5;phase++){
  const candidates=GRAMMAR_BANK.filter(row=>GRAMMAR_UNITS[phase].includes(row[1])).map(grammarGap).filter(Boolean);
  grammar.push(wave(candidates,phase,random,usedGrammar));
 }
 const convo=unique(shuffle(TASK_SAMPLES.map(q=>complete(q.id,q.title,q.answer,TASK_TRANSLATIONS[q.id]||q.mission)).filter(Boolean),random),25);
 const task=Array.from({length:5},(_,i)=>convo.slice(i*5,(i+1)*5));
 const usedSections=new Set(),sections=[];
 for(let phase=0;phase<5;phase++){
  const candidateSections=GRAMMAR_SECTION_POOL.filter((section,i)=>Math.floor(i*5/GRAMMAR_SECTION_POOL.length)===phase);
  const candidates=candidateSections.flatMap(x=>x.questions);
  sections.push(wave(candidates,phase,random,usedSections));
 }
 const campaign=[words,potato,grammar,task,sections];
 if(campaign.some(stage=>stage.length!==5||stage.some(phase=>phase.length!==5)))throw Error('問題データが不足しています。');
 return campaign;
}
