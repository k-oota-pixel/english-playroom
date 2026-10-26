import {announceTitles} from 'https://k-oota-pixel.github.io/english-playroom/learning-titles.js?v=2.1.11';
import './material-open.js?v=1.9.6';
import {interviewAttemptPatch} from './dashboard-extra.js?v=1';
import './nickname-profile.js?v=2.1.2';
import {enableAppCheck} from './firebase-security.js?v=2.1.2';
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.2";
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
onAuthStateChanged(auth,user=>{currentUser=user||null;if(user)queueMicrotask(flushTitleEvents);if(!authResolved){authResolved=true;resolveAuth();}});

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


const titleMemory=new Map();let titleQueue=Promise.resolve(),titleFlushTimer=0,titleFlushRunning=false;
function readTitleOutbox(key){try{return JSON.parse(localStorage.getItem(key)||'null')||titleMemory.get(key)||[];}catch{return titleMemory.get(key)||[];}}
function writeTitleOutbox(key,rows){titleMemory.set(key,rows);try{localStorage.setItem(key,JSON.stringify(rows));}catch{}}
async function stableBatchId(values){const bytes=new TextEncoder().encode(values.join('|')),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');}
function scheduleTitleFlush(delay=5000){clearTimeout(titleFlushTimer);titleFlushTimer=setTimeout(()=>void flushTitleEvents(),delay);}
function removeTitleRows(key,ids){const remove=new Set(ids);writeTitleOutbox(key,readTitleOutbox(key).filter(row=>!remove.has(row.event?.eventId)));}
function flushTitleEvents(){
 const user=currentUser;if(!user)return Promise.resolve({freshTitles:[]});
 clearTimeout(titleFlushTimer);
 titleQueue=titleQueue.catch(()=>{}).then(async()=>{
  if(titleFlushRunning||currentUser?.uid!==user.uid)return {freshTitles:[]};
  titleFlushRunning=true;const key='monstudy-title-outbox:'+user.uid,freshTitles=[];
  try{
   let rows=readTitleOutbox(key);
   const legacy=rows.filter(row=>row.event&&!row.batchVersion);
   for(const row of legacy){
    if(currentUser?.uid!==user.uid)break;
    try{
     const token=await user.getIdToken(),response=await fetch('https://task-quest.onrender.com/api/learning/title-event',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(row.event)});
     if(!response.ok){if(response.status===400){removeTitleRows(key,[row.event.eventId]);continue;}break;}
     const result=await response.json();removeTitleRows(key,[row.event.eventId]);freshTitles.push(...(result.freshTitles||[]));
    }catch{break;}
   }
   rows=readTitleOutbox(key).filter(row=>row.batchVersion===2&&row.event);
   const apps=[...new Set(rows.map(row=>row.event.appId))];
   for(const appId of apps){
    const pending=rows.filter(row=>row.event.appId===appId);
    while(pending.length){
     const group=pending.splice(0,25);if(currentUser?.uid!==user.uid)return {freshTitles};
     const ids=group.map(row=>row.event.eventId),batchId=await stableBatchId([appId,...ids]),token=await user.getIdToken();
     try{
      const response=await fetch('https://task-quest.onrender.com/api/learning/title-event',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({appId,batchId,events:group.map(row=>row.event)})});
      if(!response.ok){if(response.status===400){removeTitleRows(key,ids);continue;}break;}
      const result=await response.json();removeTitleRows(key,ids);freshTitles.push(...(result.freshTitles||[]));
     }catch{break;}
    }
   }
   if(currentUser?.uid===user.uid)announceTitles(freshTitles);
   return {freshTitles};
  }finally{
   titleFlushRunning=false;
   if(currentUser?.uid===user.uid&&readTitleOutbox(key).length)scheduleTitleFlush(1000);
  }
 });
 return titleQueue;
}
function enqueueTitleEvents(appId,payloads,flushNow=false){
 const user=currentUser;if(!user||(payloads||[]).some(payload=>payload.expectedUid!==undefined&&payload.expectedUid!==user.uid))return Promise.resolve({freshTitles:[]});
 const key='monstudy-title-outbox:'+user.uid,pending=readTitleOutbox(key),known=new Set(pending.map(row=>row.event?.eventId));
 for(const payload of payloads||[]){
  const event={...payload,appId,eventId:payload.eventId||crypto.randomUUID()};
  if(!known.has(event.eventId)){pending.push({event,at:Date.now(),batchVersion:2});known.add(event.eventId);}
 }
 writeTitleOutbox(key,pending.slice(-500));
 if(flushNow)return flushTitleEvents();
 scheduleTitleFlush();return Promise.resolve({queued:true,freshTitles:[]});
}
function recordTitleEvent(appId,payload={}){return enqueueTitleEvents(appId,[payload]);}
function recordTitleEvents(appId,payloads=[]){return enqueueTitleEvents(appId,payloads,true);}
window.addEventListener('online',()=>{void flushTitleEvents();void flushLearningActivities();void flushRetryAttempts();});

let lastLearningUid='',lastLearningApp='',lastLearningSent=0;
const LEARNING_ACTIVITY_IDS=new Set(['word-breaker','ateru','basic-quest','eiken-retry','task-quest','eiken-cloze','eiken-title','listening-training','pre2-interview-questions','eiken-pre2-interview-a','talk-quest','pet-catch','reading-training','pet-instructions','pet-chat']);
function learningContentFromPage(){const path=location.pathname;return [...LEARNING_ACTIVITY_IDS].find(id=>path.split('/').includes(id));}
function readLearningOutbox(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}}
function writeLearningOutbox(key,rows){try{localStorage.setItem(key,JSON.stringify(rows));}catch{}}
let learningTimer=0,learningQueue=Promise.resolve(),learningFlushRunning=false;
function scheduleLearningFlush(delay=5000){clearTimeout(learningTimer);learningTimer=setTimeout(()=>void flushLearningActivities(),delay);}
function removeLearningRows(key,ids){const remove=new Set(ids);writeLearningOutbox(key,readLearningOutbox(key).filter(row=>!remove.has(row.eventId)));}
function flushLearningActivities(){
 const user=currentUser;if(!user)return Promise.resolve();
 clearTimeout(learningTimer);
 learningQueue=learningQueue.catch(()=>{}).then(async()=>{
  if(learningFlushRunning||currentUser?.uid!==user.uid)return;
  learningFlushRunning=true;const key='monstudy-learning-outbox:'+user.uid;
  try{
   let rows=readLearningOutbox(key);
   while(rows.length&&currentUser?.uid===user.uid){
    const group=rows.slice(0,100),ids=group.map(row=>row.eventId),batchId=await stableBatchId(ids),token=await user.getIdToken();
    try{
     const response=await fetch('https://task-quest.onrender.com/api/learning/activity',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({batchId,events:group.map(row=>({appId:row.appId,eventId:row.eventId}))}),keepalive:true});
     if(!response.ok)break;
     const result=await response.json();removeLearningRows(key,ids);rows=readLearningOutbox(key);
     if(currentUser?.uid===user.uid)announceTitles(result.freshTitles);
    }catch{break;}
   }
  }finally{learningFlushRunning=false;if(currentUser?.uid===user.uid&&readLearningOutbox(key).length)scheduleLearningFlush(1000);}
 });
 return learningQueue;
}
async function recordLearningActivity(appId=learningContentFromPage()){
 await authReady;const user=currentUser;if(!user||!LEARNING_ACTIVITY_IDS.has(appId)||typeof fetch!=='function')return;
 if(lastLearningUid===user.uid&&lastLearningApp===appId&&Date.now()-lastLearningSent<1000)return;
 lastLearningUid=user.uid;lastLearningApp=appId;lastLearningSent=Date.now();
 const key='monstudy-learning-outbox:'+user.uid,rows=readLearningOutbox(key);
 rows.push({eventId:crypto.randomUUID(),appId,at:Date.now()});writeLearningOutbox(key,rows.slice(-1000));scheduleLearningFlush();
}

const RETRY_OUTBOX_PREFIX='monstudy-retry-coin-outbox:';
function readRetryOutbox(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch{return [];}}
function writeRetryOutbox(key,rows){try{localStorage.setItem(key,JSON.stringify(rows));}catch{}}
let retryTimer=0,retryQueue=Promise.resolve(),retryFlushRunning=false;
function scheduleRetryFlush(delay=10000){clearTimeout(retryTimer);retryTimer=setTimeout(()=>void flushRetryAttempts(),delay);}
function removeRetryRows(key,ids){const remove=new Set(ids);writeRetryOutbox(key,readRetryOutbox(key).filter(row=>!remove.has(row.eventId)));}
function flushRetryAttempts(){
 const user=currentUser;if(!user)return Promise.resolve();
 clearTimeout(retryTimer);
 retryQueue=retryQueue.catch(()=>{}).then(async()=>{
  if(retryFlushRunning||currentUser?.uid!==user.uid)return;
  retryFlushRunning=true;const key=RETRY_OUTBOX_PREFIX+user.uid;
  try{
   let rows=readRetryOutbox(key);
   while(rows.length&&currentUser?.uid===user.uid){
    const group=rows.slice(0,50),ids=group.map(row=>row.eventId),today=todayKey();let awardedCount=0,counted=0,progress=0,newCoins=0;
    try{
     await runTransaction(db,async tx=>{
      const ref=walletRef(user),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{},sameDay=data.coinRewardDate===today;
      const claims=sameDay&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(value=>typeof value==='string'):[];
      newCoins=Math.max(0,Math.floor(Number(data.coins)||0));progress=Math.max(0,Math.min(4,Math.floor(Number(data.retryCoinProgress)||0)));
      for(const row of group){
       const claim='eiken-retry:'+cleanPart(row.questionId);if(claims.includes(claim))continue;
       claims.push(claim);counted++;progress++;if(progress>=5){progress-=5;newCoins++;awardedCount++;}
      }
      if(!counted)return;
      const earned=data.coinEarnedDate===today?Math.max(0,Math.floor(Number(data.coinsEarnedToday)||0)):0;
      tx.set(ref,{coins:newCoins,retryCoinProgress:progress,coinRewardDate:today,coinRewardClaims:claims,coinEarnedDate:today,coinsEarnedToday:earned+awardedCount,coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
     });
     removeRetryRows(key,ids);rows=readRetryOutbox(key);
     if(awardedCount){toast(`🪙 +${awardedCount}　リトライ5問達成！`);notifyDailyCoinLeaderboard(user);}
    }catch(error){console.error('Retry coin batch failed',error);break;}
   }
  }finally{retryFlushRunning=false;if(currentUser?.uid===user.uid&&readRetryOutbox(key).length)scheduleRetryFlush(1000);}
 });
 return retryQueue;
}
window.addEventListener('pagehide',()=>{void flushTitleEvents();void flushLearningActivities();void flushRetryAttempts();});
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
 await authReady;const user=currentUser;if(!user)return {awarded:false,reason:'signed-out'};
 void recordLearningActivity('eiken-retry');
 const normalized=cleanPart(questionId),key=RETRY_OUTBOX_PREFIX+user.uid,rows=readRetryOutbox(key);
 if(!rows.some(row=>row.questionId===normalized))rows.push({eventId:crypto.randomUUID(),questionId:normalized,at:Date.now()});
 writeRetryOutbox(key,rows.slice(-500));
 if(rows.length>=5)void flushRetryAttempts();else scheduleRetryFlush();
 return {awarded:false,counted:true,queued:true,reason:'queued'};
}

window.EnglishPlayroomCoins=Object.freeze({
  getUserId:()=>currentUser?.uid||'',
  recordTitleEvent,
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
