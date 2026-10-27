import {apiHeaders} from '../firebase-security.js?v=2.1.30';
(()=>{
'use strict';
const QUESTIONS=window.GRADE3_INTERVIEW_Q45||[];
const API='https://eiken-title.onrender.com/api/grade3-interview/q45';
const $=id=>document.getElementById(id);
const screens=['typeScreen','orderScreen','numberScreen','deliveryScreen','practiceScreen','resultScreen'];
const state={type:null,selectionMode:null,index:null,delivery:null,repeatCount:0,lastRandom:-1,firstAnswer:'',followQuestion:'',followUp:false};
globalThis.MonstudyMaterial?.setActivityGuard(()=>!$('practiceScreen').classList.contains('hidden'));
function questionList(){return QUESTIONS;}
function item(){return questionList()[state.index]||{};}
function question(){return item()[state.type===4?'q4':'q5']||'';}
function qLabel(){return 'Question '+state.type;}
function setSteps(step){[1,2,3,4].forEach(n=>{const el=$('step'+n);if(el){el.classList.toggle('active',n===step);el.classList.toggle('done',n<step);}});}
function show(id,step){if('speechSynthesis'in window)window.speechSynthesis.cancel();screens.forEach(x=>$(x)?.classList.toggle('hidden',x!==id));setSteps(step);window.scrollTo({top:0,behavior:'smooth'});}
function chooseRandom(){if(!QUESTIONS.length)return 0;let n=Math.floor(Math.random()*QUESTIONS.length);if(QUESTIONS.length>1&&n===state.lastRandom)n=(n+1+Math.floor(Math.random()*(QUESTIONS.length-1)))%QUESTIONS.length;state.lastRandom=n;return n;}
function renderNumberGrid(){const grid=$('numberGrid');grid.replaceChildren();questionList().forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.setAttribute('aria-label','問題 '+(i+1));b.addEventListener('click',()=>{state.index=i;show('deliveryScreen',3);});grid.appendChild(b);});}
function preferredVoice(){if(!('speechSynthesis'in window))return null;const voices=window.speechSynthesis.getVoices();return voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;}
function speakQuestion(){if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){state.delivery='read';renderDelivery();showError('このブラウザでは音声再生を利用できないため、英文表示に切り替えました。');return;}window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(question());const voice=preferredVoice();if(voice)u.voice=voice;u.lang=voice?.lang||'en-US';u.rate=.88;u.pitch=1;u.volume=1;window.speechSynthesis.speak(u);}
function renderDelivery(){const audio=state.delivery==='audio';$('audioPrompt').classList.toggle('hidden',!audio);$('readPrompt').classList.toggle('hidden',audio);$('deliveryBadge').textContent=audio?'🔊 音声で聞く':'👀 英文を読む';$('questionText').textContent=audio?'':question();}
function resetAnswerArea(){$('answerInput').value='';$('answerInput').readOnly=false;$('followUpInput').value='';$('followUp').classList.add('hidden');$('gradeBtn').textContent='AIで採点する';$('gradeBtn').disabled=false;$('errorBox').classList.add('hidden');$('errorBox').textContent='';$('repeatNote').textContent='';state.firstAnswer='';state.followQuestion='';state.followUp=false;state.repeatCount=0;}
function startQuestion(){resetAnswerArea();$('practiceType').textContent=qLabel().toUpperCase();$('practiceNumber').textContent='No. '+String(state.index+1).padStart(2,'0')+' / 20';renderDelivery();show('practiceScreen',4);if(state.delivery==='audio')speakQuestion();else setTimeout(()=>$('answerInput').focus(),100);}
function showError(message){const box=$('errorBox');box.textContent=message;box.classList.remove('hidden');}
function bareYesNo(text){return /^(yes|no)(?:[.!?]|,?\s+(?:i do|i don't|i can|i can't|i have|i haven't|i would|i wouldn't))?\s*$/i.test(text.trim());}
function revealFollowUp(answer){state.firstAnswer=answer;$('answerInput').readOnly=true;state.followQuestion=/^yes\b/i.test(answer.trim())?item().yesFollow:item().noFollow;$('followUpQuestion').textContent=state.followQuestion;$('followUp').classList.remove('hidden');$('gradeBtn').textContent='回答をまとめてAIで採点する';state.followUp=true;setTimeout(()=>$('followUpInput').focus(),60);}
async function grade(){
 $('errorBox').classList.add('hidden');const answer=$('answerInput').value.trim();if(!answer){showError('英語で回答を入力してください。');$('answerInput').focus();return;}
 let followQuestion='',followAnswer='';
 if(state.type===5&&!state.followUp){
  if(!/^(yes|no)\b/i.test(answer)){showError('Yes または No で答えてください。');$('answerInput').focus();return;}
  if(bareYesNo(answer)){revealFollowUp(answer);return;}
 }else if(state.type===5&&state.followUp){
  followQuestion=state.followQuestion;followAnswer=$('followUpInput').value.trim();if(!followAnswer){showError(followQuestion+' に英語で答えてください。');$('followUpInput').focus();return;}
 }
 const btn=$('gradeBtn');btn.disabled=true;btn.textContent='AIが採点しています…';
 try{
  const response=await fetch(API,{method:'POST',headers:await apiHeaders(),body:JSON.stringify({question_id:state.index+1,question_type:state.type,question:question(),answer:state.followUp?state.firstAnswer:answer,follow_up_question:followQuestion,follow_up_answer:followAnswer}),signal:AbortSignal.timeout(30000)});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data.error||'採点できませんでした。もう一度お試しください。');
  if(!Number.isInteger(data.score)||data.score<0||data.score>5||typeof data.feedback!=='string')throw new Error('採点結果を読み取れませんでした。もう一度お試しください。');
  renderResult(data);
  const questionId='q'+state.type+'-'+(state.index+1),userId=window.EnglishPlayroomCoins?.getUserId?.()||'';
  window.EnglishPlayroomCoins?.recordTitleEvent?.('eiken-grade3-interview-q45',{kind:'answer',expectedUid:userId,itemId:questionId,score:data.score,total:5,questionType:'q'+state.type,followUp:state.followUp});
  window.EnglishPlayroomCoins?.awardGrade3InterviewQ45?.(questionId);
 }catch(e){showError(e?.name==='TimeoutError'?'AIの返事に時間がかかっています。もう一度お試しください。':e?.message||'AI採点に接続できませんでした。');btn.disabled=false;btn.textContent=state.followUp?'回答をまとめてAIで採点する':'AIで採点する';}
}
function renderResult(data){$('resultType').textContent=qLabel().toUpperCase();$('scoreValue').textContent=String(data.score);$('resultQuestionNumber').textContent=qLabel()+' · No. '+String(state.index+1).padStart(2,'0');$('resultQuestion').textContent=question();$('listeningRecord').textContent=state.delivery==='audio'?'🔊 音声モード・聞き返し '+state.repeatCount+'回':'👀 英文表示モード';$('feedbackText').textContent=data.feedback||'';$('strengthsText').textContent=data.strengths||'';$('betterAnswer').textContent=data.betterAnswer||'';const wrap=$('corrections');wrap.replaceChildren();const corrections=Array.isArray(data.corrections)?data.corrections:[];if(!corrections.length){const p=document.createElement('p');p.className='no-errors';p.textContent='大きな文法・語法ミスは見つかりませんでした。';wrap.appendChild(p);}else corrections.forEach(c=>{const item=document.createElement('div');item.className='correction-item';const line=document.createElement('div');line.className='correction-line';const wrong=document.createElement('span');wrong.className='wrong';wrong.textContent=c.original;const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='→';const right=document.createElement('span');right.className='right';right.textContent=c.corrected;line.append(wrong,arrow,right);const reason=document.createElement('div');reason.className='correction-reason';reason.textContent=c.reason;item.append(line,reason);wrap.appendChild(item);});show('resultScreen',4);}
function goNext(){if(state.selectionMode==='random')state.index=chooseRandom();else state.index=(state.index+1)%questionList().length;startQuestion();}
function backFromDelivery(){if(state.selectionMode==='number')show('numberScreen',2);else show('orderScreen',2);}
document.querySelectorAll('[data-question-type]').forEach(btn=>btn.addEventListener('click',()=>{state.type=Number(btn.dataset.questionType);state.selectionMode=null;state.index=null;state.delivery=null;$('orderTypeLabel').textContent=qLabel()+'・全20問';$('numberTypeLabel').textContent=qLabel()+'・全20問';show('orderScreen',2);}));
$('randomChoice').addEventListener('click',()=>{state.selectionMode='random';state.index=chooseRandom();show('deliveryScreen',3);});
$('numberChoice').addEventListener('click',()=>{state.selectionMode='number';renderNumberGrid();show('numberScreen',2);});
$('audioChoice').addEventListener('click',()=>{state.delivery='audio';startQuestion();});
$('readChoice').addEventListener('click',()=>{state.delivery='read';startQuestion();});
$('repeatBtn').addEventListener('click',()=>{state.repeatCount++;if(state.repeatCount>=2)$('repeatNote').textContent='本番では、何度も聞き返すと評価に影響する場合があります。';else $('repeatNote').textContent='The interviewer repeats the question.';speakQuestion();});
$('gradeBtn').addEventListener('click',grade);$('nextBtn').addEventListener('click',goNext);$('retryBtn').addEventListener('click',startQuestion);$('menuBtn').addEventListener('click',()=>show('orderScreen',2));
document.querySelectorAll('[data-back]').forEach(btn=>btn.addEventListener('click',()=>{const where=btn.dataset.back;if(where==='type')show('typeScreen',1);else if(where==='order')show('orderScreen',2);else if(where==='delivery')backFromDelivery();}));
if('speechSynthesis'in window)window.speechSynthesis.addEventListener?.('voiceschanged',()=>preferredVoice(),{once:true});
show('typeScreen',1);
})();
