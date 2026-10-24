import {recordLearningActivity} from './coin-reward.js?v=1.10.4';
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {getFirestore,doc,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet,normalizePetName,validPetName} from './pet-model.js';
import {renderPetSVG} from './pet-art.js?v=touch1812';
import {careState,happyDay,previousHappy,yesterdayKey} from './pet-care-model.js?v=1.5.9';

const CLEAR_SCORE=4;
const COLOR={
  red:'#e55b5b',
  blue:'#4b83d1',
  green:'#55a76a',
  yellow:'#e8bd45'
};

const ROUND_TEMPLATES=Object.freeze([
  {
    instruction:'Catch the red ball!',
    target:'red-ball',
    choices:[
      {id:'red-ball',noun:'ball',color:'red',size:'normal'},
      {id:'blue-ball',noun:'ball',color:'blue',size:'normal'},
      {id:'red-star',noun:'star',color:'red',size:'normal'},
      {id:'green-box',noun:'box',color:'green',size:'normal'}
    ]
  },
  {
    instruction:'Touch the blue star!',
    target:'blue-star',
    choices:[
      {id:'blue-star',noun:'star',color:'blue',size:'normal'},
      {id:'red-star',noun:'star',color:'red',size:'normal'},
      {id:'blue-box',noun:'box',color:'blue',size:'normal'},
      {id:'yellow-ball',noun:'ball',color:'yellow',size:'normal'}
    ]
  },
  {
    instruction:'Find the small green box!',
    target:'small-green-box',
    choices:[
      {id:'small-green-box',noun:'box',color:'green',size:'small'},
      {id:'big-green-box',noun:'box',color:'green',size:'big'},
      {id:'small-blue-box',noun:'box',color:'blue',size:'small'},
      {id:'small-green-star',noun:'star',color:'green',size:'small'}
    ]
  },
  {
    instruction:'Catch the big yellow ball!',
    target:'big-yellow-ball',
    choices:[
      {id:'big-yellow-ball',noun:'ball',color:'yellow',size:'big'},
      {id:'small-yellow-ball',noun:'ball',color:'yellow',size:'small'},
      {id:'big-blue-ball',noun:'ball',color:'blue',size:'big'},
      {id:'big-yellow-star',noun:'star',color:'yellow',size:'big'}
    ]
  },
  {
    instruction:'Find the small red star!',
    target:'small-red-star',
    choices:[
      {id:'small-red-star',noun:'star',color:'red',size:'small'},
      {id:'big-red-star',noun:'star',color:'red',size:'big'},
      {id:'small-green-star',noun:'star',color:'green',size:'small'},
      {id:'small-red-box',noun:'box',color:'red',size:'small'}
    ]
  }
]);

let auth=null,db=null,currentUser=null,currentData={};
let titleRun='',titleRoundWrong=false,titleUid='';
const titleEvent=e=>{if(currentUser?.uid===titleUid)window.EnglishPlayroomCoins?.recordTitleEvent?.('pet-instructions',e);};
let roundIndex=0,score=0,busy=false;
let dialog=null;

function shuffle(list){
  const copy=[...list];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
function petName(data=currentData){return validPetName(data?.petName)?normalizePetName(data.petName):'ペット';}
function petStage(data=currentData){return data?.petAdult===false?'mystery':'adult';}
function petSVG(data=currentData){
  try{return renderPetSVG(data?.petAppearance,data?.petShop,petStage(data));}catch{return '<div class="pet-play-fallback">🐾</div>';}
}
function count(value){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}

function injectStyles(){
  if(document.getElementById('petPlay160Styles'))return;
  const style=document.createElement('style');
  style.id='petPlay160Styles';
  style.textContent=`
#petPlayOpen.pet-shop-open{border-color:#a9cbb9;color:#215f4d;background:#f7fcf8}#petPlayOpen.pet-shop-open:hover{background:#eaf6ee}
.pet-play-dialog{width:min(620px,calc(100vw - 20px));border:0;border-radius:24px;padding:0;background:#fffdf8;color:#193d38;box-shadow:0 22px 80px #10251f66}.pet-play-dialog::backdrop{background:#17342f9c;backdrop-filter:blur(3px)}
.pet-play-shell{position:relative;padding:20px}.pet-play-close{position:absolute;right:14px;top:14px;appearance:none;border:1px solid #d9e2dc;background:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;z-index:3}.pet-play-kicker{font-size:9px;font-weight:900;letter-spacing:.18em;color:#5d8e7c}.pet-play-title{font-size:28px;font-weight:950;letter-spacing:.04em;margin:2px 0 3px}.pet-play-sub{font-size:12px;color:#6f7e77;line-height:1.6;margin:0}
.pet-play-intro{display:grid;grid-template-columns:170px 1fr;gap:18px;align-items:center;padding:14px 0 2px}.pet-play-pet{width:170px;height:170px;display:grid;place-items:center;border-radius:24px;background:linear-gradient(145deg,#fff7d9,#eef8f0);overflow:hidden}.pet-play-pet svg{width:100%;height:100%;display:block}.pet-play-fallback{font-size:76px}.pet-play-rules{display:grid;gap:8px}.pet-play-rule{background:#f4f7f2;border:1px solid #e1e9e2;border-radius:13px;padding:9px 11px;font-size:11px;line-height:1.5}.pet-play-reward{font-weight:900;color:#806019}.pet-play-start,.pet-play-again{appearance:none;border:0;background:#246c57;color:#fff;border-radius:14px;padding:12px 18px;font:inherit;font-size:13px;font-weight:900;cursor:pointer;width:100%;margin-top:14px}.pet-play-start:hover,.pet-play-again:hover{filter:brightness(.96)}
.pet-play-game{padding-top:8px}.pet-play-gamehead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.pet-play-progress{font-size:11px;font-weight:900;color:#5a766c}.pet-play-score{font-size:11px;font-weight:900;color:#8a6b19}.pet-play-prompt{font-size:clamp(22px,5vw,32px);font-weight:950;text-align:center;line-height:1.25;padding:13px 8px 17px;color:#174f40}.pet-play-mini-pet{width:76px;height:76px;margin:0 auto 8px;position:relative}.pet-play-mini-pet svg{width:100%;height:100%;display:block}.pet-play-mood{position:absolute;right:-15px;top:-9px;width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#fff;border:1px solid #dde6dd;box-shadow:0 4px 10px #183b3818;font-size:19px;opacity:0;transform:scale(.6);transition:.18s}.pet-play-mood.show{opacity:1;transform:scale(1)}
.pet-play-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pet-play-choice{appearance:none;border:2px solid #e0e7e0;background:#fff;border-radius:18px;min-height:132px;display:grid;place-items:center;cursor:pointer;transition:.15s transform,.15s border-color,.15s background}.pet-play-choice:hover{transform:translateY(-2px);border-color:#a9cbb9}.pet-play-choice:disabled{cursor:default}.pet-play-choice.correct{border-color:#54a66d;background:#eef9f1}.pet-play-choice.wrong{border-color:#d96c62;background:#fff2f0;animation:petPlayShake .28s ease-in-out}.pet-play-object{display:grid;place-items:center;filter:drop-shadow(0 5px 5px #193d3818)}.pet-play-object.small{transform:scale(.72)}.pet-play-object.big{transform:scale(1.13)}.pet-play-object.ball{width:64px;height:64px;border-radius:50%;background:var(--pet-play-color);box-shadow:inset -8px -10px 0 #00000012,inset 8px 8px 0 #ffffff42}.pet-play-object.box{width:66px;height:66px;border-radius:10px;background:var(--pet-play-color);box-shadow:inset -7px -8px 0 #00000012,inset 6px 6px 0 #ffffff38}.pet-play-object.star{width:78px;height:78px;background:var(--pet-play-color);clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 94%,50% 72%,21% 94%,32% 57%,2% 35%,39% 35%)}
.pet-play-feedback{text-align:center;min-height:22px;font-size:12px;font-weight:900;margin-top:9px;color:#557168}.pet-play-feedback.ok{color:#297044}.pet-play-feedback.no{color:#a04c43}
.pet-play-result{text-align:center;padding-top:5px}.pet-play-result-pet{width:190px;height:190px;margin:0 auto;position:relative;display:grid;place-items:center}.pet-play-result-pet svg{width:100%;height:100%;display:block}.pet-play-result-pet.perfect{animation:petPlayBounce .7s ease-in-out 2}.pet-play-result-pet.clear{animation:petPlayWiggle .7s ease-in-out 2}.pet-play-result-pet.retry{animation:petPlayNod .8s ease-in-out 2}.pet-play-emotion{position:absolute;right:0;top:2px;font-size:42px;filter:drop-shadow(0 4px 5px #0002);animation:petPlayPop .42s ease-out both}.pet-play-result-title{font-size:31px;font-weight:950;margin:2px 0 4px}.pet-play-result-score{font-size:18px;font-weight:900;color:#3e6f60}.pet-play-result-message{font-size:12px;color:#6b7972;line-height:1.65;margin:8px auto 0;max-width:430px}.pet-play-result-reward{display:inline-flex;gap:9px;align-items:center;margin-top:12px;padding:9px 13px;border-radius:999px;background:#fff5c9;border:1px solid #ead17a;font-size:12px;font-weight:950;color:#725714}.pet-play-result-note{font-size:10px;color:#8a918d;margin-top:7px}
@keyframes petPlayShake{0%,100%{transform:translateX(0)}30%{transform:translateX(-5px)}70%{transform:translateX(5px)}}@keyframes petPlayBounce{0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-16px) scale(1.05)}}@keyframes petPlayWiggle{0%,100%{transform:rotate(0)}35%{transform:rotate(-4deg)}70%{transform:rotate(4deg)}}@keyframes petPlayNod{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}@keyframes petPlayPop{0%{transform:scale(.3) rotate(-16deg);opacity:0}75%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@media(max-width:560px){.pet-play-shell{padding:16px 13px}.pet-play-title{font-size:24px}.pet-play-intro{grid-template-columns:110px 1fr;gap:11px}.pet-play-pet{width:110px;height:110px}.pet-play-rule{font-size:10px;padding:7px 9px}.pet-play-choices{gap:8px}.pet-play-choice{min-height:112px}.pet-play-result-pet{width:155px;height:155px}.pet-play-emotion{font-size:35px}.pet-play-result-title{font-size:27px}}
`;
  document.head.appendChild(style);
}

function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='petPlayDialog';
  dialog.className='pet-play-dialog';
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{busy=false;});
  document.body.appendChild(dialog);
  return dialog;
}

function installButton(){
  if(document.getElementById('petPlayOpen'))return true;
  const anchor=document.getElementById('petClean')||document.getElementById('petFeed')||document.getElementById('petShopOpen');
  if(!anchor)return false;
  const button=document.createElement('button');
  button.id='petPlayOpen';
  button.className='pet-shop-open';
  button.type='button';
  button.textContent='PLAY';
  button.disabled=!currentUser||!hasPet(currentData);
  anchor.insertAdjacentElement('afterend',button);
  button.addEventListener('click',openIntro);
  return true;
}

function syncButton(){
  installButton();
  const button=document.getElementById('petPlayOpen');
  if(button)button.disabled=!currentUser||!hasPet(currentData);
}

function headerHtml(){return `<button class="pet-play-close" type="button" aria-label="閉じる">×</button><div class="pet-play-kicker">PET PLAY · ENGLISH MINI GAME</div><div class="pet-play-title">CATCH!</div>`;}
function wireClose(){dialog?.querySelector('.pet-play-close')?.addEventListener('click',()=>dialog.close());}

function openIntro(){
  if(!currentUser||!hasPet(currentData))return;
  ensureDialog();
  dialog.innerHTML=`<div class="pet-play-shell">${headerHtml()}<p class="pet-play-sub">英語の指示を読んで、${petName()}といっしょに正しいものをキャッチしよう！</p><div class="pet-play-intro"><div class="pet-play-pet">${petSVG()}</div><div class="pet-play-rules"><div class="pet-play-rule"><strong>5 ROUNDS</strong><br>色・大きさ・ものの名前を英語で見つけます。</div><div class="pet-play-rule"><strong>CLEAR</strong><br>5問中4問以上でクリア！</div><div class="pet-play-rule pet-play-reward">🎁 本日の初回CLEAR：🪙 +1 COIN / ♥ HAPPY +1</div></div></div><button class="pet-play-start" type="button">START!</button></div>`;
  wireClose();
  dialog.querySelector('.pet-play-start').addEventListener('click',startGame);
  if(!dialog.open)dialog.showModal();
}

function startGame(){
  titleRun=crypto.randomUUID();titleUid=currentUser?.uid||'';roundIndex=0;score=0;busy=false;
  renderRound();
}

function objectHtml(choice){
  const size=choice.size==='normal'?'':` ${choice.size}`;
  return `<span class="pet-play-object ${choice.noun}${size}" style="--pet-play-color:${COLOR[choice.color]}" aria-hidden="true"></span>`;
}
function choiceLabel(choice){return `${choice.size==='small'?'small ':choice.size==='big'?'big ':''}${choice.color} ${choice.noun}`;}

function renderRound(){
  if(roundIndex>=ROUND_TEMPLATES.length){finishGame();return;}titleRoundWrong=false;
  const round=ROUND_TEMPLATES[roundIndex];
  dialog.innerHTML=`<div class="pet-play-shell">${headerHtml()}<div class="pet-play-game"><div class="pet-play-gamehead"><span class="pet-play-progress">ROUND ${roundIndex+1} / ${ROUND_TEMPLATES.length}</span><span class="pet-play-score">SCORE ${score}</span></div><div class="pet-play-mini-pet">${petSVG()}<span class="pet-play-mood" aria-hidden="true"></span></div><div class="pet-play-prompt">${round.instruction}</div><div class="pet-play-choices"></div><div class="pet-play-feedback" role="status"></div></div></div>`;
  wireClose();
  const grid=dialog.querySelector('.pet-play-choices');
  for(const choice of shuffle(round.choices)){
    const button=document.createElement('button');
    button.type='button';button.className='pet-play-choice';button.dataset.id=choice.id;button.setAttribute('aria-label',choiceLabel(choice));button.innerHTML=objectHtml(choice);
    button.addEventListener('click',()=>answerRound(button,choice.id===round.target));
    grid.appendChild(button);
  }
}

function answerRound(button,correct){
  if(busy)return;busy=true;
  const round=ROUND_TEMPLATES[roundIndex];
  const buttons=[...dialog.querySelectorAll('.pet-play-choice')];buttons.forEach(b=>b.disabled=true);
  const feedback=dialog.querySelector('.pet-play-feedback'),mood=dialog.querySelector('.pet-play-mood');
  if(correct){
    if(!titleRoundWrong)score+=1;titleEvent({kind:'round',eventId:titleRun+'-'+roundIndex,correct:true,color:true,shape:true,size:roundIndex>=2,recovered:titleRoundWrong});button.classList.add('correct');feedback.className='pet-play-feedback ok';feedback.textContent='Nice catch!';mood.textContent='♥';
  }else{
    button.classList.add('wrong');const target=buttons.find(b=>b.dataset.id===round.target);if(target)target.classList.add('correct');feedback.className='pet-play-feedback no';feedback.textContent='Oops! Look at the words again.';mood.textContent='？';titleRoundWrong=true;busy=false;buttons.forEach(b=>b.disabled=b===button);feedback.textContent='もう一度、ことばを見て選んでみよう。';return;
  }
  mood.classList.add('show');
  setTimeout(()=>{roundIndex+=1;busy=false;renderRound();},850);
}

async function rewardClear(){
  const user=currentUser;
  if(!user||!db)return {rewarded:false,reason:'offline'};
  const today=happyDay();
  try{
    return await runTransaction(db,async tx=>{
      const ref=doc(db,'users',user.uid,'apps','english-playroom');
      const snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
      if(!hasPet(data))throw Error('ペットが見つかりません。');
      const play=data.petPlay&&typeof data.petPlay==='object'?data.petPlay:{};
      if(play.catchRewardDate===today)return {rewarded:false,reason:'already',happy:careState(data,today).happy,coins:count(data.coins)};
      const yesterday=yesterdayKey(today),saved=data.petCare&&typeof data.petCare==='object'?data.petCare:{};
      const previous=previousHappy(data,today);
      const petCare={...saved,happy:Math.min(10,careState(data,today).happy+1),happyDate:today};
      if(saved.happyDate===yesterday||saved.previousHappyDate===yesterday){petCare.previousHappy=previous;petCare.previousHappyDate=yesterday;}
      const coins=count(data.coins)+1;
      const petPlay={...play,catchRewardDate:today,lastCatchClearDate:today};
      tx.set(ref,{coins,petCare,petPlay,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      return {rewarded:true,reason:'rewarded',happy:petCare.happy,coins};
    });
  }catch(error){console.error('PET PLAY reward failed',error);return {rewarded:false,reason:'error'};}
}

function resultMood(){
  if(score===5)return {emotion:'🤩',title:'PERFECT!',message:`${petName()}は大よろこび！ 全部の英語を見分けられました。`,cls:'perfect'};
  if(score>=CLEAR_SCORE)return {emotion:'😄',title:'CLEAR!',message:`${petName()}もうれしそう！ 英語の指示をしっかり読めました。`,cls:'clear'};
  if(score===3)return {emotion:'😤',title:'SO CLOSE!',message:`${petName()}もちょっとくやしそう。あと1問でCLEAR！`,cls:'retry'};
  return {emotion:'🥺',title:'TRY AGAIN!',message:`${petName()}は「もう一回いっしょに遊ぼう！」と言っているみたい。`,cls:'retry'};
}

async function finishGame(){
  titleEvent({kind:'run',eventId:titleRun,score});void recordLearningActivity('pet-instructions');
  const clear=score>=CLEAR_SCORE,mood=resultMood();
  dialog.innerHTML=`<div class="pet-play-shell">${headerHtml()}<div class="pet-play-result"><div class="pet-play-result-pet ${mood.cls}">${petSVG()}<span class="pet-play-emotion" aria-hidden="true">${mood.emotion}</span></div><div class="pet-play-result-title">${mood.title}</div><div class="pet-play-result-score">${score} / ${ROUND_TEMPLATES.length}</div><p class="pet-play-result-message">${mood.message}</p><div id="petPlayRewardResult"></div><button class="pet-play-again" type="button">PLAY AGAIN</button></div></div>`;
  wireClose();dialog.querySelector('.pet-play-again').addEventListener('click',startGame);
  const rewardBox=dialog.querySelector('#petPlayRewardResult');
  if(!clear){rewardBox.innerHTML='<div class="pet-play-result-note">4問以上正解するとCLEARです。</div>';return;}
  rewardBox.innerHTML='<div class="pet-play-result-note">ごほうびを確認中…</div>';
  const reward=await rewardClear();
  if(!dialog.open)return;
  if(reward.rewarded){rewardBox.innerHTML=`<div class="pet-play-result-reward">🪙 +1 COIN <span>♥ ${reward.happy>=10?'HAPPY MAX':'HAPPY +1'}</span></div><div class="pet-play-result-note">今日のCATCH!クリア報酬を受け取りました。</div>`;}
  else if(reward.reason==='already'){rewardBox.innerHTML='<div class="pet-play-result-note">今日のクリア報酬は受け取り済みです。何度でも遊べます！</div>';}
  else{rewardBox.innerHTML='<div class="pet-play-result-note">報酬の保存に失敗しました。通信状態を確認して、もう一度CLEARしてください。</div>';}
}

function start(){
  injectStyles();
  const installTimer=setInterval(()=>{if(installButton())clearInterval(installTimer);},300);
  const observer=new MutationObserver(()=>syncButton());observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pet-state-updated',event=>{currentData=event.detail&&typeof event.detail==='object'?event.detail:{};syncButton();});
  if(!getApps().length){setTimeout(start,0);return;}
  const app=getApp();auth=getAuth(app);db=getFirestore(app);
  onAuthStateChanged(auth,user=>{currentUser=user;syncButton();if(!user&&dialog?.open)dialog.close();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
