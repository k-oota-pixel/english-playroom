import {auth,db,walletRef} from './coin-reward.js?v=2.1.11';
import {onAuthStateChanged} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.2';
import {getDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {hasPet} from './pet-model.js';
import {BASE_STATS,titleCount,strengthState,allocatePoint,allocationTotal,strengthLevel,randomBaseStats,hasIndividualBaseStats} from './pet-strength-model.js?v=1.10.22';
import {MAGIC_SPELLS,magicAtLevel} from './pet-dungeons-model.js?v=1.10.22';

const RESPEC_PRICE=30;
const EMPTY_STRENGTH=Object.freeze({hp:0,attack:0,defense:0,mp:0});

const titleCountCache=new Map(),titleCountRequests=new Map();
export async function loadStrengthTitles(user,{force=false}={}){
 const uid=user?.uid;if(!uid)throw Error('ログインが必要です。');
 const cached=titleCountCache.get(uid);if(!force&&cached&&cached.expiresAt>Date.now())return cached.count;
 if(!force&&titleCountRequests.has(uid))return titleCountRequests.get(uid);
 const request=(async()=>{
  const token=await user.getIdToken(),r=await fetch('https://task-quest.onrender.com/api/learning/titles',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(45000)});
  if(!r.ok)throw Error('称号を読み込めませんでした。もう一度お試しください。');
  const data=await r.json();if(!Array.isArray(data.titles))throw Error('称号を確認できませんでした。');
  const count=titleCount(data.titles);titleCountCache.set(uid,{count,expiresAt:Date.now()+30000});return count;
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
 dialog.innerHTML='<header><h2 id="strengthHeading">ペット強化</h2><button type="button" data-close>閉じる</button></header><p>獲得した称号3個につき1ポイント。HPは＋2、攻撃力・防御力・MPは＋1ずつ強化できます。初めて使う強化ポイント1つにつきレベルが1上がります。</p><div data-body></div><p data-message role="status"></p>';
 document.body.append(dialog);
 const body=dialog.querySelector('[data-body]'),message=dialog.querySelector('[data-message]');
 let busy=false,generation=0;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});

 function render(count,data){
  const state=strengthState(count,data.petStrength,data.petBaseStats),level=strengthLevel(levelPointsOf(data),data.petStrength);body.replaceChildren();
  const levelCard=document.createElement('div');levelCard.className='strength-level-card';levelCard.innerHTML=`<span>PET LEVEL</span><strong>Lv.${level}</strong>`;body.append(levelCard);
  const summary=document.createElement('p');summary.className='strength-summary';summary.textContent=`獲得称号 ${count}個　／　残り ${state.available}ポイント`;body.append(summary);
  const next=document.createElement('p');next.textContent=`次のポイントまで称号あと${3-count%3}個`;body.append(next);
  for(const [key,label,gain] of [['hp','HP',2],['attack','攻撃力',1],['defense','防御力',1],['mp','MP',1]]){
   const row=document.createElement('div');row.className='strength-row';
   const text=document.createElement('strong');text.textContent=`${label}　${state.stats[key]}`;
   const add=document.createElement('button');add.type='button';add.textContent=`＋${gain}（1pt）`;add.disabled=busy||!hasPet(data)||state.available<1;add.onclick=()=>save(key);
   row.append(text,add);body.append(row);
  }
  const magicEffect=spell=>spell.description.replace('体力','HP');
  const learned=MAGIC_SPELLS.filter(spell=>spell.level<=level),list=document.createElement('section');list.className='strength-magic-list';
  const heading=document.createElement('h3');heading.textContent='習得済みの魔法';list.append(heading);
  for(const spell of learned){const item=document.createElement('p');item.innerHTML=`<strong>${spell.name}</strong><span>${magicEffect(spell)} ／ 消費MP ${spell.mpCost}</span>`;list.append(item);}
  if(!learned.length){const empty=document.createElement('p');empty.textContent='まだ魔法を習得していません。';list.append(empty);}body.append(list);
  const nextMagic=MAGIC_SPELLS.find(spell=>spell.level>level),magic=document.createElement('p');magic.className='strength-magic-next';magic.textContent=nextMagic?`次の魔法：Lv.${nextMagic.level}で「${nextMagic.name}」
${magicEffect(nextMagic)} ／ 消費MP ${nextMagic.mpCost}`:'すべての魔法を習得済み！';body.append(magic);
  const note=document.createElement('p');note.textContent=hasPet(data)?'強化は塔・洞窟の次の冒険から反映されます。振り直しはSHOPで30コインです（レベルは下がりません）。':'ペットが生まれると強化できます。';body.append(note);
 }

 async function load(){
  const user=auth.currentUser;if(!user||busy)return;
  const id=++generation;busy=true;body.textContent='読み込み中…';message.textContent='';dialog.showModal();
  try{
   const [count,snap]=await Promise.all([loadStrengthTitles(user),getDoc(walletRef(user))]);
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   let data=snap.data()||{};data=await reconcilePetStats(user,data);
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   busy=false;render(count,data);
  }catch(e){if(id===generation){body.textContent='';message.textContent=e.message;}}
  finally{if(id===generation)busy=false;}
 }

 async function save(key){
  const user=auth.currentUser;if(!user||busy)return;
  const id=generation;busy=true;body.querySelectorAll('button').forEach(b=>b.disabled=true);message.textContent='保存中…';
  try{
   const count=await loadStrengthTitles(user);
   const result=await runTransaction(db,async tx=>{
    if(auth.currentUser?.uid!==user.uid)throw Error('ログインし直してください。');
    const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{};
    if(!hasPet(data))throw Error('ペットが生まれると強化できます。');
    const beforeLevel=strengthLevel(levelPointsOf(data),data.petStrength),petStrength=allocatePoint(count,data.petStrength,key);
    const petStrengthLevelPoints=Math.max(levelPointsOf(data),allocationTotal(petStrength)),afterLevel=strengthLevel(petStrengthLevelPoints,petStrength);
    tx.set(ref,{petStrength,petStrengthLevelPoints,petUpdatedAt:serverTimestamp()},{merge:true});
    return {data:{...data,petStrength,petStrengthLevelPoints},beforeLevel,afterLevel};
   });
   if(id!==generation||auth.currentUser?.uid!==user.uid)return;
   busy=false;render(count,result.data);message.textContent='強化を保存しました！';
   if(result.afterLevel>result.beforeLevel)showLevelUp(result.afterLevel);
  }catch(e){if(id===generation){message.textContent=e.message||'保存できませんでした。閉じてもう一度お試しください。';}}
  finally{if(id===generation)busy=false;}
 }

 button.onclick=load;
 onAuthStateChanged(auth,user=>{
  generation++;busy=false;button.disabled=!user;dialog.close();body.replaceChildren();
  // Pet stats are reconciled when the panel is opened or an adventure loads; avoid an auth-time wallet read on every page.
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
    if(!hasPet(data))throw Error('ペットが生まれてから使えます。');
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
