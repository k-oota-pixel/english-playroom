import {makeDialog} from './learning-titles.js?v=2.1.25';
const LOGIN_STREAK_REWARDS=Object.freeze([0,2,5,10,15,20,30]);
function loginStreakReward(day){
 const normalized=Math.max(0,Math.min(7,Math.floor(Number(day)||0)));
 return normalized>=1?LOGIN_STREAK_REWARDS[normalized-1]:0;
}
export function createChallengeBoard({root,getUser,load,claim}){
 const refreshButton=root.querySelector('[data-challenge-refresh]'),note=root.querySelector('[data-challenge-note]'),grid=root.querySelector('[data-challenge-grid]');
 const dialog=makeDialog('チャレンジ');dialog.classList.add('challenge-dialog');note.hidden=false;const footer=root.querySelector('.challenge-footer');if(footer)footer.hidden=false;const reload=document.createElement('button');reload.type='button';reload.textContent='更新';dialog.append(reload,note,grid);if(footer)dialog.append(footer);reload.addEventListener('click',()=>refresh());
 let requestId=0,loading=false,busy=false,state=null,rollover=0;
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
 const isCurrent=(id,uid)=>id===requestId&&getUser()?.uid===uid;
 function reset(){dialog.close();requestId++;clearTimeout(rollover);loading=false;busy=false;state=null;grid.replaceChildren();grid.hidden=true;refreshButton.disabled=!getUser();refreshButton.textContent='チャレンジ';refreshButton.setAttribute('aria-expanded','false');note.textContent=getUser()?'ボタンを押すと、今日と今週のチャレンジを読み込みます。':'ログインすると、毎日・毎週のチャレンジに参加できます。';note.classList.remove('error');}
 function link(item){const a=node('a',undefined,'challenge-task'+(item.done?' done':''));a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.append(node('span',item.done?'✓':'○','challenge-check'));const text=node('span');text.append(node('strong',item.label),node('small',item.hint));a.append(text,node('span','↗','challenge-arrow'));return a;}
 function render(){
  grid.replaceChildren();grid.hidden=false;refreshButton.setAttribute('aria-expanded','true');
  for(const kind of ['daily','weekly']){
   const data=state[kind],card=node('article',undefined,'challenge-card '+kind),heading=node('div',undefined,'challenge-card-head');
   heading.append(node('h3',kind==='daily'?'デイリーチャレンジ':'ウィークリーチャレンジ'),node('span','🪙 '+data.reward,'challenge-reward'));card.append(heading);
   const date=kind==='daily'?state.day.replaceAll('-','/'):`${state.week.replaceAll('-','/')}〜${state.weekEnd.replaceAll('-','/')}`;
   card.append(node('p',date,'challenge-date'),node('p',kind==='daily'?`両方クリアで${data.reward}コイン獲得！`:`選ばれた4つをクリアして${data.reward}コイン獲得！`,'challenge-promise'));
   if(kind==='daily'){const streak=data.streak||{count:0,target:3};card.append(node('p','3日連続で達成したらさらに10コインゲット！','challenge-streak'));card.append(node('p',streak.received?'🎉 3日連続達成！ 追加10コイン受け取り済み':'連続達成：'+streak.count+' / 3日','challenge-count'));card.append(node('p','追加ボーナスは3日ごと。達成報酬と一緒に受け取れます。','challenge-date'));}
   const count=Math.min(data.count,data.target);card.append(node('p',`${count} / ${data.target} 達成`,'challenge-count'));
   const progress=node('progress');progress.max=data.target;progress.value=count;progress.setAttribute('aria-label',`${kind==='daily'?'今日':'今週'}の達成数`);card.append(progress);
   const list=node('div',undefined,'challenge-tasks');for(const task of (data.tasks||data.contents))list.append(link(task));card.append(list);
   const button=node('button',data.claimed?'受け取り済み':data.complete?`${data.reward+(kind==='daily'&&data.streak?.eligible?10:0)}コインを受け取る`:`あと${data.target-count}${kind==='daily'?'つ':'種類'}で達成`,'challenge-claim');button.type='button';button.disabled=busy||data.claimed||!data.complete;button.dataset.claim=kind;button.addEventListener('click',()=>receive(kind));card.append(button);grid.append(card);
  }
  clearTimeout(rollover);const delay=new Date(state.nextDaily).getTime()-state.serverNow;rollover=setTimeout(()=>reset(),Math.max(1000,Math.min(delay+150,2147483647)));
 }
 async function refresh(){const user=getUser();if(!user||loading||busy)return;if(!dialog.open)dialog.showModal();const id=++requestId,uid=user.uid;loading=true;refreshButton.disabled=true;refreshButton.textContent='チャレンジ';note.textContent='取り組み状況を確認しています…';note.classList.remove('error');try{const result=await load(user);if(!isCurrent(id,uid))return;state=result;render();note.textContent='正解率は問いません。教材で回答・結果を記録すると進みます。戻ったら更新して確認できます。';}catch(error){if(isCurrent(id,uid)){note.textContent=error.message||'読み込めませんでした。更新して再試行してください。';note.classList.add('error');}}finally{if(isCurrent(id,uid)){loading=false;refreshButton.disabled=false;refreshButton.textContent='チャレンジ';}}}
 async function receive(kind){const user=getUser();if(!user||busy||loading||!state?.[kind]?.complete||state[kind].claimed)return;const id=++requestId,uid=user.uid,period=state[kind].id;busy=true;refreshButton.disabled=true;render();note.classList.remove('error');note.textContent='報酬を受け取っています…';try{const result=await claim(user,kind,period);if(!isCurrent(id,uid))return;state=result;render();note.textContent=result.awarded?`🎉 チャレンジ達成！ ${result.awarded}コイン獲得！${result.streakBonus?'（3日連続ボーナス10コインを含む）':''}`:'この期間の報酬は受け取り済みです。';}catch(error){if(isCurrent(id,uid)){note.textContent=error.message||'受け取れませんでした。更新して再試行してください。';note.classList.add('error');}}finally{if(isCurrent(id,uid)){busy=false;refreshButton.disabled=false;if(state)render();}}}

 refreshButton.addEventListener('click',refresh);
 return {reset,refresh,destroy(){requestId++;clearTimeout(rollover);dialog.close();dialog.remove();}};
}
export function createLoginStreakBonus({root,getUser,getStreak,claimStreak}){
 const status=root.querySelector('[data-streak-status]'),days=root.querySelector('[data-streak-days]'),button=root.querySelector('[data-streak-claim]'),message=root.querySelector('[data-streak-message]');
 let busy=false;
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
 function render(){
  const user=getUser(),streak=getStreak(),day=Math.max(0,Math.min(7,Math.floor(Number(streak?.day)||0)));
  status.textContent=!user?'ログインすると記録が始まります':day?(`連続ログイン ${day}日目`):'ログイン日数を確認しています…';
  days.replaceChildren();
  LOGIN_STREAK_REWARDS.forEach((reward,index)=>{
   const number=index+1,item=node('span',undefined,'streak-day'+(number===day?' current':number<day?' completed':''));
   item.append(node('span',number+'日'),node('strong',String(reward)));days.append(item);
  });
  const canClaim=!!user&&!!streak?.date&&day>=2&&!streak.claimed;
  button.disabled=busy||!canClaim;
  button.textContent=streak?.claimed?'今日の分は受け取り済み':canClaim?`🪙 ${loginStreakReward(day)}コインを受け取る`:day===1?'明日から受け取れます':'ログインすると受け取れます';
 }
 async function receive(){
  const user=getUser(),streak=getStreak(),day=Math.max(0,Math.min(7,Math.floor(Number(streak?.day)||0)));
  if(!user||busy||!streak?.date||day<2||streak.claimed)return;
  busy=true;message.textContent='';render();
  try{
   const result=await claimStreak(user,streak.date,day),current=getStreak();
   if(current?.uid===user.uid){
    const updated={...current,claimed:true};window.EnglishPlayroomLoginStreak=updated;
    window.dispatchEvent(new CustomEvent('english-playroom-login-streak',{detail:updated}));
   }
   message.textContent=result.awarded?`🎉 ${result.awarded}コインを獲得しました！`:'今日の分は受け取り済みです。';
  }catch(error){message.textContent=error.message||'受け取れませんでした。もう一度お試しください。';}
  finally{busy=false;render();}
 }
 const changed=event=>{if(event.detail?.uid===getUser()?.uid)render();};
 window.addEventListener('english-playroom-login-streak',changed);
 button.addEventListener('click',receive);render();
 return {reset:render,destroy(){window.removeEventListener('english-playroom-login-streak',changed);}};
}
async function boot(){const root=document.getElementById('learningChallenges');if(!root)return;const [{getApps,getApp},{getAuth,onAuthStateChanged},{getFirestore,doc,runTransaction,serverTimestamp}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.3.1'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js')]);if(!getApps().length){setTimeout(boot,80);return;}let user=null;const db=getFirestore(getApp());
 async function request(user,body){const token=await user.getIdToken(),response=await fetch('https://task-quest.onrender.com/api/learning/challenges',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'チャレンジを取得できませんでした。');return data;}
 async function claimStreak(u,expectedDate,expectedDay){
  let result={awarded:0};
  await runTransaction(db,async tx=>{
   const ref=doc(db,'users',u.uid,'apps','english-playroom'),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};
   const day=Math.max(0,Math.min(7,Math.floor(Number(data.loginStreakDay)||0)));
   if(data.loginStreakLastDate!==expectedDate||day!==expectedDay)throw Error('ログイン状況が更新されました。チャレンジ画面を更新してください。');
   if(day<2)throw Error('1日目のコインボーナスはありません。');
   if(data.loginStreakClaimedDate===expectedDate){result={awarded:0};return;}
   const reward=loginStreakReward(day),coins=Math.max(0,Math.floor(Number(data.coins)||0));
   const coinsEarnedToday=data.coinEarnedDate===expectedDate?Math.max(0,Math.floor(Number(data.coinsEarnedToday)||0)):0;
   const claims=data.coinRewardDate===expectedDate&&Array.isArray(data.coinRewardClaims)?data.coinRewardClaims.filter(value=>typeof value==='string'):[];
   const claimId='login-streak-'+expectedDate;
   if(!claims.includes(claimId))claims.push(claimId);
   tx.set(ref,{coins:coins+reward,loginStreakClaimedDate:expectedDate,coinRewardDate:expectedDate,coinRewardClaims:claims.slice(-200),coinEarnedDate:expectedDate,coinsEarnedToday:coinsEarnedToday+reward,coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
   result={awarded:reward};
  });
  if(result.awarded){
   try{
    const token=await u.getIdToken();
    await fetch('https://task-quest.onrender.com/api/coins/leaderboard',{method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store',keepalive:true});
   }catch(error){console.warn('Login bonus leaderboard update deferred',error);}
  }
  return result;
 }
 const getStreak=()=>window.EnglishPlayroomLoginStreak?.uid===user?.uid?window.EnglishPlayroomLoginStreak:null;
 const loginBonusRoot=document.getElementById('loginStreakBonus');
 const loginBonus=loginBonusRoot?createLoginStreakBonus({root:loginBonusRoot,getUser:()=>user,getStreak,claimStreak}):null;
 const board=createChallengeBoard({root,getUser:()=>user,load:u=>request(u),claim:(u,kind,period)=>request(u,{kind,period})});onAuthStateChanged(getAuth(getApp()),next=>{user=next;board.reset();loginBonus?.reset();});window.addEventListener('pagehide',event=>{if(!event.persisted){board.destroy();loginBonus?.destroy();}});
}
if(typeof document!=='undefined')boot().catch(error=>{const note=document.querySelector('[data-challenge-note]');if(note)note.textContent='チャレンジを読み込めませんでした。ページを更新してください。';console.error(error);});
