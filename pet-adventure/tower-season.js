import {runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {auth,db,authReady,walletRef} from '../coin-reward.js?v=2.1.11';

export const TOWER_SEASON_ID='2026-11-maou';
const ADVENTURE_STORAGE_KEY='monstudy-pet-adventure-v1';
const ANNOUNCEMENT_KEY='monstudy-tower-season-news';
const CLOUD_RESET_KEY='monstudy-tower-season-cloud-reset';
const POSTER_URL='https://raw.githubusercontent.com/k-oota-pixel/english-playroom/main/pet-adventure/maou-tower-season-open.webp?v=2.3.26-hq2';

function safeGet(key){try{return localStorage.getItem(key)}catch{return null}}
function safeSet(key,value){try{localStorage.setItem(key,value)}catch{}}
function safeRemove(key){try{localStorage.removeItem(key)}catch{}}
function userKey(prefix,uid){return `${prefix}:${TOWER_SEASON_ID}:${uid||'guest'}`}

function installSeasonStyles(){
 if(document.querySelector('link[data-tower-season-style]'))return;
 const link=document.createElement('link');
 link.rel='stylesheet';link.href='./tower-season.css?v=2.3.26';link.dataset.towerSeasonStyle='1';document.head.append(link);
}

export async function installTowerSeasonAnnouncement(){
 installSeasonStyles();
 const select=document.getElementById('adventureSelect');
 if(!select||document.getElementById('towerSeasonDialog'))return;
 await authReady.catch(()=>{});
 const uid=auth.currentUser?.uid||'guest';
 const preferenceKey=userKey(ANNOUNCEMENT_KEY,uid);

 const actions=document.createElement('div');
 actions.className='season-news-actions';
 const reopen=document.createElement('button');
 reopen.type='button';reopen.className='season-news-reopen';reopen.innerHTML='<span aria-hidden="true">✦</span> 新シーズンのお知らせ';
 actions.append(reopen);
 const intro=select.querySelector('.select-intro');
 (intro||select.querySelector('h1'))?.insertAdjacentElement('afterend',actions);

 const dialog=document.createElement('dialog');
 dialog.id='towerSeasonDialog';dialog.className='tower-season-dialog';dialog.setAttribute('aria-label','魔王の塔 新シーズンのお知らせ');
 dialog.innerHTML=`<div class="tower-season-sheet">
   <button type="button" class="tower-season-close" aria-label="お知らせを閉じる">×</button>
   <img class="tower-season-poster" src="${POSTER_URL}" alt="新シーズン開幕 魔王の塔。魔王のいる100階に君はたどり着けるか！？" width="1122" height="1402" decoding="async">
   <div class="tower-season-controls">
     <label class="tower-season-suppress"><input type="checkbox"> <span>次回以降表示しない</span></label>
     <button type="button" class="tower-season-dismiss">閉じる</button>
   </div>
 </div>`;
 document.body.append(dialog);
 const poster=dialog.querySelector('.tower-season-poster');
 poster.addEventListener('error',()=>{
   const fallback=new URL('./maou-tower-season-open.webp?v=2.3.26-hq2',import.meta.url).href;
   if(poster.src!==fallback)poster.src=fallback;
 },{once:true});
 const checkbox=dialog.querySelector('input[type="checkbox"]');
 const close=()=>{if(dialog.open)dialog.close()};
 const syncPreference=()=>checkbox.checked?safeSet(preferenceKey,'1'):safeRemove(preferenceKey);
 const open=()=>{checkbox.checked=safeGet(preferenceKey)==='1';if(!dialog.open)dialog.showModal()};
 dialog.querySelector('.tower-season-close').addEventListener('click',close);
 dialog.querySelector('.tower-season-dismiss').addEventListener('click',close);
 dialog.addEventListener('close',syncPreference);
 dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
 reopen.addEventListener('click',open);
 if(safeGet(preferenceKey)!=='1')open();
}

function resetLocalTowerProgress(uid){
 const key=`${ADVENTURE_STORAGE_KEY}-${uid}`;
 let records={towerBest:1,dungeonBest:1};
 try{records={...records,...JSON.parse(safeGet(key)||'{}')}}catch{}
 if(records.towerSeason===TOWER_SEASON_ID)return;
 records.towerSeason=TOWER_SEASON_ID;
 records.towerBest=1;
 safeSet(key,JSON.stringify(records));
}

export async function ensureTowerSeasonReset(){
 await authReady;
 const user=auth.currentUser;
 if(!user)return;
 resetLocalTowerProgress(user.uid);
 const resetKey=userKey(CLOUD_RESET_KEY,user.uid);
 if(safeGet(resetKey)==='1')return;
 const ref=walletRef(user);
 await runTransaction(db,async tx=>{
   const snap=await tx.get(ref),data=snap.data()||{};
   if(data.wordTowerSeason===TOWER_SEASON_ID)return;
   tx.set(ref,{
     wordTowerSeason:TOWER_SEASON_ID,
     wordTowerBest:1,
     wordTowerCleared:false,
     petAdventureUpdatedAt:serverTimestamp()
   },{merge:true});
 });
 safeSet(resetKey,'1');
}
