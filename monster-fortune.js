import {MONSTUDY_FORTUNES} from './monster-fortunes.js?v=2.3.48';
import {getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from './auth-session.js?v=2.4.37';
import {getFirestore,doc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const PRICE=2;
const openButton=document.getElementById('monsterFortuneOpen');
const dialog=document.getElementById('monsterFortuneDialog');
const closeButton=document.getElementById('monsterFortuneClose');
const buyButton=document.getElementById('monsterFortuneBuy');
const intro=document.getElementById('monsterFortuneIntro');
const outcome=document.getElementById('monsterFortuneOutcome');
const text=document.getElementById('monsterFortuneMessage');
const category=document.getElementById('monsterFortuneCategory');
const notice=document.getElementById('monsterFortuneNotice');
const wallet=document.getElementById('monsterFortuneWallet');
let auth=null,db=null,user=null,knownData=null,busy=false,localDraw=null;

function dateJST(){
  // UTC+9固定ではなく、Asia/Tokyoの暦日で判定する。
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const field=k=>parts.find(part=>part.type===k)?.value||'';
  return field('year')+'-'+field('month')+'-'+field('day');
}
function savedToday(data){
  const saved=data?.monsterFortune;
  const date=dateJST();
  if(saved?.date!==date)return null;
  const id=Number(saved.id);
  if(!Number.isInteger(id)||id<1||id>MONSTUDY_FORTUNES.length)return null;
  return {date,id};
}
function updateSeen(data){
  knownData=data||{};
  const saved=savedToday(data);
  if(saved)localDraw=saved;
}
function currentDraw(){
  const today=dateJST();
  if(localDraw?.date===today)return localDraw;
  return savedToday(knownData);
}
function coinsOf(data){return Math.max(0,Math.floor(Number(data?.coins)||0));}
function randomId(){
  const random=new Uint32Array(1);
  crypto.getRandomValues(random);
  return 1+(random[0]%MONSTUDY_FORTUNES.length);
}
function showResult(saved){
  const chosen=MONSTUDY_FORTUNES[saved.id-1];
  if(!chosen){notice.textContent='結果を読み込めませんでした。';return;}
  intro.hidden=true;outcome.hidden=false;
  category.textContent=chosen.category;
  text.textContent=chosen.message;
  notice.textContent='今日の占いは何度でも無料で見返せます。明日は新しい占いを引けます。';
  buyButton.hidden=true;
}
function showIntro(){
  intro.hidden=false;outcome.hidden=true;buyButton.hidden=false;
  buyButton.textContent='🪙 2コインで今日の占いを引く';
  buyButton.disabled=busy||!user;
  const coins=knownData?coinsOf(knownData):null;
  wallet.textContent=coins===null?'1日1回・2コイン':('残高 '+coins+'コイン / 1日1回');
  notice.textContent=!user?'ログインすると占えます。':'占いを引いた後は、今日中いつでも無料で見返せます。';
}
function refresh(){
  const saved=currentDraw();
  if(saved)showResult(saved);else showIntro();
}
function open(){
  refresh();
  if(!dialog.open)dialog.showModal();
}
async function purchase(){
  if(!user||!auth||!db||busy)return;
  const uid=user.uid;
  busy=true;buyButton.disabled=true;notice.textContent='運命の扉を開いています…';
  // 再試行が発生しても候補が変わらないように、乱数はトランザクションの外で確定。
  const candidate=randomId();
  try{
    const result=await runTransaction(db,async tx=>{
      const ref=doc(db,'users',uid,'apps','english-playroom');
      const snap=await tx.get(ref);
      const data=snap.exists()?snap.data():{};
      const today=dateJST();
      if(data?.monsterFortune?.date===today){
        const id=Number(data.monsterFortune.id);
        if(Number.isInteger(id)&&id>=1&&id<=MONSTUDY_FORTUNES.length){
          return {date:today,id,spent:false,coins:coinsOf(data)};
        }
        throw new Error('今日の占いデータを確認できません。');
      }
      const coins=coinsOf(data);
      if(coins<PRICE)throw new Error('コインが足りません。学習して2コイン貯めてから挑戦してください。');
      tx.set(ref,{
        monsterFortune:{date:today,id:candidate},
        coins:coins-PRICE,
        coinUpdatedAt:serverTimestamp(),
        petUpdatedAt:serverTimestamp()
      },{merge:true});
      return {date:today,id:candidate,spent:true,coins:coins-PRICE};
    });
    if(auth.currentUser?.uid!==uid)return;
    localDraw={date:result.date,id:result.id};
    knownData={...(knownData||{}),monsterFortune:localDraw,coins:result.coins};
    showResult(localDraw);
  }catch(error){
    if(auth.currentUser?.uid!==uid)return;
    console.error('もんすた占いの抽選に失敗しました',error);
    notice.textContent=error?.code?'通信が不安定です。コインの消費状況を確認してから、もう一度お試しください。':(error?.message||'占いを引けませんでした。');
  }finally{
    busy=false;
    if(auth.currentUser?.uid===uid&&!currentDraw())buyButton.disabled=false;
  }
}
async function boot(){
  if(!openButton||!dialog||!buyButton)return;
  openButton.addEventListener('click',open);
  closeButton.addEventListener('click',()=>dialog.close());
  buyButton.addEventListener('click',purchase);
  document.addEventListener('pet-state-updated',event=>{if(user){updateSeen(event.detail);if(dialog.open&&!busy)refresh();}});
  // 同じデータのリスナーを増設せず、既存のペット同期イベントを流用。
  const start=()=>{
    if(!getApps().length){setTimeout(start,80);return;}
    auth=getAuth(getApp());db=getFirestore(getApp());
    onAuthStateChanged(auth,next=>{
      user=next;knownData=null;localDraw=null;
      openButton.disabled=!next;
      if(dialog.open)refresh();
    });
  };
  start();
}
boot();
