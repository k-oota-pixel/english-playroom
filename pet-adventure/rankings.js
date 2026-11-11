import {auth,authReady} from '../coin-reward.js?v=2.3.6';
import {openRankedPet,rankedPetButton} from '../ranked-pet-view.js?v=2.4.71';


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
   rank.textContent=entry.rank+'位';name.textContent=entry.petName;name.style.cursor='pointer';name.title='ぺっとを見る';name.onclick=()=>openRankedPet(entry.uid,message=>{status.textContent=message;});title.textContent='ー'+(entry.title||'称号なし')+'ー';identity.append(name,title);floor.className='ranking-floor';floor.append(document.createTextNode(current==='tower'?entry.floor+'階':'地下'+entry.floor+'層'));
   if(Number(entry.floor)===100){const clearState=document.createElement('small');clearState.className='adventure-clear-state '+(entry.cleared===true?'is-cleared':'is-challenging');clearState.textContent=entry.cleared===true?'★ 完全制覇':'挑戦中';floor.append(clearState);}
   const view=rankedPetButton(entry,message=>{status.textContent=message;});row.append(rank,identity,floor,view);list.append(row);
  }
  status.textContent=data.leaders.length?'自己ベスト更新後にランキングへ反映されます。':'まだ記録がありません。最初の冒険に挑戦しよう！';
 }catch(error){if(requestId===sequence&&error.name!=='AbortError')status.textContent=error.message;}
 finally{if(requestId===sequence)reload.disabled=false;}
}
for(const button of document.querySelectorAll('[data-ranking]'))button.addEventListener('click',()=>{mode=button.dataset.ranking;heading.textContent=(mode==='tower'?'魔王の塔':'魔物の巣窟')+'ランキング';dialog.showModal();load();});
document.getElementById('rankingClose').addEventListener('click',()=>dialog.close());reload.addEventListener('click',load);dialog.addEventListener('close',()=>{sequence++;controller?.abort();reload.disabled=false;});


// Display both existing daily typing-defense boards on demand. The backend shares
// cached ranking snapshots between users, so GET requests do not repeatedly query Firestore.
const defenseDialog=document.getElementById('defenseRankingDialog');
const defenseReload=document.getElementById('defenseRankingReload');
const defenseModes=[
 {key:'easy',status:document.getElementById('defenseRankingEasyStatus'),list:document.getElementById('defenseRankingEasyList')},
 {key:'normal',status:document.getElementById('defenseRankingNormalStatus'),list:document.getElementById('defenseRankingNormalList')},
 {key:'hard',status:document.getElementById('defenseRankingHardStatus'),list:document.getElementById('defenseRankingHardList')}
];
const defenseEndpoint='https://task-quest.onrender.com/api/adventure/defense-rankings?mode=';
const defenseCache=new Map();
const defenseCacheMs=3*60*1000;
const defenseDay=()=>new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
let defenseSequence=0,defenseController=null;
function renderDefenseBoard(board,data,error=''){
 board.list.replaceChildren();
 if(error){board.status.textContent=error;return;}
 const leaders=data?.leaders||[];
 board.status.textContent=leaders.length?'最高記録の上位'+leaders.length+'名':'まだクリア記録がありません。';
 for(const [index,entry] of leaders.entries()){
  const li=document.createElement('li'),rank=document.createElement('b'),identity=document.createElement('span'),name=document.createElement('b'),title=document.createElement('small'),count=document.createElement('strong');
  rank.textContent=(Number(entry.rank)||index+1)+'位';
  name.textContent=entry.petName||'ふしぎなたまご';
  title.textContent='ー'+(entry.title||'称号なし')+'ー';
  identity.append(name,title);
  count.textContent='第'+Math.max(0,Math.floor(Number(entry.floor)||0))+'ステージ';
  if(Number(entry.floor)===5){const badge=document.createElement('small');badge.className='adventure-clear-state is-cleared';badge.textContent='★ 完全制覇';count.append(badge);}
  const view=rankedPetButton(entry,message=>{board.status.textContent=message;});li.append(rank,identity,count,view);board.list.append(li);
 }
}
async function loadDefenseRankings(force=false){
 const requestId=++defenseSequence;
 defenseController?.abort();defenseController=new AbortController();
 const signal=defenseController.signal;
 defenseReload.disabled=true;
 for(const board of defenseModes){board.status.textContent='ランキングを読み込んでいます…';board.list.replaceChildren();}
 try{
  await authReady;
  if(requestId!==defenseSequence)return;
  const user=auth.currentUser;
  if(!user||user.isAnonymous)throw Error('もんすたでぃにログインしてから再表示してください。');
  const cached=defenseCache.get(user.uid);
  if(!force&&cached?.day===defenseDay()&&Date.now()-cached.loadedAt<defenseCacheMs){
   for(const board of defenseModes)renderDefenseBoard(board,cached.boards[board.key]);
   return;
  }
  const token=await user.getIdToken();
  if(requestId!==defenseSequence)return;
  const results=await Promise.allSettled(defenseModes.map(async board=>{
   const response=await fetch(defenseEndpoint+encodeURIComponent(board.key),{
    headers:{Authorization:'Bearer '+token},cache:'no-store',signal
   });
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!Array.isArray(result.leaders))throw Error(result.error||'ランキングを取得できませんでした。');
   return result;
  }));
  if(requestId!==defenseSequence)return;
  if(auth.currentUser?.uid!==user.uid)throw Error('ログイン状態が変わりました。再表示してください。');
  const boards={};
  for(const [index,board] of defenseModes.entries()){
   const result=results[index];
   if(result.status==='fulfilled'){
    boards[board.key]=result.value;
    renderDefenseBoard(board,result.value);
   }else{
    renderDefenseBoard(board,null,result.reason?.message||'取得できませんでした。再表示をお試しください。');
   }
  }
  if(results.every(result=>result.status==='fulfilled')){
   defenseCache.set(user.uid,{day:defenseDay(),loadedAt:Date.now(),boards});
  }
 }catch(error){
  if(requestId===defenseSequence&&error.name!=='AbortError'){
   for(const board of defenseModes)renderDefenseBoard(board,null,error.message||'ランキングを取得できませんでした。');
  }
 }finally{
  if(requestId===defenseSequence)defenseReload.disabled=false;
 }
}
document.getElementById('defenseRankingOpen').addEventListener('click',()=>{
 defenseDialog.showModal();
 void loadDefenseRankings();
});
document.getElementById('defenseRankingClose').addEventListener('click',()=>defenseDialog.close());
defenseReload.addEventListener('click',()=>void loadDefenseRankings(true));
defenseDialog.addEventListener('close',()=>{defenseSequence++;defenseController?.abort();defenseReload.disabled=false;});
