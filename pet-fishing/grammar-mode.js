import {G1} from './data/eigojun-grammar-1.js';
import {G2} from './data/eigojun-grammar-2.js';
import {G3} from './data/eigojun-grammar-3.js';
import {G4} from './data/eigojun-grammar-4.js';

export const GRAMMAR_BANK=[...G1,...G2,...G3,...G4];
export const GRAMMAR_LABELS={be:'be動詞',general:'一般動詞',mixed:'be一般混合',perfect:'完了形',infinitive:'不定詞',participle:'分詞',relative:'関係代名詞',question:'疑問詞',svoo:'第4文型',svoc:'第5文型',indirect:'間接疑問文',conjunction:'接続詞'};
export const GRAMMAR_DUMMIES=['apple','river','museum','market','weather','future','money','soccer','teacher','student','happy','sleepy','angry','careful','quiet','strong','quickly','yesterday','tomorrow','picture','window','family','school','lunch','music','homework','restaurant','doctor','chair','curtain','watch','letter','house','train','engine','birthday','present','story','laptop','green','English','Hawaii'];

const POOLS={
be:['am','is','are','was','were','am not','is not','are not','was not','were not','do','does'],
general:['do','does','did','do not','does not','did not','want','wants','eat','eats','wash','washes','teach','teaches','play','plays'],
mixed:['do','does','did','do not','does not','did not','is','are','was','were','is not','was not','play','plays','played','go','goes','went','like','likes'],
perfect:['have','has','had','have just','has just','have already','have not','has not','have never','have been','has been','have met','have lived','have been listening','has been studying','how long','how many'],
infinitive:['to be','to go','to do','to study','to pass','to hear','how to go','what to study','where to go','when to go','not to go','go','going','did not'],
participle:['exciting','excited','swimming','sitting','closing','broken','closed','was sitting','was broken','was closed','is broken','is swimming','is closing','swim','sit','close'],
relative:['who','whom','which','whose','what','where','when'],
question:['what','who','where','which','when','how','how many','how old','how long','do','does','are','is','did'],
svoo:['gave','give','sent','send','made','make','showed','show','bought','buy','told','tell','to','for','from','with','did','did not'],
svoc:['called','kept','made','named','repaired','painted','natural','difficult','calling','keeping','making','naming','repairing','painting','naturally','difficulty'],
indirect:['which','how far','when','why','whose','where','how','how many','how often','if','how old','what','who'],
conjunction:['because','though','but','so','when','and','if','before','after','or']
};
const SPECIAL={
'am':['is','are','was','do','does'],'am not':['is not','are not','was not','do not','am'],'is':['are','am','was','does','do'],'is not':['are not','was not','does not','is','do not'],'are':['is','am','were','do','does'],'are not':['is not','were not','do not','are','does not'],
'do':['does','did','is','are','do not'],'does':['do','did','is','does not','are'],'did':['do','does','was','did not','were'],'do not':['does not','did not','are not','do','does'],'does not':['do not','did not','is not','does','do'],'did not':['do not','does not','was not','did','does'],
'have just':['has just','have already','have not','have','had just'],'have already':['has already','have just','have not','have','had already'],'have not':['has not','had not','have','do not','have never'],'has not':['have not','had not','has','does not','has never'],'have never':['has never','have already','have not','never have','have'],'have been':['has been','had been','have','have gone','was'],'have met':['has met','met','have meet','have been','had met'],'have lived':['has lived','lived','have live','had lived','are living'],'have been listening':['has been listening','have listened','was listening','have been listened','listening'],'has been studying':['have been studying','has studied','was studying','has been studied','studying'],
'to be':['be','being','to do','to go','for be'],'to pass':['pass','passing','to passed','to go','for passing'],'to go':['go','going','to went','to do','for going'],'to do':['do','doing','to did','to be','for doing'],'to study':['study','studying','to studied','to do','for study'],'to hear':['hear','hearing','to heard','for hearing','to listen'],
'how to go':['how go','where to go','what to go','how going','to go'],'what to study':['what study','how to study','where to study','what studying','to study'],'where to go':['where go','how to go','when to go','what to go','to go'],'when to go':['when go','where to go','how to go','what to go','to go'],'not to go':['to not go','not go','do not go','to go','not going'],
'whom':['whose','which','what','where','when'],'who':['whom','whose','which','what','where'],'which':['who','whom','whose','what','where'],'whose':['who','whom','which','what','where'],
'to':['for','from','with','at','by'],'for':['to','from','with','at','by'],
'because':['though','but','so','when','and'],'though':['because','so','when','and','if'],'but':['because','so','when','and','if'],'so':['because','though','but','when','and'],'when':['because','though','but','so','and'],'and':['because','though','but','so','when']
};

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function matchCase(text,start){text=String(text||'');if(!text)return text;return start?text[0].toUpperCase()+text.slice(1):text[0].toLowerCase()+text.slice(1)}
function distractors(answer,unit,question){
  const start=question.startsWith('____'),key=String(answer).toLowerCase(),seen=new Set([key]),out=[];
  const add=value=>{value=matchCase(value,start);const k=value.toLowerCase();if(!value||seen.has(k))return;seen.add(k);out.push(value)};
  for(const x of shuffle([...(SPECIAL[key]||[])]))add(x);
  if(out.length<5)for(const x of shuffle([...(POOLS[unit]||[])])){add(x);if(out.length>=5)break}
  if(out.length<5)for(const x of shuffle([...GRAMMAR_DUMMIES])){add(x);if(out.length>=5)break}
  return out.slice(0,5);
}
export function pickGrammarQuestion(lastQuestionId=''){
  const notLast=GRAMMAR_BANK.filter(row=>'grammar-'+row[0]!==lastQuestionId),list=notLast.length?notLast:GRAMMAR_BANK,row=list[Math.floor(Math.random()*list.length)]||GRAMMAR_BANK[0];
  const [id,unit,text,answer,ja]=row,wrong=distractors(answer,unit,text),answers=shuffle([{number:0,text:answer,correct:true},...wrong.map((x,i)=>({number:i+1,text:x,correct:false}))]);
  return {id:'grammar-'+id,grade:'基礎英文法',mode:'grammar',unit,label:GRAMMAR_LABELS[unit]||'基礎英文法',text,ja,answers,correct:answers.find(a=>a.correct)};
}
export function grammarJapanese(value){
  return String(value||'').replace(/\[×([^\]]+)\]/g,(_,words)=>{const list=words.split('×').filter(Boolean);return list.length?`（${list.join(' / ')} は使わない）`:''}).replace(/\s+/g,' ').trim();
}
