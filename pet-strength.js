import {auth,db,walletRef} from './coin-reward.js?v=2.1.25';
import {onAuthStateChanged} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37';
import {getDocFromServer as getDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {hasPet} from './pet-model.js?v=2.1.25';
import {BASE_STATS,titleCount,strengthState,allocatePoint,allocationTotal,strengthLevel,randomBaseStats,hasIndividualBaseStats,grantedStrengthPoints,stepStrengthDraft,strengthDraftChanges} from './pet-strength-model.js?v=2.4.88';
import {MAGIC_SPELLS,magicAtLevel} from './pet-dungeons-model.js?v=2.4.95';

import {collectedTitleCount} from './title-ownership.js?v=1';

const RESPEC_PRICE=30;
const EMPTY_STRENGTH=Object.freeze({hp:0,attack:0,defense:0,mp:0});
function canStrengthen(data={}){return hasPet(data)||(!data.petHatched&&!data.petLastDeparture);}

const titleCountCache=new Map(),titleCountRequests=new Map();
function storedTitleCount(data={}){
 const collected=collectedTitleCount(data);
 if(collected!==null)return collected;
 if(!data||data.titleCountSummaryVersion!==1||Number(data.titleCountSyncedRevision)!==Number(data.titleCountRevision||0))return null;
 const n=Number(data.unlockedTitleCount);return Number.isSafeInteger(n)&&n>=0?n:null;
}
export async function loadStrengthTitles(user,{force=false,walletData=null}={}){
 const uid=user?.uid;if(!uid)throw Error('ログインが必要です。');
 const stored=collectedTitleCount(walletData);if(stored!==null){titleCountCache.set(uid,{count:stored,expiresAt:Date.now()+30000});return stored;}
 const cached=titleCountCache.get(uid);if(!force&&!walletData&&cached&&cached.expiresAt>Date.now())return cached.count;
 if(!force&&titleCountRequests.has(uid))return titleCountRequests.get(uid);
 const request=(async()=>{
  const view=walletData&&!walletData.titleCollectionVersion?'initialize':'strength';
  const token=await user.getIdToken(),r=await fetch('https://task-quest.onrender.com/api/learning/titles?view='+view,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error('称号を読み込めませんでした。もう一度お試しください。');
  const data=await r.json();if(!Array.isArray(data.titles)&&!Number.isSafeInteger(data.unlockedTitleCount))throw Error('称号を確認できませんでした。');
  const summarized=Number(data.unlockedTitleCount),count=Number.isSafeInteger(summarized)&&summarized>=0?summarized:titleCount(data.titles);titleCountCache.set(uid,{count,expiresAt:Date.now()+30000});return count;
 })();titleCountRequests.set(uid,request);
 try{return await request;}finally{if(titleCountRequests.get(uid)===request)titleCountRequests.delete(uid);}
}

function generationOf(data={}){const n=Number(data.petGeneration);return Number.isSafeInteger(n)&&n>0?n:1;}
function levelPointsOf(data={}){const n=Number(data.petStrengthLevelPoints),stored=Number.isSafeInteger(n)&&n>0?n:0;return Math.max(stored,allocationTotal(data.petStrength));}
function lastDepartureGeneration(data={}){const n=Number(data.petLastDeparture?.generation);return Number.isSafeInteger(n)&&n>0?n:0;}

function needsStatReconcile(data={}){
 const generation=generationOf(data),storedGeneration=Number(data.petBaseStatsGeneration)||0;
 if(hasPet(data)){
  const afterDeparture=!storedGeneration&&lastDepartureGeneration(data)>0&&lastDepartureGeneration(data)<generation;
  return !hasIndividualBaseStats(data.petBaseStats)||storedGeneration!==generation||afterDeparture;
 }
 if(!data.petLastDeparture)return false;
 return allocationTotal(data.petStrength)>0||data.petBaseStats!=null||storedGeneration!==generation||levelPointsOf(data)>0;
}

async function reconcilePetStats(user,source={}){
 if(!user||!needsStatReconcile(source))return source;
 const candidate=randomBaseStats();
 return runTransaction(db,async tx=>{
  const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{};
  if(!needsStatReconcile(data))return data;
  const generation=generationOf(data),storedGeneration=Number(data.petBaseStatsGeneration)||0;
  if(!hasPet(data)){
   if(!data.petLastDeparture)return data;
   const patch={petStrength:{...EMPTY_STRENGTH},petStrengthLevelPoints:0,petBaseStats:null,petBaseStatsGeneration:generation,petUpdatedAt:serverTimestamp()};
   tx.set(ref,patch,{merge:true});
   return {...data,...patch};
  }
  const generationChanged=storedGeneration>0&&storedGeneration!==generation;
  const migratedAfterDeparture=!storedGeneration&&lastDepartureGeneration(data)>0&&lastDepartureGeneration(data)<generation;
  const patch={petBaseStats:hasIndividualBaseStats(data.petBaseStats)&&!generationChanged?data.petBaseStats:candidate,petBaseStatsGeneration:generation,petUpdatedAt:serverTimestamp()};
  if(generationChanged||migratedAfterDeparture){patch.petStrength={...EMPTY_STRENGTH};patch.petStrengthLevelPoints=0;}
  tx.set(ref,patch,{merge:true});
  return {...data,...patch};
 });
}

let reconcileQueue=Promise.resolve();
function queueReconcile(user,data){
 reconcileQueue=reconcileQueue.catch(()=>{}).then(async()=>{
  if(!user||auth.currentUser?.uid!==user.uid)return;
  try{await reconcilePetStats(user,data);}catch(error){console.warn('pet stat reconciliation failed',error);}
 });
}

document.addEventListener('pet-state-updated',event=>{const user=auth.currentUser;if(user)queueReconcile(user,event.detail||{});});

function showLevelUp(level){
 const learned=magicAtLevel(level),dialog=document.createElement('dialog');dialog.className='strength-levelup-dialog';
 const magic=learned?`<div class="levelup-magic"><span>✨ NEW MAGIC!</span><strong>${learned.name}</strong><small>${learned.description} · MP ${learned.mpCost}</small></div>`:'';
 dialog.innerHTML=`<div class="levelup-card"><div class="levelup-stars">✦ ✨ ✦</div><span class="levelup-kicker">LEVEL UP!</span><strong class="levelup-level">Lv.${level}</strong>${magic}<button type="button">OK！</button></div>`;
 document.body.append(dialog);const close=()=>dialog.close();dialog.querySelector('button').onclick=close;dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}

const button=document.getElementById('petStrengthOpen');
if(button){
 const dialog=document.createElement('dialog');
 dialog.className='strength-dialog';dialog.setAttribute('aria-labelledby','strengthHeading');
 dialog.innerHTML='<header><h2 id="strengthHeading">ペット強化</h2><button type="button" data-close>閉じる</button></header><p>たまごの状態でも称号ポイントを配分できます。獲得した称号3個につき1ポイント。HPは＋2、攻撃力・防御力・MPは＋1ずつ強化でき、初めて使う強化ポイント1つにつきレベルが1上がります。</p><p class="strength-preview-help">＋／－の操作は仮の変更です。最後に「変更を確定」を押すまで保存されません。</p><div data-body></div><footer class="strength-actions"><button type="button" data-undo>元に戻す</button><button type="button" data-confirm>変更を確定</button></footer><p data-message role="status" aria-live="polite"></p>';
 document.body.append(dialog);
 const body=dialog.querySelector('[data-body]'),message=dialog.querySelector('[data-message]');
 const confirmButton=dialog.querySelector('[data-confirm]'),undoButton=dialog.querySelector('[data-undo]');
 let busy=false,generation=0,session=null;

 function pendingChanges(){
  if(!session)return null;
  return strengthDraftChanges(session.initial,session.draft);
 }
 function pendingTotal(){return Object.values(pendingChanges()||{}).reduce((sum,value)=>sum+value,0);}
 function requestClose(){
  if(busy)return;
  if(pendingTotal()>0&&!window.confirm('まだ確定していない強化があります。変更を破棄して閉じますか？'))return;
  session=null;dialog.close();
 }
 dialog.querySelector('[data-close]').onclick=requestClose;
 dialog.addEventListener('click',event=>{if(event.target===dialog)requestClose();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();requestClose();});

 function render(){
  if(!session)return;
  const {count,data,initial,draft}=session;
  const state=strengthState(count,draft,data.petBaseStats,{ageDays:data.petLifeDays,adult:hasPet(data)&&data.petAdult!==false,grantedPoints:grantedStrengthPoints(data)});
  const level=strengthLevel(levelPointsOf(data),draft),pending=pendingTotal();
  body.replaceChildren();
  const levelCard=document.createElement('div');levelCard.className='strength-level-card';levelCard.innerHTML=`<span>PET LEVEL${pending?'（仮）':''}</span><strong>Lv.${level}</strong>`;body.append(levelCard);
  const summary=document.createElement('p');summary.className='strength-summary';summary.textContent=`獲得称号 ${count}個　／　残り ${state.available}ポイント${pending?`（未確定 ${pending}pt）`:''}`;body.append(summary);
  const next=document.createElement('p');next.textContent=`次のポイントまで称号あと${3-count%3}個`;body.append(next);
  for(const [key,label,gain] of [['hp','HP',2],['attack','攻撃力',1],['defense','防御力',1],['mp','MP',1]]){
   const row=document.createElement('div');row.className='strength-row';
   const text=document.createElement('strong');text.textContent=`${label}　${state.stats[key]}${draft[key]>initial[key]?'（仮）':''}`;
   const actions=document.createElement('div');actions.className='strength-row-actions';
   const subtract=document.createElement('button');subtract.type='button';subtract.className='strength-subtract';subtract.textContent='－';subtract.setAttribute('aria-label',`${label}の未確定ポイントを1戻す`);
   subtract.disabled=busy||draft[key]<=initial[key];subtract.onclick=()=>change(key,-1);
   const add=document.createElement('button');add.type='button';add.textContent=`＋${gain}（1pt）`;add.disabled=busy||!canStrengthen(data)||state.available<1;add.onclick=()=>change(key,1);
   actions.append(subtract,add);row.append(text,actions);body.append(row);
  }
  const magicEffect=spell=>spell.description.replace('体力','HP');
  const learned=MAGIC_SPELLS.filter(spell=>spell.level<=level),list=document.createElement('section');list.className='strength-magic-list';
  const heading=document.createElement('h3');heading.textContent=`習得済みの魔法${pending?'（確定後に反映）':''}`;list.append(heading);
  for(const spell of learned){const item=document.createElement('p');item.innerHTML=`<strong>${spell.name}</strong><span>${magicEffect(spell)} ／ 消費MP ${spell.mpCost}</span>`;list.append(item);}
  if(!learned.length){const empty=document.createElement('p');empty.textContent='まだ魔法を習得していません。';list.append(empty);}body.append(list);
  const nextMagic=MAGIC_SPELLS.find(spell=>spell.level>level),magic=document.createElement('p');magic.className='strength-magic-next';magic.textContent=nextMagic?`次の魔法：Lv.${nextMagic.level}で「${nextMagic.name}」\n${magicEffect(nextMagic)} ／ 消費MP ${nextMagic.mpCost}`:'すべての魔法を習得済み！';body.append(magic);
  const note=document.createElement('p');note.textContent=hasPet(data)?'強化を確定すると、塔・洞窟の次の冒険から反映されます。確定後の振り直しはSHOPで30コインです（レベルは下がりません）。':canStrengthen(data)?'確定した強化ポイントとレベルは、孵化後の冒険から反映されます。':'新しいたまごを迎えると強化できます。';body.append(note);
  undoButton.disabled=busy||pending===0;
  confirmButton.disabled=busy||pending===0;
  confirmButton.textContent=pending?`変更を確定（${pending}pt）`:'変更を確定';
 }

 function change(key,direction){
  if(busy||!session)return;
  try{
   const {count,data,initial,draft}=session;
   session.draft=stepStrengthDraft(count,initial,draft,key,direction,grantedStrengthPoints(data));
   message.textContent='';render();
  }catch(error){message.textContent=error.message||'ポイントを変更できませんでした。';}
 }
 undoButton.onclick=()=>{
  if(busy||!session)return;
  session.draft={...session.initial};message.textContent='未確定の変更を元に戻しました。';render();
 };

 async function load(){
  const user=auth.currentUser;if(!user||busy)return;
  const id=++generation;busy=true;session=null;body.textContent='読み込み中…';message.textContent='';
  confirmButton.disabled=true;undoButton.disabled=true;dialog.showModal();
  try{
   // Reuse the home page's existing wallet subscription; no extra Firestore read on normal opens.
   const live=window.MonstudyShopState;
   const dataFromWallet=live?.ready&&live.user?.uid===user.uid?live.data:null;
   const snap=dataFromWallet==null?await getDoc(walletRef(user)):null;
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   let data=dataFromWallet??(snap?.data()||{});
   data=await reconcilePetStats(user,data);
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   const count=await loadStrengthTitles(user,{walletData:data});
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   const initial=strengthState(count,data.petStrength,BASE_STATS,{grantedPoints:grantedStrengthPoints(data)}).points;
   session={uid:user.uid,count,data,initial:{...initial},draft:{...initial},generation:generationOf(data)};
   busy=false;render();
  }catch(error){if(id===generation){body.textContent='';message.textContent=error.message||'読み込めませんでした。';}}
  finally{if(id===generation)busy=false;}
 }

 async function save(){
  const user=auth.currentUser;if(!user||busy||!session||session.uid!==user.uid)return;
  const changes=pendingChanges(),total=Object.values(changes).reduce((sum,value)=>sum+value,0);
  if(total===0)return;
  const id=generation,editing=session;
  busy=true;render();message.textContent='確定して保存しています…';
  try{
   const result=await runTransaction(db,async tx=>{
    if(auth.currentUser?.uid!==user.uid)throw Error('ログインし直してください。');
    const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{};
    if(!canStrengthen(data)||generationOf(data)!==editing.generation)throw Error('ペットの状態が変わりました。画面を開き直してください。');
    const count=storedTitleCount(data);
    if(count===null||count!==editing.count)throw Error('称号ポイントが更新されました。画面を開き直してください。');
    const current=strengthState(count,data.petStrength,BASE_STATS,{grantedPoints:grantedStrengthPoints(data)}).points;
    if(Object.keys(changes).some(key=>current[key]!==editing.initial[key]))throw Error('別の画面で強化内容が変わりました。画面を開き直してください。');
    let petStrength={...current};
    for(const key of ['hp','attack','defense','mp'])for(let n=0;n<changes[key];n++)petStrength=allocatePoint(count,petStrength,key,grantedStrengthPoints(data));
    const beforeLevel=strengthLevel(levelPointsOf(data),data.petStrength);
    const petStrengthLevelPoints=Math.max(levelPointsOf(data),allocationTotal(petStrength));
    const afterLevel=strengthLevel(petStrengthLevelPoints,petStrength);
    tx.set(ref,{petStrength,petStrengthLevelPoints,petUpdatedAt:serverTimestamp()},{merge:true});
    return {data:{...data,petStrength,petStrengthLevelPoints},count,beforeLevel,afterLevel};
   });
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   const initial=strengthState(result.count,result.data.petStrength,BASE_STATS,{grantedPoints:grantedStrengthPoints(result.data)}).points;
   session={uid:user.uid,count:result.count,data:result.data,initial:{...initial},draft:{...initial},generation:generationOf(result.data)};
   message.textContent='すべての変更をまとめて保存しました！';
   if(result.afterLevel>result.beforeLevel)showLevelUp(result.afterLevel);
  }catch(error){if(id===generation)message.textContent=error.message||'保存できませんでした。再度お試しください。';}
  finally{if(id===generation){busy=false;render();}}
 }
 confirmButton.onclick=save;
 button.onclick=load;
 onAuthStateChanged(auth,user=>{
  generation++;busy=false;session=null;button.disabled=!user;dialog.close();body.replaceChildren();
  // Pet stats are reconciled by the existing lifecycle update, not by every draft click.
 });
}

let shopRespecBusy=false;
function ensureRespecShopCard(){
 const note=document.querySelector('#petShopDialog [data-dungeon-shop-panel] .dungeon-shop-note');
 if(!note||document.querySelector('#petShopDialog [data-strength-respec-card]'))return;
 const card=document.createElement('section');card.className='pet-strength-respec-card';card.dataset.strengthRespecCard='';
 card.innerHTML='<div><strong>🔄 ステータス振り直し</strong><span>称号で獲得した強化ポイントをすべて未配分に戻します。生まれつきの個体差とペットレベルは変わりません。</span></div><button type="button">🪙 30コインで振り直す</button><small role="status"></small>';
 note.insertAdjacentElement('beforebegin',card);
 const buy=card.querySelector('button'),status=card.querySelector('small');
 buy.addEventListener('click',async()=>{
  const user=auth.currentUser;if(!user||shopRespecBusy)return;
  if(!window.confirm('30コインを使って、強化ポイントをすべて振り直せる状態にしますか？\nペットレベルは下がりません。'))return;
  shopRespecBusy=true;buy.disabled=true;status.textContent='振り直し中…';status.className='';
  try{
   await runTransaction(db,async tx=>{
    const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{};
    if(!canStrengthen(data))throw Error('たまごの状態またはペットがいるときに使えます。');
    if(allocationTotal(data.petStrength)<1)throw Error('振り分け済みの強化ポイントがありません。');
    const coins=Math.max(0,Math.floor(Number(data.coins)||0));
    if(coins<RESPEC_PRICE)throw Error('コインが足りません。');
    const petStrengthLevelPoints=levelPointsOf(data);
    tx.set(ref,{coins:coins-RESPEC_PRICE,petStrength:{...EMPTY_STRENGTH},petStrengthLevelPoints,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
   });
   status.textContent='振り直し完了！「ペット強化」からポイントを配り直せます。レベルは維持されています。';status.className='ok';
  }catch(error){status.textContent=error?.message||'振り直しできませんでした。';status.className='error';}
  finally{shopRespecBusy=false;buy.disabled=false;}
 });
}

if(typeof MutationObserver!=='undefined'){
 const observer=new MutationObserver(()=>ensureRespecShopCard());
 observer.observe(document.documentElement,{childList:true,subtree:true});
 ensureRespecShopCard();
}

