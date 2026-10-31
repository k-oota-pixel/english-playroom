import {getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth} from './auth-session.js?v=2.3.2';

const API='https://task-quest.onrender.com/api/contact-message';
const MAX_LENGTH=2000;

function installStyle(){
  if(document.getElementById('developerContactStyle'))return;
  const style=document.createElement('style');
  style.id='developerContactStyle';
  style.textContent=`
.auth-links-stack{display:flex;align-items:center;gap:9px;flex:0 0 auto}
.auth-links-stack>a,.developer-message-btn{font-size:11px!important;color:#246a57!important;white-space:nowrap;text-decoration:none}
.auth-links-stack>a:hover,.developer-message-btn:hover{text-decoration:underline}
.developer-message-btn{appearance:none;border:0;background:transparent;padding:0;font:inherit;font-weight:650;cursor:pointer}
#authSub{display:none!important}
.developer-contact-dialog{width:min(92vw,520px);border:0;border-radius:20px;padding:0;color:#193d38;background:#fff;box-shadow:0 22px 70px #173c3540}
.developer-contact-dialog::backdrop{background:#10231f73;backdrop-filter:blur(2px)}
.developer-contact-card{padding:20px}
.developer-contact-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.developer-contact-title{margin:0;font-size:20px;line-height:1.35}
.developer-contact-close{appearance:none;border:1px solid #d9e4dc;background:#fff;color:#52675e;border-radius:999px;width:34px;height:34px;font:700 20px/1 system-ui;cursor:pointer}
.developer-contact-lead{margin:9px 0 15px;color:#667870;font-size:12.5px;line-height:1.65}
.developer-contact-label{display:block;font-size:12px;font-weight:850;margin-bottom:7px}
.developer-contact-textarea{display:block;width:100%;min-height:160px;resize:vertical;border:1px solid #cadbd1;border-radius:13px;padding:12px 13px;font:14px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;color:#193d38;background:#fbfdfb}
.developer-contact-textarea:focus{outline:3px solid #2d796326;border-color:#2d7963;background:#fff}
.developer-contact-meta{display:flex;justify-content:space-between;gap:10px;margin-top:6px;color:#829087;font-size:10px}
.developer-contact-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:17px}
.developer-contact-cancel,.developer-contact-send{appearance:none;border-radius:999px;padding:9px 15px;font:800 12px system-ui;cursor:pointer}
.developer-contact-cancel{border:1px solid #d7e1da;background:#fff;color:#52675e}
.developer-contact-send{border:0;background:#245f50;color:#fff;min-width:86px}
.developer-contact-send:disabled{opacity:.55;cursor:wait}
.developer-contact-status{min-height:20px;margin:12px 0 0;font-size:11.5px;line-height:1.5;color:#5a6d64}
.developer-contact-status.ok{color:#24704e;font-weight:750}.developer-contact-status.error{color:#b14d40;font-weight:750}
@media(max-width:560px){
  .auth-links-stack{flex-direction:column;align-items:flex-start;gap:2px;line-height:1.25}
  .auth-links-stack>a,.developer-message-btn{font-size:9.5px!important}
  .developer-contact-card{padding:17px}.developer-contact-title{font-size:18px}.developer-contact-textarea{min-height:145px;font-size:16px}
}
`;
  document.head.append(style);
}

function buildDialog(){
  let dialog=document.getElementById('developerContactDialog');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='developerContactDialog';
  dialog.className='developer-contact-dialog';
  dialog.setAttribute('aria-labelledby','developerContactTitle');
  dialog.innerHTML=`<form class="developer-contact-card" method="dialog">
    <div class="developer-contact-head">
      <div><h2 class="developer-contact-title" id="developerContactTitle">開発者にメッセージ</h2></div>
      <button class="developer-contact-close" type="button" aria-label="閉じる">×</button>
    </div>
    <p class="developer-contact-lead">不具合の報告や改善のアイデアなどを送れます。メールアドレスの入力は不要で、あなたのメールアドレスがメッセージに添付されることもありません。</p>
    <label class="developer-contact-label" for="developerContactMessage">メッセージ</label>
    <textarea class="developer-contact-textarea" id="developerContactMessage" maxlength="${MAX_LENGTH}" required placeholder="例：○○の画面でボタンを押しても反応しません。"></textarea>
    <div class="developer-contact-meta"><span>個人情報は入力しないでください。</span><span data-contact-count>0 / ${MAX_LENGTH}</span></div>
    <p class="developer-contact-status" data-contact-status role="status" aria-live="polite"></p>
    <div class="developer-contact-actions"><button class="developer-contact-cancel" type="button">キャンセル</button><button class="developer-contact-send" type="submit">送信</button></div>
  </form>`;
  document.body.append(dialog);
  const form=dialog.querySelector('form');
  const textarea=dialog.querySelector('textarea');
  const count=dialog.querySelector('[data-contact-count]');
  const status=dialog.querySelector('[data-contact-status]');
  const sendButton=dialog.querySelector('.developer-contact-send');
  const close=()=>{if(dialog.open)dialog.close();};
  dialog.querySelector('.developer-contact-close').addEventListener('click',close);
  dialog.querySelector('.developer-contact-cancel').addEventListener('click',close);
  textarea.addEventListener('input',()=>{count.textContent=`${[...textarea.value].length} / ${MAX_LENGTH}`;status.textContent='';status.className='developer-contact-status';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const message=textarea.value.trim();
    if(!message){status.textContent='メッセージを入力してください。';status.className='developer-contact-status error';textarea.focus();return;}
    sendButton.disabled=true;sendButton.textContent='送信中…';status.textContent='';status.className='developer-contact-status';
    try{
      const auth=getAuth(getApp());
      const user=auth.currentUser;
      if(!user)throw Error('ログイン状態を確認できません。ページを開き直してください。');
      const token=await user.getIdToken();
      const response=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({message,page:location.pathname+location.search}),signal:AbortSignal.timeout(20000)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||'メッセージを送信できませんでした。');
      textarea.value='';count.textContent=`0 / ${MAX_LENGTH}`;status.textContent='送信しました。ありがとうございます。';status.className='developer-contact-status ok';
      setTimeout(close,1100);
    }catch(error){status.textContent=error?.message||'メッセージを送信できませんでした。';status.className='developer-contact-status error';}
    finally{sendButton.disabled=false;sendButton.textContent='送信';}
  });
  return dialog;
}

function install(){
  installStyle();
  const area=document.querySelector('.auth-area');
  if(!area)return;
  const accountLink=area.querySelector('a[href*="account.html"]');
  if(!accountLink)return;
  if(accountLink.textContent!=='コード登録')accountLink.textContent='コード登録';
  let stack=area.querySelector('.auth-links-stack');
  if(!stack){
    stack=document.createElement('span');stack.className='auth-links-stack';
    accountLink.before(stack);stack.append(accountLink);
  }
  let button=stack.querySelector('.developer-message-btn');
  if(!button){
    button=document.createElement('button');button.type='button';button.className='developer-message-btn';button.textContent='開発者にメッセージ';
    button.addEventListener('click',()=>{const dialog=buildDialog();dialog.querySelector('[data-contact-status]').textContent='';dialog.querySelector('[data-contact-status]').className='developer-contact-status';dialog.showModal();setTimeout(()=>dialog.querySelector('textarea')?.focus(),0);});
    stack.append(button);
  }
  const authSub=area.querySelector('#authSub');if(authSub&&!authSub.hidden)authSub.hidden=true;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
new MutationObserver(install).observe(document.documentElement,{subtree:true,childList:true});
