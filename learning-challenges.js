export function createChallengeBoard({root,getUser,load,claim}){
 const refreshButton=root.querySelector('[data-challenge-refresh]'),note=root.querySelector('[data-challenge-note]'),grid=root.querySelector('[data-challenge-grid]');
 let requestId=0,loading=false,busy=false,state=null,rollover=0,lastFetched=0;
 const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
 const isCurrent=(id,uid)=>id===requestId&&getUser()?.uid===uid;
 function reset(){requestId++;clearTimeout(rollover);loading=false;busy=false;state=null;lastFetched=0;grid.replaceChildren();grid.hidden=true;refreshButton.disabled=!getUser();refreshButton.textContent='更新';note.textContent=getUser()?'今日のチャレンジを読み込みます。':'ログインすると、毎日・毎週のチャレンジに参加できます。';note.classList.remove('error');}
 function link(item){const a=node('a',undefined,'challenge-task'+(item.done?' done':''));a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.append(node('span',item.done?'✓':'○','challenge-check'));const text=node('span');text.append(node('strong',item.label),node('small',item.hint));a.append(text,node('span','↗','challenge-arrow'));return a;}
 function render(){
  grid.replaceChildren();grid.hidden=false;
  for(const kind of ['daily','weekly']){
   const data=state[kind],card=node('article',undefined,'challenge-card '+kind),heading=node('div',undefined,'challenge-card-head');
   heading.append(node('h3',kind==='daily'?'デイリーチャレンジ':'ウィークリーチャレンジ'),node('span','🪙 '+data.reward,'challenge-reward'));card.append(heading);
   const date=kind==='daily'?state.day.replaceAll('-','/'):`${state.week.replaceAll('-','/')}〜${state.weekEnd.replaceAll('-','/')}`;
   card.append(node('p',date,'challenge-date'),node('p',kind==='daily'?`両方クリアで${data.reward}コイン獲得！`:`4種類の教材に取り組んで${data.reward}コイン獲得！`,'challenge-promise'));
   const count=Math.min(data.count,data.target);card.append(node('p',`${count} / ${data.target} 達成`,'challenge-count'));
   const progress=node('progress');progress.max=data.target;progress.value=count;progress.setAttribute('aria-label',`${kind==='daily'?'今日':'今週'}の達成数`);card.append(progress);
   if(kind==='daily'){const list=node('div',undefined,'challenge-tasks');for(const task of data.tasks)list.append(link(task));card.append(list);}
   else{const done=data.contents.filter(x=>x.done);card.append(node('p',done.length?'今週取り組んだ教材：'+done.map(x=>x.label).join('・'):'今週は、いろいろな教材に挑戦しよう。','challenge-week-done'));const details=node('details'),summary=node('summary','対象の教材を見る');details.append(summary);const list=node('div',undefined,'challenge-tasks');for(const item of data.contents)list.append(link(item));details.append(list);card.append(details);}
   const button=node('button',data.claimed?'受け取り済み':data.complete?`${data.reward}コインを受け取る`:`あと${data.target-count}${kind==='daily'?'つ':'種類'}で達成`,'challenge-claim');button.type='button';button.disabled=busy||data.claimed||!data.complete;button.dataset.claim=kind;button.addEventListener('click',()=>receive(kind));card.append(button);grid.append(card);
  }
  clearTimeout(rollover);const delay=new Date(state.nextDaily).getTime()-state.serverNow;rollover=setTimeout(()=>refresh(),Math.max(1000,Math.min(delay+150,2147483647)));
 }
 async function refresh(){const user=getUser();if(!user||loading||busy)return;const id=++requestId,uid=user.uid;loading=true;refreshButton.disabled=true;refreshButton.textContent='読み込み中…';note.textContent='取り組み状況を確認しています…';note.classList.remove('error');try{const result=await load(user);if(!isCurrent(id,uid))return;state=result;lastFetched=Date.now();render();note.textContent='正解率は問いません。教材で回答・結果を記録すると進みます。戻ったら更新して確認できます。';}catch(error){if(isCurrent(id,uid)){note.textContent=error.message||'読み込めませんでした。更新して再試行してください。';note.classList.add('error');}}finally{if(isCurrent(id,uid)){loading=false;refreshButton.disabled=false;refreshButton.textContent='更新';}}}
 async function receive(kind){const user=getUser();if(!user||busy||loading||!state?.[kind]?.complete||state[kind].claimed)return;const id=++requestId,uid=user.uid,period=state[kind].id;busy=true;refreshButton.disabled=true;render();note.classList.remove('error');note.textContent='報酬を受け取っています…';try{const result=await claim(user,kind,period);if(!isCurrent(id,uid))return;state=result;render();note.textContent=result.awarded?`🎉 チャレンジ達成！ ${result.awarded}コイン獲得！`:'この期間の報酬は受け取り済みです。';}catch(error){if(isCurrent(id,uid)){note.textContent=error.message||'受け取れませんでした。更新して再試行してください。';note.classList.add('error');}}finally{if(isCurrent(id,uid)){busy=false;refreshButton.disabled=false;if(state)render();}}}
 refreshButton.addEventListener('click',refresh);
 function resume(){if(getUser()&&Date.now()-lastFetched>3000)refresh();}
 window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume();});
 return {reset,refresh,destroy(){requestId++;clearTimeout(rollover);window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);}};
}
async function boot(){const root=document.getElementById('learningChallenges');if(!root)return;const [{getApps,getApp},{getAuth,onAuthStateChanged}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js')]);if(!getApps().length){setTimeout(boot,80);return;}let user=null;
 async function request(user,body){const token=await user.getIdToken(),response=await fetch('https://task-quest.onrender.com/api/learning/challenges',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'チャレンジを取得できませんでした。');return data;}
 const board=createChallengeBoard({root,getUser:()=>user,load:u=>request(u),claim:(u,kind,period)=>request(u,{kind,period})});onAuthStateChanged(getAuth(getApp()),next=>{user=next;board.reset();if(user)board.refresh();});window.addEventListener('pagehide',event=>{if(!event.persisted)board.destroy();});
}
if(typeof document!=='undefined')boot().catch(error=>{const note=document.querySelector('[data-challenge-note]');if(note)note.textContent='チャレンジを読み込めませんでした。ページを更新してください。';console.error(error);});
