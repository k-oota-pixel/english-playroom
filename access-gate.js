import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signOut} from './auth-session.js?v=2.3.2';
if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
await new Promise(resolve=>setTimeout(resolve,0));
const app=getApps().find(app=>app.name==='[DEFAULT]')||initializeApp({apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'});
const auth=getAuth(app);
function failure(error){
 document.getElementById('monstudy-access-message')?.remove();
 const panel=document.createElement('section');panel.id='monstudy-access-message';
 panel.style.cssText='visibility:visible;position:fixed;inset:0;z-index:2147483647;display:grid;place-content:center;gap:16px;padding:24px;background:#f6f5ef;color:#193d38;font:16px/1.7 system-ui';
 const message=document.createElement('p');message.textContent=error.message||'ログイン確認に接続できませんでした。';
 const retry=document.createElement('button');retry.textContent='もう一度確認する';retry.onclick=()=>location.reload();
 const logout=document.createElement('button');logout.textContent='ログイン画面へ';logout.onclick=async()=>{await signOut(auth);location.href='https://k-oota-pixel.github.io/english-playroom/login.html';};
 panel.append(message,retry,logout);document.body.append(panel);
}
window.addEventListener('monstudy-access-error',event=>failure(event.detail));
onAuthStateChanged(auth,user=>{
 if(!user)return;
 document.getElementById('monstudy-access-lock')?.remove();
 document.getElementById('monstudy-access-message')?.remove();
},failure);
