import {renderPetVisual} from './pet-art.js?v=2.4.3';
import {getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37';

const API='https://task-quest.onrender.com';
const TTL={social:30*60*1000,pet:10*60*1000,search:5*60*1000};
let viewer=null,social=null,profile={},openButton=null,dialog=null,petDialog=null;
let tab='friends',busy=false,results=[],searchTerm='',socialPromise=null;
const searchCache=new Map();
const $=(q,root=document)=>root.querySelector(q);
function textEl(parent,tag,value,cls){
 const x=document.createElement(tag);x.textContent=String(value??'');if(cls)x.className=cls;parent.append(x);return x;
}
function notify(value,error=false,target=dialog){
 const n=$('.ms-friends-notice',target);if(n){n.textContent=value;n.dataset.error=error?'1':'0';}
}
function key(type){return 'ms-social-'+type+'-'+(viewer?.uid||'none');}
function cached(type,ttl){
 try{const data=JSON.parse(localStorage.getItem(key(type))||'null');return data&&Date.now()-data.at<ttl?data.value:null;}catch{return null;}
}
function save(type,value){
 try{localStorage.setItem(key(type),JSON.stringify({at:Date.now(),value}));}catch{}
}
function clearFor(uid){
 if(!uid)return;
 try{localStorage.removeItem('ms-social-list-'+uid);localStorage.removeItem('ms-social-pets-'+uid);}catch{}
 searchCache.clear();
}
async function request(path,payload){
 if(!viewer)throw Error('ログインしてください。');
 const uid=viewer.uid,token=await viewer.getIdToken();
 const r=await fetch(API+path,{method:payload===undefined?'GET':'POST',
  headers:{Authorization:'Bearer '+token,...(payload===undefined?{}:{'Content-Type':'application/json'})},
  ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
 const result=await r.json().catch(()=>({}));
 if(viewer?.uid!==uid)throw Error('ログイン状態が変わりました。');
 if(!r.ok)throw Error(result.error||'通信に失敗しました。');
 return result;
}
async function ensureSocial(force=false){
 if(!viewer)throw Error('ログインしてください。');
 if(!force){
  if(social)return social;
  const previous=cached('list',TTL.social);
  if(previous){social=previous;return social;}
 }
 if(socialPromise)return socialPromise;
 socialPromise=request('/api/friends').then(data=>{social=data;save('list',data);return data;}).finally(()=>{socialPromise=null;});
 return socialPromise;
}
function updateSocial(next){social=next;save('list',next);render();}
function button(parent,label,cb,cls=''){
 const b=textEl(parent,'button',label,'ms-friends-btn '+cls);b.type='button';b.disabled=busy;b.onclick=cb;return b;
}
async function action(path,body,onSuccess,done){
 if(busy)return;
 busy=true;render();
 try{
  await request(path,body);
  if(typeof onSuccess==='function')onSuccess();
  if(done)notify(done);
 }catch(error){notify(error.message||'処理に失敗しました。',true);}
 finally{busy=false;render();}
}
function record(person){return {uid:person.uid,nickname:person.nickname||'',petName:person.petName||''};}
function stateFor(uid){
 if(!social)return '';
 if((social.friends||[]).some(x=>x.uid===uid))return 'friend';
 if((social.outgoing||[]).some(x=>x.uid===uid))return 'outgoing';
 if((social.incoming||[]).some(x=>x.uid===uid))return 'incoming';
 return '';
}
async function sendRequest(person,target=dialog){
 if(!person?.uid||person.uid===viewer?.uid)return;
 await action('/api/friends/request',{targetUid:person.uid},()=>{
  const next=social||{friends:[],incoming:[],outgoing:[]};
  if(!stateFor(person.uid))next.outgoing=[...next.outgoing,record(person)];
  updateSocial({...next});
 },'おともだち申請を送信しました。');
 if(target===petDialog)notify('申請を送信しました。',false,petDialog);
}
function personRow(parent,person,kind){
 const card=textEl(parent,'div','','ms-friends-person');
 const info=textEl(card,'div','','ms-friends-person-info');
 textEl(info,'strong',person.petName||'ふしぎなたまご');
 textEl(info,'small','ニックネーム：'+(person.nickname||'未設定'));
 const actions=textEl(card,'div','','ms-friends-person-actions');
 button(actions,'ぺっとを見る',()=>window.monstudyPetView(person.uid));
 if(kind==='friends'){
  button(actions,'ギフト',()=>{window.monstudyGiftPrefillFriend?.(person);dialog.close();});
  button(actions,'解除',()=>{if(confirm('おともだちを解除しますか？'))action('/api/friends/remove',{targetUid:person.uid},()=>{
   updateSocial({...social,friends:social.friends.filter(x=>x.uid!==person.uid)});
  },'おともだちを解除しました。');},'ms-friends-secondary');
 }else if(kind==='incoming'){
  button(actions,'承認',()=>action('/api/friends/respond',{senderUid:person.uid,accept:true},()=>{
   updateSocial({...social,incoming:social.incoming.filter(x=>x.uid!==person.uid),
    friends:[...social.friends,record(person)]});
  },'おともだちになりました。'));
  button(actions,'拒否',()=>action('/api/friends/respond',{senderUid:person.uid,accept:false},()=>{
   updateSocial({...social,incoming:social.incoming.filter(x=>x.uid!==person.uid)});
  },'申請をお断りしました。'),'ms-friends-secondary');
 }else if(kind==='outgoing'){
  button(actions,'申請を取り消す',()=>action('/api/friends/remove',{targetUid:person.uid},()=>{
   updateSocial({...social,outgoing:social.outgoing.filter(x=>x.uid!==person.uid)});
  },'申請を取り消しました。'),'ms-friends-secondary');
 }else if(person.uid!==viewer?.uid){
  const state=stateFor(person.uid);
  if(state==='friend')textEl(actions,'small','おともだち');
  else if(state==='outgoing')textEl(actions,'small','申請中');
  else if(state==='incoming')button(actions,'申請を承認',()=>{tab='incoming';render();});
  else button(actions,'おともだち申請',()=>sendRequest(person));
 }
}
function render(){
 if(!dialog)return;
 const tabs=dialog.querySelectorAll('[data-friends-tab]');
 tabs.forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.friendsTab===tab));b.disabled=busy;});
 const area=$('#msFriendsContent',dialog);area.replaceChildren();
 const list=tab==='friends'?social?.friends:tab==='incoming'?social?.incoming:tab==='outgoing'?social?.outgoing:results;
 if(tab==='search'){
  const form=textEl(area,'form','','ms-friends-search');
  const input=document.createElement('input');input.type='search';input.placeholder='ニックネーム・ぺっと名';input.maxLength=20;input.value=searchTerm;input.setAttribute('aria-label','ニックネームまたはペット名');form.append(input);
  const submit=button(form,'検索',()=>{});submit.type='submit';
  form.onsubmit=e=>{e.preventDefault();search(input.value);};
 }
 if(!list){textEl(area,'p','おともだち情報を読み込んでいます…');return;}
 if(!list.length)textEl(area,'p',tab==='friends'?'おともだちはまだいません。':tab==='incoming'?'新しい申請はありません。':tab==='outgoing'?'申請中のおともだちはいません。':searchTerm?'見つかりませんでした。':'名前を入力して検索してください。','ms-friends-muted');
 for(const person of list)personRow(area,person,tab);
 if(tab==='friends'){
  const privacy=textEl(area,'label','','ms-friends-privacy');
  const check=document.createElement('input');check.type='checkbox';check.checked=profile.petVisibleToOthers!==false;check.disabled=busy;privacy.append(check);
  textEl(privacy,'span','ほかの利用者に自分のぺっとを公開する');
  check.onchange=()=>action('/api/friends/privacy',{visible:check.checked},()=>{
   profile={...profile,petVisibleToOthers:check.checked};const old=cached('pets',TTL.pet)||{};delete old[viewer.uid];save('pets',old);
  },check.checked?'ペットを公開しました。':'ペットを非公開にしました。');
 }
}
async function search(value){
 const q=String(value||'').normalize('NFKC').trim();
 if(!q||[...q].length>20){notify('名前を1〜20文字で入力してください。',true);return;}
 searchTerm=q;const cache=searchCache.get(q);
 if(cache&&Date.now()-cache.at<TTL.search){results=cache.results;render();return;}
 if(busy)return;
 busy=true;render();
 try{
  const data=await request('/api/friends/search?q='+encodeURIComponent(q));
  results=Array.isArray(data.users)?data.users:[];
  searchCache.set(q,{at:Date.now(),results});
  if(searchCache.size>30)searchCache.delete(searchCache.keys().next().value);
  notify(results.length?'検索結果：'+results.length+'件':'該当する利用者が見つかりませんでした。');
 }catch(e){notify(e.message,true);}
 finally{busy=false;render();}
}
async function openFriends(){
 if(!viewer)return;
 tab='friends';dialog.showModal();render();
 try{await ensureSocial();render();}catch(e){notify(e.message,true);}
}
async function showPet(uid,force=false){
 if(!viewer){return;}
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid||''))return;
 if(!petDialog.open)petDialog.showModal();
 const view=$('#msFriendPetVisual',petDialog);
 const content=$('#msFriendPetMeta',petDialog);
 content.replaceChildren();view.textContent='読み込んでいます…';
 const actions=$('#msFriendPetActions',petDialog);actions.replaceChildren();
 const id=viewer.uid;const pets=cached('pets',TTL.pet)||{};
 try{
  let data=!force?pets[uid]:null;
  if(!data){data=await request('/api/friends/pet?uid='+encodeURIComponent(uid));pets[uid]=data;
    const recent=Object.entries(pets).slice(-24);save('pets',Object.fromEntries(recent));}
  if(viewer?.uid!==id||!petDialog.open)return;
  textEl(content,'h2',data.petName||'ふしぎなたまご');
  textEl(content,'small','トレーナー：'+(data.nickname||'未設定'));
  if(data.petHatched){view.textContent='';renderPetVisual(view,data);}
  else view.textContent='🥚';
  button(actions,'更新',()=>showPet(uid,true),'ms-friends-secondary');
  if(uid!==viewer.uid){
   const state=stateFor(uid);
   if(state==='friend')textEl(actions,'span','おともだち');
   else if(state==='outgoing')textEl(actions,'span','申請中');
   else if(state==='incoming')button(actions,'申請を承認',()=>{petDialog.close();openFriends().then(()=>{tab='incoming';render();});});
   else button(actions,'おともだち申請',()=>sendRequest(data,petDialog));
  }
  notify('',false,petDialog);
 }catch(e){view.textContent='';notify(e.message,true,petDialog);}
}
function init(){
 if(dialog)return;
 openButton=$('#monstudyFriendsOpen');
 if(!openButton){setTimeout(init,100);return;}
 const style=document.createElement('style');
 style.textContent='.ms-friends-dialog{width:min(540px,calc(100vw - 24px));max-height:88dvh;overflow:auto;padding:18px;border:0;border-radius:18px;background:#fffef7;color:#193d38}.ms-friends-dialog::backdrop{background:#15291fc0}.ms-friends-dialog header{display:flex;justify-content:space-between;align-items:center;gap:8px}.ms-friends-dialog h2{font-size:20px;margin:3px 0 10px}.ms-friends-dialog .ms-friends-close{background:#e9f0e9;color:#234d3b;border:0;border-radius:20px;padding:5px 10px;cursor:pointer}.ms-friends-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}.ms-friends-tabs button{flex:1;border:1px solid #b4cfc0;background:#fff;color:#245541;padding:8px;border-radius:9px;font-size:12px;cursor:pointer}.ms-friends-tabs [aria-pressed=true]{background:#286a55;color:#fff}.ms-friends-notice{min-height:20px;color:#277e60;font-size:12px}.ms-friends-notice[data-error="1"]{color:#bd3640}.ms-friends-person{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center;border:1px solid #d2dfd4;border-radius:12px;padding:10px;margin:8px 0}.ms-friends-person-info{display:flex;flex-direction:column;gap:4px}.ms-friends-person-info small,.ms-friends-muted{color:#64736a}.ms-friends-person-actions{display:flex;gap:5px;flex-wrap:wrap}.ms-friends-btn{cursor:pointer;padding:7px 9px;background:#286b56;color:white;border:0;border-radius:8px;font:inherit;font-size:12px;font-weight:700}.ms-friends-btn:disabled{opacity:.45}.ms-friends-secondary{background:#e6efe8;color:#31594a}.ms-friends-search{display:flex;gap:7px}.ms-friends-search input{flex:1;min-width:0;padding:10px;border-radius:8px;border:1px solid #b9c9bf;background:#fff;color:#193d38}.ms-friends-privacy{display:flex;align-items:center;gap:8px;margin:15px 0 0;font-size:12px}.ms-friends-pet-visual{width:min(300px,100%);aspect-ratio:1;margin:8px auto;font-size:68px;display:grid;place-items:center}.ms-friends-pet-visual svg{width:100%;height:100%;display:block}.ms-friends-pet-meta{text-align:center}.ms-friends-pet-meta h2{margin:0}.ms-friends-pet-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}body[data-screen-theme=dark] .ms-friends-dialog{background:#26363a;color:#f0f6ec}body[data-screen-theme=dark] .ms-friends-person{border-color:#68796d}body[data-screen-theme=dark] .ms-friends-muted{color:#b5c6c0}';
 document.head.append(style);
 dialog=document.createElement('dialog');dialog.className='ms-friends-dialog';
 dialog.innerHTML='<header><h2>🐾 おともだち</h2><button class="ms-friends-close" type="button">閉じる</button></header><div class="ms-friends-tabs"><button data-friends-tab="friends" type="button">おともだち</button><button data-friends-tab="incoming" type="button">届いた申請</button><button data-friends-tab="outgoing" type="button">申請中</button><button data-friends-tab="search" type="button">探す</button></div><p class="ms-friends-notice" role="status"></p><div id="msFriendsContent"></div>';
 document.body.append(dialog);
 $('.ms-friends-close',dialog).onclick=()=>dialog.close();
 dialog.querySelectorAll('[data-friends-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.friendsTab;render();});
 petDialog=document.createElement('dialog');petDialog.className='ms-friends-dialog';
 petDialog.innerHTML='<header><h2>🐾 ぺっとを見る</h2><button class="ms-friends-close" type="button">閉じる</button></header><div id="msFriendPetMeta" class="ms-friends-pet-meta"></div><div id="msFriendPetVisual" class="ms-friends-pet-visual"></div><div id="msFriendPetActions" class="ms-friends-pet-actions"></div><p class="ms-friends-notice" role="status"></p>';
 document.body.append(petDialog);
 $('.ms-friends-close',petDialog).onclick=()=>petDialog.close();
 openButton.onclick=openFriends;
 function boot(){
  if(!getApps().length){setTimeout(boot,100);return;}
  onAuthStateChanged(getAuth(getApp()),user=>{
   const previous=viewer?.uid;viewer=user;social=null;socialPromise=null;results=[];searchCache.clear();
   if(previous&&previous!==user?.uid)clearFor(previous);
   if(!user){dialog.close();petDialog.close();}
   openButton.disabled=!user;
  });
 }
 boot();
}
window.monstudyFriendsOpen=()=>openFriends();
window.monstudyFriendsRequest=uid=>sendRequest({uid});
window.monstudyPetView=(uid,force=false)=>showPet(uid,force);
window.addEventListener('monstudy-shop-state',event=>{if(event.detail?.user?.uid===viewer?.uid)profile=event.detail?.data||{};});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
