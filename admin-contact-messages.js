import {getApps,initializeApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getFirestore,doc,onSnapshot} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {getAuth,onAuthStateChanged} from "./auth-session.js?v=2.3.19";
const config={apiKey:"AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ",authDomain:"eiken-retry.firebaseapp.com",projectId:"eiken-retry",storageBucket:"eiken-retry.firebasestorage.app",messagingSenderId:"231308672297",appId:"1:231308672297:web:5e8b8ede3a0246c2318b38"};
const app=getApps()[0]||initializeApp(config),auth=getAuth(app),db=getFirestore(app),API="https://task-quest.onrender.com";
const style=document.createElement("style");
style.textContent=".admin-tab-message-count{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-left:4px;padding:0 5px;border-radius:999px;background:#c84638;color:white;font-size:10px;line-height:1;font-weight:900}.contact-admin-panel{display:grid;gap:12px;margin-top:14px}.contact-admin-panel[hidden]{display:none}.contact-admin-list{display:grid;gap:10px}.contact-admin-card{border:1px solid #e5ebe7;border-radius:10px;padding:12px;background:white}.contact-admin-card p{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0}.contact-admin-meta{font-size:11px;color:#6f7d77}.contact-admin-status{padding:14px;border:1px solid #dfe7e2;border-radius:12px;background:white;color:#6f7d77}.contact-admin-more{justify-self:start}";
document.head.append(style);
const adminPanel=document.getElementById("panel");
function tabsReady(){const existing=adminPanel?.querySelector(".admin-tabs");if(existing)return Promise.resolve(existing);return new Promise(resolve=>{const observer=new MutationObserver(()=>{const tabs=adminPanel?.querySelector(".admin-tabs");if(tabs){observer.disconnect();resolve(tabs);}});observer.observe(adminPanel||document.body,{childList:true,subtree:true});});}
const tabs=await tabsReady(),usersTab=tabs.querySelector(".admin-tab"),securityTab=tabs.querySelectorAll(".admin-tab")[1];
if(!usersTab||!securityTab)throw Error("管理画面のタブを初期化できません。");
const messageTab=document.createElement("button");messageTab.type="button";messageTab.className="admin-tab";messageTab.textContent="✉ メッセージ";
tabs.append(messageTab);
const messagePanel=document.createElement("section");messagePanel.className="contact-admin-panel";messagePanel.hidden=true;
messagePanel.innerHTML='<div class="contact-admin-status" data-status>メッセージを開くと一覧を読み込みます。</div><div class="contact-admin-list" data-list></div><button type="button" class="btn contact-admin-more" data-more hidden>次の50件</button>';
adminPanel.append(messagePanel);
const status=messagePanel.querySelector("[data-status]"),list=messagePanel.querySelector("[data-list]"),more=messagePanel.querySelector("[data-more]");
let unsubscribe=null,nextToken=null,loading=false,adminUid="",opened=false;
function setCount(value){const n=Math.max(0,Math.floor(Number(value)||0));messageTab.replaceChildren(document.createTextNode("✉ メッセージ"));if(n){const badge=document.createElement("span");badge.className="admin-tab-message-count";badge.textContent=String(n);messageTab.append(badge);}messageTab.setAttribute("aria-label",n?("開発者へのメッセージ、新着"+n+"件"):"開発者へのメッセージ");}
function date(value){if(!value)return "日時不明";const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"});}
function card(item){const el=document.createElement("article");el.className="contact-admin-card";const meta=document.createElement("div");meta.className="contact-admin-meta";meta.textContent=date(item.createdAt||item.sentAt)+" ・ "+(item.page||"ページ不明");const msg=document.createElement("p");msg.textContent=item.message||"（本文なし）";const uid=document.createElement("div");uid.className="contact-admin-meta";uid.textContent="ユーザーID: "+(item.uid||"不明");el.append(meta,msg,uid);return el;}
async function loadPage(token=""){if(loading)return;loading=true;more.disabled=true;status.textContent="読み込み中…";try{const user=auth.currentUser;if(!user)throw Error("管理者としてログインしてください。");const idToken=await user.getIdToken();const url=new URL(API+"/api/admin/contact-messages");if(token)url.searchParams.set("pageToken",token);const response=await fetch(url,{headers:{Authorization:"Bearer "+idToken},signal:AbortSignal.timeout(20000)});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||"メッセージを取得できませんでした。");if(!token)list.replaceChildren();for(const item of data.messages||[])list.append(card(item));nextToken=data.nextPageToken||null;more.hidden=!nextToken;status.textContent=list.childElementCount?list.childElementCount+"件を表示中":"メッセージはまだありません。";}catch(error){status.textContent=error.message||"読み込みに失敗しました。";}finally{loading=false;more.disabled=false;}}
async function showMessages(){messagePanel.hidden=false;opened=true;for(const child of adminPanel.children){if(child!==tabs&&child!==messagePanel)child.hidden=true;}for(const tab of tabs.querySelectorAll(".admin-tab"))tab.classList.remove("active");messageTab.classList.add("active");await loadPage("");}
function leaveMessages(){messagePanel.hidden=true;messageTab.classList.remove("active");opened=false;}
messageTab.onclick=showMessages;usersTab.addEventListener("click",leaveMessages);securityTab.addEventListener("click",leaveMessages);more.onclick=()=>nextToken&&loadPage(nextToken);
onAuthStateChanged(auth,async user=>{
 if(unsubscribe){unsubscribe();unsubscribe=null;}adminUid="";messagePanel.hidden=true;messageTab.hidden=true;setCount(0);
 if(!user)return;
 try{const token=await user.getIdToken();const response=await fetch(API+"/api/admin/session",{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});if(!response.ok)return;
 adminUid=user.uid;messageTab.hidden=false;
 unsubscribe=onSnapshot(doc(db,"users",adminUid,"developerMessageNotifications","current"),snapshot=>setCount(snapshot.exists()?snapshot.data().unreadCount:0),()=>{messageTab.title="新着通知を接続できません。管理画面を開き直してください。";});
 }catch{}
});
