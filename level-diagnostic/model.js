// Adaptive vocabulary / Retry Notebook diagnostic. This is a provisional,
// uncalibrated 15-band score (NOT an official Eiken or validated CAT/IRT score).
export const SCALE_VERSION = 'pilot-1';
export const MIN_QUESTIONS = 16;
export const STANDARD_QUESTIONS = 20;
export const MAX_QUESTIONS = 24;
export const GRADES = Object.freeze([
  {name:'4級',key:'4',start:1},
  {name:'3級',key:'3',start:4},
  {name:'準2級',key:'pre2',start:7},
  {name:'2級',key:'2',start:10},
  {name:'準1級程度',key:'pre1',start:13}
]);
const POINTS = Array.from({length:61},(_,i)=>i/4);
const CLAMP = (n,a,b)=>Math.max(a,Math.min(b,n));
const normalize = text=>String(text||'').normalize('NFKC').trim().toLowerCase();
const rnd = rng=>CLAMP(Number(rng())||0,0,0.999999999);

function gradeSpec(name){
  return GRADES.find(g=>g.name===name||g.key===name||(name==='準1級'&&g.key==='pre1'));
}
function vocabBand(word,grade,no){
  if(grade.key==='pre1')return CLAMP(13+Math.floor((Number(no)-1501)/134),13,15);
  const letters=(String(word).match(/[A-Za-z]/g)||[]).length;
  const parts=String(word).trim().split(/\s+/).length;
  return grade.start+(parts>2||letters>=10?2:letters>=6||parts>1?1:0);
}
function grammarBand(question,grade){
  const text=String(question||'');
  const length=text.length;
  const complexity=/(although|unless|despite|however|neither|relative|hardly|until|whereas)/i.test(text)?1:0;
  return grade.start+(length>=125||length>=78&&complexity?2:length>=65||complexity?1:0);
}
function uniqueWords(records,grade){
  const items=[],seen=new Set();
  for(const [index,row] of (records||[]).entries()){
    const en=String(row?.word||'').trim();
    const ja=Array.isArray(row?.answers)?row.answers.map(x=>String(x||'').trim()).find(Boolean):'';
    if(!en||!ja||seen.has(normalize(en)))continue;
    seen.add(normalize(en));
    items.push({
      id:'v:'+grade.key+':'+index,
      kind:'vocab',grade:grade.name,level:vocabBand(en,grade,index),
      en,ja,alternateAnswers:row.answers||[]
    });
  }
  return items;
}
function cleanGrammar(rows){
  const list=[],seen=new Set();
  for(const row of rows||[]){
    const grade=gradeSpec(String(row?.grade||''));
    if(!grade||!row?.id||!String(row.question||'').trim()||!Array.isArray(row.choices)||row.choices.length!==4)continue;
    const choices=row.choices.map(c=>({number:Number(c?.number),text:String(c?.text||'').trim()}));
    const answer=Number(row.answer_number);
    if(choices.some(c=>!Number.isInteger(c.number)||!c.text)||new Set(choices.map(c=>normalize(c.text))).size!==4)continue;
    if(choices.filter(c=>c.number===answer).length!==1)continue;
    const id='g:'+String(row.id);
    if(seen.has(id))continue;seen.add(id);
    list.push({id,kind:'grammar',grade:grade.name,level:grammarBand(row.question,grade),
      question:String(row.question),choices,answer_number:answer});
  }
  return list;
}
export function buildQuestionBank(vocabulary,retryRows,advanced){
  const vocab=[];
  for(const grade of GRADES.slice(0,4)){
    vocab.push(...uniqueWords(vocabulary?.grades?.[grade.key]?.words,grade));
  }
  const pre1=gradeSpec('pre1');
  const seen=new Set();
  for(const row of advanced?.entries||[]){
    const en=String(row?.en||'').trim(),ja=String(row?.ja||'').trim(),no=Number(row?.no);
    if(!en||!ja||!Number.isInteger(no)||seen.has(normalize(en)))continue;
    seen.add(normalize(en));
    vocab.push({id:'v:pre1:'+no,kind:'vocab',grade:pre1.name,level:vocabBand(en,pre1,no),en,ja,alternateAnswers:[ja]});
  }
  const grammar=cleanGrammar(retryRows);
  const vocabByGrade=new Map();
  for(const grade of GRADES)vocabByGrade.set(grade.name,vocab.filter(q=>q.grade===grade.name));
  if(vocabByGrade.get('4級').length<60||vocabByGrade.get('3級').length<40||
     vocabByGrade.get('準2級').length<40||vocabByGrade.get('2級').length<40||
     vocabByGrade.get('準1級程度').length<30)throw Error('単語データの件数が不足しています。');
  for(const grade of GRADES){
    if(grammar.filter(q=>q.grade===grade.name).length<20)throw Error(grade.name+'の文法問題が不足しています。');
  }
  return {vocab,grammar,vocabByGrade};
}
function shuffle(items,rng){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(rnd(rng)*(i+1));[result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export function fourChoices(item,bank,rng=Math.random){
  if(item.kind==='grammar'){
    const candidates=shuffle(item.choices,rng);
    return {id:item.id,kind:'grammar',grade:item.grade,level:item.level,
      prompt:item.question,direction:'語彙・文法',options:candidates.map(c=>c.text),
      correctIndex:candidates.findIndex(c=>c.number===item.answer_number)};
  }
  const sameGrade=bank.vocabByGrade.get(item.grade)||[];
  const jaMatches=sameGrade.filter(q=>normalize(q.ja)===normalize(item.ja));
  const englishToJapanese=jaMatches.length>1||rnd(rng)<0.5;
  const key=englishToJapanese?'ja':'en';
  const correct=String(item[key]);
  const distractors=sameGrade.filter(row=>row.id!==item.id&&normalize(row.en)!==normalize(item.en)&&
    normalize(row.ja)!==normalize(item.ja)&&normalize(row[key])!==normalize(correct));
  const distinct=[],seen=new Set([normalize(correct)]);
  for(const row of shuffle(distractors,rng)){
    const value=String(row[key]);
    if(seen.has(normalize(value)))continue;
    seen.add(normalize(value));
    distinct.push(value);
    if(distinct.length===3)break;
  }
  if(distinct.length!==3)throw Error('選択肢が不足しています: '+item.grade);
  const options=shuffle([correct,...distinct],rng);
  return {id:item.id,kind:'vocab',grade:item.grade,level:item.level,
    direction:englishToJapanese?'英日':'日英',
    prompt:englishToJapanese?'「'+item.en+'」の意味は？':'「'+item.ja+'」に当たる英語は？',
    options,correctIndex:options.indexOf(correct)};
}
function probability(ability,difficulty){
  return .25+.72/(1+Math.exp(-(ability-difficulty)/1.2));
}
function initialWeights(){
  const weights=POINTS.map(theta=>Math.exp(-.5*Math.pow((theta-3.6)/3.8,2)));
  const sum=weights.reduce((a,b)=>a+b,0);
  return weights.map(w=>w/sum);
}
function moments(weights){
  const mean=weights.reduce((a,w,i)=>a+w*POINTS[i],0);
  const variance=weights.reduce((a,w,i)=>a+w*Math.pow(POINTS[i]-mean,2),0);
  return {mean,std:Math.sqrt(variance)};
}
export function createSession(recentIds=[]){
  return {weights:{vocab:initialWeights(),grammar:initialWeights()},answers:[],
    sessionIds:new Set(),recentIds:new Set((recentIds||[]).map(String)),
    lastPrompt:null};
}
export function domainEstimate(session,kind){return moments(session.weights[kind]);}
export function chooseQuestion(session,bank,rng=Math.random){
  if(session.answers.length>=MAX_QUESTIONS)return null;
  const kind=session.answers.length%2===0?'vocab':'grammar';
  const pool=bank[kind],target=session.answers.length<2?2:CLAMP(Math.round(domainEstimate(session,kind).mean),1,15);
  const unused=pool.filter(item=>!session.sessionIds.has(item.id));
  if(!unused.length)throw Error('出題可能な問題がありません。');
  // Favor candidates from nearby bands, excluding recently seen questions whenever possible.
  const nearby=unused.filter(item=>Math.abs(item.level-target)<=1);
  const candidates=nearby.length>=4?nearby:unused;
  const fresh=candidates.filter(item=>!session.recentIds.has(item.id));
  const eligible=fresh.length>=4?fresh:candidates;
  const ranked=shuffle(eligible,rng).sort((a,b)=>Math.abs(a.level-target)-Math.abs(b.level-target));
  const chosen=ranked[Math.floor(rnd(rng)*Math.min(ranked.length,12))];
  session.sessionIds.add(chosen.id);
  const question=fourChoices(chosen,bank,rng);
  session.lastPrompt=question;
  return question;
}
export function submitAnswer(session,question,index){
  if(session.lastPrompt!==question)throw Error('回答対象の問題が一致しません。');
  if(!Number.isInteger(index)||index<0||index>=question.options.length)throw Error('回答が正しくありません。');
  const correct=index===question.correctIndex;
  const weights=session.weights[question.kind].map((w,i)=>w*(correct?
    probability(POINTS[i],question.level):1-probability(POINTS[i],question.level)));
  const total=weights.reduce((a,b)=>a+b,0);
  if(!(total>0))throw Error('推定計算に失敗しました。');
  session.weights[question.kind]=weights.map(w=>w/total);
  session.answers.push({id:question.id,kind:question.kind,level:question.level,
    correct,selected:index,expected:question.correctIndex});
  session.lastPrompt=null;
  return correct;
}
export function isFinished(session){
  const n=session.answers.length;
  if(n<MIN_QUESTIONS)return false;
  const vocab=session.answers.filter(a=>a.kind==='vocab').length;
  const grammar=n-vocab;
  if(vocab<8||grammar<8)return false;
  const a=domainEstimate(session,'vocab'),b=domainEstimate(session,'grammar');
  if(n>=MAX_QUESTIONS)return true;
  if(n>=STANDARD_QUESTIONS&&a.std<=1.65&&b.std<=1.65)return true;
  return a.std<=1.03&&b.std<=1.03;
}
export function levelLabel(ability){
  const number=CLAMP(Math.round(ability),1,15);
  const grade=GRADES[Math.floor((number-1)/3)];
  return grade.name+(grade.name==='準1級程度'?'':(['基礎','標準','上位'][(number-1)%3]));
}
// Anchor is provisional, informed by a 20/40 teacher reference on upper-level
// items; it is not an empirically calibrated equivalence or TOEIC conversion.
export const TEACHER_REFERENCE_THETA = 12.1;
export function scoreFromAbility(ability){
  return Math.round(CLAMP((ability-.2)/(TEACHER_REFERENCE_THETA-.2),0,1)*1000);
}
export function summarize(session){
  const v=domainEstimate(session,'vocab'),g=domainEstimate(session,'grammar');
  const ability=(v.mean+g.mean)/2;
  const correct=session.answers.filter(a=>a.correct).length;
  const uncertainty=(v.std+g.std)/2;
  return {scaleVersion:SCALE_VERSION,score:scoreFromAbility(ability),
    vocabScore:scoreFromAbility(v.mean),grammarScore:scoreFromAbility(g.mean),
    grade:levelLabel(ability),vocabGrade:levelLabel(v.mean),grammarGrade:levelLabel(g.mean),
    estimatedLevel:Number(ability.toFixed(2)),uncertainty:Number(uncertainty.toFixed(2)),
    referenceOnly:uncertainty>1.75,correct,total:session.answers.length,
    vocabCorrect:session.answers.filter(a=>a.kind==='vocab'&&a.correct).length,
    grammarCorrect:session.answers.filter(a=>a.kind==='grammar'&&a.correct).length,
    answers:session.answers.map(a=>({...a}))};
}
