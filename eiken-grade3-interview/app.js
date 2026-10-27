import {apiHeaders} from '../firebase-security.js?v=2.1.9';
(()=>{
'use strict';
const API='https://eiken-title.onrender.com/api/grade3-interview/grade';
const $=id=>document.getElementById(id);
const questions=window.GRADE3_INTERVIEW_QUESTIONS||[];
let index=Math.floor(Math.random()*questions.length),lastIndex=-1,isGraded=false;
globalThis.MonstudyMaterial?.setActivityGuard(()=>!isGraded);
function item(){return questions[index];}
function speak(text){
 if(!('speechSynthesis'in window)||typeof SpeechSynthesisUtterance==='undefined'){showError('このブラウザでは音声再生を利用できません。英文を読んで練習してください。');return;}
 window.speechSynthesis.cancel();
 const utterance=new SpeechSynthesisUtterance(text);
 const voices=window.speechSynthesis.getVoices();
 const voice=voices.find(v=>/^en-US/i.test(v.lang))||voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
 if(voice)utterance.voice=voice;utterance.lang=voice?.lang||'en-US';utterance.rate=.88;
 window.speechSynthesis.speak(utterance);
}
function render(){
 if(!questions.length)return;
 const q=item();
 const id=index+1;
 $('cardNumber').textContent='No. '+String(id).padStart(2,'0')+' / '+String(questions.length).padStart(2,'0');
 $('picture').src='images/'+String(id).padStart(2,'0')+'.webp';
 $('picture').alt='英検３級二次試験の練習用イラスト No. '+id;
 $('question2').textContent=q.q2;$('question3').textContent=q.q3;
 $('answer2').value='';$('answer3').value='';
 $('result2').hidden=true;$('result3').hidden=true;$('errorBox').hidden=true;$('errorBox').textContent='';
 $('gradeBtn').disabled=false;$('gradeBtn').textContent='Q2・Q3をAI採点する';
 isGraded=false;
 [...$('cardNav').children].forEach((button,i)=>button.classList.toggle('active',i===index));
 if('speechSynthesis'in window)window.speechSynthesis.cancel();
}
function buildNav(){
 const nav=$('cardNav');nav.replaceChildren();
 questions.forEach((q,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1);b.setAttribute('aria-label','問題 '+(i+1));b.addEventListener('click',()=>{index=i;render();});nav.appendChild(b);});
}
function showError(message){$('errorBox').textContent=message;$('errorBox').hidden=false;}
function resultHtml(data){
 const score=Number.isInteger(data.score)?data.score:0;
 const corrections=Array.isArray(data.corrections)?data.corrections:[];
 const correctionText=corrections.map(c=>'• '+c.original+' → '+c.corrected+(c.reason?'（'+c.reason+'）':'')).join('\n');
 const answer=data.betterAnswer?'<div class="better"><strong>Answer Example</strong>'+escapeHtml(data.betterAnswer)+'</div>':'';
 return '<div class="score">評価 <strong>'+score+'</strong> / 5</div><p>'+escapeHtml(data.feedback||'')+'</p><p>'+escapeHtml(data.strengths||'')+'</p>'+(correctionText?'<p>'+escapeHtml(correctionText)+'</p>':'')+answer;
}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
async function grade(){
 $('errorBox').hidden=true;
 const answer2=$('answer2').value.trim(),answer3=$('answer3').value.trim();
 if(!answer2||!answer3){showError('Q2とQ3の両方に英語で回答してください。');(!answer2?$('answer2'):$('answer3')).focus();return;}
 const button=$('gradeBtn');button.disabled=true;button.textContent='AIが採点しています…';
 try{
  const response=await fetch(API,{method:'POST',headers:await apiHeaders(),body:JSON.stringify({question_id:index+1,scene:item().scene,questions:[{number:2,question:item().q2,expected_answers:item().a2,answer:answer2},{number:3,question:item().q3,expected_answers:item().a3,answer:answer3}]}),signal:AbortSignal.timeout(45000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'AI採点に接続できませんでした。');
  if(!data.results||data.results.length!==2||data.results.some(x=>!Number.isInteger(x.score)||x.score<0||x.score>5))throw new Error('採点結果を読み取れませんでした。もう一度お試しください。');
  data.results.forEach(result=>{const target=result.number===2?$('result2'):$('result3');target.innerHTML=resultHtml(result);target.hidden=false;});
  isGraded=true;button.textContent='採点済み';
  window.EnglishPlayroomCoins?.awardGrade3Interview?.(index+1);
 }catch(error){showError(error?.name==='TimeoutError'?'AIの返事に時間がかかっています。もう一度お試しください。':error?.message||'AI採点に接続できませんでした。');button.disabled=false;button.textContent='Q2・Q3をAI採点する';}
}
function next(){
 if(questions.length<2)return;
 const old=index;do{index=Math.floor(Math.random()*questions.length);}while(index===old&&questions.length>1);
 lastIndex=old;render();window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-audio]').forEach(button=>button.addEventListener('click',()=>speak(button.dataset.audio==='q2'?item().q2:item().q3)));
$('gradeBtn').addEventListener('click',grade);$('nextBtn').addEventListener('click',next);
$('randomBtn').addEventListener('click',()=>{next();});
buildNav();render();
})();