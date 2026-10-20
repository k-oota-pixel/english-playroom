import {interviewAttemptPatch} from './dashboard-extra.js?v=1';
import './nickname-profile.js';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const firebaseConfig={
  apiKey:"AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ",
  authDomain:"eiken-retry.firebaseapp.com",
  projectId:"eiken-retry",
  storageBucket:"eiken-retry.firebasestorage.app",
  messagingSenderId:"231308672297",
  appId:"1:231308672297:web:5e8b8ede3a0246c2318b38",
  measurementId:"G-8CWR37L5K0"
};
const app=getApps().length?getApp():initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app);
// Reuse the site's existing Firebase app and wallet without changing daily rewards.
export { auth, db, authReady, walletRef };
let currentUser=auth.currentUser||null;
let authResolved=false,resolveAuth;
const authReady=new Promise(r=>resolveAuth=r);
onAuthStateChanged(auth,user=>{currentUser=user||null;if(!authResolved){authResolved=true;resolveAuth();}});

function todayKey(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function cleanPart(value){return String(value??'').trim().replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,80)||'item';}
function walletRef(user){return doc(db,'users',user.uid,'apps','english-playroom');}
function ensureToast(){
  let el=document.getElementById('englishPlayroomCoinToast');if(el)return el;
  const style=document.createElement('style');style.textContent='#englishPlayroomCoinToast{position:fixed;right:14px;bottom:14px;z-index:2147483646;background:#193d38;color:#fff;border:1px solid #ffffff28;border-radius:999px;padding:9px 13px;font:800 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 28px #10251f35;opacity:0;transform:translateY(8px);pointer-events:none;transition:.18s}#englishPlayroomCoinToast.show{opacity:1;transform:translateY(0)}';document.head.appendChild(style);
  el=document.createElement('div');el.id='englishPlayroomCoinToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');document.body.appendChild(el);return el;
}
let toastTimer=0;
function toast(text){const el=ensureToast();el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200);}

// PET CATCH has its own login-state overlay. Keep its hidden login link truly hidden
// even though the page's .login-link rule sets display:inline-block.
function installPetCatchHiddenLinkFix(){
  if(!location.pathname.includes('/pet-catch'))return;
  const style=document.createElement('style');
  style.id='petCatchHiddenLoginFix';
  style.textContent='.login-link[hidden]{display:none!important}';
  document.head.appendChild(style);
}
installPetCatchHiddenLinkFix();

// TaskQuest keeps an in-tab draft for each quest so an AI quota/network error,
// timeout, or the one-time Firebase sync reload cannot erase a student's answer.
function installTaskQuestAnswerGuard(){
  const form=document.getElementById('form');
  const answer=document.getElementById('answer');
  const feedback=document.getElementById('feedback');
  const questnum=document.getElementById('questnum');
  if(!form||!answer||!feedback||!questnum)return;

  const STORAGE_KEY='taskquest-answer-drafts-v1';
  let drafts={};
  try{
    const saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'{}');
    if(saved&&typeof saved==='object'&&!Array.isArray(saved))drafts=saved;
  }catch{}

  const taskKey=()=>questnum.textContent.trim();
  const persist=()=>{
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(drafts));}catch{}
  };
  const saveCurrent=()=>{
    const key=taskKey();if(!key)return;
    if(answer.value)drafts[key]=answer.value;
    else delete drafts[key];
    persist();
  };
  const restoreCurrent=()=>{
    const key=taskKey(),saved=key?drafts[key]:'';
    if(saved&&!answer.value)answer.value=saved;
  };
  const clearCurrentDraft=()=>{
    const key=taskKey();if(key&&Object.prototype.hasOwnProperty.call(drafts,key)){delete drafts[key];persist();}
  };

  answer.addEventListener('input',saveCurrent);
  form.addEventListener('submit',saveCurrent,true);

  const feedbackObserver=new MutationObserver(()=>{
    const text=feedback.textContent||'';
    if(text.includes('この回答は挑戦回数に含めていません。')){
      restoreCurrent();
      return;
    }
    if(text.includes('TASK CLEAR!')||text.includes('TRY AGAIN'))clearCurrentDraft();
  });
  feedbackObserver.observe(feedback,{childList:true,subtree:true,characterData:true});

  const questObserver=new MutationObserver(()=>queueMicrotask(restoreCurrent));
  questObserver.observe(questnum,{childList:true,subtree:true,characterData:true});
  window.addEventListener('pageshow',restoreCurrent);
  queueMicrotask(restoreCurrent);
  window.addEventListener('pagehide',()=>{feedbackObserver.disconnect();questObserver.disconnect();},{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installTaskQuestAnswerGuard,{once:true});
else installTaskQuestAnswerGuard();

async function awardOncePerDay(appId,itemId,label='1コインGET！'){
  await authReady;
  const user=currentUser;if(!user)return {awarded:false,reason:'signed-out'};
  const today=todayKey(),claim=`${cleanPart(appId)}:${cleanPart(itemId)}`;
  let awarded=false,newCoins=0;
  try{
    await runTransaction(db,async tx=>{
      const ref=walletRef(user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
      const sameDay=data.coinRewardDate===today;
      const claims=sameDay&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(x=>typeof x==='string'):[];
      const coins=Math.max(0,Math.floor(Number(data.coins)||0));
      const interview=appId==='eiken-pre2-interview-a'?interviewAttemptPatch(data,itemId.replace(/^theme-/,''),today):null;
      if(claims.includes(claim)){
        if(interview)tx.set(ref,{pre2InterviewA:interview},{merge:true});
        newCoins=coins;return;
      }
      claims.push(claim);newCoins=coins+1;awarded=true;
      tx.set(ref,{...(interview?{pre2InterviewA:interview}:{}),coins:newCoins,coinRewardDate:today,coinRewardClaims:claims,coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
    });
    if(awarded)toast(`🪙 +1　${label}`);
    return {awarded,coins:newCoins,reason:awarded?'awarded':'already-today'};
  }catch(error){console.error('Coin reward failed',error);return {awarded:false,reason:'error',error};}
}

async function recordRetryAttempt(questionId){
  await authReady;
  const user=currentUser;if(!user)return {awarded:false,reason:'signed-out'};
  const today=todayKey(),claim=`eiken-retry:${cleanPart(questionId)}`;
  let awarded=false,progress=0,newCoins=0,counted=false;
  try{
    await runTransaction(db,async tx=>{
      const ref=walletRef(user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
      const sameDay=data.coinRewardDate===today;
      const claims=sameDay&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(x=>typeof x==='string'):[];
      const coins=Math.max(0,Math.floor(Number(data.coins)||0));
      progress=Math.max(0,Math.min(4,Math.floor(Number(data.retryCoinProgress)||0)));
      if(claims.includes(claim)){newCoins=coins;return;}
      claims.push(claim);counted=true;progress+=1;newCoins=coins;
      if(progress>=5){progress-=5;newCoins=coins+1;awarded=true;}
      tx.set(ref,{coins:newCoins,retryCoinProgress:progress,coinRewardDate:today,coinRewardClaims:claims,coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
    });
    if(awarded)toast('🪙 +1　リトライ5問達成！');
    else if(counted)toast(`リトライコインまで ${5-progress}問`);
    return {awarded,counted,progress,coins:newCoins,reason:counted?'counted':'already-today'};
  }catch(error){console.error('Retry coin reward failed',error);return {awarded:false,counted:false,reason:'error',error};}
}

window.EnglishPlayroomCoins=Object.freeze({
  awardOncePerDay,
  recordRetryAttempt,
  awardAteru:roundId=>awardOncePerDay('ateru',`round-${cleanPart(roundId)}`,'アテル3問以上正解！'),
  awardBasic:stageId=>awardOncePerDay('basic-quest',`stage-${cleanPart(stageId)}`,'Basic Questクリア！'),
  awardCloze:themeId=>awardOncePerDay('eiken-cloze',`theme-${cleanPart(themeId)}`,'空所補充に挑戦！'),
  awardTitle:themeId=>awardOncePerDay('eiken-title',`theme-${cleanPart(themeId)}`,'タイトルに挑戦！'),
  awardListening:setId=>awardOncePerDay('listening-training',`set-${cleanPart(setId)}`,'Listening 5問達成！'),
  awardTalk:themeId=>awardOncePerDay('talk-quest',`theme-${cleanPart(themeId)}`,'日常英会話に挑戦！'),
  awardPre2Questions:questionId=>awardOncePerDay('pre2-interview-questions',`question-${cleanPart(questionId)}`,'準2級質問対策に挑戦！'),
  awardTask:themeId=>awardOncePerDay('task-quest',`theme-${cleanPart(themeId)}`,'Task-Questに挑戦！'),
  awardPre2A:themeId=>awardOncePerDay('eiken-pre2-interview-a',`theme-${cleanPart(themeId)}`,'準2級面接Aで2つ以上正解！')
});
