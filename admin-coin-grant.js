import {getAuth} from './auth-session.js?v=2.4.37';

const API='https://task-quest.onrender.com';
const auth=getAuth();
const header=document.querySelector('.auth');
if(!header)throw Error('管理画面のヘッダーが見つかりません。');

const style=document.createElement('style');
style.textContent='.coin-grant-dialog{width:min(600px,calc(100vw - 28px));max-height:88vh;overflow-y:auto;border:1px solid #dfe7e2;border-radius:16px;padding:20px;color:#173b35;background:#fff;box-shadow:0 22px 70px #102d273f}.coin-grant-dialog::backdrop{background:#122b2885}.coin-grant-dialog h2{margin:0 0 8px;font-size:20px}.coin-grant-dialog .cg-note{font-size:12px;color:#67766f;margin:6px 0 12px}.coin-grant-dialog label{display:block;font-weight:700;margin:10px 0 4px}.coin-grant-dialog input{display:block;width:100%;padding:11px;border-radius:9px;border:1px solid #a9bdb2;font:inherit}.coin-grant-dialog .cg-results{max-height:220px;overflow-y:auto;display:grid;gap:6px;margin:8px 0}.coin-grant-dialog .cg-result{width:100%;text-align:left;border:1px solid #dfe7e2;border-radius:9px;background:#f6f9f7;color:#173b35;padding:9px 12px;cursor:pointer;overflow-wrap:anywhere}.coin-grant-dialog .cg-result:hover,.coin-grant-dialog .cg-result:focus{border-color:#246a57;background:#edf6f1}.coin-grant-dialog .cg-result strong{display:block}.coin-grant-dialog .cg-result small{display:block;color:#68766f;line-height:1.5}.coin-grant-dialog .cg-selection{background:#f3f8f4;border:1px solid #b8d4c4;padding:12px;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere}.coin-grant-dialog .cg-quick,.coin-grant-dialog .cg-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.coin-grant-dialog .cg-quick button{padding:5px 12px;border:1px solid #becbc3;background:#fff;border-radius:8px;cursor:pointer}.coin-grant-dialog .cg-actions{justify-content:flex-end}.coin-grant-dialog .cg-feedback{white-space:pre-wrap;margin:8px 0;color:#375b4b}.coin-grant-dialog .cg-feedback.error{color:#a4463a}.coin-grant-dialog .cg-feedback.success{color:#246a57;font-weight:bold}.coin-grant-dialog [hidden]{display:none!important}';
document.head.append(style);

const openButton=document.createElement('button');
openButton.type='button';
openButton.className='btn primary';
openButton.textContent='🪙 コイン付与';
openButton.hidden=true;
header.insertBefore(openButton,document.getElementById('logout'));

const dialog=document.createElement('dialog');
dialog.className='coin-grant-dialog';
dialog.setAttribute('aria-labelledby','coin-grant-title');
dialog.innerHTML=[
 '<h2 id="coin-grant-title">🪙 コインを付与</h2>',
 '<p class="cg-note">検索して本人を選択し、付与するコイン数を指定してください。検索は管理者のみ利用できます。</p>',
 '<label for="coin-grant-search">コード名・ニックネーム・ペット名・IDで検索</label>',
 '<input id="coin-grant-search" type="search" maxlength="32" autocomplete="off" placeholder="2文字以上入力（ペット名は完全一致）">',
 '<div class="cg-feedback" role="status" aria-live="polite" data-status>検索語を入力してください。</div>',
 '<div class="cg-results" data-results></div>',
 '<section data-selected hidden>',
 ' <label>付与対象（本人確認）</label><div class="cg-selection" data-identity></div>',
 ' <label for="coin-grant-amount">付与するコイン数</label>',
 ' <input id="coin-grant-amount" type="number" min="1" max="1000000" step="1" inputmode="numeric" placeholder="例：20">',
 ' <div class="cg-quick" data-quick><button type="button" data-amount="5">5</button><button type="button" data-amount="10">10</button><button type="button" data-amount="20">20</button><button type="button" data-amount="50">50</button><button type="button" data-amount="100">100</button></div>',
 '</section>',
 '<div class="cg-actions"><button type="button" class="btn" data-close>閉じる</button><button type="button" class="btn primary" data-grant disabled>選択した利用者に付与</button></div>'
].join('');
document.body.append(dialog);

const $=selector=>dialog.querySelector(selector);
const searchInput=$('#coin-grant-search'),amountInput=$('#coin-grant-amount');
const feedback=$('[data-status]'),results=$('[data-results]'),selectedPanel=$('[data-selected]');
const identity=$('[data-identity]'),grantButton=$('[data-grant]');
let selected=null,loading=false,searchSerial=0,searchTimer=null;
function status(message,kind=''){feedback.textContent=message;feedback.className='cg-feedback'+(kind?' '+kind:'');}
function describe(u){
 return 'コード名：'+(u.codeName||'未登録')+'\nニックネーム：'+(u.nickname||'未登録')+
 '\nペット名：'+(u.petName||'未設定')+'\nID：'+u.uid+
 '\n現在の残高：'+Number(u.coins||0).toLocaleString('ja-JP')+' コイン';
}
function resetSelection(){selected=null;selectedPanel.hidden=true;grantButton.disabled=true;amountInput.value='';}
function resetModal(){
 clearTimeout(searchTimer);++searchSerial;searchInput.value='';results.replaceChildren();resetSelection();status('検索語を入力してください。');
}
function authorized(){return document.documentElement.dataset.monstudyAdminAuthorized==='true'&&Boolean(auth.currentUser);}
async function adminApi(path,options={}){
 if(!authorized())throw Error('管理者ログインが必要です。');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch(API+path,{...options,headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000)});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.error||'管理サーバーからの取得に失敗しました。');
 return body;
}
function selectUser(u){
 selected=u;results.replaceChildren();selectedPanel.hidden=false;
 identity.textContent=describe(u);amountInput.value='20';grantButton.disabled=false;
 status('付与対象を確認してください。','');
 amountInput.focus();
}
function renderResults(data){
 results.replaceChildren();
 const users=Array.isArray(data.users)?data.users:[];
 if(!users.length){status('一致する登録者がいません。ペット名は完全一致で検索してください。');return;}
 for(const u of users.slice(0,30)){
  const b=document.createElement('button');b.type='button';b.className='cg-result';
  const name=document.createElement('strong'),details=document.createElement('small');
  name.textContent=(u.codeName||'コード名未登録')+' ／ '+(u.nickname||'ニックネーム未登録');
  details.textContent='ペット：'+(u.petName||'未設定')+' ｜ ID：'+u.uid+' ｜ 🪙'+Number(u.coins||0).toLocaleString('ja-JP');
  b.append(name,details);b.addEventListener('click',()=>selectUser(u));results.append(b);
 }
 const total=Number(data.total)||users.length;
 status(total+'件見つかりました。対象者を選択してください。'+(total>30?'（最初の30件を表示。検索語を絞ってください。）':''));
}
function search(){
 clearTimeout(searchTimer);const serial=++searchSerial;resetSelection();results.replaceChildren();
 const query=searchInput.value.trim();
 if([...query].length<2){status('2文字以上入力してください。');return;}
 status('登録者全体から検索しています…');
 searchTimer=setTimeout(async()=>{
  try{
   const data=await adminApi('/api/admin/users?search='+encodeURIComponent(query));
   if(serial!==searchSerial||query!==searchInput.value.trim()||!dialog.open)return;
   renderResults(data);
  }catch(error){
   if(serial===searchSerial&&dialog.open)status(error.message||'検索に失敗しました。','error');
  }
 },500);
}
searchInput.addEventListener('input',search);
amountInput.addEventListener('input',()=>{
 grantButton.disabled=!selected||loading||!Number.isSafeInteger(Number(amountInput.value))||Number(amountInput.value)<1||Number(amountInput.value)>1000000;
});
$('[data-quick]').addEventListener('click',event=>{
 const amount=event.target.closest('button[data-amount]')?.dataset.amount;
 if(amount){amountInput.value=amount;amountInput.dispatchEvent(new Event('input'));}
});
$('[data-close]').addEventListener('click',()=>dialog.close());
openButton.addEventListener('click',()=>{
 if(!authorized())return;
 resetModal();dialog.showModal();searchInput.focus();
});
dialog.addEventListener('close',()=>{clearTimeout(searchTimer);++searchSerial;});
grantButton.addEventListener('click',async()=>{
 if(loading||!selected||!authorized())return;
 const amount=Number(amountInput.value);
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000){status('付与数は1〜1,000,000の整数を入力してください。','error');return;}
 const target=selected;
 if(!window.confirm(describe(target)+'\n\nこの利用者に '+amount.toLocaleString('ja-JP')+' コインを加算しますか？'))return;
 loading=true;grantButton.disabled=true;searchInput.disabled=true;
 try{
  const data=await adminApi('/api/admin/coins',{method:'POST',body:JSON.stringify({uid:target.uid,amount})});
  window.dispatchEvent(new CustomEvent('monstudy-admin-coin-granted',{detail:{uid:target.uid,coins:data.coins}}));
  resetSelection();results.replaceChildren();searchInput.value='';
  status('付与が完了しました：'+(target.nickname||target.codeName||target.uid)+' に '+amount.toLocaleString('ja-JP')+' コイン。\n付与後の残高：'+Number(data.coins||0).toLocaleString('ja-JP')+' コイン','success');
 }catch(error){
  status(error.name==='TimeoutError'?'通信がタイムアウトしました。重複付与を防ぐため、残高を確認してから再操作してください。':(error.message||'コイン付与に失敗しました。'),'error');
  grantButton.disabled=false;
 }finally{loading=false;searchInput.disabled=false;}
});
function updateAuthorization(){
 const ok=authorized();openButton.hidden=!ok;
 if(!ok&&dialog.open)dialog.close();
}
window.addEventListener('monstudy-admin-access-change',updateAuthorization);
updateAuthorization();
