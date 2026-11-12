import {rankedPetButton} from './ranked-pet-view.js?v=2.4.71';
const API='https://task-quest.onrender.com/api/learning/titles';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function makeDialog(title){
 const dialog=el('dialog');dialog.className='titles-dialog';dialog.setAttribute('aria-label',title);
 const header=el('div');header.className='titles-heading';const close=el('button','閉じる');close.type='button';close.addEventListener('click',()=>dialog.close());header.append(el('h2',title),close);dialog.append(header);
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});document.body.append(dialog);return dialog;
}
function styles(){if(document.getElementById('titleStyles')||document.querySelector('link[rel="stylesheet"][href*="learning-titles.css"]'))return;const link=el('link');link.id='titleStyles';link.rel='stylesheet';link.href=new URL('./learning-titles.css?v=2.4.71',import.meta.url).href;document.head.append(link);}
export function announceTitles(titles){
 if(!Array.isArray(titles)||!titles.length)return;styles();
 const dialog=makeDialog('🏆 新しい称号を解放！');for(const t of titles){const row=el('article');row.className='title-award';row.append(el('small',t.label),el('h3',t.name),el('p',t.condition));dialog.append(row);}
 const link=el('a','メインページで称号を選ぶ →');link.href='https://k-oota-pixel.github.io/english-playroom/';link.target='_blank';link.rel='noopener';dialog.append(link);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
}
export function mountTitles({root,getUser,request,onSelection=()=>{}}){
 const mountKey=Symbol.for('monstudy.titles.controller');if(root[mountKey])return root[mountKey];
 styles();const button=root.querySelector('[data-titles-open]'),note=root.querySelector('[data-titles-note]');let generation=0,state=null,dialog=null,busy=false,activeTab='normal',ranking=null,rankingBusy=false,rankingError='',rankingLoadId=0,weeklyBusy=false,weeklyLoaded=false,weeklyError='',progressBusy=false,progressLoaded=false,progressError='',openGroups=new Set(),progressAppLoaded=new Set(),progressAppLoading=new Set(),progressAppErrors=new Map();
 function reset(){generation++;rankingLoadId++;openGroups.clear();progressAppLoaded.clear();progressAppLoading.clear();progressAppErrors.clear();state=null;ranking=null;rankingBusy=false;rankingError='';activeTab='normal';weeklyBusy=false;weeklyLoaded=false;weeklyError='';progressBusy=false;progressLoaded=false;progressError='';openGroups.clear();progressAppLoaded.clear();progressAppLoading.clear();progressAppErrors.clear();onSelection('');busy=false;if(dialog){dialog.close();dialog.remove();dialog=null;}button.disabled=!getUser();note.textContent=getUser()?'教材ごとの実績と、表示する称号を確認できます。':'ログインすると称号を確認・選択できます。';}
 function hydrateSelection(data={}){const selectedId=typeof data.selectedId==='string'?data.selectedId:typeof data.selectedTitleId==='string'?data.selectedTitleId:'',selectedTitle=typeof data.selectedTitle==='string'?data.selectedTitle:'';state={...(state||{}),selectedId,selectedTitle};onSelection(selectedTitle);note.textContent=selectedTitle?'表示中：ー'+selectedTitle+'ー':'称号を選んでランキングに表示できます。';}
 function renderRanking(){
  if(!dialog)return;
  const root=dialog.querySelector('[data-title-ranking]');
  if(!root)return;
  root.replaceChildren();
  const header=el('div');header.className='titles-ranking-heading';
  header.append(el('strong','👑 称号獲得数 TOP3'),el('small','全期間'));
  root.append(header);
  if(!ranking&&!rankingBusy&&!rankingError){const loadButton=el('button','称号ランキングを表示');loadButton.type='button';loadButton.addEventListener('click',()=>void loadRanking());root.append(loadButton);return;}
  if(rankingBusy){root.append(el('p','ランキングを取得しています…'));return;}
  if(rankingError){root.append(el('p',rankingError));const retry=el('button','ランキングを再取得');retry.type='button';retry.addEventListener('click',()=>void loadRanking());root.append(retry);return;}
  const leaders=Array.isArray(ranking?.leaders)?ranking.leaders:[];
  if(!leaders.length){root.append(el('p','まだランキング対象の記録がありません。'));return;}
  const list=el('ol');list.className='titles-ranking-list';
  for(const [index,item] of leaders.entries()){
   const row=el('li');row.className='titles-ranking-entry';
   row.append(el('span',['🥇','🥈','🥉'][index]||String(index+1)),el('span',item.petName||'ふしぎなたまご'),el('strong',String(Math.max(0,Number(item.unlockedTitleCount)||0))+'個'));const view=rankedPetButton(item,message=>{rankingError=message;renderRanking();});view.classList.add('titles-pet-view');row.append(view);
   list.append(row);
  }
  root.append(list);
  if(state&&Number.isFinite(state.unlockedTitleCount))root.append(el('p','あなたの獲得数：'+state.unlockedTitleCount+'個'));
 }
 function cardForTitle(t){
  const card=el('article');card.className='title-award'+(t.unlocked?' unlocked':' locked');
  card.append(el('small',t.id===state.selectedId?'表示中':t.unlocked?'解放済み':'未解放'),el('h4',t.name),Object.assign(el('p',t.condition),{className:'title-condition'}));
  if(Number.isFinite(t.done))card.append(Object.assign(el('p',Math.min(t.done,t.need)+' / '+t.need),{className:'title-progress'}));
  const equip=el('button',t.id===state.selectedId?'選択中':'この称号を表示');equip.disabled=busy||!t.unlocked||t.id===state.selectedId;
  equip.addEventListener('click',()=>select(t.id));card.append(equip);return card;
 }
 function render(){
  if(dialog){dialog.close();dialog.remove();}
  dialog=makeDialog('実績・称号コレクション');
  const status=el('p',state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を表示しない');status.setAttribute('role','status');dialog.append(status);
  const tabs=el('div');tabs.className='titles-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','称号の種類');
  for(const [key,label] of [['normal','🏆 教材別称号'],['weekly','⚔️ 週間称号'],['master','👑 教材マスター']]){
   const tab=el('button',label);tab.type='button';tab.className='titles-tab'+(activeTab===key?' active':'');
   tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(activeTab===key));
   tab.addEventListener('click',()=>{if(activeTab!==key){activeTab=key;render();if(key==='weekly'&&!weeklyLoaded&&!weeklyBusy)void loadWeekly();}});
   tabs.append(tab);
  }
  dialog.append(tabs);
  const rankingCard=el('section');rankingCard.className='titles-ranking';rankingCard.dataset.titleRanking='1';rankingCard.setAttribute('aria-label','称号獲得数ランキング');
  dialog.append(rankingCard);renderRanking();
  const clear=el('button','称号を表示しない');clear.disabled=busy||!state.selectedId;clear.className='titles-clear';
  clear.addEventListener('click',()=>select(''));dialog.append(clear);
  const panel=el('div');panel.className='titles-tab-panel';panel.setAttribute('role','tabpanel');
  const allTitles=Array.isArray(state.titles)?state.titles:[];
  const isMaster=t=>t.category==='master'||String(t.id).startsWith('master:');
  {
   const isWeekly=t=>t.category==='weekly'||String(t.id).startsWith('weekly:');
   const filtered=allTitles.filter(t=>activeTab==='master'?isMaster(t):activeTab==='weekly'?isWeekly(t):!isMaster(t)&&!isWeekly(t));
   const groups=new Map();for(const t of filtered){if(!groups.has(t.appId))groups.set(t.appId,[]);groups.get(t.appId).push(t);}
   if(activeTab==='normal')panel.append(el('p','各教材の獲得状況を確認できます。リトライノート・魔王の塔・魔物の巣窟・もんすた城の防衛の記録も確認できます。'));
   if(activeTab==='weekly'){panel.append(el('p','月曜から日曜までに4日達成すると、翌週に称号が自動で付与されます。今週の進み具合は前日分まで表示します。'));if(weeklyBusy)panel.append(el('p','週間ランキングを集計しています…'));if(weeklyError)panel.append(el('p',weeklyError));}
   if(activeTab==='master')panel.append(el('p','教材の対象称号をすべて解放すると、特別なマスター称号を獲得できます。'));
   if(activeTab==='normal')panel.append(el('p','教材名を開くと、未達成の称号の進捗を教材ごとに読み込みます。'));
   if(!groups.size)panel.append(el('p','この種類の称号はまだありません。'));
   for(const list of groups.values()){
    const appId=list[0].appId,section=el('details');section.open=openGroups.has(appId)||list.some(t=>t.id===state.selectedId);section.className='title-group';section.dataset.titleAppId=appId;
    section.addEventListener('toggle',()=>{
     if(!section.isConnected)return;
     if(section.open){
      openGroups.add(appId);
      if(!progressLoaded&&!progressAppLoaded.has(appId)&&!progressAppLoading.has(appId))void loadAppProgress(appId);
     }else openGroups.delete(appId);
    });
    section.append(el('summary',list[0].label+'　'+list.filter(t=>t.unlocked).length+' / '+list.length+' 解放'));
    const grid=el('div');grid.className='title-grid';for(const t of list)grid.append(cardForTitle(t));
    section.append(grid);panel.append(section);
   }
  }
  dialog.append(panel);dialog.showModal();
 }
 async function load(){
  const user=getUser();if(!user||busy)return;
  busy=true;button.disabled=true;ranking=null;rankingBusy=false;rankingError='';activeTab='normal';weeklyBusy=false;weeklyLoaded=false;weeklyError='';progressBusy=false;progressLoaded=false;progressError='';
  const id=++generation;rankingLoadId++;
  note.textContent='称号を読み込み中…';
  if(dialog){dialog.close();dialog.remove();}
  dialog=makeDialog('称号');dialog.append(el('p','称号を読み込み中…'));dialog.showModal();
  try{
   const data=await request(user,undefined,'collection');
   if(id!==generation||getUser()?.uid!==user.uid)return;
   state=data;onSelection(state.selectedTitle||'');busy=false;render();
   note.textContent=state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を選んでランキングに表示できます。';

  }catch(error){
   if(id===generation){note.textContent=error.message||'称号を取得できませんでした。もう一度お試しください。';dialog.append(el('p',note.textContent));}
  }finally{if(id===generation){busy=false;button.disabled=false;}}
 }
 async function loadRanking(){
  const user=getUser();if(!user||rankingBusy)return;
  const rankId=++rankingLoadId;
  ranking=null;rankingBusy=true;rankingError='';renderRanking();
  try{
   const data=await request(user,undefined,'ranking');
   if(rankId!==rankingLoadId||getUser()?.uid!==user.uid)return;
   ranking=data;rankingError='';
  }catch(error){
   if(rankId!==rankingLoadId||getUser()?.uid!==user.uid)return;
   rankingError=error.message||'ランキングを取得できませんでした。';
  }finally{if(rankId===rankingLoadId){rankingBusy=false;renderRanking();}}
 }
 async function loadAppProgress(appId){
  const user=getUser();if(!user||progressAppLoaded.has(appId)||progressAppLoading.has(appId))return;
  const id=generation;progressAppLoading.add(appId);progressAppErrors.delete(appId);
  const group=dialog?.querySelector(`[data-title-app-id="${appId}"]`);
  const notice=el('p','進捗を取得しています…');notice.className='title-progress-message';group?.append(notice);
  try{
   const data=await request(user,undefined,'app-progress:'+appId);
   if(id!==generation||getUser()?.uid!==user.uid)return;
   const doneById=new Map((Array.isArray(data.titles)?data.titles:[]).map(title=>[title.id,title.done]));
   state={...state,titles:state.titles.map(title=>title.appId===appId&&!title.unlocked&&doneById.has(title.id)?{...title,done:doneById.get(title.id)}:title)};
   progressAppLoaded.add(appId);
   const currentGroup=dialog?.querySelector(`[data-title-app-id="${appId}"]`);
   const matching=state.titles.filter(title=>title.appId===appId);
   if(currentGroup){
    const cards=[...currentGroup.querySelectorAll('.title-grid .title-award')];
    matching.forEach((title,i)=>{
     const card=cards[i];if(!card||!Number.isFinite(title.done))return;
     const text=Math.min(title.done,title.need)+' / '+title.need;
     let progress=card.querySelector('.title-progress');
     if(!progress){progress=el('p');progress.className='title-progress';card.insertBefore(progress,card.querySelector('button'));}
     progress.textContent=text;
    });
   }
  }catch(error){
   if(id===generation){const message=error.message||'進捗を取得できませんでした。';progressAppErrors.set(appId,message);const target=dialog?.querySelector(`[data-title-app-id="${appId}"]`);const retry=el('button','進捗を再取得');retry.type='button';retry.addEventListener('click',()=>{retry.remove();void loadAppProgress(appId);});target?.append(el('p',message),retry);}
  }finally{progressAppLoading.delete(appId);notice.remove();}
 }
 async function loadProgress(){
  const user=getUser();if(!user||progressBusy||progressLoaded)return;
  const id=generation;progressBusy=true;progressError='';render();
  try{
   const data=await request(user,undefined,'progress');
   if(id!==generation||getUser()?.uid!==user.uid)return;
   const details=new Map(data.titles.map(title=>[title.id,title]));
   state={...state,selectedId:data.selectedId,selectedTitle:data.selectedTitle,unlockedTitleCount:data.unlockedTitleCount,
    titles:state.titles.map(title=>title.category==='weekly'?title:details.get(title.id)||title)};
   progressLoaded=true;
  }catch(error){if(id===generation)progressError=error.message||'進捗を取得できませんでした。';}
  finally{if(id===generation){progressBusy=false;if(dialog?.open)render();}}
 }
 async function loadWeekly(){
  const user=getUser();if(!user||weeklyBusy||weeklyLoaded)return;
  const id=generation;weeklyBusy=true;weeklyError='';render();
  try{
   const data=await request(user,undefined,'weekly');
   if(id!==generation||getUser()?.uid!==user.uid)return;
   const existing=new Map(state.titles.map(title=>[title.id,title]));
   state={...state,...data,titles:data.titles.map(title=>title.done===null&&existing.has(title.id)?{...title,done:existing.get(title.id).done}:title)};weeklyLoaded=true;weeklyBusy=false;
   onSelection(state.selectedTitle||'');
   if(dialog?.open)render();
  }catch(error){
   if(id!==generation)return;
   weeklyBusy=false;weeklyError=error.message||'週間称号を取得できませんでした。';
   if(dialog?.open)render();
  }
 }
 async function select(selectedId){const user=getUser();if(!user||busy)return;busy=true;const id=++generation;for(const b of dialog.querySelectorAll('button'))b.disabled=true;try{const data=await request(user,{selectedId});if(id!==generation||getUser()?.uid!==user.uid)return;state={...state,...data};onSelection(state.selectedTitle||'');const cached=window.EnglishPlayroomWallet;if(cached?.uid===user.uid&&cached.data){cached.data={...cached.data,selectedTitleId:state.selectedId||'',selectedTitle:state.selectedTitle||''};}busy=false;render();note.textContent=state.selectedTitle?'表示中：ー'+state.selectedTitle+'ー':'称号を表示しません。';}catch(error){if(id===generation){busy=false;render();dialog.prepend(el('p',error.message||'保存できませんでした。再試行してください。'));}}finally{if(id===generation)busy=false;}}
 async function refreshSelection(){const user=getUser();if(!user)return;const id=generation;const data=await request(user,undefined,'selection');if(id!==generation||getUser()?.uid!==user.uid)return;hydrateSelection(data);}
 button.addEventListener('click',load);reset();const controller={reset,load,refreshSelection,hydrateSelection};root[mountKey]=controller;return controller;
}
async function boot(){const root=document.getElementById('learningTitles');if(!root)return;const bootKey=Symbol.for('monstudy.titles.boot');if(root[bootKey])return;root[bootKey]=true;try{styles();const [{getApps,getApp},{getAuth,onAuthStateChanged}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37')]);if(!getApps().length){delete root[bootKey];setTimeout(boot,80);return;}let user=null,fallbackUid='';const board=mountTitles({root,getUser:()=>user,onSelection:name=>{const label=document.getElementById('petSelectedTitle');if(label)label.textContent=name||'称号なし';},request:async(u,body,view)=>{const token=await u.getIdToken(),url=view==='ranking'?'https://task-quest.onrender.com/api/learning/title-rankings':view?.startsWith('app-progress:')?API+'?view=app-progress&appId='+encodeURIComponent(view.slice(13)):view?API+'?view='+encodeURIComponent(view):API,r=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(45000)});const data=await r.json();if(!r.ok)throw Error(data.error||'称号を取得できませんでした。');return data;}});
 const hydrateWallet=data=>{if(!data||typeof data!=='object')return false;const has=Object.prototype.hasOwnProperty.call(data,'selectedTitleId')||Object.prototype.hasOwnProperty.call(data,'selectedTitle');if(!has)return false;board.hydrateSelection({selectedId:typeof data.selectedTitleId==='string'?data.selectedTitleId:'',selectedTitle:typeof data.selectedTitle==='string'?data.selectedTitle:''});return true;};
 const fallback=()=>{if(!user||fallbackUid===user.uid)return;fallbackUid=user.uid;void board.refreshSelection().catch(console.warn);};
 onAuthStateChanged(getAuth(getApp()),u=>{user=u;fallbackUid='';board.reset();if(!u)return;const cached=window.EnglishPlayroomWallet;if(cached?.uid===u.uid){if(!hydrateWallet(cached.data))fallback();}});
 window.addEventListener('english-playroom-wallet',event=>{if(!user||event.detail?.uid!==user.uid)return;if(!hydrateWallet(event.detail.data))fallback();});
 }catch(error){delete root[bootKey];throw error;}}
if(typeof document!=='undefined')boot().catch(console.error);

// Compare only after the notebook has persisted its records; first sync is migration.
if(typeof document!=='undefined'&&location.pathname.includes('/eiken-retry')){let previous=null,identity='',queue=Promise.resolve();document.addEventListener('retry-cloud-saved',event=>{const uid=event.detail?.uid;queue=queue.then(async()=>{const [{getApp},{getAuth}]=await Promise.all([import('https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'),import('https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.4.37')]);const user=getAuth(getApp()).currentUser;if(!user||user.uid!==uid)return;if(identity!==uid){previous=null;identity=uid;}const token=await user.getIdToken(),response=await fetch(API+'?view=retry',{headers:{Authorization:'Bearer '+token},cache:'no-store'});if(!response.ok)return;const data=await response.json();if(getAuth(getApp()).currentUser?.uid!==uid)return;const unlocked=data.titles.filter(t=>t.id.startsWith('retry:')&&t.unlocked);if(previous)announceTitles(unlocked.filter(t=>!previous.has(t.id)));previous=new Set(unlocked.map(t=>t.id));}).catch(console.warn);});}

// The wallet and PLAY button are installed asynchronously by the pet controls.
if(typeof document!=='undefined'){const place=()=>{const actions=document.getElementById('petLearningActions'),play=document.getElementById('petPlayOpen');if(actions&&play&&!actions.contains(play)){play.before(actions);actions.prepend(play);}};place();new MutationObserver(place).observe(document.body,{childList:true,subtree:true});}
