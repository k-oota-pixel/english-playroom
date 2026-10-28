import {getAuth,onAuthStateChanged,getIdTokenResult,signOut} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.3';

const auth=getAuth(),form=document.getElementById('form'),status=document.getElementById('status'),submit=document.getElementById('submit');
let eligible=false;
function show(message,ok=false){status.textContent=message;status.className='status'+(ok?' ok':'');}
onAuthStateChanged(auth,async user=>{
  if(!user){location.replace('./login.html');return;}
  try{const token=await getIdTokenResult(user);eligible=token.claims.passwordResetRequired===true;if(!eligible)location.replace('./');}
  catch{show('ログイン状態を確認できません。もう一度ログインしてください。');}
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(!eligible||!auth.currentUser)return;
  const password=document.getElementById('password').value,confirmPassword=document.getElementById('confirm').value;
  if(password.length<6){show('新しいパスワードは6文字以上で設定してください。');return;}
  if(password==='000000'){show('仮パスワードとは異なるパスワードを設定してください。');return;}
  if(password!==confirmPassword){show('確認用パスワードが一致しません。');return;}
  submit.disabled=true;show('パスワードを保存しています…');
  try{
    const token=await auth.currentUser.getIdToken();
    const response=await fetch('https://task-quest.onrender.com/api/admin/users?completePasswordReset=1',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password}),signal:AbortSignal.timeout(20000)});
    let data={};try{data=await response.json();}catch{}
    if(!response.ok)throw Error(data.error||'パスワードを保存できませんでした。');
    eligible=false;form.hidden=true;show('新しいパスワードを保存しました。ログイン画面から新しいパスワードでログインしてください。',true);
    document.getElementById('login').classList.remove('hidden');
    await signOut(auth);
  }catch(error){show(error.message||'保存できませんでした。もう一度お試しください。');}
  finally{submit.disabled=false;}
});
