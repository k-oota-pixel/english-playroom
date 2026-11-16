// Pilot adaptive assessment: one latent English ability, sampled from 10 vocabulary
// and 10 grammar questions. Not official Eiken / a calibrated IRT examination.
export const SCALE_VERSION='pilot-2-grade2';
export const MIN_QUESTIONS=20;
export const STANDARD_QUESTIONS=20;
export const MAX_QUESTIONS=20;
export const GRADES=Object.freeze([
  {name:'4級',key:'4',start:1},
  {name:'3級',key:'3',start:4},
  {name:'準2級',key:'pre2',start:7},
  {name:'2級',key:'2',start:10},
  {name:'準1級程度',key:'pre1',start:13}
]);
const POINTS=Array.from({length:61},(_,i)=>i/4);
const CLAMP=(x,min,max)=>Math.min(max,Math.max(min,x));
const normalize=text=>String(text||'').normalize('NFKC').trim().toLowerCase();
const normalizedSentence=text=>normalize(text).replace(/[.!?。！？]/g,'').replace(/\s+/g,' ');
const randomIndex=(rng,n)=>Math.floor(CLAMP(Number(rng())||0,0,.999999999)*n);
const gradeSpec=name=>GRADES.find(g=>g.name===name||g.key===name||(name==='準1級'&&g.key==='pre1'));
const validWord=text=>Boolean(String(text||'').trim());

function vocabBand(word,grade,no){
  if(grade.key==='pre1')return CLAMP(13+Math.floor((Number(no)-1501)/134),13,15);
  const letters=(String(word).match(/[A-Za-z]/g)||[]).length;
  const parts=String(word).trim().split(/\s+/).length;
  return grade.start+(parts>2||letters>=10?2:letters>=6||parts>1?1:0);
}
function grammarBand(question,grade){
  const str=String(question||'');
  const complexity=/(although|unless|despite|however|neither|hardly|until|whereas)/i.test(str)?1:0;
  return grade.start+(str.length>=125||str.length>=78&&complexity?2:str.length>=65||complexity?1:0);
}
function uniqueWords(records,grade){
  const items=[],seen=new Set();
  for(const [index,row] of (records||[]).entries()){
    const en=String(row?.word||'').trim(),ja=Array.isArray(row?.answers)?
      row.answers.map(x=>String(x||'').trim()).find(Boolean):'';
    if(!en||!ja||seen.has(normalize(en)))continue;
    seen.add(normalize(en));
    items.push({id:'v:'+grade.key+':'+index,kind:'vocab',source:'vocabulary',
      grade:grade.name,level:vocabBand(en,grade,index),en,ja});
  }
  return items;
}
function cleanGrammar(rows){
  const items=[],seen=new Set();
  for(const row of rows||[]){
    const grade=gradeSpec(String(row?.grade||''));
    if(!grade||!row?.id||!String(row.question||'').trim()||!Array.isArray(row.choices)||row.choices.length!==4)continue;
    const choices=row.choices.map(c=>({number:Number(c?.number),text:String(c?.text||'').trim()}));
    const answer=Number(row.answer_number);
    if(choices.some(c=>!Number.isInteger(c.number)||!c.text)||new Set(choices.map(c=>normalize(c.text))).size!==4)continue;
    if(choices.filter(c=>c.number===answer).length!==1)continue;
    const id='g:retry:'+String(row.id);
    if(seen.has(id))continue;seen.add(id);
    items.push({id,kind:'grammar',source:'retry',grade:grade.name,
      level:grammarBand(row.question,grade),question:String(row.question),choices,answer_number:answer});
  }
  return items;
}
function cleanPotato(groups){
  const items=[],seen=new Set();
  for(const group of groups||[]){
    // Only use be verbs and genuine modal-word questions. Other groups contain
    // transformations ("s", "ies", "そのまま") rather than selectable gap text.
    if(!['be','modal'].includes(group?.id))continue;
    const choices=(group.choices||[]).filter(c=>/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(String(c.text||'')));
    for(const [index,q] of (group.questions||[]).entries()){
      const matching=choices.filter(c=>Number(c.id)===Number(q?.correctId));
      if(matching.length!==1||!validWord(q?.japanese)||!validWord(q?.english))continue;
      const given=String(q?.answer||'').match(/\(\s*([^()]*)\s*\)/)?.[1]?.trim();
      const correct=String(matching[0].text).trim();
      // Exclude ambiguous "can / will" source answers and corrupted originals.
      if(normalize(given)!==normalize(correct)||new Set(choices.map(c=>normalize(c.text))).size<4)continue;
      if(group.id==='modal'&&['may','can'].includes(normalize(correct))&&/(してもよい|できる|だろう)/.test(String(q.japanese)))continue;
      const level=group.id==='be'?([4,5].includes(Number(q.correctId))?3:1):
        ['have','has','am going','is going','are going'].includes(normalize(correct))?4:3;
      const id='g:potato:'+group.id+':'+index;
      if(seen.has(id))continue;seen.add(id);
      items.push({id,kind:'grammar',source:'potato',grade:level<=3?'4級':'3級',level,
        question:String(q.english)+'\n'+String(q.japanese),
        choices:choices.map(c=>({number:Number(c.id),text:String(c.text).trim()})),
        answer_number:Number(q.correctId)});
    }
  }
  return items;
}
function cleanReordering(stages){
  const items=[],seen=new Set();
  const grammarStages={1:1,2:2,3:2,4:5,5:5,6:5,7:6,8:3,9:6,10:8,11:6,12:6};
  for(const stage of stages||[]){
    const level=grammarStages[Number(stage?.number)];
    if(!level)continue;
    for(const row of stage.questions||[]){
      const en=String(row?.en||'').trim(),ja=String(row?.ja||'').trim();
      const variants=(row?.acceptedAnswers||[]).map(x=>String(x||'').trim()).filter(Boolean);
      const tokens=en.split(/\s+/).filter(Boolean);
      // Require a short, clean, deterministic text order, and the original answer.
      if(!row?.id||!en||!ja||tokens.length<4||tokens.length>13||
        variants.length<1||!variants.some(v=>normalizedSentence(v)===normalizedSentence(en)))continue;
      const id='g:order:'+String(row.id);
      if(seen.has(id))continue;seen.add(id);
      items.push({id,kind:'grammar',source:'order',grade:GRADES[Math.floor((level-1)/3)].name,
        level,question:ja,english:en,acceptedAnswers:variants,tokens});
    }
  }
  return items;
}
export function buildQuestionBank(vocabulary,retryRows,advanced,extras={}){
  const vocab=[];
  for(const grade of GRADES.slice(0,4))vocab.push(...uniqueWords(vocabulary?.grades?.[grade.key]?.words,grade));
  const pre1=gradeSpec('pre1'),seen=new Set();
  for(const row of advanced?.entries||[]){
    const en=String(row?.en||'').trim(),ja=String(row?.ja||'').trim(),no=Number(row?.no);
    if(!en||!ja||!Number.isInteger(no)||seen.has(normalize(en)))continue;
    seen.add(normalize(en));
    vocab.push({id:'v:pre1:'+no,kind:'vocab',source:'vocabulary',grade:pre1.name,
      level:vocabBand(en,pre1,no),en,ja});
  }
  const retry=cleanGrammar(retryRows),potato=cleanPotato(extras.potatoGroups),order=cleanReordering(extras.basicGrammarStages);
  const grammar=[...retry,...potato,...order],vocabByGrade=new Map();
  for(const grade of GRADES){
    vocabByGrade.set(grade.name,vocab.filter(q=>q.grade===grade.name));
    if(vocabByGrade.get(grade.name).length<30)throw Error(grade.name+'の単語問題が不足しています。');
    if(retry.filter(q=>q.grade===grade.name).length<20)throw Error(grade.name+'のリトライノート問題が不足しています。');
  }
  return {vocab,grammar,vocabByGrade,sources:{retry:retry.length,potato:potato.length,order:order.length}};
}
function shuffle(items,rng){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=randomIndex(rng,i+1);[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function fourChoices(item,bank,rng=Math.random){
  if(item.kind==='grammar'){
    let candidates=shuffle(item.choices,rng);
    if(item.source==='potato'){
      const correct=candidates.find(c=>c.number===item.answer_number);
      const distractors=candidates.filter(c=>c.number!==item.answer_number).slice(0,3);
      if(!correct||distractors.length!==3)throw Error('ポテトマンの選択肢が不足しています。');
      candidates=shuffle([correct,...distractors],rng);
    }
    return {id:item.id,kind:'grammar',source:item.source,grade:item.grade,level:item.level,
      prompt:item.question,direction:item.source==='potato'?'ポテトマン · 空所補充':'語彙・文法',
      options:candidates.map(c=>c.text),correctIndex:candidates.findIndex(c=>c.number===item.answer_number),guessRate:.25};
  }
  const sameGrade=bank.vocabByGrade.get(item.grade)||[];
  const jaMatches=sameGrade.filter(q=>normalize(q.ja)===normalize(item.ja));
  const englishToJapanese=jaMatches.length>1||randomIndex(rng,2)===0;
  const key=englishToJapanese?'ja':'en',correct=String(item[key]);
  const distractors=sameGrade.filter(row=>row.id!==item.id&&normalize(row.en)!==normalize(item.en)&&
    normalize(row.ja)!==normalize(item.ja)&&normalize(row[key])!==normalize(correct));
  const distinct=[],used=new Set([normalize(correct)]);
  for(const row of shuffle(distractors,rng)){
    const value=String(row[key]);
    if(used.has(normalize(value)))continue;
    used.add(normalize(value));distinct.push(value);
    if(distinct.length===3)break;
  }
  if(distinct.length!==3)throw Error('選択肢が不足しています: '+item.grade);
  const options=shuffle([correct,...distinct],rng);
  return {id:item.id,kind:'vocab',source:'vocabulary',grade:item.grade,level:item.level,
    direction:englishToJapanese?'英日':'日英',
    prompt:englishToJapanese?'「'+item.en+'」の意味は？':'「'+item.ja+'」に当たる英語は？',
    options,correctIndex:options.indexOf(correct),guessRate:.25};
}
function orderQuestion(item,rng){
  const original=item.tokens.map((t,id)=>({id,text:t}));
  let scrambled=shuffle(original,rng);
  if(scrambled.every((t,i)=>t.id===i)){
    scrambled=[...scrambled.slice(1),scrambled[0]];
  }
  return {id:item.id,kind:'grammar',source:'order',grade:item.grade,level:item.level,
    direction:'並べ替え · 基本文法',prompt:'次の日本語になるよう、語句を並べ替えてください。\n'+item.question,
    tokens:scrambled,acceptedAnswers:[...item.acceptedAnswers],guessRate:.02};
}
function initialWeights(){
  const weights=POINTS.map(theta=>Math.exp(-.5*Math.pow((theta-3.6)/3.7,2)));
  const sum=weights.reduce((a,b)=>a+b,0);
  return weights.map(w=>w/sum);
}
function moments(weights){
  const mean=weights.reduce((a,w,i)=>a+w*POINTS[i],0);
  const variance=weights.reduce((a,w,i)=>a+w*(POINTS[i]-mean)**2,0);
  return {mean,std:Math.sqrt(variance)};
}
export function createSession(recentIds=[]){
  return {weights:initialWeights(),answers:[],sessionIds:new Set(),
    recentIds:new Set((recentIds||[]).map(String)),lastPrompt:null};
}
export function abilityEstimate(session){return moments(session.weights);}
export function domainEstimate(session){return abilityEstimate(session);}
function desiredSource(session,kind,target){
  if(kind!=='grammar')return 'vocabulary';
  const index=Math.floor(session.answers.length/2);
  const planned=['potato','retry','order','retry','potato','retry','order','retry','potato','retry'][index]||'retry';
  if(planned==='potato'&&target>5)return 'retry';
  if(planned==='order'&&target>9)return 'retry';
  return planned;
}
export function chooseQuestion(session,bank,rng=Math.random){
  if(session.answers.length>=MAX_QUESTIONS)return null;
  const kind=session.answers.length%2===0?'vocab':'grammar';
  const target=session.answers.length<2?2:CLAMP(Math.round(abilityEstimate(session).mean),1,15);
  const unused=bank[kind].filter(item=>!session.sessionIds.has(item.id));
  if(!unused.length)throw Error('出題可能な問題がありません。');
  const preferred=desiredSource(session,kind,target);
  const bySource=unused.filter(item=>item.source===preferred&&Math.abs(item.level-target)<=1);
  const nearby=unused.filter(item=>Math.abs(item.level-target)<=1);
  const candidates=bySource.length>=4?bySource:nearby.length>=4?nearby:unused;
  const fresh=candidates.filter(item=>!session.recentIds.has(item.id));
  const eligible=fresh.length>=4?fresh:candidates;
  const ranked=shuffle(eligible,rng).sort((a,b)=>Math.abs(a.level-target)-Math.abs(b.level-target));
  const chosen=ranked[randomIndex(rng,Math.min(ranked.length,12))];
  session.sessionIds.add(chosen.id);
  const question=chosen.source==='order'?orderQuestion(chosen,rng):fourChoices(chosen,bank,rng);
  session.lastPrompt=question;
  return question;
}
function probability(ability,item){
  const adjustedDifficulty=item.level+(item.source==='order'?.35:0);
  const chance=Number(item.guessRate)??.25;
  return chance+(1-chance-.02)/(1+Math.exp(-(ability-adjustedDifficulty)/1.24));
}
export function submitAnswer(session,question,answer){
  if(session.lastPrompt!==question)throw Error('回答対象の問題が一致しません。');
  let correct;
  if(question.source==='order'){
    const tokens=question.tokens||[];
    if(!Array.isArray(answer)||answer.length!==tokens.length||new Set(answer).size!==tokens.length)throw Error('すべての語句を1回ずつ並べてください。');
    const chosen=answer.map(id=>tokens.find(t=>t.id===id)?.text);
    if(chosen.some(x=>!x))throw Error('語句の指定が正しくありません。');
    const completed=normalizedSentence(chosen.join(' '));
    correct=question.acceptedAnswers.some(v=>normalizedSentence(v)===completed);
  }else{
    if(!Number.isInteger(answer)||answer<0||answer>=question.options.length)throw Error('回答が正しくありません。');
    correct=answer===question.correctIndex;
  }
  const weights=session.weights.map((w,i)=>{
    const p=probability(POINTS[i],question);
    return w*(correct?p:1-p);
  });
  const total=weights.reduce((a,b)=>a+b,0);
  if(!(total>0))throw Error('推定計算に失敗しました。');
  session.weights=weights.map(w=>w/total);
  session.answers.push({id:question.id,kind:question.kind,source:question.source,level:question.level,
    correct,selected:question.source==='order'?answer:[answer],expected:question.source==='order'?null:question.correctIndex});
  session.lastPrompt=null;
  return correct;
}
export function isFinished(session){return session.answers.length===MAX_QUESTIONS;}
export function levelLabel(ability){
  const number=CLAMP(Math.round(ability),1,15);
  const grade=GRADES[Math.floor((number-1)/3)];
  return grade.name+(grade.key==='pre1'?'':(['基礎','標準','上位'][(number-1)%3]));
}
// Demonstrated mastery of upper Eiken grade-2 content is the provisional ceiling.
// This is an ability anchor, not a percent-correct or TOEIC conversion.
export const GRADE2_MASTERY_THETA=11.6;
export function scoreFromAbility(ability){
  return Math.round(CLAMP((ability-.2)/(GRADE2_MASTERY_THETA-.2),0,1)*1000);
}
export function summarize(session){
  const estimate=abilityEstimate(session);
  const correct=session.answers.filter(a=>a.correct).length;
  const vocabCorrect=session.answers.filter(a=>a.kind==='vocab'&&a.correct).length;
  const grammarCorrect=session.answers.filter(a=>a.kind==='grammar'&&a.correct).length;
  const grade2=session.answers.filter(a=>a.level>=10&&a.level<=12);
  const evidence=grade2.length>=2&&grade2.filter(a=>a.correct).length>=2;
  const fullScore=scoreFromAbility(estimate.mean);
  // Avoid granting maximum on too little grade-2 evidence.
  const score=fullScore===1000&&!evidence?990:fullScore;
  return {scaleVersion:SCALE_VERSION,score,grade:levelLabel(estimate.mean),
    estimatedLevel:Number(estimate.mean.toFixed(2)),uncertainty:Number(estimate.std.toFixed(2)),
    referenceOnly:estimate.std>1.75||fullScore===1000&&!evidence,
    correct,total:session.answers.length,vocabCorrect,grammarCorrect,
    vocabTotal:session.answers.filter(a=>a.kind==='vocab').length,
    grammarTotal:session.answers.filter(a=>a.kind==='grammar').length,
    grade2Evidence:grade2.length,
    answers:session.answers.map(a=>({...a,selected:[...a.selected]}))};
}
