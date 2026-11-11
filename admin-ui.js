import {createMaterialUsagePanel} from './admin-material-usage.js?v=1.9.9';
import {adminContentRows} from './admin-content-model.js?v=2.1.5';
import {enableAppCheck} from './firebase-security.js?v=2.1.2';
import { initializeApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,browserLocalPersistence,ensureRenderReady,timeoutSignal} from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ",authDomain:"eiken-retry.firebaseapp.com",projectId:"eiken-retry",storageBucket:"eiken-retry.firebasestorage.app",messagingSenderId:"231308672297",appId:"1:231308672297:web:5e8b8ede3a0246c2318b38"};
const API='https://task-quest.onrender.com';
const app=initializeApp(firebaseConfig);enableAppCheck(app);const auth=getAuth(app),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
await setPersistence(auth,browserLocalPersistence);
// The free Render service can need time to resume. Public, read-free prewarm never blocks the UI.
void ensureRenderReady().catch(()=>{});
const $=id=>document.getElementById(id);
let allUsers=[],busy=false,expandedUid='',generation=0,viewGeneration=0,currentUid='',pageIndex=0,cursors=[''],nextToken=null,fetchedAt=0;
let searchResults=null,searchTotal=0,searchTruncated=false,searchTimer=0,searchSerial=0,searchBusy=false,searchFetchedAt=0;
const pageCache=new Map(),detailCache=new Map(),TTL=60000;
const labels={'english-playroom':'ペット / コイン','ateru':'アテル','basic-quest':'Basic Quest','eiken-retry':'リトライノート','eiken-cloze':'英検 空所補充','eiken-title':'英検 タイトル','task-quest':'Task-Quest','eiken-pre2-interview-a':'英検準2級 面接A'};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function setStatus(text,kind=''){const el=$('status');el.textContent=text;el.className='status'+(kind?' '+kind:'');}
function fmtDate(v){if(!v)return '未記録';const d=new Date(Number(v)||v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}
function mini(data={}){const keys=['lastPlayedDate','submissions','correctAnswers','completedStages','attemptedIds','rounds','clearCount','attempts','correct','petLoginDays','retryCoinProgress'];const lines=[];for(const k of keys){if(!(k in data))continue;const v=data[k];lines.push(`${k}: ${Array.isArray(v)?v.length:typeof v==='object'&&v!==null?Object.keys(v).length:v}`);}if(!lines.length){for(const [k,v] of Object.entries(data).slice(0,3))lines.push(`${k}: ${Array.isArray(v)?v.length:typeof v==='object'&&v!==null?'…':v}`);}return lines.slice(0,4).join('\n')||'記録なし';}
async function token(){const u=auth.currentUser;if(!u)throw Error('ログインしてください。');return u.getIdToken();}
async function api(path,opt={}){
 const idToken=await token();
 try{
  // First request may have to wake a sleeping Render instance (about 60s).
  // Do not automatically retry POST actions to avoid duplicate coin grants or resets.
  const res=await fetch(API+path,{...opt,signal:timeoutSignal(90000),headers:{...(opt.headers||{}),'Authorization':`Bearer ${idToken}`,'Content-Type':'application/json'}});
  let body={};try{body=await res.json();}catch{}
  if(!res.ok)throw Error(body.error||`管理APIエラー (${res.status})`);
  return body;
 }catch(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')throw Error('管理サーバーからの応答がありませんでした。「このページを更新」で再度お試しください。');
  throw error;
 }
}
function searchQuery(){return $('search').value.trim();}
function updateRefresh(){$('refresh').disabled=busy||searchBusy;$('refresh').textContent=searchQuery()?'↻ 検索結果を更新':'↻ このページを更新';}
function restorePageMeta(){
 $('updated').textContent=fetchedAt?'一覧の最終更新: '+fmtDate(fetchedAt)+' ／ 自動更新はしません。':'';
 $('prev').disabled=busy||pageIndex===0;$('next').disabled=busy||!nextToken;
}
async function load(index=pageIndex,force=false){
 if(busy||searchQuery()||!auth.currentUser)return;const own=generation,request=++viewGeneration,key=cursors[index];if(key===undefined)return;
 busy=true;updateRefresh();$('prev').disabled=true;$('next').disabled=true;setStatus('6人分の一覧を読み込んでいます…（サーバー休止時は復帰に時間がかかることがあります）');
 try{
  if(force)pageCache.delete(key);
  let data=pageCache.get(key);
  if(!data||Date.now()-data.fetchedAt>=TTL){
   const url='/api/admin/users?limit=6'+(key?'&pageToken='+encodeURIComponent(key):'');
   try{
    // Activity order is queried once; identity and pet names come from the single search-index document.
    const [compact,indexUsers]=await Promise.all([api(url+'&compact=1'),loadSearchIndex(force)]);
    const names=new Map(indexUsers.map(user=>[user.uid,user]));
    data={...compact,users:(compact.users||[]).map(row=>{
     const profile=names.get(row.uid)||{};
     return {...profile,...row,coins:null,hasNickname:!!profile.nickname};
    })};
   }catch(error){
    // Keep administrator access available if the index has not yet been built.
    console.warn('Compact admin list unavailable; using legacy read path',error);
    const legacy=await api(url);
    data={...legacy,users:(legacy.users||[]).map(row=>({...row,coins:null}))};
   }
   if(own!==generation||request!==viewGeneration)return;
   pageCache.set(key,data);
  }
  if(own!==generation||request!==viewGeneration)return;
  allUsers=[...(data.users||[])].sort((a,b)=>Number(b.lastLearningAt||0)-Number(a.lastLearningAt||0)||Number(b.createdAt||0)-Number(a.createdAt||0));pageIndex=index;nextToken=data.nextPageToken;fetchedAt=data.fetchedAt||Date.now();expandedUid='';
  cursors=cursors.slice(0,index+1);if(nextToken)cursors.push(nextToken);$('panel').hidden=false;
  restorePageMeta();
  setStatus('一覧は最終学習日時が新しい順に6人ずつ表示します。名前は検索用データから表示し、コイン残高は利用者を開いたときだけ取得します。','ok');render();
 }catch(e){if(own===generation)setStatus(e.message,'error');}
 finally{if(own===generation){busy=false;updateRefresh();if(!searchQuery())restorePageMeta();}}
}
let indexRequest=null,indexedMatches=[],searchPageIndex=0;
async function loadSearchIndex(force=false){
 const shared=window.__monstudyAdminIndex;
 if(!force&&shared?.users&&Date.now()-shared.at<120000)return shared.users;
 if(indexRequest)return indexRequest;
 indexRequest=api('/api/admin/search-index').then(data=>{
  const users=Array.isArray(data.users)?data.users:[];
  window.__monstudyAdminIndex={users,at:Date.now()};
  return users;
 }).finally(()=>{indexRequest=null;});
 return indexRequest;
}
async function showSearchPage(index,own=generation,serial=searchSerial,q=searchQuery()){
 if(index<0||index>=Math.max(1,Math.ceil(indexedMatches.length/6)))return;
 const display=indexedMatches.slice(index*6,index*6+6);
 const preview=display.length?await api('/api/admin/search-preview?uids='+encodeURIComponent(display.map(u=>u.uid).join(','))):{users:[]};
 if(own!==generation||serial!==searchSerial||q!==searchQuery())return;
 const snapshots=new Map((preview.users||[]).map(u=>[u.uid,u]));
 searchResults=display.map(u=>({...u,...(snapshots.get(u.uid)||{}),hasNickname:!!u.nickname}));
 searchPageIndex=index;searchTotal=indexedMatches.length;searchTruncated=searchTotal>6;searchFetchedAt=Date.now();expandedUid='';
 $('updated').textContent='検索の最終更新: '+fmtDate(searchFetchedAt)+' ／ 検索文字列の比較では追加readしません。';
 $('prev').disabled=index===0;
 $('next').disabled=(index+1)*6>=searchTotal;
 setStatus('「'+q+'」に一致する登録者は'+searchTotal+'人です。'+(searchTotal>6?'検索結果 '+(index+1)+'ページ目を表示しています。':'') ,'ok');
 render();
}
async function runSearch(force=false){
 const q=searchQuery();if(!q||!auth.currentUser)return;
 const own=generation,serial=++searchSerial;searchBusy=true;expandedUid='';searchResults=null;updateRefresh();$('prev').disabled=true;$('next').disabled=true;
 setStatus('検索用ドキュメントを読み込んでいます…');render();
 try{
  const users=await loadSearchIndex(force);
  if(own!==generation||serial!==searchSerial||q!==searchQuery())return;
  const query=q.normalize('NFKC').toLocaleLowerCase('ja-JP');
  indexedMatches=users.filter(u=>[u.uid,u.codeName,u.loginId,u.nickname,u.petName].some(value=>String(value||'').normalize('NFKC').toLocaleLowerCase('ja-JP').includes(query)));
  await showSearchPage(0,own,serial,q);
 }catch(e){if(own===generation&&serial===searchSerial){searchResults=[];searchTotal=0;searchTruncated=false;setStatus(e.message,'error');render();}}
 finally{if(own===generation&&serial===searchSerial){searchBusy=false;updateRefresh();}}
}
function onSearchInput(){
 clearTimeout(searchTimer);searchSerial++;expandedUid='';detailCache.clear();
 const q=searchQuery();
 if(!q){indexedMatches=[];searchPageIndex=0;searchResults=null;searchTotal=0;searchTruncated=false;searchBusy=false;searchFetchedAt=0;updateRefresh();restorePageMeta();setStatus('一覧は最終学習日時が新しい順に6人ずつ表示します。検索欄では登録者全体から登録コード、IDまたはニックネームを検索できます。','ok');render();return;}
 searchResults=null;searchTotal=0;searchTruncated=false;updateRefresh();$('prev').disabled=true;$('next').disabled=true;render();
 searchTimer=setTimeout(runSearch,320);
}
async function expand(uid){
 expandedUid=expandedUid===uid?'':uid;render();if(!expandedUid)return;
 const cached=detailCache.get(uid);if(cached&&Date.now()-cached.fetchedAt<TTL)return;
 const own=generation;try{const data=await api('/api/admin/user?uid='+encodeURIComponent(uid));if(own!==generation)return;detailCache.set(uid,data);if(expandedUid===uid)render();}
 catch(e){if(own===generation&&expandedUid===uid){detailCache.set(uid,{error:e.message,fetchedAt:0});render();}}
}
function appCards(apps={},activity={}){return adminContentRows(apps,activity).map(row=>{const lines=[...(row.lastLearningAt?['最終学習日時：'+fmtDate(row.lastLearningAt)]:[]),...row.lines];return `<div class="app" data-content-id="${esc(row.id)}"><strong>${esc(row.label)}</strong><div class="mini">${esc(lines.length?lines.join('\n'):'記録なし')}</div></div>`;}).join('');}
function rawBlocks(apps={}){return Object.entries(apps).sort(([a],[b])=>a.localeCompare(b)).map(([id,d])=>`<pre><b>${esc(labels[id]||id)}</b>\n${esc(JSON.stringify(d,null,2))}</pre>`).join('')||'<div class="sub">学習記録はまだありません。</div>';}
function userBody(u){return `<div class="user-body"><div class="meta"><span>最終学習日時: ${esc(fmtDate(u.lastLearningAt))}</span><span>登録: ${esc(fmtDate(u.createdAt))}</span><span>記録: ${adminContentRows(u.apps,u.activity).filter(row=>row.recorded).length} / ${adminContentRows().length}教材</span></div><div class="apps">${appCards(u.apps,u.activity)}</div><div class="grant"><strong>コイン付与</strong><input class="amount" type="number" min="1" max="1000000" step="1" value="10"><button class="quick" data-amount="10">+10</button><button class="quick" data-amount="100">+100</button><button class="quick" data-amount="1000">+1,000</button><button class="quick" data-amount="100000">+100,000</button><button class="btn primary grantBtn" type="button">付与する</button><button class="btn resetPetNameBtn" type="button">ペット名をリセットする</button></div><details class="details"><summary>保存されている学習記録を詳しく見る</summary><div class="raw">${rawBlocks(u.apps)}</div></details></div>`;}
function render(){
 const q=searchQuery(),searching=!!q,list=searching?(searchResults||[]):allUsers;
 if(searching){
  if(searchResults===null)$('count').textContent='登録者全体を検索中…';
  else if(searchTruncated)$('count').textContent=`検索結果 ${list.length} / ${searchTotal}人（上位${list.length}人）`;
  else $('count').textContent=`検索結果 ${searchTotal}人（登録者全体）`;
 }else $('count').textContent=(pageIndex+1)+'ページ目・'+list.length+' / '+allUsers.length+'人（6人ずつ）';
 if(searching&&searchResults===null){$('users').innerHTML='<div class="empty">登録者全体から検索しています…</div>';return;}
 $('users').innerHTML=list.map(u=>{
  const open=u.uid===expandedUid,detail=detailCache.get(u.uid);const profile=detail?.apps?.['english-playroom'];const currentCoins=profile&&Number.isFinite(Number(profile.coins))?Number(profile.coins):null;const coinBadge=open&&currentCoins!==null?'<div class="coin">🪙 '+currentCoins.toLocaleString('ja-JP')+'</div>':'';const body=detail?.error?'<div class="user-body">'+esc(detail.error)+'<button type="button" class="btn detail-retry">再試行</button></div>':detail?.apps?userBody({...u,apps:detail.apps,activity:detail.activity}):'<div class="user-body" role="status">学習記録を読み込んでいます…</div>';
  return '<article class="user'+(open?' open':'')+'" data-uid="'+esc(u.uid)+'"><div class="user-summary"><div class="code-name">コード名：<span class="copy-value">'+esc(u.loginId?(u.codeName||'未復元'):'—')+'</span></div><div class="login-id">ID：'+esc(u.loginId||'—')+'</div><div class="nickname">'+esc(u.nickname||'ニックネーム未登録')+'</div><div class="pet-name">'+esc(u.petName||'ペット名未設定')+'</div><div class="summary-meta">最終学習日時 '+esc(fmtDate(u.lastLearningAt))+'</div>'+'<div class="summary-actions">'+coinBadge+'<button type="button" class="btn detail-toggle" aria-expanded="'+open+'">'+(open?'閉じる':'詳細を確認')+'</button></div></div>'+(open?body:'')+'</article>';
 }).join('')||'<div class="empty">一致する登録者はいません。</div>';
 document.querySelectorAll('.detail-toggle').forEach(b=>b.onclick=()=>expand(b.closest('.user').dataset.uid));
 document.querySelectorAll('.detail-retry').forEach(b=>b.onclick=()=>{const uid=b.closest('.user').dataset.uid;detailCache.delete(uid);expandedUid='';expand(uid);});
 document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>b.closest('.user').querySelector('.amount').value=b.dataset.amount);
 document.querySelectorAll('.resetPetNameBtn').forEach(b=>b.onclick=()=>resetPetName(b.closest('.user')));
 document.querySelectorAll('.grantBtn').forEach(b=>b.onclick=()=>grant(b.closest('.user')));
}
async function grant(card){const uid=card.dataset.uid,amount=Math.floor(Number(card.querySelector('.amount').value));if(!Number.isFinite(amount)||amount<1||amount>1000000){setStatus('付与コインは1〜1,000,000で入力してください。','error');return;}const visible=(searchResults||[]).find(x=>x.uid===uid),u=visible||allUsers.find(x=>x.uid===uid),label=u?.nickname||'このユーザー';if(!confirm(`${label} に ${amount.toLocaleString('ja-JP')}コイン付与しますか？`))return;const own=generation;try{card.querySelector('.grantBtn').disabled=true;const r=await api('/api/admin/coins',{method:'POST',body:JSON.stringify({uid,amount})});if(own!==generation)return;
 for(const page of pageCache.values())for(const item of page.users)if(item.uid===uid)item.coins=r.coins;
 for(const item of allUsers)if(item.uid===uid)item.coins=r.coins;
 if(searchResults)for(const item of searchResults)if(item.uid===uid)item.coins=r.coins;
 const detail=detailCache.get(uid);if(detail?.apps?.['english-playroom'])detail.apps['english-playroom'].coins=r.coins;
 setStatus(label+' に '+amount.toLocaleString('ja-JP')+'コイン付与しました。','ok');render();}catch(e){if(own===generation)setStatus(e.message,'error');}finally{const btn=document.querySelector(`.user[data-uid="${CSS.escape(uid)}"] .grantBtn`);if(btn)btn.disabled=false;}}
window.addEventListener('monstudy-admin-coin-granted',event=>{
 const uid=String(event.detail?.uid||''),coins=Number(event.detail?.coins);
 if(!uid||!Number.isFinite(coins))return;
 for(const page of pageCache.values())for(const item of page.users||[])if(item.uid===uid)item.coins=coins;
 for(const item of allUsers)if(item.uid===uid)item.coins=coins;
 for(const item of searchResults||[])if(item.uid===uid)item.coins=coins;
 const detail=detailCache.get(uid);if(detail?.apps?.['english-playroom'])detail.apps['english-playroom'].coins=coins;
 render();
});
async function resetPetName(card){
 const uid=card.dataset.uid,u=(searchResults||[]).find(x=>x.uid===uid)||allUsers.find(x=>x.uid===uid),label=u?.nickname||'このユーザー';
 if(!confirm(label+' のペット名をリセットしますか？ユーザーに再設定を案内します。'))return;
 const own=generation;card.querySelector('.resetPetNameBtn').disabled=true;
 try{
  await api('/api/admin/pet-name-reset',{method:'POST',body:JSON.stringify({uid})});if(own!==generation)return;
  for(const page of pageCache.values())for(const item of page.users)if(item.uid===uid)item.petName='';
  for(const item of [...allUsers,...(searchResults||[])])if(item.uid===uid)item.petName='';
  detailCache.delete(uid);expandedUid='';await expand(uid);setStatus(label+' のペット名をリセットしました。','ok');
 }catch(e){if(own===generation)setStatus(e.message,'error');}
 finally{const btn=document.querySelector(`.user[data-uid="${CSS.escape(uid)}"] .resetPetNameBtn`);if(btn)btn.disabled=false;}
}
const usagePanel=createMaterialUsagePanel({host:$('updated'),request:()=>api('/api/admin/material-usage'),getIdentity:()=>auth.currentUser?.uid});
$('login').onclick=()=>signInWithPopup(auth,provider).catch(e=>setStatus(e.message,'error'));
$('logout').onclick=()=>signOut(auth);
$('refresh').onclick=()=>searchQuery()?runSearch(true):load(pageIndex,true);$('search').oninput=onSearchInput;
$('prev').onclick=()=>searchQuery()?showSearchPage(searchPageIndex-1):load(pageIndex-1);$('next').onclick=()=>searchQuery()?showSearchPage(searchPageIndex+1):load(pageIndex+1);
function setAdminAuthorized(authorized){
 document.documentElement.dataset.monstudyAdminAuthorized=String(Boolean(authorized));
 window.dispatchEvent(new CustomEvent('monstudy-admin-access-change',{detail:{authorized:Boolean(authorized)}}));
}
onAuthStateChanged(auth,user=>{
 usagePanel.reset();generation++;viewGeneration++;searchSerial++;clearTimeout(searchTimer);
 allUsers=[];searchResults=null;searchTotal=0;searchTruncated=false;searchBusy=false;
 pageCache.clear();detailCache.clear();delete window.__monstudyAdminIndex;indexRequest=null;indexedMatches=[];searchPageIndex=0;expandedUid='';busy=false;pageIndex=0;cursors=[''];nextToken=null;
 fetchedAt=0;searchFetchedAt=0;currentUid=user?.uid||'';$('panel').hidden=true;$('search').value='';
 setAdminAuthorized(false);
 $('users').replaceChildren();
 $('who').textContent=user?.email|| (user?'学習用アカウントでログイン中':'');
 $('login').hidden=false;$('logout').hidden=!user;
 if(!user){setStatus('Googleで管理者ログインをしてください。');return;}
 if(!user.email){
  setStatus('学習用アカウントでログインしています。Googleで管理者ログインを選択してください。');
  return;
 }
 const own=generation,uid=user.uid;
 setStatus('管理者権限を確認しています…');
 void (async()=>{
  try{
   await api('/api/admin/session');
   if(own!==generation||auth.currentUser?.uid!==uid)return;
   setAdminAuthorized(true);
   $('login').hidden=true;$('logout').hidden=false;
   await load(0);
  }catch(error){
   if(own!==generation||auth.currentUser?.uid!==uid)return;
   setAdminAuthorized(false);
   $('login').hidden=false;
   setStatus(error.message==='このアカウントには管理権限がありません。'
    ?'このGoogleアカウントには管理権限がありません。「Googleで管理者ログイン」から正しいアカウントを選択してください。'
    :error.message||'管理者権限を確認できませんでした。もう一度お試しください。','error');
  }
 })();
});

// No automatic request: the button reads only the displayed users, at most ten.
const retryLogsButton=document.createElement('button');retryLogsButton.type='button';retryLogsButton.className='btn';retryLogsButton.textContent='リトライノートの画面離脱記録を取得';
const retryLogsNote=document.createElement('div');retryLogsNote.className='sub';retryLogsNote.textContent='表示中の最大6人が対象。取得時のみ各1件読み取り（直近100プレイ）。再表示はキャッシュを使用します。';
const retryLogsResult=document.createElement('div');retryLogsResult.className='sub';
$('panel').append(retryLogsButton,retryLogsNote,retryLogsResult);
const retryLogCache=new Map();
retryLogsButton.onclick=async()=>{
 const selected=(searchQuery()?(searchResults||[]):allUsers).slice(0,6),own=generation;
 if(!selected.length){retryLogsResult.textContent='対象の利用者がいません。';return;}
 retryLogsButton.disabled=true;retryLogsResult.textContent='画面離脱記録を取得しています…';
 try{
  const missing=selected.filter(u=>!retryLogCache.has(u.uid));
  if(missing.length){const data=await api('/api/admin/retry-screen-logs?uids='+encodeURIComponent(missing.map(u=>u.uid).join(',')));if(own!==generation)return;for(const row of data.users||[])retryLogCache.set(row.uid,row.logs||[]);}
  if(own!==generation)return;
  retryLogsResult.innerHTML=selected.map(u=>{const logs=retryLogCache.get(u.uid)||[];return '<details><summary>'+esc(u.nickname||'ニックネーム未登録')+'：'+logs.length+'プレイ ／ 離脱 '+logs.reduce((n,r)=>n+(Number(r.count)||0),0)+'回</summary>'+ (logs.length?logs.slice().reverse().map(r=>'<div>'+esc(fmtDate(r.endedAt))+' ／ '+esc(r.correct)+' / '+esc(r.total)+'問正解 ／ 画面離脱 '+esc(r.count)+'回・'+Math.round((Number(r.totalMs)||0)/1000)+'秒</div>').join(''):'記録がありません。機能追加後に終了したプレイから記録されます。')+'</details>';}).join('')+'<p>通知や誤操作でも発生するため、不正の判定には使えません。最新記録の再取得は下のボタンで行います。</p>';
 }catch(e){if(own===generation)retryLogsResult.textContent=e.message;}finally{retryLogsButton.disabled=false;}
};
const retryLogsRefresh=document.createElement('button');retryLogsRefresh.type='button';retryLogsRefresh.className='btn';retryLogsRefresh.textContent='画面離脱記録を再取得';$('panel').append(retryLogsRefresh);
retryLogsRefresh.onclick=()=>{retryLogCache.clear();retryLogsButton.click();};
onAuthStateChanged(auth,()=>{retryLogCache.clear();retryLogsResult.replaceChildren();});
