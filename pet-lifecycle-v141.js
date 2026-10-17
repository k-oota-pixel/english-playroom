import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet,normalizePetName,validPetName} from './pet-model.js';

const LIFECYCLE_VERSION=141;
const MAX_MEMORIES=40;
const app=getApps().length?getApp():null;
const auth=app?getAuth(app):null;
const db=app?getFirestore(app):null;
let currentUser=null,currentData={},unsubscribe=null,lastSvgSignature='';

function localDateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function int(value,fallback=0){const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.floor(n)):fallback;}
function lifeDays(data={}){return int(data.petLifeDays,0);}
function generationOf(data={}){return Math.max(1,int(data.petGeneration,1));}
function stageOf(data={}){
  if(!hasPet(data))return 'egg';
  const days=lifeDays(data);
  if(days<10)return 'baby';
  if(days<30)return 'adult';
  return 'elder';
}
function visualStage(data={}){return stageOf(data)==='baby'?'baby':'adult';}
function chanceFor(days){if(days<30)return 0;if(days<40)return .01;if(days<50)return .03;if(days<60)return .06;return .10;}
function hashString(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function shouldDepart(uid,generation,today,days){const chance=chanceFor(days);if(!chance)return false;return (hashString(`${uid}|${generation}|${today}|${days}`)%10000)/10000<chance;}
function safeAppearance(value){return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):null;}
function petName(data){return validPetName(data?.petName)?normalizePetName(data.petName):'ペット';}
function memoriesOf(data={}){return Array.isArray(data.petMemories)?data.petMemories.filter(x=>x&&typeof x==='object'):[];}
function dataRef(user){return doc(db,'users',user.uid,'apps','english-playroom');}

function cumulativeLoginPatch(data,today){
  const days=int(data.petLoginDays,0),last=typeof data.petLastLoginDate==='string'?data.petLastLoginDate:'';
  const count=!last||today>last;
  return count?{petLoginDays:days+1,petLastLoginDate:today}:{};
}

function advanceLifecycle(source,today,uid){
  const loginPatch=cumulativeLoginPatch(source,today);
  const data={...source,...loginPatch};
  const patch={...loginPatch};
  const oldVersion=int(data.petLifecycleVersion,0);

  if(oldVersion<LIFECYCLE_VERSION){
    patch.petLifecycleVersion=LIFECYCLE_VERSION;
    patch.petGeneration=generationOf(data);
    patch.petLastLifeLoginDate=today;
    patch.petLastLifeCheckDate='';
    if(hasPet(data)){
      // ver1.4.1 launch: every existing pet gets to experience the new juvenile form.
      patch.petLifeDays=3;
      return {patch,data:{...data,...patch},event:'migrated'};
    }
    // Existing eggs keep the progress they had already earned, capped at hatch day.
    patch.petLifeDays=Math.min(3,int(data.petLoginDays,0));
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
  if(hasPet(merged)&&counted&&days>=30&&merged.petLastLifeCheckDate!==today){
    patch.petLastLifeCheckDate=today;
    if(shouldDepart(uid,generationOf(merged),today,days)){
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
        petMemories:memories,
        petLastDeparture:memory,
        petGeneration:generation+1,
        petHatched:false,
        petName:null,
        petAppearance:null,
        petHatchedAt:null,
        petCustomizedAt:null,
        petLifeDays:0,
        petLastLifeLoginDate:today,
        petLastLifeCheckDate:today
      });
      merged={...data,...patch};
      return {patch,data:merged,event:'departed',memory};
    }
  }
  return {patch,data:{...data,...patch},event:''};
}

function ensureStyles(){
  if(document.getElementById('petLifecycle141Styles'))return;
  const style=document.createElement('style');style.id='petLifecycle141Styles';
  style.textContent=`
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
  const mod=await import('./pet-art.js');return mod.renderPetSVG(appearance,shop,stage);
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

async function rerenderIfNeeded(data){
  if(!hasPet(data))return;
  const stage=visualStage(data),appearance=data.petAppearance||{},equipped=data.petShop?.equipped||{};
  const signature=`${stage}|${JSON.stringify(appearance)}|${JSON.stringify(equipped)}`;
  const visual=document.getElementById('petVisual');if(!visual)return;
  const svg=visual.querySelector('svg');
  if(signature===lastSvgSignature&&svg?.dataset?.petStage===stage)return;
  lastSvgSignature=signature;
  try{
    visual.innerHTML=await svgFor(appearance,data.petShop,stage);
    visual.classList.remove('egg');visual.classList.add('hatched');
  }catch(error){console.error('Pet lifecycle render failed',error);}
}

function applyUi(data={}){
  currentData=data;ensureStyles();const memoryButton=ensureMemoryButton();
  const stage=stageOf(data),days=lifeDays(data),hatched=hasPet(data),generation=generationOf(data);
  document.documentElement.dataset.petStage=stage;
  const petDays=document.getElementById('petDays'),status=document.getElementById('petStatus'),bar=document.getElementById('petBar'),create=document.getElementById('petCreate');
  if(memoryButton)memoryButton.hidden=!memoriesOf(data).length;
  if(hatched){
    rerenderIfNeeded(data);
    if(petDays)petDays.textContent=stage==='baby'?`幼体 · ${days}日目`:stage==='adult'?`成体 · ${days}日目`:`長寿期 · ${days}日目`;
    if(status){
      if(stage==='baby')status.textContent=days<10?`あと${10-days}回ログインすると、おとなの姿に成長します。`:'今日も一緒に英語を楽しもう。';
      else if(stage==='adult')status.textContent=`一緒に過ごして${days}日目。30日目から長寿期に入ります。`;
      else status.textContent=`長寿期${days}日目。今日も一緒に過ごせる大切な一日です。`;
    }
    if(create)create.hidden=true;
  }else if(currentUser){
    const ready=days>=3,shown=Math.min(3,days);
    if(petDays)petDays.textContent=generation>1?`新しいたまご ${shown} / 3日`:`ログイン ${shown} / 3日`;
    if(bar)bar.style.width=`${Math.min(100,(shown/3)*100)}%`;
    if(create)create.hidden=!ready;
    const title=document.getElementById('petTitle');
    if(title)title.textContent=ready?'たまごがかえりそう！':generation>1?'新しいふしぎなたまご':'ふしぎなたまご';
    if(status)status.textContent=ready?'アンケートに答えて、新しい相棒に出会おう。':days?`あと${3-days}回ログインすると、たまごがかえります。`:'新しいたまごを育てよう。';
  }
}

function installGuard(){
  document.addEventListener('click',event=>{
    const button=event.target instanceof Element?event.target.closest('#petCreate'):null;if(!button||!currentUser)return;
    if(!hasPet(currentData)&&lifeDays(currentData)<3){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();applyUi(currentData);}
  },true);
}

async function synchronize(user){
  const today=localDateKey();
  const result=await runTransaction(db,async transaction=>{
    const ref=dataRef(user),snap=await transaction.get(ref),source=snap.exists()?(snap.data()||{}):{};
    const advanced=advanceLifecycle(source,today,user.uid);
    if(Object.keys(advanced.patch).length)transaction.set(ref,{...advanced.patch,petUpdatedAt:serverTimestamp()},{merge:true});
    return advanced;
  });
  currentData=result.data;applyUi(result.data);
  if(result.event==='departed')showDeparture(result.memory,user);
}

function start(){
  if(!auth||!db)return;ensureStyles();ensureMemoryButton();installGuard();
  onAuthStateChanged(auth,user=>{
    if(unsubscribe){unsubscribe();unsubscribe=null;}currentUser=user;currentData={};lastSvgSignature='';
    if(!user){delete document.documentElement.dataset.petStage;const b=ensureMemoryButton();if(b)b.hidden=true;return;}
    const ref=dataRef(user);
    unsubscribe=onSnapshot(ref,snap=>{if(auth.currentUser?.uid!==user.uid)return;currentData=snap.exists()?(snap.data()||{}):{};applyUi(currentData);},error=>console.error('Pet lifecycle snapshot failed',error));
    synchronize(user).catch(error=>console.error('Pet lifecycle sync failed',error));
  });
  // The legacy page renderer still updates some labels after auth; quietly re-apply lifecycle labels.
  setInterval(()=>{if(currentUser)applyUi(currentData);},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

export {stageOf,visualStage,lifeDays,chanceFor,LIFECYCLE_VERSION};
