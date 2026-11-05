import {auth,authReady} from '../coin-reward.js?v=2.3.6';

const dialog=document.getElementById('rankingDialog'),heading=document.getElementById('rankingTitle'),status=document.getElementById('rankingStatus'),list=document.getElementById('rankingList'),reload=document.getElementById('rankingReload');
let mode='tower',sequence=0,controller=null;
async function load(){
 const requestId=++sequence,current=mode;controller?.abort();controller=new AbortController();reload.disabled=true;list.replaceChildren();status.textContent='ランキングを読み込んでいます…';
 try{
  await authReady;if(requestId!==sequence)return;
  const user=auth.currentUser;
  if(!user||user.isAnonymous)throw Error('もんすたでぃでログインしてから再表示してください。');
  const token=await user.getIdToken();if(requestId!==sequence)return;
  if(auth.currentUser?.uid!==user.uid)throw Error('ログイン状態が変わりました。再表示してください。');
  const response=await fetch('https://task-quest.onrender.com/api/adventure/rankings?mode='+current,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
  if(requestId!==sequence)return;
  if(auth.currentUser?.uid!==user.uid)throw Error('ログイン状態が変わりました。再表示してください。');
  if(!response.ok){
   const result=await response.json().catch(()=>({}));
   throw Error(response.status===401?'ログイン情報を確認できませんでした。ページを更新して再試行してください。':response.status===403&&result.error?result.error:'ランキングを取得できませんでした。再表示をお試しください。');
  }
  const data=await response.json();if(requestId!==sequence)return;
  if(auth.currentUser?.uid!==user.uid)throw Error('ログイン状態が変わりました。再表示してください。');
  if(!Array.isArray(data.leaders))throw Error('ランキングを取得できませんでした。');
  for(const entry of data.leaders){
   const row=document.createElement('li'),rank=document.createElement('strong'),identity=document.createElement('span'),name=document.createElement('b'),title=document.createElement('small'),floor=document.createElement('strong');
   rank.textContent=entry.rank+'位';name.textContent=entry.petName;title.textContent='ー'+(entry.title||'称号なし')+'ー';identity.append(name,title);floor.textContent=current==='tower'?entry.floor+'階':'地下'+entry.floor+'層';row.append(rank,identity,floor);list.append(row);
  }
  status.textContent=data.leaders.length?'自己ベスト更新後にランキングへ反映されます。':'まだ記録がありません。最初の冒険に挑戦しよう！';
 }catch(error){if(requestId===sequence&&error.name!=='AbortError')status.textContent=error.message;}
 finally{if(requestId===sequence)reload.disabled=false;}
}
for(const button of document.querySelectorAll('[data-ranking]'))button.addEventListener('click',()=>{mode=button.dataset.ranking;heading.textContent=(mode==='tower'?'魔王の塔':'魔物の巣窟')+'ランキング';dialog.showModal();load();});
document.getElementById('rankingClose').addEventListener('click',()=>dialog.close());reload.addEventListener('click',load);dialog.addEventListener('close',()=>{sequence++;controller?.abort();reload.disabled=false;});

