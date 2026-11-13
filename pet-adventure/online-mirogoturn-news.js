// Same on-entry announcement pattern as tower-season.js, but completely local.
// No Firestore / Realtime Database reads or writes; both online battle modes share preference.
export const MIROGOTURN_NEWS_ID='2026-11-mirogoturn';
const PREF_PREFIX='monstudy-online-mirogoturn-news';
function keyFor(uid){return PREF_PREFIX+':'+MIROGOTURN_NEWS_ID+':'+(uid||'guest');}
function getPreference(key){try{return localStorage.getItem(key)==='1';}catch{return false;}}
function setPreference(key,value){try{if(value)localStorage.setItem(key,'1');else localStorage.removeItem(key);}catch{}}

export function installMirogoturnNews(uid){
 const select=document.getElementById('lobbyView');
 if(!select||document.getElementById('onlineMirogoturnDialog'))return;
 const preferenceKey=keyFor(uid);

 const link=document.createElement('link');
 link.rel='stylesheet';link.href='./online-mirogoturn-news.css?v=2.4.94';link.dataset.onlineMirogoturnStyle='1';document.head.append(link);

 const reopen=document.createElement('button');
 reopen.type='button';reopen.className='online-mirogoturn-reopen';
 reopen.innerHTML='✨ 新魔法「ミロゴターン」登場！';
 const h1=select.querySelector('h1');
 (h1||select.querySelector('.online-wallet'))?.insertAdjacentElement('afterend',reopen);

 const dialog=document.createElement('dialog');
 dialog.id='onlineMirogoturnDialog';dialog.className='online-mirogoturn-dialog';
 dialog.setAttribute('aria-label','オンライン対戦 新魔法ミロゴターン実装のお知らせ');
 dialog.innerHTML=`<div class="online-mirogoturn-sheet">
  <button type="button" class="online-mirogoturn-close" aria-label="お知らせを閉じる">×</button>
  <div class="online-mirogoturn-image-wrap">
   <img class="online-mirogoturn-poster" src="./mirogoturn-new-spell.webp?v=2.4.94" alt="新魔法 ミロゴターン。Lv.20で習得、消費MP8。時間制限なく、受けた攻撃魔法を1回だけ反射する。自分はダメージを受けず相手にはね返す。" width="1122" height="1402" decoding="async">
   <button type="button" class="online-mirogoturn-poster-ok" aria-label="新魔法のお知らせを閉じる"></button>
   <div class="online-mirogoturn-fallback" hidden><strong>✨ 新魔法 ミロゴターン</strong><p>Lv.20で習得・消費MP 8</p><p>攻撃魔法を1回だけはね返す！<br>時間制限なし</p><button type="button" class="online-mirogoturn-fallback-ok">OK</button></div>
  </div>
  <div class="online-mirogoturn-controls">
   <label><input type="checkbox"> 次回以降表示しない</label>
   <button type="button" class="online-mirogoturn-dismiss">閉じる</button>
  </div>
 </div>`;
 document.body.append(dialog);
 const checkbox=dialog.querySelector('input[type="checkbox"]');
 const poster=dialog.querySelector('.online-mirogoturn-poster');
 poster.addEventListener('error',()=>{
  poster.hidden=true;dialog.querySelector('.online-mirogoturn-poster-ok').hidden=true;
  dialog.querySelector('.online-mirogoturn-fallback').hidden=false;
 });
 const close=()=>{if(dialog.open)dialog.close();};
 const open=()=>{
  checkbox.checked=getPreference(preferenceKey);
  if(!dialog.open)dialog.showModal();
 };
 dialog.querySelector('.online-mirogoturn-close').addEventListener('click',close);
 dialog.querySelector('.online-mirogoturn-poster-ok').addEventListener('click',close);
 dialog.querySelector('.online-mirogoturn-fallback-ok').addEventListener('click',close);
 dialog.querySelector('.online-mirogoturn-dismiss').addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 dialog.addEventListener('close',()=>setPreference(preferenceKey,checkbox.checked));
 reopen.addEventListener('click',open);
 if(!getPreference(preferenceKey))open();
}
