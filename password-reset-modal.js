import {getIdTokenResult,signInWithEmailAndPassword,signOut} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.4';

export function installPasswordResetModal(auth){
  const style=document.createElement('style');
  style.textContent=`
    .required-password-dialog{width:min(480px,calc(100% - 32px));border:1px solid #dce5da;border-radius:20px;padding:0;color:#193d38;box-shadow:0 18px 60px #193d3830;font:14px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
    .required-password-dialog::backdrop{background:#193d3880;backdrop-filter:blur(3px)}
    .required-password-panel{padding:24px}
    .required-password-panel h2{margin:0 0 8px;font-size:23px}
    .required-password-panel p{margin:0 0 16px;color:#65756e}
    .required-password-field{display:grid;gap:6px;margin:12px 0}
    .required-password-field label{font-size:12px;font-weight:800}
    .required-password-field input{width:100%;border:1px solid #cbd8cf;border-radius:11px;padding:11px 12px;font:inherit}
    .required-password-submit,.required-password-login{width:100%;border:0;border-radius:11px;padding:12px;background:#246a57;color:white;font:inherit;font-weight:850;cursor:pointer}
    .required-password-submit:disabled{opacity:.55;cursor:wait}
    .required-password-status{min-height:1.5em;margin:12px 0;color:#9b453b;font-size:12px}
    .required-password-status.ok{color:#2f6f50}
    .required-password-login{display:block;margin-top:12px;text-align:center;text-decoration:none;background:#f0f5f0;color:#246a57}
  `;
  document.head.append(style);
  const dialog=document.createElement('dialog');
  dialog.className='required-password-dialog';
  dialog.setAttribute('aria-labelledby','requiredPasswordTitle');
  dialog.innerHTML=`<section class="required-password-panel">
    <h2 id="requiredPasswordTitle">新しいパスワードを設定</h2>
    <p>管理者によるリセット後のため、続ける前に新しいパスワードを設定してください。6文字以上、仮パスワードとは異なるものにしてください。</p>
    <form id="requiredPasswordForm">
      <div class="required-password-field"><label for="requiredPassword">新しいパスワード</label><input id="requiredPassword" type="password" autocomplete="new-password" minlength="6" required></div>
      <div class="required-password-field"><label for="requiredPasswordConfirm">新しいパスワード（確認）</label><input id="requiredPasswordConfirm" type="password" autocomplete="new-password" minlength="6" required></div>
      <p id="requiredPasswordStatus" class="required-password-status" role="status" aria-live="polite"></p>
      <button id="requiredPasswordSubmit" class="required-password-submit" type="submit">新しいパスワードを保存</button>
    </form>
    <a id="requiredPasswordLogin" class="required-password-login" href="./login.html" hidden>ログインし直す</a>
  </section>`;
  document.body.append(dialog);
  const form=dialog.querySelector('#requiredPasswordForm');
  const status=dialog.querySelector('#requiredPasswordStatus');
  const submit=dialog.querySelector('#requiredPasswordSubmit');
  const login=dialog.querySelector('#requiredPasswordLogin');
  let requiredUid='';
  const show=(message,ok=false)=>{status.textContent=message;status.classList.toggle('ok',ok);};
  dialog.addEventListener('cancel',event=>event.preventDefault());

  async function check(user){
    if(!user){requiredUid='';if(dialog.open)dialog.close();return false;}
    try{
      const token=await getIdTokenResult(user);
      const required=token.claims.passwordResetRequired===true;
      if(required){requiredUid=user.uid;if(!dialog.open)dialog.showModal();return true;}
      requiredUid='';if(dialog.open)dialog.close();return false;
    }catch(error){
      console.error('Password reset status could not be checked',error);
      return false;
    }
  }

  login.addEventListener('click',async event=>{
    event.preventDefault();
    try{await signOut(auth);}catch(error){console.error('Could not sign out before login',error);}
    const back=encodeURIComponent(new URL('./',location.href).href);
    location.href='./login.html?return='+back;
  });

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const user=auth.currentUser;
    if(!user||user.uid!==requiredUid)return;
    const password=dialog.querySelector('#requiredPassword').value;
    const confirmPassword=dialog.querySelector('#requiredPasswordConfirm').value;
    if(password.length<6){show('新しいパスワードは6文字以上で設定してください。');return;}
    if(password==='000000'){show('仮パスワードとは異なるパスワードを設定してください。');return;}
    if(password!==confirmPassword){show('確認用パスワードが一致しません。');return;}
    submit.disabled=true;show('パスワードを保存しています…');
    let saved=false;
    try{
      const token=await user.getIdToken();
      const response=await fetch('https://task-quest.onrender.com/api/admin/users?completePasswordReset=1',{
        method:'POST',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
        body:JSON.stringify({password}),
        signal:AbortSignal.timeout(20000)
      });
      let data={};try{data=await response.json();}catch{}
      if(!response.ok)throw Error(data.error||'パスワードを保存できませんでした。');
      saved=true;
      const credential=await signInWithEmailAndPassword(auth,user.email,password);
      const refreshed=await getIdTokenResult(credential.user,true);
      if(refreshed.claims.passwordResetRequired===true)throw Error('パスワード再設定状態が解除されていません。');
      requiredUid='';form.reset();dialog.close();
    }catch(error){
      if(saved){
        form.hidden=true;login.hidden=false;
        show('パスワードは保存されました。ログインを更新できなかったため、ログインし直してください。',true);
      }else{
        show(error.message||'保存できませんでした。もう一度お試しください。');
      }
    }finally{
      submit.disabled=false;
    }
  });

  return {check};
}
