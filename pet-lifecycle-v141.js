import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.3";
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet,normalizePetName,validPetName} from './pet-model.js?v=2.1.25';

import {growthPatch,hatchPatch,hatchDay} from './pet-growth.js';
import {renderPetVisual} from './pet-art.js?v=2.1.25';
import {chanceFor,shouldDepart} from './pet-lifetime-model.js?v=2.1.62';
import {advanceHealth} from './pet-health-model.js?v=1.8.1';
const LIFECYCLE_VERSION=141;
const MAX_MEMORIES=40;
const app=getApps().length?getApp():null;
const auth=app?getAuth(app):null;
const db=app?getFirestore(app):null;
let currentUser=null,currentData={},unsubscribe=null,lastSvgSignature='',syncInitializedUid='';

function localDateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function int(value,fallback=0){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):fallback;}
function lifeDays(data={}){return int(data.petLifeDays,0);}
function generationOf(data={}){return Math.max(1,int(data.petGeneration,1));}
function stageOf(data={}){
  if(!hasPet(data))return 'egg';
  const days=lifeDays(data);
  if(data.petAdult===false)return 'baby';
  if(days<6)return 'adult';
  return 'elder';
}
function visualStage(data={}){return data.petAdult===false?'mystery':'baby';}
function safeAppearance(value){return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):null;}
function petName(data){return validPetName(data?.petName)?normalizePetName(data.petName):'ペット';}
function memoriesOf(data={}){return Array.isArray(data.petMemories)?data.petMemories.filter(x=>x&&typeof x==='object'):[];}
function dataRef(user){return doc(db,'users',user.uid,'apps','english-playroom');}

function cumulativeLoginPatch(data,today){
  const days=int(data.petLoginDays,0),last=typeof data.petLastLoginDate==='string'?data.petLastLoginDate:'';
  const count=!last||today>last;
  return count?{petLoginDays:days+1,petLastLoginDate:today}:{};
}

function previousDateKey(dateKey){const d=new Date(dateKey+'T12:00:00');d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function loginStreakPatch(data,today){
  const last=typeof data.loginStreakLastDate==='string'?data.loginStreakLastDate:'';
  const current=Math.max(0,Math.min(7,int(data.loginStreakDay,0)));
  if(last===today)return {};
  const next=last===previousDateKey(today)&&current>0?(current===7?1:current+1):1;
  return {loginStreakLastDate:today,loginStreakDay:next};
}
function advanceLifecycle(source,today,uid){
  const loginPatch=cumulativeLoginPatch(source,today);
  const streakPatch=loginStreakPatch(source,today);
  const data={...source,...loginPatch,...streakPatch};
  const patch={...loginPatch,...streakPatch,...growthPatch(data,today,uid)};
  if(hasPet(data)&&data.petAdult===false&&validPetName(data.petName))patch.petName=null;
  const health=advanceHealth(data,today,uid);Object.assign(patch,health.patch);Object.assign(data,health.patch);
  const oldVersion=int(data.petLifecycleVersion,0);

  if(oldVersion<LIFECYCLE_VERSION){
    patch.petLifecycleVersion=LIFECYCLE_VERSION;
    patch.petGeneration=generationOf(data);
    patch.petLastLifeLoginDate=today;
    patch.petLastLifeCheckDate='';
    if(hasPet(data)){
      patch.petLifeDays=Math.max(2,lifeDays(data));
      return {patch,data:{...data,...patch},event:'migrated'};
    }
    // Existing eggs keep the progress they had already earned, capped at the new hatch day.
    patch.petLifeDays=Math.min(2,int(data.petLoginDays,0));
    return {patch,data:{...data,...patch},event:''};
  }

  let days=lifeDays(data);
  const lastLife=typeof data.petLastLifeLoginDate==='string'?data.petLastLifeLoginDate:'';
  const counted=!lastLife||today>lastLife;
  if(counted){
    days+=1;
    patch.petLifeDays=days;
    patch.petLastLifeLoginDate=today;
  }

  let merged={...data,...patch};
  if(hasPet(merged)&&counted&&(health.fatal||(days>=6&&merged.petLastLifeCheckDate!==today))){
    patch.petLastLifeCheckDate=today;
    const newlySick=health.patch.petHealth?.sick&&!source.petHealth?.sick;
    if(health.fatal||(!newlySick&&shouldDepart(uid,generationOf(merged),today,days,merged))){
      const generation=generationOf(merged);
      const memory={
        id:`g${generation}-${today}`,
        generation,
        name:petName(merged),
        species:merged.petAppearance?.species||'',
        appearance:safeAppearance(merged.petAppearance),
        lifetimeDays:days,
        departedDate:today
      };
      const memories=[...memoriesOf(merged),memory].slice(-MAX_MEMORIES);
      Object.assign(patch,{
        petHealth:null,petWaste:{count:0,day:Math.floor(Date.parse(today+'T00:00:00Z')/86400000)},
        petMemories:memories,
        petLastDeparture:memory,
        petGeneration:generation+1,
        petHatched:false,
        petAdult:false,petGrowthPending:false,petHatchDate:null,petGrowthCheckedDay:1,
        petName:null,
        petAppearance:null,
        petHatchedAt:null,
        petCustomizedAt:null,
        petLifeDays:0,
        petCare:{happy:0,happyDate:today,previousHappy:0,previousHappyDate:''},
        petLastLifeLoginDate:today,
        petLastLifeCheckDate:today
      });
      merged={...data,...patch};
      return {patch,data:merged,event:'departed',memory};
    }
  }
  return {patch,data:{...data,...patch},event:''};
}

function renderHealth(data){
 const visual=document.getElementById('petVisual'),host=visual?.closest('.pet-visual-wrap');if(!host)return;
 const sick=hasPet(data)&&data.petHealth?.sick===true;visual.toggleAttribute('data-pet-sick',sick);
 let badge=host.querySelector('.pet-health-indicator');if(!sick){badge?.remove();return;}
 if(!badge){badge=document.createElement('span');badge.className='pet-health-indicator';badge.setAttribute('role','status');badge.style.cssText='position:absolute;right:3px;top:5px;z-index:14;padding:4px 7px;border-radius:12px;background:#fff3e9;color:#92513e;font-size:12px;font-weight:800;pointer-events:none';host.append(badge);}
 badge.textContent='🌡️ 病気';badge.title='SHOPの「おくすり」で注射（5コイン）を使うと回復します。';
}
function ensureStyles(){
  if(document.getElementById('petLifecycle141Styles'))return;
  const style=document.createElement('style');style.id='petLifecycle141Styles';
  style.textContent=`
#petVisual[data-pet-sick] .pet-character{animation-duration:14s!important}
.pet-memory-button{margin-left:6px}.pet-life-chip{display:inline-flex;align-items:center;gap:4px;margin-top:7px;padding:4px 8px;border-radius:999px;background:#f4efe2;color:#766027;font-size:10px;font-weight:850}
.pet-life-dialog{width:min(620px,calc(100% - 24px))}.pet-life-dialog .pet-actions{position:sticky;bottom:-24px;background:#fffdf8;padding-top:10px}.pet-departure-card{text-align:center}.pet-departure-visual{width:150px;height:150px;margin:10px auto}.pet-departure-visual svg{width:100%;height:100%;display:block;border-radius:24px}.pet-departure-days{font-size:26px;font-weight:900;color:#2d6656;margin:8px 0}.pet-memory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.pet-memory-card{display:grid;grid-template-columns:74px 1fr;gap:10px;align-items:center;border:1px solid #e5dfcf;background:#fff;border-radius:15px;padding:9px}.pet-memory-thumb{width:74px;height:74px}.pet-memory-thumb svg{width:100%;height:100%;display:block;border-radius:13px}.pet-memory-name{font-weight:900}.pet-memory-meta{font-size:10px;color:#748078;line-height:1.5;margin-top:3px}
html[data-pet-stage="baby"] #petVisual.hatched .pet-character{animation-duration:11.4s!important}
@media(max-width:560px){.pet-memory-grid{grid-template-columns:1fr}.pet-life-dialog{padding:18px}.pet-departure-visual{width:130px;height:130px}}
`;
  document.head.appendChild(style);
}

function ensureMemoryButton(){
  let button=document.getElementById('petMemoriesButton');
  if(button)return button;
  const anchor=document.getElementById('petNameButton')||document.getElementById('petCreate');
  if(!anchor)return null;
  button=document.createElement('button');button.id='petMemoriesButton';button.type='button';button.className='pet-button secondary pet-memory-button';button.textContent='思い出帳';button.hidden=true;
  anchor.insertAdjacentElement('afterend',button);
  button.addEventListener('click',()=>openMemories());
  return button;
}

function ensureDepartureDialog(){
  let dialog=document.getElementById('petDepartureDialog');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='petDepartureDialog';dialog.className='pet-dialog pet-life-dialog';
  dialog.innerHTML='<div class="pet-departure-card"><div class="survey-eyebrow">MEMORIES</div><h2>大切な相棒が旅立ちました</h2><div id="petDepartureVisual" class="pet-departure-visual"></div><div id="petDepartureText"></div><div class="pet-actions"><button type="button" class="pet-button" data-close>思い出帳に残す</button></div></div>';
  document.body.appendChild(dialog);dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());return dialog;
}
function ensureMemoriesDialog(){
  let dialog=document.getElementById('petMemoriesDialog');if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.id='petMemoriesDialog';dialog.className='pet-dialog pet-life-dialog';
  dialog.innerHTML='<div class="survey-eyebrow">MEMORY BOOK</div><h2>ペットの思い出帳</h2><p>これまで一緒に過ごした相棒たちです。</p><div id="petMemoryGrid" class="pet-memory-grid"></div><div class="pet-actions"><button type="button" class="pet-button secondary" data-close>閉じる</button></div>';
  document.body.appendChild(dialog);dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());return dialog;
}

async function svgFor(appearance,shop,stage='adult'){
  const mod=await import('./pet-art.js?v=2.1.25');return mod.renderPetSVG(appearance,shop,stage);
}
async function openMemories(){
  const memories=memoriesOf(currentData);if(!memories.length)return;
  const dialog=ensureMemoriesDialog(),grid=dialog.querySelector('#petMemoryGrid');grid.replaceChildren();
  for(const memory of [...memories].reverse()){
    const card=document.createElement('article');card.className='pet-memory-card';
    const thumb=document.createElement('div');thumb.className='pet-memory-thumb';
    const info=document.createElement('div');const name=document.createElement('div');name.className='pet-memory-name';name.textContent=memory.name||'ペット';
    const meta=document.createElement('div');meta.className='pet-memory-meta';meta.textContent=`第${memory.generation||'?'}世代 · ${int(memory.lifetimeDays)}日間\n${memory.departedDate||''}`;meta.style.whiteSpace='pre-line';
    info.append(name,meta);card.append(thumb,info);grid.append(card);
    if(memory.appearance)svgFor(memory.appearance,{},'adult').then(svg=>thumb.innerHTML=svg).catch(()=>{});
  }
  dialog.showModal();
}
async function showDeparture(memory,user){
  if(!memory||!user)return;
  const key=`monsterstudy-departure-seen:${user.uid}:${memory.id||memory.departedDate}`;
  try{if(localStorage.getItem(key)==='1')return;localStorage.setItem(key,'1');}catch{}
  const dialog=ensureDepartureDialog(),visual=dialog.querySelector('#petDepartureVisual'),text=dialog.querySelector('#petDepartureText');
  text.innerHTML='';const lead=document.createElement('div');lead.className='pet-departure-days';lead.textContent=`${int(memory.lifetimeDays)}日間`;
  const p=document.createElement('p');p.textContent=`${memory.name||'ペット'}と一緒に過ごしました。思い出は思い出帳に残っています。新しいたまごがやってきました。`;
  text.append(lead,p);if(memory.appearance)svgFor(memory.appearance,{},'adult').then(svg=>visual.innerHTML=svg).catch(()=>{});
  setTimeout(()=>{if(!dialog.open)dialog.showModal();},350);
}

function rerenderIfNeeded(data){
  if(!hasPet(data))return;
  const visual=document.getElementById('petVisual');if(!visual)return;
  renderPetVisual(visual,data);
  visual.classList.remove('egg');visual.classList.add('hatched');
}

function applyUi(data={}){
  currentData=data;renderHealth(data);document.dispatchEvent(new CustomEvent('pet-state-updated',{detail:data}));ensureStyles();const memoryButton=ensureMemoryButton();
  const stage=stageOf(data),days=lifeDays(data),hatched=hasPet(data),generation=generationOf(data);
  document.documentElement.dataset.petStage=stage;
  const petDays=document.getElementById('petDays'),status=document.getElementById('petStatus'),bar=document.getElementById('petBar'),create=document.getElementById('petCreate');
  if(memoryButton)memoryButton.hidden=!memoriesOf(data).length;
  if(hatched){
    const title=document.getElementById('petTitle');if(title)title.textContent=data.petAdult===false?'ペットの赤ちゃん':validPetName(data.petName)?normalizePetName(data.petName):'わたしのペット';
    const nameButton=document.getElementById('petNameButton');if(nameButton)nameButton.hidden=data.petAdult===false||validPetName(data.petName);
    rerenderIfNeeded(data);
    if(petDays){petDays.hidden=stage==='baby';petDays.textContent=stage==='baby'?'':`${days}才`;}
    if(status){
      status.hidden=(stage==='baby'||stage==='elder')&&!data.petGrowthPending;
      if(data.petGrowthPending)status.textContent='成長のときが来ました！アンケートに答えて成体に育てよう。';
      else if(stage==='baby')status.textContent='';
      else if(stage==='adult')status.textContent='';
      else status.textContent='';
    }
    if(create){create.hidden=!data.petGrowthPending;create.textContent='成長アンケートに答える';}
  }else if(currentUser){
    const ready=days>=2,shown=Math.min(2,days);
    if(petDays){petDays.hidden=false;petDays.textContent=generation>1?`新しいたまご ${shown} / 2日`:`ログイン ${shown} / 2日`;}
    if(bar)bar.style.width=`${Math.min(100,(shown/2)*100)}%`;
    if(create){create.hidden=!ready;create.textContent='たまごをかえす';}
    const title=document.getElementById('petTitle');
    if(title)title.textContent=ready?'たまごがかえりそう！':generation>1?'新しいふしぎなたまご':'ふしぎなたまご';
    if(status){status.hidden=false;status.textContent=ready?'たまごをかえして、ペットの赤ちゃんを迎えよう。':days?`あと${2-days}回ログインすると、たまごがかえります。`:'新しいたまごを育てよう。';}
  }
}

function installGuard(){
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('#petCreate'):null;if(!button||!currentUser)return;
    if(hasPet(currentData))return;
    const days=lifeDays(currentData);
    if(days<2){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();applyUi(currentData);return;
    }
    // The legacy page still has a 3-day hatch check. On day 2, hatch here first and stop that older handler.
    if(days===2){
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();button.disabled=true;
      const user=currentUser,today=localDateKey();
      runTransaction(db,async transaction=>{
        const ref=dataRef(user),snap=await transaction.get(ref),data=snap.exists()?(snap.data()||{}):{};
        if(hasPet(data))return;
        const progress=Math.max(int(data.petLifeDays,0),int(data.petLoginDays,0));
        if(progress<2)throw Error('2日ログインすると孵化できます。');
        transaction.set(ref,{...hatchPatch(today),petHatchedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      }).catch(error=>{const status=document.getElementById('petStatus');if(status)status.textContent=error.message||'孵化できませんでした。';}).finally(()=>{button.disabled=false;});
    }
  },true);
}

async function synchronize(user,source=currentData){
  const today=localDateKey();
  const preview=advanceLifecycle(source||{},today,user.uid);
  if(!Object.keys(preview.patch).length){
    currentData=preview.data;applyUi(preview.data);
    if(preview.event==='departed')showDeparture(preview.memory,user);
    return preview.data;
  }
  const result=await runTransaction(db,async transaction=>{
    const ref=dataRef(user),snap=await transaction.get(ref),source=snap.exists()?(snap.data()||{}):{};
    const advanced=advanceLifecycle(source,today,user.uid);
    if(Object.keys(advanced.patch).length)transaction.set(ref,{...advanced.patch,petUpdatedAt:serverTimestamp()},{merge:true});
    return advanced;
  });
  currentData=result.data;applyUi(result.data);
  if(result.event==='departed')showDeparture(result.memory,user);
  return result.data;
}
function publishLifecycleSync(user,data,error=null){
  const detail={uid:user.uid,data:data||{},error:error?String(error.message||error):null,at:Date.now()};
  window.MonstudyLifecycleSync=detail;
  window.dispatchEvent(new CustomEvent('pet-lifecycle-sync-complete',{detail}));
}
async function runLifecycleSync(user){
  try{const data=await synchronize(user,currentData);publishLifecycleSync(user,data);}
  catch(error){publishLifecycleSync(user,currentData,error);console.error('Pet lifecycle sync failed',error);}
}
window.addEventListener('pet-lifecycle-sync-request',event=>{
  const uid=event.detail?.uid;if(!currentUser||currentUser.uid!==uid)return;
  window.MonstudyLifecycleSync=null;
  runLifecycleSync(currentUser);
});

function start(){
  if(!auth||!db)return;ensureStyles();ensureMemoryButton();installGuard();
  onAuthStateChanged(auth,user=>{
    if(unsubscribe){unsubscribe();unsubscribe=null;}currentUser=user;currentData={};lastSvgSignature='';syncInitializedUid='';window.MonstudyLifecycleSync=null;
    if(!user){renderHealth({});delete document.documentElement.dataset.petStage;const b=ensureMemoryButton();if(b)b.hidden=true;return;}
    const ref=dataRef(user);
    unsubscribe=onSnapshot(ref,snap=>{if(auth.currentUser?.uid!==user.uid)return;currentData=snap.exists()?(snap.data()||{}):{};applyUi(currentData);if(snap.metadata?.fromCache===false&&syncInitializedUid!==user.uid){syncInitializedUid=user.uid;runLifecycleSync(user);}},error=>{console.error('Pet lifecycle snapshot failed',error);if(syncInitializedUid!==user.uid)publishLifecycleSync(user,currentData,error);});
  });
  // The legacy page renderer still updates some labels after auth; quietly re-apply lifecycle labels.
  let checkedDate=localDateKey();
  setInterval(()=>{if(currentUser){applyUi(currentData);const today=localDateKey();if(today>checkedDate){checkedDate=today;synchronize(currentUser).catch(console.error);}}},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

export {stageOf,visualStage,lifeDays,chanceFor,LIFECYCLE_VERSION};
