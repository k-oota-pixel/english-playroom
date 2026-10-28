import {getAuth,onAuthStateChanged as watchAuth,getIdTokenResult} from './auth-session.js?v=2.1.3';

const API='https://task-quest.onrender.com';
const users=document.getElementById('users');
if(users){
  const style=document.createElement('style');
  style.textContent='.account-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:0 12px 9px}.account-tools button{border:1px solid #d7dfd9;background:#fff;border-radius:9px;padding:5px 9px;font:inherit;font-size:10px;font-weight:800;color:#36564d;cursor:pointer}.account-tools button:disabled{opacity:.5;cursor:wait}.account-tools .email-value{font-size:11px;color:#345b4d;overflow-wrap:anywhere}';
  document.head.append(style);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function defaultAuth(){for(let i=0;i<40;i++){try{return getAuth();}catch{}await sleep(50);}throw Error('管理画面の認証を初期化できませんでした。');}
const auth=await defaultAuth();
function showStatus(text,kind=''){const el=document.getElementById('status');if(el){el.textContent=text;el.className='status'+(kind?' '+kind:'');}}
  async function call(path,options={}){
    const user=auth.currentUser;if(!user)throw Error('管理者ログインをしてください。');
    const token=await user.getIdToken();
    const response=await fetch(API+path,{...options,signal:AbortSignal.timeout(20000),headers:{...(options.headers||{}),Authorization:'Bearer '+token,'Content-Type':'application/json'}});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw Error(data.error||'管理APIを利用できませんでした。');
    return data;
  }
  function enhance(){
    for(const card of users.querySelectorAll('.user[data-uid]')){
      if(card.querySelector('.account-tools'))continue;
      const summary=card.querySelector('.user-summary');if(!summary)continue;
      const tools=document.createElement('div');tools.className='account-tools';
      const emailButton=document.createElement('button');emailButton.type='button';emailButton.textContent='メールアドレスを確認';
      const resetButton=document.createElement('button');resetButton.type='button';resetButton.textContent='パスワードを000000にリセット';
      const value=document.createElement('span');value.className='email-value';value.hidden=true;value.setAttribute('aria-live','polite');
      emailButton.addEventListener('click',async()=>{
        if(!value.hidden){value.hidden=true;emailButton.textContent='メールアドレスを確認';return;}
        emailButton.disabled=true;emailButton.textContent='確認中…';
        try{const data=await call('/api/admin/users?emailUid='+encodeURIComponent(card.dataset.uid));value.textContent=data.email||'メールアドレスは登録されていません';value.hidden=false;emailButton.textContent='メールアドレスを隠す';}
        catch(error){showStatus(error.message,'error');emailButton.textContent='メールアドレスを確認';}
        finally{emailButton.disabled=false;}
      });
      resetButton.addEventListener('click',async()=>{
        const title=card.querySelector('.nickname')?.textContent||'この利用者';
        if(!confirm(title+' のパスワードを000000に変更しますか？\n\nすべてのログイン状態を解除し、次回ログイン時に利用者本人が新しいパスワードを設定する必要があります。'))return;
        resetButton.disabled=true;resetButton.textContent='処理中…';
        try{await call('/api/admin/users?resetPassword=1',{method:'POST',body:JSON.stringify({uid:card.dataset.uid})});resetButton.textContent='リセット済み';showStatus(title+' のパスワードを000000に変更しました。次回ログイン後に新しいパスワードの設定が必要です。','ok');}
        catch(error){resetButton.disabled=false;resetButton.textContent='パスワードを000000にリセット';showStatus(error.message,'error');}
      });
      tools.append(emailButton,resetButton,value);summary.after(tools);
    }
  }
  new MutationObserver(enhance).observe(users,{childList:true,subtree:true});
  enhance();
  watchAuth(auth,user=>{if(!user){for(const node of users.querySelectorAll('.account-tools'))node.remove();}});
}
