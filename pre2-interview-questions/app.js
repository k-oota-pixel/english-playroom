import {apiHeaders} from '../firebase-security.js?v=2.1.2';
(()=>{
'use strict';

const QUESTIONS=window.PRE2_INTERVIEW_QUESTIONS;
const API='https://task-quest.onrender.com/api/pre2-interview-grade';
const $=id=>document.getElementById(id);
const screens=['typeScreen','orderScreen','numberScreen','deliveryScreen','practiceScreen','resultScreen'];
globalThis.MonstudyMaterial?.setActivityGuard(()=>!$('practiceScreen').classList.contains('hidden'));
const state={type:null,selectionMode:null,index:null,delivery:null,repeatCount:0,lastRandom:null,firstAnswer:'',followUp:false};
const recordedTitleBestByQuestion=new Map();

function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function questionList(){return QUESTIONS?.[state.type]||[];}
function question(){return questionList()[state.index]||'';}
function qLabel(){return `Question ${state.type}`;}

function setSteps(step){
  [1,2,3,4].forEach(n=>{
    const el=$('step'+n);if(!el)return;
    el.classList.toggle('active',n===step);
    el.classList.toggle('done',n<step);
  });
}
function show(id,step){
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  screens.forEach(x=>$(x)?.classList.toggle('hidden',x!==id));
  setSteps(step);
  window.scrollTo({top:0,behavior:'smooth'});
}
function chooseRandom(){
  const list=questionList();
  if(!list.length)return 0;
  let n=Math.floor(Math.random()*list.length);
  if(list.length>1&&n===state.lastRandom)n=(n+1+Math.floor(Math.random()*(list.length-1)))%list.length;
  state.lastRandom=n;
  return n;
}
function renderNumberGrid(){
  const grid=$('numberGrid');grid.innerHTML='';
  questionList().forEach((_,i)=>{
    const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.setAttribute('aria-label',`問題 ${i+1}`);
    b.addEventListener('click',()=>{state.index=i;show('deliveryScreen',3);});
    grid.appendChild(b);
  });
}

function preferredVoice(){
  if(!('speechSynthesis' in window))return null;
  const voices=window.speechSynthesis.getVoices();
  return voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
}
function speakQuestion(){
  if(!('speechSynthesis' in window)||typeof SpeechSynthesisUtterance==='undefined'){
    state.delivery='read';
    renderDelivery();
    showError('このブラウザでは音声再生を利用できないため、英文表示に切り替えました。');
    return;
  }
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(question());
  const voice=preferredVoice();if(voice)u.voice=voice;
  u.lang=voice?.lang||'en-US';u.rate=.88;u.pitch=1;u.volume=1;
  window.speechSynthesis.speak(u);
}

function renderDelivery(){
  const audio=state.delivery==='audio';
  $('audioPrompt').classList.toggle('hidden',!audio);
  $('readPrompt').classList.toggle('hidden',audio);
  $('deliveryBadge').textContent=audio?'🔊 音声で聞く':'👀 英文を読む';
  $('questionText').textContent=audio?'':question();
}
function resetAnswerArea(){
  $('answerInput').value='';$('answerInput').readOnly=false;
  $('followUpInput').value='';$('followUp').classList.add('hidden');
  $('gradeBtn').textContent='AIで採点する';$('gradeBtn').disabled=false;
  $('errorBox').classList.add('hidden');$('errorBox').textContent='';
  state.firstAnswer='';state.followUp=false;state.repeatCount=0;
  $('repeatNote').textContent='';
}
function startQuestion(){
  resetAnswerArea();
  $('practiceType').textContent=qLabel().toUpperCase();
  $('practiceNumber').textContent=`No. ${String(state.index+1).padStart(2,'0')} / 50`;
  renderDelivery();
  show('practiceScreen',4);
  if(state.delivery==='audio')speakQuestion();
  else setTimeout(()=>$('answerInput').focus(),120);
}
function showError(message){const box=$('errorBox');box.textContent=message;box.classList.remove('hidden');}

function bareOpinion(answer){
  const clean=answer.toLowerCase().replace(/[,.!?;:]/g,' ').replace(/\s+/g,' ').trim();
  const words=clean?clean.split(' '):[];
  if(words.length>6)return null;
  if(/^yes\b/.test(clean))return 'Why?';
  if(/^no\b/.test(clean))return 'Why not?';
  return null;
}
function revealFollowUp(prompt){
  state.firstAnswer=$('answerInput').value.trim();state.followUp=true;
  $('answerInput').readOnly=true;
  $('followUpQuestion').textContent=prompt;
  $('followUp').classList.remove('hidden');
  $('gradeBtn').textContent='回答をまとめてAIで採点する';
  setTimeout(()=>$('followUpInput').focus(),60);
}

async function grade(){
  $('errorBox').classList.add('hidden');
  let answer=$('answerInput').value.trim();
  if(!answer){showError('英語で回答を入力してください。');$('answerInput').focus();return;}

  if(!state.followUp){
    const prompt=bareOpinion(answer);
    if(prompt){revealFollowUp(prompt);return;}
  }else{
    const extra=$('followUpInput').value.trim();
    if(!extra){showError(`${$('followUpQuestion').textContent} に英語で答えてください。`);$('followUpInput').focus();return;}
    answer=`${state.firstAnswer} ${extra}`;
  }

  const titleOwner=window.EnglishPlayroomCoins?.getUserId?.()||'';const rewardQuestionId=`${state.type}-${state.index+1}`;
  const btn=$('gradeBtn');btn.disabled=true;btn.textContent='AIが採点しています…';
  try{
    const response=await fetch(API,{method:'POST',headers:await apiHeaders(),body:JSON.stringify({questionType:state.type,question:question(),answer,repeatCount:state.repeatCount}),signal:AbortSignal.timeout(30000)});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw new Error(data.error||`採点できませんでした（${response.status}）。`);
    if(!Number.isInteger(data.score)||data.score<0||data.score>5||typeof data.feedback!=='string')throw new Error('採点結果を読み取れませんでした。もう一度お試しください。');
    renderResult(data);
    const reason=/\b(because|since|as)\b/i.test(answer),previous=recordedTitleBestByQuestion.get(rewardQuestionId)||{score:-1,followUp:false,reason:false};
    if(data.score>previous.score||(state.followUp&&!previous.followUp)||(reason&&!previous.reason)){recordedTitleBestByQuestion.set(rewardQuestionId,{score:Math.max(previous.score,data.score),followUp:previous.followUp||state.followUp,reason:previous.reason||reason});window.EnglishPlayroomCoins?.recordTitleEvent?.('pre2-interview-questions',{kind:'answer',expectedUid:titleOwner,itemId:rewardQuestionId,score:data.score,total:5,questionType:'q'+state.type,followUp:state.followUp,reason});}
    window.EnglishPlayroomCoins?.awardPre2Questions?.(rewardQuestionId);
  }catch(e){
    showError(e?.name==='TimeoutError'?'AIの返事に時間がかかっています。もう一度お試しください。':e?.message||'AI採点に接続できませんでした。');
    btn.disabled=false;btn.textContent=state.followUp?'回答をまとめてAIで採点する':'AIで採点する';
  }
}

function renderResult(data){
  $('resultType').textContent=qLabel().toUpperCase();
  $('scoreValue').textContent=String(data.score);
  $('resultQuestionNumber').textContent=`${qLabel()} · No. ${String(state.index+1).padStart(2,'0')}`;
  $('resultQuestion').textContent=question();
  $('listeningRecord').textContent=state.delivery==='audio'?`🔊 音声モード・聞き返し ${state.repeatCount}回`:'👀 英文表示モード';
  $('feedbackText').textContent=data.feedback||'';
  $('strengthsText').textContent=data.strengths||'';
  $('betterAnswer').textContent=data.betterAnswer||'';
  const wrap=$('corrections');wrap.innerHTML='';
  const corrections=Array.isArray(data.corrections)?data.corrections:[];
  if(!corrections.length){wrap.innerHTML='<p class="no-errors">大きな文法・語法ミスは見つかりませんでした。</p>';}
  else corrections.forEach(c=>{
    const item=document.createElement('div');item.className='correction-item';
    item.innerHTML=`<div class="correction-line"><span class="wrong">${esc(c.original)}</span><span class="arrow">→</span><span class="right">${esc(c.corrected)}</span></div><div class="correction-reason">${esc(c.reason)}</div>`;
    wrap.appendChild(item);
  });
  show('resultScreen',4);
}

function goNext(){
  if(state.selectionMode==='random')state.index=chooseRandom();
  else state.index=(state.index+1)%questionList().length;
  startQuestion();
}
function backFromDelivery(){
  if(state.selectionMode==='number')show('numberScreen',2);
  else show('orderScreen',2);
}

// Question type
 document.querySelectorAll('[data-question-type]').forEach(btn=>btn.addEventListener('click',()=>{
  state.type=Number(btn.dataset.questionType);state.selectionMode=null;state.index=null;state.delivery=null;
  $('orderTypeLabel').textContent=`${qLabel()}・全50問`;
  $('numberTypeLabel').textContent=`${qLabel()}・全50問`;
  show('orderScreen',2);
 }));

$('randomChoice').addEventListener('click',()=>{state.selectionMode='random';state.index=chooseRandom();show('deliveryScreen',3);});
$('numberChoice').addEventListener('click',()=>{state.selectionMode='number';renderNumberGrid();show('numberScreen',2);});
$('audioChoice').addEventListener('click',()=>{state.delivery='audio';startQuestion();});
$('readChoice').addEventListener('click',()=>{state.delivery='read';startQuestion();});
$('repeatBtn').addEventListener('click',()=>{
  state.repeatCount++;
  if(state.repeatCount>=2)$('repeatNote').textContent='本番では、何度も聞き返すと評価に影響する場合があります。';
  else $('repeatNote').textContent='The interviewer repeats the question.';
  speakQuestion();
});
$('gradeBtn').addEventListener('click',grade);
$('nextBtn').addEventListener('click',goNext);
$('retryBtn').addEventListener('click',startQuestion);
$('menuBtn').addEventListener('click',()=>show('orderScreen',2));

document.querySelectorAll('[data-back]').forEach(btn=>btn.addEventListener('click',()=>{
  const where=btn.dataset.back;
  if(where==='type')show('typeScreen',1);
  else if(where==='order')show('orderScreen',2);
  else if(where==='delivery')backFromDelivery();
}));

if('speechSynthesis' in window)window.speechSynthesis.addEventListener?.('voiceschanged',()=>preferredVoice(),{once:true});
show('typeScreen',1);
})();
