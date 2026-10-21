import {adminContentRows} from './admin-content-model.js?v=all-contents-1';
import {initializeApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged,setPersistence,browserLocalPersistence} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ",authDomain:"eiken-retry.firebaseapp.com",projectId:"eiken-retry",storageBucket:"eiken-retry.firebasestorage.app",messagingSenderId:"231308672297",appId:"1:231308672297:web:5e8b8ede3a0246c2318b38"};
const API='https://task-quest.onrender.com';
const app=initializeApp(firebaseConfig),auth=getAuth(app),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:'select_account'});
await setPersistence(auth,browserLocalPersistence);
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
async function api(path,opt={}){const idToken=await token();const res=await fetch(API+path,{...opt,signal:AbortSignal.timeout(20000),headers:{...(opt.headers||{}),'Authorization':`Bearer ${idToken}`,'Content-Type':'application/json'}});let body={};try{body=await res.json();}catch{}if(!res.ok)throw Error(body.error||`管理APIエラー (${res.status})`);return body;}
function searchQuery(){return $('search').value.trim();}
function updateRefresh(){$('refresh').disabled=busy||searchBusy;$('refresh').textContent=searchQuery()?'↻ 検索結果を更新':'↻ このページを更新';}
function restorePageMeta(){
 $('updated').textContent=fetchedAt?'一覧の最終更新: '+fmtDate(fetchedAt)+' ／ 自動更新はしません。':'';
 $('prev').disabled=busy||pageIndex===0;$('next').disabled=busy||!nextToken;
}
async function load(index=pageIndex,force=false){
 if(busy||searchQuery()||!auth.currentUser)return;const own=generation,request=++viewGeneration,key=cursors[index];if(key===undefined)return;
 busy=true;updateRefresh();$('prev').disabled=true;$('next').disabled=true;setStatus('10人分の一覧を読み込んでいます…');
 try{
  if(force)pageCache.delete(key);
  let data=pageCache.get(key);if(!data||Date.now()-data.fetchedAt>=TTL){data=await api('/api/admin/users?limit=10'+(key?'&pageToken='+encodeURIComponent(key):''));if(own!==generation||request!==viewGeneration)return;pageCache.set(key,data);}
  if(own!==generation||request!==viewGeneration)return;
  allUsers=[...(data.users||[])].sort((a,b)=>Number(b.lastLearningAt||0)-Number(a.lastLearningAt||0)||Number(b.createdAt||0)-Number(a.createdAt||0));pageIndex=index;nextToken=data.nextPageToken;fetchedAt=data.fetchedAt||Date.now();expandedUid='';
  cursors=cursors.slice(0,index+1);if(nextToken)cursors.push(nextToken);$('panel').hidden=false;
  restorePageMeta();
  setStatus('一覧は最終学習日時が新しい順に10人ずつ表示します。検索欄では登録者全員からニックネームを探せます。','ok');render();
 }catch(e){if(own===generation)setStatus(e.message,'error');}
 finally{if(own===generation){busy=false;updateRefresh();if(!searchQuery())restorePageMeta();}}
}
async function runSearch(){
 const q=searchQuery();if(!q||!auth.currentUser)return;
 const own=generation,serial=++searchSerial;searchBusy=true;expandedUid='';searchResults=null;updateRefresh();$('prev').disabled=true;$('next').disabled=true;
 setStatus(`登録者全体から「${q}」を検索しています…`);render();
 try{
  const data=await api('/api/admin/users?search='+encodeURIComponent(q));
  if(own!==generation||serial!==searchSerial||q!==searchQuery())return;
  searchResults=[...(data.users||[])];searchTotal=Math.max(searchResults.length,Number(data.total)||0);searchTruncated=!!data.truncated;searchFetchedAt=data.fetchedAt||Date.now();
  $('updated').textContent='検索の最終更新: '+fmtDate(searchFetchedAt)+' ／ 登録者全体を対象にしています。';
  const note=searchTruncated?`「${q}」の検索結果を上位${searchResults.length}人表示しています。`:`「${q}」に一致する登録者は${searchTotal}人です。`;
  setStatus(note,'ok');render();
 }catch(e){if(own===generation&&serial===searchSerial){searchResults=[];searchTotal=0;searchTruncated=false;setStatus(e.message,'error');render();}}
 finally{if(own===generation&&serial===searchSerial){searchBusy=false;updateRefresh();$('prev').disabled=true;$('next').disabled=true;}}
}
function onSearchInput(){
 clearTimeout(searchTimer);searchSerial++;expandedUid='';detailCache.clear();
 const q=searchQuery();
 if(!q){searchResults=null;searchTotal=0;searchTruncated=false;searchBusy=false;searchFetchedAt=0;updateRefresh();restorePageMeta();setStatus('一覧は最終学習日時が新しい順に10人ずつ表示します。検索欄では登録者全員からニックネームを探せます。','ok');render();return;}
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
function userBody(u){return `<div class="user-body"><div class="meta"><span>最終学習日時: ${esc(fmtDate(u.lastLearningAt))}</span><span>登録: ${esc(fmtDate(u.createdAt))}</span><span>記録: ${adminContentRows(u.apps,u.activity).filter(row=>row.recorded).length} / ${adminContentRows().length}教材</span></div><div class="apps">${appCards(u.apps,u.activity)}</div><div class="grant"><strong>コイン付与</strong><input class="amount" type="number" min="1" max="1000000" step="1" value="10"><button class="quick" data-amount="10">+10</button><button class="quick" data-amount="100">+100</button><button class="quick" data-amount="1000">+1,000</button><button class="quick" data-amount="100000">+100,000</button><button class="btn primary grantBtn" type="button">付与する</button></div><details class="details"><summary>保存されている学習記録を詳しく見る</summary><div class="raw">${rawBlocks(u.apps)}</div></details></div>`;}
function render(){
 const q=searchQuery(),searching=!!q,list=searching?(searchResults||[]):allUsers;
 if(searching){
  if(searchResults===null)$('count').textContent='登録者全体を検索中…';
  else if(searchTruncated)$('count').textContent=`検索結果 ${list.length} / ${searchTotal}人（上位${list.length}人）`;
  else $('count').textContent=`検索結果 ${searchTotal}人（登録者全体）`;
 }else $('count').textContent=(pageIndex+1)+'ページ目・'+list.length+' / '+allUsers.length+'人（10人ずつ）';
 if(searching&&searchResults===null){$('users').innerHTML='<div class="empty">登録者全体から検索しています…</div>';return;}
 $('users').innerHTML=list.map(u=>{
  const open=u.uid===expandedUid,detail=detailCache.get(u.uid);const body=detail?.error?'<div class="user-body">'+esc(detail.error)+'<button type="button" class="btn detail-retry">再試行</button></div>':detail?.apps?userBody({...u,apps:detail.apps,activity:detail.activity}):'<div class="user-body" role="status">学習記録を読み込んでいます…</div>';
  return '<article class="user'+(open?' open':'')+'" data-uid="'+esc(u.uid)+'"><button class="user-summary" type="button" aria-expanded="'+open+'"><div class="identity"><div class="nickname">'+esc(u.nickname||'ニックネーム未登録')+'</div><div class="pet-name">ペット：'+esc(u.petName||'ペット名未設定')+'</div></div><div class="summary-meta">最終学習日時 '+esc(fmtDate(u.lastLearningAt))+'</div><div class="coin">🪙 '+Number(u.coins||0).toLocaleString('ja-JP')+'</div><div class="chev" aria-hidden="true">⌄</div></button>'+(open?body:'')+'</article>';
 }).join('')||'<div class="empty">一致する登録者はいません。</div>';
 document.querySelectorAll('.user-summary').forEach(b=>b.onclick=()=>expand(b.closest('.user').dataset.uid));
 document.querySelectorAll('.detail-retry').forEach(b=>b.onclick=()=>{const uid=b.closest('.user').dataset.uid;detailCache.delete(uid);expandedUid='';expand(uid);});
 document.querySelectorAll('.quick').forEach(b=>b.onclick=()=>b.closest('.user').querySelector('.amount').value=b.dataset.amount);
 document.querySelectorAll('.grantBtn').forEach(b=>b.onclick=()=>grant(b.closest('.user')));
}
async function grant(card){const uid=card.dataset.uid,amount=Math.floor(Number(card.querySelector('.amount').value));if(!Number.isFinite(amount)||amount<1||amount>1000000){setStatus('付与コインは1〜1,000,000で入力してください。','error');return;}const visible=(searchResults||[]).find(x=>x.uid===uid),u=visible||allUsers.find(x=>x.uid===uid),label=u?.nickname||'このユーザー';if(!confirm(`${label} に ${amount.toLocaleString('ja-JP')}コイン付与しますか？`))return;const own=generation;try{card.querySelector('.grantBtn').disabled=true;const r=await api('/api/admin/coins',{method:'POST',body:JSON.stringify({uid,amount})});if(own!==generation)return;
 for(const page of pageCache.values())for(const item of page.users)if(item.uid===uid)item.coins=r.coins;
 for(const item of allUsers)if(item.uid===uid)item.coins=r.coins;
 if(searchResults)for(const item of searchResults)if(item.uid===uid)item.coins=r.coins;
 const detail=detailCache.get(uid);if(detail?.apps?.['english-playroom'])detail.apps['english-playroom'].coins=r.coins;
 setStatus(label+' に '+amount.toLocaleString('ja-JP')+'コイン付与しました。','ok');render();}catch(e){if(own===generation)setStatus(e.message,'error');}finally{const btn=document.querySelector(`.user[data-uid="${CSS.escape(uid)}"] .grantBtn`);if(btn)btn.disabled=false;}}
$('login').onclick=()=>signInWithPopup(auth,provider).catch(e=>setStatus(e.message,'error'));
$('logout').onclick=()=>signOut(auth);
$('refresh').onclick=()=>searchQuery()?runSearch():load(pageIndex,true);$('search').oninput=onSearchInput;
$('prev').onclick=()=>load(pageIndex-1);$('next').onclick=()=>load(pageIndex+1);
onAuthStateChanged(auth,user=>{generation++;viewGeneration++;searchSerial++;clearTimeout(searchTimer);allUsers=[];searchResults=null;searchTotal=0;searchTruncated=false;searchBusy=false;pageCache.clear();detailCache.clear();expandedUid='';busy=false;pageIndex=0;cursors=[''];nextToken=null;fetchedAt=0;searchFetchedAt=0;currentUid=user?.uid||'';$('panel').hidden=true;$('search').value='';
 if(!user){$('users').replaceChildren();$('who').textContent='';$('login').hidden=false;$('logout').hidden=true;setStatus('管理者ログインをしてください。');return;}
 $('who').textContent=user.email||'';$('login').hidden=true;$('logout').hidden=false;load(0);
});
