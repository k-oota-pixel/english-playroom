import './material-open.js?v=1.9.6';
import {interviewAttemptPatch} from './dashboard-extra.js?v=1';
import './nickname-profile.js';
import {enableAppCheck} from './firebase-security.js';
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
const app=getApps().length?getApp():initializeApp(firebaseConfig);enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const DAILY_COIN_LEADERBOARD_API='https://task-quest.onrender.com/api/coins/leaderboard';
// Reuse the site's existing Firebase app and wallet without changing daily rewards.
export { auth, db, authReady, walletRef, recordLearningActivity };
let currentUser=auth.currentUser||null;
let authResolved=false,resolveAuth;
const authReady=new Promise(r=>resolveAuth=r);
onAuthStateChanged(auth,user=>{currentUser=user||null;if(!authResolved){authResolved=true;resolveAuth();}});

function todayKey(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
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

function notifyDailyCoinLeaderboard(user){
  if(typeof fetch!=='function')return;
  void (async()=>{
    try{
      const token=await user.getIdToken();
      const response=await fetch(DAILY_COIN_LEADERBOARD_API,{method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store',keepalive:true});
      if(!response.ok)throw new Error('HTTP '+response.status);
    }catch(error){console.warn('Daily coin leaderboard update deferred',error);}
  })();
}


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

let lastLearningUid='',lastLearningApp='',lastLearningSent=0;
function learningContentFromPage(){const path=location.pathname;return ['word-breaker','ateru','basic-quest','eiken-retry','task-quest','eiken-cloze','eiken-title','listening-training','pre2-interview-questions','eiken-pre2-interview-a','talk-quest','pet-catch','reading-training'].find(id=>path.split('/').includes(id));}
async function recordLearningActivity(appId=learningContentFromPage()){
  await authReady;const user=currentUser;if(!user||typeof fetch!=='function')return;
  if(lastLearningUid===user.uid&&lastLearningApp===appId&&Date.now()-lastLearningSent<1000)return;lastLearningUid=user.uid;lastLearningApp=appId;lastLearningSent=Date.now();
  try{const token=await user.getIdToken();const response=await fetch('https://task-quest.onrender.com/api/learning/activity',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(appId?{appId}:{}),keepalive:true});if(!response.ok)throw Error('HTTP '+response.status);}catch(error){console.warn('Learning activity update deferred',error);}
}

async function awardOncePerDay(appId,itemId,label='1コインGET！'){
  await authReady;
  const user=currentUser;if(!user)return {awarded:false,reason:'signed-out'};
  void recordLearningActivity(appId);
  const today=todayKey(),claim=`${cleanPart(appId)}:${cleanPart(itemId)}`;
  let awarded=false,newCoins=0;
  try{
    await runTransaction(db,async tx=>{
      const ref=walletRef(user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
      const sameDay=data.coinRewardDate===today;
      const claims=sameDay&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(x=>typeof x==='string'):[];
      const coins=Math.max(0,Math.floor(Number(data.coins)||0));
      const coinsEarnedToday=data.coinEarnedDate===today?Math.max(0,Math.floor(Number(data.coinsEarnedToday)||0)):0;
      const interview=appId==='eiken-pre2-interview-a'?interviewAttemptPatch(data,itemId.replace(/^theme-/,''),today):null;
      if(claims.includes(claim)){
        if(interview)tx.set(ref,{pre2InterviewA:interview},{merge:true});
        newCoins=coins;return;
      }
      claims.push(claim);newCoins=coins+1;awarded=true;
      tx.set(ref,{...(interview?{pre2InterviewA:interview}:{}),coins:newCoins,coinRewardDate:today,coinRewardClaims:claims,coinEarnedDate:today,coinsEarnedToday:coinsEarnedToday+1,coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
    });
    if(awarded){toast(`🪙 +1　${label}`);notifyDailyCoinLeaderboard(user);}
    return {awarded,coins:newCoins,reason:awarded?'awarded':'already-today'};
  }catch(error){console.error('Coin reward failed',error);return {awarded:false,reason:'error',error};}
}

async function recordRetryAttempt(questionId){
  await authReady;
  const user=currentUser;if(!user)return {awarded:false,reason:'signed-out'};
  void recordLearningActivity('eiken-retry');
  const today=todayKey(),claim=`eiken-retry:${cleanPart(questionId)}`;
  let awarded=false,progress=0,newCoins=0,counted=false;
  try{
    await runTransaction(db,async tx=>{
      const ref=walletRef(user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
      const sameDay=data.coinRewardDate===today;
      const claims=sameDay&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(x=>typeof x==='string'):[];
      const coins=Math.max(0,Math.floor(Number(data.coins)||0));
      const coinsEarnedToday=data.coinEarnedDate===today?Math.max(0,Math.floor(Number(data.coinsEarnedToday)||0)):0;
      progress=Math.max(0,Math.min(4,Math.floor(Number(data.retryCoinProgress)||0)));
      if(claims.includes(claim)){newCoins=coins;return;}
      claims.push(claim);counted=true;progress+=1;newCoins=coins;
      if(progress>=5){progress-=5;newCoins=coins+1;awarded=true;}
      tx.set(ref,{coins:newCoins,retryCoinProgress:progress,coinRewardDate:today,coinRewardClaims:claims,coinEarnedDate:today,coinsEarnedToday:coinsEarnedToday+(awarded?1:0),coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
    });
    if(awarded){toast('🪙 +1　リトライ5問達成！');notifyDailyCoinLeaderboard(user);}
    else if(counted)toast(`リトライコインまで ${5-progress}問`);
    return {awarded,counted,progress,coins:newCoins,reason:counted?'counted':'already-today'};
  }catch(error){console.error('Retry coin reward failed',error);return {awarded:false,counted:false,reason:'error',error};}
}

window.EnglishPlayroomCoins=Object.freeze({
  recordLearningActivity,
  awardOncePerDay,
  recordRetryAttempt,
  awardAteru:roundId=>awardOncePerDay('ateru',`round-${cleanPart(roundId)}`,'アテル3問以上正解！'),
  awardBasic:stageId=>awardOncePerDay('basic-quest',`stage-${cleanPart(stageId)}`,'Basic Questクリア！'),
  awardCloze:themeId=>awardOncePerDay('eiken-cloze',`theme-${cleanPart(themeId)}`,'空所補充に挑戦！'),
  awardTitle:themeId=>awardOncePerDay('eiken-title',`theme-${cleanPart(themeId)}`,'タイトルに挑戦！'),
  awardReading:passageId=>awardOncePerDay('reading-training',`theme-${cleanPart(passageId)}`,'長文演習を完了！'),
  awardListening:setId=>awardOncePerDay('listening-training',`set-${cleanPart(setId)}`,'Listening 5問達成！'),
  awardTalk:themeId=>awardOncePerDay('talk-quest',`theme-${cleanPart(themeId)}`,'日常英会話に挑戦！'),
  awardPre2Questions:questionId=>awardOncePerDay('pre2-interview-questions',`question-${cleanPart(questionId)}`,'準2級質問対策に挑戦！'),
  awardTask:themeId=>awardOncePerDay('task-quest',`theme-${cleanPart(themeId)}`,'Task-Questに挑戦！'),
  awardPre2A:themeId=>awardOncePerDay('eiken-pre2-interview-a',`theme-${cleanPart(themeId)}`,'準2級面接Aで2つ以上正解！')
});
