import {auth,authReady} from '../coin-reward.js?v=2.1.11';
import {renderPetSVG} from '../pet-art.js?v=2.1.49';
import {strengthLevel} from '../pet-strength-model.js?v=2.3.23';
import {MAGIC_SPELLS,DUNGEON_ITEMS,normalizeDungeonInventory} from '../pet-dungeons-model.js?v=1.10.22';

const API='https://task-quest.onrender.com/api/online-battle';
const $=id=>document.getElementById(id);
const ELEMENTS=[['fire','🔥','FIRE'],['thunder','⚡','THUNDER'],['leaf','🍃','LEAF'],['water','💧','WATER']];
const lobbyView=$('lobbyView'),battleView=$('battleView'),gradePicker=$('gradePicker'),roomList=$('roomList'),roomsEl=$('rooms'),notice=$('notice'),selectedGradeTitle=$('selectedGradeTitle');
const GRADES=Object.freeze([{key:'4',label:'4級'},{key:'3',label:'3級'},{key:'pre2',label:'準2級'},{key:'2',label:'2級'}]);
const ROOM_STORAGE_KEY='monstudy-online-room-v2';
const AUTO_IDLE_MS=5*60*1000;
const els={
 coinCount:$('coinCount'),modeTitle:$('modeTitle'),areaLabel:$('areaLabel'),stageLabel:$('stageLabel'),enemyCount:$('enemyCount'),bestLabel:$('bestLabel'),
 petStats:$('petStats'),petName:$('petName'),myNickname:$('myNickname'),petHpBar:$('petHpBar'),petHpText:$('petHpText'),petMpBar:$('petMpBar'),petMpText:$('petMpText'),petVisual:$('adventurePetVisual'),
 enemyName:$('enemyName'),enemyElement:$('enemyElement'),enemyHpBar:$('enemyHpBar'),enemyHpText:$('enemyHpText'),enemyMpText:$('enemyMpText'),enemyVisual:$('enemyVisual'),
 battleStatus:$('battleStatus'),battleFlash:$('battleFlash'),attackPanel:$('attackPanel'),attackGrid:$('attackGrid'),attackHeading:$('attackHeading'),attackHint:$('attackHint'),
 quizPanel:$('quizPanel'),attackBadge:$('attackBadge'),attackPower:$('attackPower'),questionText:$('questionText'),answerGrid:$('answerGrid'),answerFeedback:$('answerFeedback'),nextBtn:$('nextBtn'),
 waitingCard:$('waitingCard'),waitingTitle:$('waitingTitle'),waitingText:$('waitingText'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultTitle:$('resultTitle'),resultText:$('resultText'),
 readyBtn:$('readyBtn'),readyCount:$('readyCount'),readyFeedback:$('readyFeedback'),resultFeedback:$('resultFeedback'),retryBtn:$('retryBtn'),leaveBtn:$('leaveBtn'),exitRunBtn:$('exitRunBtn'),magicBtn:$('magicBtn'),itemBtn:$('itemBtn'),
 magicDialog:$('magicDialog'),magicClose:$('magicClose'),magicList:$('magicList'),magicMpStatus:$('magicMpStatus'),magicMessage:$('magicMessage'),itemDialog:$('itemDialog'),itemClose:$('itemClose'),itemList:$('itemList'),itemMessage:$('itemMessage')
};
let user=null,activeRoom='',selectedGrade='',pollTimer=0,pollIntervalMs=0,roomsTimer=0,roomRefreshInFlight='',coins=0,questionPool=[],ownData={};
let currentRoom=null,turnCards=[],selectedAttack=null,currentQuestion=null,lastQuestionId='',lastEventKey='',lastEventRoomId='',lastStatus='',busy=false,readyPending=false,seenQuestionIds=new Set();
let idleTimer=0,autoPausedForIdle=false,resumeSyncing=false,lastResumeSyncAt=0;
let navigationToken='',navigationExitInFlight=null;
let lastActionDialogSignature='';

function stopAutoRefresh(){
 if(pollTimer){clearInterval(pollTimer);pollTimer=0;}
 pollIntervalMs=0;
 if(roomsTimer){clearInterval(roomsTimer);roomsTimer=0;}
}
function startAutoRefresh(){
 if(document.hidden||!user||autoPausedForIdle)return;
 // Only active matches need 1-second sync; waiting rooms retain 2.5 seconds.
 const interval=activeRoom&&currentRoom?.roomId===activeRoom&&currentRoom.status==='playing'?1000:2500;
 if(!activeRoom){
  if(pollTimer){clearInterval(pollTimer);pollTimer=0;}
  pollIntervalMs=0;
 }else if(!pollTimer||pollIntervalMs!==interval){
  if(pollTimer)clearInterval(pollTimer);
  pollIntervalMs=interval;
  pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},interval);
 }
 if(!roomsTimer)roomsTimer=window.setInterval(()=>{if(!activeRoom&&selectedGrade)void refreshLobby();},15000);
}
function armIdlePause(){
 clearTimeout(idleTimer);
 idleTimer=window.setTimeout(()=>{autoPausedForIdle=true;stopAutoRefresh();},AUTO_IDLE_MS);
}
async function syncVisibleState(){
 if(document.hidden||!user||resumeSyncing)return;
 const now=Date.now();if(now-lastResumeSyncAt<750)return;lastResumeSyncAt=now;resumeSyncing=true;
 try{if(activeRoom)await refreshRoom();else if(selectedGrade)await refreshLobby();}
 finally{resumeSyncing=false;}
}
function registerActivity(){
 if(document.hidden||!user)return;
 const shouldResync=autoPausedForIdle||(!pollTimer&&!roomsTimer);
 autoPausedForIdle=false;armIdlePause();startAutoRefresh();
 if(shouldResync)void syncVisibleState();
}
function handleVisibility(){
 if(document.hidden){stopAutoRefresh();return;}
 autoPausedForIdle=false;armIdlePause();startAutoRefresh();void syncVisibleState();
}

function say(message,error=false){
 notice.textContent=message;notice.classList.toggle('error',error);
 // The lobby notice is hidden in the battle layout: show action errors where players can see them.
 const target=!battleView.hidden?(!els.waitingCard.hidden?els.readyFeedback:!els.resultCard.hidden?els.resultFeedback:null):null;
 if(target){target.textContent=message;target.hidden=!message;target.classList.toggle('error',error);}
}
function clearBattleFeedback(){
 for(const target of [els.readyFeedback,els.resultFeedback]){target.textContent='';target.hidden=true;target.classList.remove('error');}
}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
function shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function gradeLevel(grade){return ({'4級':'4','3級':'3','準2級':'pre2','2級':'2'})[grade]||'4';}
function roomPlayerCount(room){return Math.max(0,Math.min(2,Number(room.playerCount??room.players?.length??0)||0));}
function roomStatus(room){const count=roomPlayerCount(room);if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(count===1)return '1人待機中';if(count===2)return '準備中';return '空室';}
function setBar(el,value,max){const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;el.style.width=pct+'%';}
function minePlayer(room=currentRoom){return (room?.players||[]).find(p=>p.uid===user?.uid)||null;}
function ownLevel(){return Math.max(1,Number(minePlayer()?.level)||strengthLevel(ownData.petStrengthLevelPoints,ownData.petStrength));}
function petArt(player){
 if(!player)return '👾';
 if(!player.petHatched)return '<span class="online-egg" role="img" aria-label="たまご">🥚</span>';
 try{return renderPetSVG(player.petAppearance,{...player.petShop,equipped:{...player.petShop?.equipped,'pet-frame':''}},player.petAdult?'adult':'baby',{background:false});}catch{return '🐾';}
}
async function api(path,method='GET',body=null){
 const token=await user.getIdToken();
 navigationToken=token;
 let response;
 try{
  response=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify(body||{}):undefined,cache:'no-store',signal:AbortSignal.timeout(30000)});
 }catch(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')throw new Error('通信がタイムアウトしました。もう一度お試しください。');
  throw new Error('サーバーに接続できませんでした。通信環境を確認してください。');
 }
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'通信に失敗しました。');
 return data;
}
// Best-effort leave while the page is being replaced: the normal request may
// be cancelled when the shell removes this iframe. A keepalive request survives
// same-tab navigation where the browser supports it.
function leaveOnNavigate(){
 if(!activeRoom||navigationExitInFlight)return navigationExitInFlight;
 const roomId=activeRoom,token=navigationToken;
 activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);
 stopAutoRefresh();clearTimeout(idleTimer);
 const send=authToken=>fetch(API+'/room/'+encodeURIComponent(roomId)+'/leave',{
  method:'POST',headers:{Authorization:'Bearer '+authToken,'Content-Type':'application/json'},
  body:'{}',cache:'no-store',keepalive:true
 }).then(response=>{
  if(!response.ok)console.warn('online battle auto-leave failed',response.status);
 }).catch(error=>console.warn('online battle auto-leave could not be delivered',error));
 navigationExitInFlight=token?send(token):user?.getIdToken().then(send).catch(error=>{
  console.warn('online battle auto-leave authentication failed',error);
 });
 return navigationExitInFlight;
}


function renderRooms(list){
 roomsEl.replaceChildren();
 for(const room of list){
  const count=roomPlayerCount(room),card=document.createElement('article');card.className='online-room-card';card.dataset.status=room.status||'open';
  const heading=document.createElement('strong');heading.textContent='ルーム '+(room.roomNo||String(room.roomId||'').split('-').pop());
  const state=document.createElement('span');state.className='online-room-state';state.innerHTML=`<b>${esc(roomStatus(room))}</b><span>${count} / 2人</span>`;
  const btn=document.createElement('button');btn.type='button';btn.className='primary-btn';btn.textContent='入室する';
  btn.disabled=['playing','finished'].includes(room.status)||count>=2;
  btn.addEventListener('click',()=>void enterRoom(room.roomId));
  card.append(heading,state,btn);roomsEl.append(card);
 }
}
function gradeLabel(key){return GRADES.find(entry=>entry.key===key)?.label||'4級';}
function showGradePicker(){selectedGrade='';roomList.hidden=true;gradePicker.hidden=false;roomsEl.replaceChildren();say('');}
async function selectGrade(key){if(!GRADES.some(entry=>entry.key===key))return;selectedGrade=key;selectedGradeTitle.textContent=gradeLabel(key);gradePicker.hidden=true;roomList.hidden=false;await refreshLobby();}
async function refreshLobby(){
 if(!selectedGrade||activeRoom)return;
 try{const data=await api('/lobby/'+selectedGrade),lobby=data.lobby||{};selectedGradeTitle.textContent=lobby.grade||gradeLabel(selectedGrade);renderRooms(lobby.rooms||[]);if(!notice.classList.contains('error'))say('');}
 catch(e){say(e.message,true);}
}

function enterBattleLayout(){lobbyView.hidden=true;battleView.hidden=false;document.body.classList.add('battle-mode');}
function enterLobbyLayout(){battleView.hidden=true;lobbyView.hidden=false;document.body.classList.remove('battle-mode');}
function resetTurn(){turnCards=[];selectedAttack=null;currentQuestion=null;els.answerGrid.replaceChildren();els.answerFeedback.textContent='';els.quizPanel.hidden=true;}
function clearBattleEffects(){
 els.battleFlash.classList.remove('show');
 els.battleFlash.textContent='';
 els.petVisual.classList.remove('attack','hurt');
 els.enemyVisual.classList.remove('attack','hurt');
}
// Room revisions also advance when users join or mark themselves ready. Only a NEW
// combat event (not a changed room seq) may play an animation.
function eventFingerprint(ev){
 if(!ev)return '';
 return [ev.type,ev.at,ev.from,ev.to,ev.spellId,ev.itemId,ev.kind,ev.damage,ev.heal,ev.amount].map(value=>String(value??'')).join('|');
}

function updateFighters(room){
 const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 if(mine){
  const max=Math.max(1,Number(mine.stats?.hp)||1),hp=Math.max(0,Number(mine.hp)||0),maxMp=Math.max(0,Number(mine.stats?.mp)||0),mp=Math.max(0,Number(mine.mp??maxMp)||0);
  els.petName.textContent=mine.petName||'MY PET';els.myNickname.textContent=mine.nickname||'YOU';els.petHpText.textContent=hp+' / '+max;setBar(els.petHpBar,hp,max);
  els.petMpText.textContent=mp+' / '+maxMp+' MP';setBar(els.petMpBar,mp,Math.max(1,maxMp));els.petStats.textContent=`HP ${max} · 攻撃力 ${Number(mine.stats?.attack||1)} · 防御力 ${Number(mine.stats?.defense||1)} · MP ${mp}/${maxMp}`;
  els.petVisual.innerHTML=petArt(mine);
 }
 if(other){
  const max=Math.max(1,Number(other.stats?.hp)||1),hp=Math.max(0,Number(other.hp)||0),maxMp=Math.max(0,Number(other.stats?.mp)||0),mp=Math.max(0,Number(other.mp??maxMp)||0);
  els.enemyName.textContent=other.petName||'OPPONENT';els.enemyElement.textContent=other.nickname||'RIVAL';els.enemyHpText.textContent=hp+' / '+max;setBar(els.enemyHpBar,hp,max);els.enemyVisual.innerHTML=petArt(other);els.enemyMpText.textContent='MP '+mp+' / '+maxMp;
 }else{
  els.enemyName.textContent='OPPONENT';els.enemyElement.textContent='WAITING';els.enemyHpText.textContent='— / —';setBar(els.enemyHpBar,0,1);els.enemyVisual.textContent='👾';els.enemyMpText.textContent='相手を待っています';
 }
}

function flash(text){els.battleFlash.textContent=text;els.battleFlash.classList.remove('show');void els.battleFlash.offsetWidth;els.battleFlash.classList.add('show');}
function animateEvent(room){
 const fingerprint=eventFingerprint(room.lastEvent);
 if(lastEventRoomId!==room.roomId){
  lastEventRoomId=room.roomId;
  lastEventKey=fingerprint; // Do not replay an event recorded before joining this room.
  return;
 }
 if(!fingerprint||fingerprint===lastEventKey)return;
 lastEventKey=fingerprint;
 // A stale lastEvent must never fire an animation while waiting for both players.
 if(room.status!=='playing'&&room.status!=='finished')return;
 const ev=room.lastEvent,mine=ev.from===user.uid;
 if(ev.type==='attack'){
  const target=ev.to===user.uid?els.petVisual:els.enemyVisual;target.classList.remove('hurt');void target.offsetWidth;target.classList.add('hurt');
  if(mine){els.petVisual.classList.remove('attack');void els.petVisual.offsetWidth;els.petVisual.classList.add('attack');flash('攻撃成功！\n-'+ev.damage+' HP');}
  else flash('相手の攻撃！\n-'+ev.damage+' HP');
 }else if(ev.type==='magic'){
  const name=ev.name||'魔法';
  if(ev.kind==='heal'){
   const caster=mine?els.petVisual:els.enemyVisual;caster.classList.remove('attack');void caster.offsetWidth;caster.classList.add('attack');flash((mine?'✨ '+name:'相手の '+name)+'\nHP +'+(ev.heal||0));
  }else{
   const target=ev.to===user.uid?els.petVisual:els.enemyVisual;target.classList.remove('hurt');void target.offsetWidth;target.classList.add('hurt');
   if(mine){els.petVisual.classList.remove('attack');void els.petVisual.offsetWidth;els.petVisual.classList.add('attack');flash('✨ '+name+'！\n-'+ev.damage+' HP');}
   else flash('相手の '+name+'！\n-'+ev.damage+' HP');
  }
 }else if(ev.type==='miss')flash(mine?'不正解…\n自分に1ダメージ':'相手が不正解！');
 else if(ev.type==='item')flash((mine?'': '相手の ')+(ev.icon||'🎒')+' '+(ev.name||'アイテム')+'\n'+String(ev.kind||'hp').toUpperCase()+' +'+(ev.amount||0));
 else if(ev.type==='forfeit')flash(mine?'投了しました':'相手が投了しました！\n不戦勝！');
 else if(ev.type==='start')flash('BATTLE START!');
}

function makeChoices(card,room){
 const level=gradeLevel(room.grade),same=questionPool.filter(q=>q.level===level&&q.meaning!==card.meaning),all=questionPool.filter(q=>q.meaning!==card.meaning);
 const distractors=shuffle(same.length>=3?same:all).slice(0,3).map(q=>q.meaning);
 const choices=shuffle([card.meaning,...distractors]);
 return {choices,correctIndex:choices.indexOf(card.meaning)};
}
function buildTurn(room){
 const level=gradeLevel(room.grade),pool=questionPool.filter(q=>q.level===level),source=pool.length?pool:questionPool;
 // Do not re-offer words already shown in the same match until the grade pool is exhausted.
 let available=source.filter(q=>!seenQuestionIds.has(q.id)),count=Math.min(ELEMENTS.length,source.length);
 if(available.length<count){
  seenQuestionIds.clear();
  available=source.filter(q=>q.id!==lastQuestionId);
 }
 const picked=shuffle(available.length>=count?available:source).slice(0,count);
 for(const card of picked)seenQuestionIds.add(card.id);
 turnCards=picked.map((q,i)=>({...q,element:ELEMENTS[i],power:Math.max(1,Number((room.players||[]).find(p=>p.uid===user.uid)?.stats?.attack||1)+2)}));
 renderAttackCards(room);
}
function renderAttackCards(room){
 els.attackGrid.replaceChildren();
 for(const card of turnCards){
  const button=document.createElement('button');button.type='button';button.className='attack-card';button.disabled=busy;
  button.innerHTML=`<span class="element">${card.element[1]} ${card.element[2]}</span><span class="attack-name">${esc(card.word)}</span><span class="attack-sub"><span>英検${esc(room.grade)}</span><span>POWER ${card.power}</span></span>`;
  button.addEventListener('click',()=>openQuestion(card,room));els.attackGrid.append(button);
 }
}
function prepareTurn(room){if(room.status!=='playing'||busy)return;selectedAttack=null;currentQuestion=null;els.quizPanel.hidden=true;els.attackPanel.hidden=false;buildTurn(room);}
function openQuestion(card,room){
 if(busy||room.status!=='playing')return;selectedAttack=card;lastQuestionId=card.id;const q=makeChoices(card,room);currentQuestion={...q,card};
 els.attackBadge.textContent=`${card.element[1]} ${card.element[2]}`;els.attackPower.textContent=`POWER ${card.power}`;els.questionText.innerHTML=`<strong>${esc(card.word)}</strong> の意味は？`;els.answerFeedback.textContent='';els.answerFeedback.className='answer-feedback';els.nextBtn.hidden=true;els.answerGrid.replaceChildren();
 q.choices.forEach((choice,index)=>{const b=document.createElement('button');b.type='button';b.className='answer-btn';b.innerHTML=`<strong>${index+1}.</strong> ${esc(choice)}`;b.addEventListener('click',()=>void answerQuestion(index));els.answerGrid.appendChild(b);});
 els.attackPanel.hidden=true;els.quizPanel.hidden=false;
}
async function answerQuestion(index){
 if(busy||!currentQuestion||!currentRoom||currentRoom.status!=='playing')return;busy=true;
 const buttons=[...els.answerGrid.querySelectorAll('.answer-btn')],correct=index===currentQuestion.correctIndex;
 buttons.forEach((b,i)=>{b.disabled=true;if(i===currentQuestion.correctIndex)b.classList.add('correct');else if(i===index)b.classList.add('wrong');});
 els.answerFeedback.textContent=correct?'正解！ 攻撃！':'不正解… 自分に1ダメージ';els.answerFeedback.className='answer-feedback '+(correct?'ok':'no');
 try{const room=await act(correct?'attack':'miss',{render:false});currentRoom=room;renderRoom(room);await new Promise(resolve=>setTimeout(resolve,420));if(currentRoom?.status==='playing'){busy=false;prepareTurn(currentRoom);}else busy=false;}
 catch{busy=false;if(currentRoom?.status==='playing')prepareTurn(currentRoom);}
 // Unlock action buttons immediately after the answer animation.
 syncActionControls();
}

function renderWaiting(room,mine,other){
 els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.resultCard.hidden=true;els.waitingCard.hidden=false;els.readyCount.textContent='準備完了 '+(room.players||[]).filter(p=>p.ready).length+'/2';
 const two=Boolean(mine&&other);els.readyBtn.hidden=!two||mine?.ready;els.readyBtn.disabled=readyPending||!two||Boolean(mine?.ready);els.readyBtn.textContent=readyPending?'確認中…':'準備完了';
 if(!other){els.waitingTitle.textContent='対戦相手を待っています…';els.waitingText.textContent='友だちに同じルーム番号を伝えてください';}
 else if(mine?.ready){els.waitingTitle.textContent='準備完了！';els.waitingText.textContent='相手の準備を待っています';}
 else{els.waitingTitle.textContent='対戦準備OK';els.waitingText.textContent='「準備完了」を押すと、2人そろった時点で開始します';}
}
function renderFinished(room,mine){
 resetTurn();els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.waitingCard.hidden=true;els.resultCard.hidden=false;els.readyBtn.hidden=true;
 const win=room.winnerUid===user.uid,forfeit=room.lastEvent?.type==='forfeit';els.resultIcon.textContent=win?'🏆':'💫';els.resultTitle.textContent=win?'VICTORY':'BATTLE END';
 els.resultText.textContent=win?(forfeit?'相手が投了しました。不戦勝！ 1コイン獲得しました。':'勝利！ 1コイン獲得しました。'):'敗北… 次の対戦でリベンジしよう。';
 const canRematch=(room.players||[]).length===2;els.retryBtn.hidden=!canRematch;els.retryBtn.textContent=mine?.rematchReady?'相手の再戦準備を待っています…':'もう一度対戦';els.retryBtn.disabled=!canRematch||Boolean(mine?.rematchReady);els.readyCount.textContent=canRematch?'再戦準備 '+(room.players||[]).filter(p=>p.rematchReady).length+'/2':'';
}
function renderPlaying(room){
 els.waitingCard.hidden=true;els.resultCard.hidden=true;els.readyBtn.hidden=true;els.readyCount.textContent='';
 if(!selectedAttack&&turnCards.length===0)prepareTurn(room);
 else if(selectedAttack){els.attackPanel.hidden=true;els.quizPanel.hidden=false;}
 else{els.attackPanel.hidden=false;els.quizPanel.hidden=true;}
}
function syncActionControls(){
 const room=currentRoom,available=room?.status==='playing'&&!busy&&!room.noItems;
 els.magicBtn.disabled=!available;els.itemBtn.disabled=!available;
 if(!room||room.status!=='playing'||room.noItems){
  if(els.magicDialog.open)els.magicDialog.close();
  if(els.itemDialog.open)els.itemDialog.close();
  lastActionDialogSignature='';
  return;
 }
 const mine=minePlayer(room);
 const signature=[room.roomId,mine?.hp,mine?.mp,busy].join('|');
 if(signature===lastActionDialogSignature)return;
 lastActionDialogSignature=signature;
 // Remote actions may change HP/MP while a dialog is open.
 // Use the cached inventory; do not add Firestore reads to the poll loop.
 if(els.magicDialog.open)renderMagic();
 if(els.itemDialog.open)renderItems(normalizeDungeonInventory(ownData.petDungeonItems));
}
function renderRoom(room){
 if(!room||room.roomId!==activeRoom)return;
 currentRoom=room;enterBattleLayout();const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 if(mine){
  ownData.petDungeonItems=normalizeDungeonInventory(mine.inventory||{});
  coins=Math.max(0,Math.floor(Number(mine.coins)||0));
  els.coinCount.textContent=String(coins);
 }
 els.areaLabel.textContent='英検'+(room.grade||'4級');els.stageLabel.textContent='ROOM '+(room.roomNo||String(room.roomId||'').split('-').pop());els.enemyCount.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';els.bestLabel.textContent='MAGIC / ITEM';els.battleStatus.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';
 updateFighters(room);animateEvent(room);
 if(lastStatus!==room.status){if(room.status==='playing'){resetTurn();seenQuestionIds.clear();lastQuestionId='';}lastStatus=room.status;}
 syncActionControls();els.exitRunBtn.disabled=false;els.exitRunBtn.textContent=room.status==='playing'?'投了する':'対戦を終了する';
 if(room.status==='waiting')renderWaiting(room,mine,other);else if(room.status==='playing')renderPlaying(room);else if(room.status==='finished')renderFinished(room,mine);
 startAutoRefresh();
}

async function refreshRoom(){
 if(!activeRoom)return;
 const roomId=activeRoom;
 // A slow request must not cause overlapping polls every second.
 if(roomRefreshInFlight===roomId)return;
 roomRefreshInFlight=roomId;
 try{
  const data=await api('/room/'+roomId),room=data.room;
  if(roomId!==activeRoom)return;
  // A slow polling response must not roll back a freshly confirmed ready/start state.
  if(currentRoom?.roomId===roomId&&Number(room.seq)<Number(currentRoom.seq))return;
  if(!(room.players||[]).some(p=>p.uid===user.uid)){
   activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;lastEventKey='';lastEventRoomId='';lastStatus='';
   clearBattleEffects();resetTurn();enterLobbyLayout();startAutoRefresh();
   if(selectedGrade)await refreshLobby();else showGradePicker();return;
  }
  renderRoom(room);
 }catch(e){if(roomId===activeRoom)say(e.message,true);}
 finally{if(roomRefreshInFlight===roomId)roomRefreshInFlight='';}
}
async function enterRoom(id){
 try{
  say('ルームに入室しています…');selectedGrade=String(id).split('-')[0]||selectedGrade;
  const data=await api('/room/'+id+'/join','POST');
  navigationExitInFlight=null;
  activeRoom=id;localStorage.setItem(ROOM_STORAGE_KEY,id);
  currentRoom=null;lastEventRoomId=id;lastEventKey=eventFingerprint(data.room?.lastEvent);
  lastStatus='';readyPending=false;busy=false;seenQuestionIds.clear();lastQuestionId='';
  clearBattleEffects();clearBattleFeedback();resetTurn();
  if(els.magicDialog.open)els.magicDialog.close();
  if(els.itemDialog.open)els.itemDialog.close();
  renderRoom(data.room);say('');
 }catch(e){await refreshLobby();say(e.message,true);}
}
async function act(action,{render=true,body=null}={}){
 const roomId=activeRoom;
 try{
  const data=await api('/room/'+roomId+'/'+action,'POST',body);
  // An earlier room's delayed response cannot change the room now on screen.
  if(roomId!==activeRoom)return null;
  if(action==='leave'){
   activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;
   lastEventKey='';lastEventRoomId='';lastStatus='';busy=false;readyPending=false;
   clearBattleEffects();resetTurn();startAutoRefresh();enterLobbyLayout();
   if(selectedGrade)await refreshLobby();else showGradePicker();return null;
  }
  currentRoom=data.room;if(render)renderRoom(data.room);return data.room;
 }catch(e){if(roomId===activeRoom){await refreshRoom();say(e.message,true);}throw e;}
}

function renderMagic(message='',error=false){
 const mine=minePlayer(),level=ownLevel(),maxMp=Math.max(0,Number(mine?.stats?.mp)||0),mp=Math.max(0,Number(mine?.mp??maxMp)||0);
 els.magicMpStatus.textContent=`Lv.${level}　MP ${mp} / ${maxMp}`;els.magicMessage.textContent=message;els.magicMessage.className='battle-action-message'+(error?' error':'');els.magicList.replaceChildren();
 for(const spell of MAGIC_SPELLS){
  const unlocked=level>=spell.level,full=spell.kind==='heal'&&mine&&Number(mine.hp)>=Number(mine.stats?.hp),reason=!unlocked?'未習得':mp<spell.mpCost?'MP不足':full?'HPが満タンです':busy?'処理中':'',card=document.createElement('article');card.className='battle-action-card'+(unlocked?'':' locked');
  card.innerHTML=`<strong>${esc(spell.name)}</strong><span>${unlocked?esc(spell.description):`Lv.${spell.level}で習得`}</span><small>${unlocked?`消費MP ${spell.mpCost}`:'LOCKED'}${reason?' · '+esc(reason):''}</small><button type="button">${unlocked?'使う':'未習得'}</button>`;
  const button=card.querySelector('button');button.disabled=busy||!unlocked||mp<spell.mpCost||full;button.addEventListener('click',()=>void castMagic(spell));els.magicList.append(card);
 }
}
function openMagic(){
 if(els.magicBtn.disabled)return;
 els.magicMessage.textContent='';els.magicDialog.showModal();renderMagic();
}
async function castMagic(spell){
 if(busy||!currentRoom||currentRoom.status!=='playing')return;busy=true;resetTurn();
 try{els.magicDialog.close();const room=await act('magic',{render:false,body:{spellId:spell.id}});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}
 catch(error){busy=false;renderMagic(error?.message||'魔法を使えませんでした。',true);if(!els.magicDialog.open)els.magicDialog.showModal();}
  syncActionControls();
}
function renderItems(inventory,message='',error=false){
 const mine=minePlayer(),maxHp=Math.max(1,Number(mine?.stats?.hp)||1),hp=Math.max(0,Number(mine?.hp)||0),maxMp=Math.max(0,Number(mine?.stats?.mp)||0),mp=Math.max(0,Number(mine?.mp??maxMp)||0);
 els.itemMessage.textContent=message;els.itemMessage.className='battle-action-message'+(error?' error':'');els.itemList.replaceChildren();
 for(const item of DUNGEON_ITEMS){
  const count=inventory[item.id]||0,full=item.kind==='hp'?hp>=maxHp:mp>=maxMp,reason=count<1?'未所持':full?(item.kind==='hp'?'HPが満タンです':'MPが満タンです'):busy?'処理中':'',card=document.createElement('article');card.className='battle-action-card';
  card.innerHTML=`<strong>${item.icon} ${esc(item.name)}</strong><span>${esc(item.description)}</span><small>所持 ${count}個${reason?' · '+esc(reason):''}</small><button type="button">使う</button>`;
  const button=card.querySelector('button');button.disabled=busy||count<1||full;button.addEventListener('click',()=>void useItem(item));els.itemList.append(card);
 }
}
function openItem(){
 if(els.itemBtn.disabled)return;
 els.itemMessage.textContent='';els.itemDialog.showModal();
 renderItems(normalizeDungeonInventory(minePlayer()?.inventory||ownData.petDungeonItems));
}
async function useItem(item){
 if(busy||!currentRoom||currentRoom.status!=='playing')return;busy=true;resetTurn();
 try{els.itemDialog.close();const room=await act('item',{render:false,body:{itemId:item.id}});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}
 catch(error){busy=false;renderItems(normalizeDungeonInventory(minePlayer()?.inventory||ownData.petDungeonItems),error?.message||'アイテムを使えませんでした。',true);if(!els.itemDialog.open)els.itemDialog.showModal();}
  syncActionControls();
}

async function loadQuestionPool(){
 const sources=[
  './online-battle-vocab.json?v=2.3.50',
  'https://k-oota-pixel.github.io/word-breaker/eiken_vocab_master.json?v=1.0.0'
 ];
 const failures=[];
 for(const sourceUrl of sources){
  try{
   const response=await fetch(sourceUrl,{cache:'force-cache'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const payload=await response.json(),source=payload?.grades||{},rows=[];
   for(const grade of ['4','3','pre2','2']){
    const items=source?.[grade]?.words||[];
    for(const [i,item] of items.entries()){
     const word=String(item?.word||'').trim(),meaning=(Array.isArray(item?.answers)?item.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||String(item?.meaning||'').trim();
     if(word&&meaning)rows.push({id:grade+'-'+(item.id||i),level:grade,word,meaning});
    }
   }
   if(!['4','3','pre2','2'].every(grade=>rows.filter(q=>q.level===grade).length>=4))throw new Error('級別語彙データが不足しています。');
   questionPool=rows;
   return;
  }catch(e){failures.push(sourceUrl+': '+(e?.message||e));}
 }
 console.warn('online battle question load failed',failures);
 questionPool=[
   {id:'f4-1',level:'4',word:'apple',meaning:'りんご'},{id:'f4-2',level:'4',word:'book',meaning:'本'},{id:'f4-3',level:'4',word:'water',meaning:'水'},{id:'f4-4',level:'4',word:'school',meaning:'学校'},
   {id:'f3-1',level:'3',word:'outside',meaning:'外で'},{id:'f3-2',level:'3',word:'realize',meaning:'気づく'},{id:'f3-3',level:'3',word:'exercise',meaning:'運動'},{id:'f3-4',level:'3',word:'visitor',meaning:'訪問者'},
   {id:'fp2-1',level:'pre2',word:'include',meaning:'含む'},{id:'fp2-2',level:'pre2',word:'achieve',meaning:'達成する'},{id:'fp2-3',level:'pre2',word:'maintain',meaning:'維持する'},{id:'fp2-4',level:'pre2',word:'audience',meaning:'観客'},
   {id:'f2-1',level:'2',word:'potential',meaning:'可能性'},{id:'f2-2',level:'2',word:'threaten',meaning:'脅かす'},{id:'f2-3',level:'2',word:'quantity',meaning:'量'},{id:'f2-4',level:'2',word:'accomplish',meaning:'成し遂げる'}
  ];
 const note=$('dataNote');
 if(note)note.textContent='問題データの読み込みに失敗したため、簡易問題を使用しています。ページを再読み込みしてください。';
}

async function handleReadyClick(){
 if(readyPending||!activeRoom||currentRoom?.status!=='waiting')return;
 readyPending=true;els.readyBtn.disabled=true;els.readyBtn.textContent='確認中…';
 say('準備状態を確認しています…');
 try{await act('ready');say('');}
 catch{/* act displays the actual error and refreshes the room; allow the next attempt. */}
 finally{readyPending=false;if(activeRoom&&currentRoom)renderRoom(currentRoom);}
}

// The in-game back arrow returns to the room list rather than reloading the
// same URL (which the parent shell treats as a no-op).
battleView.querySelector('header.topbar a.back')?.addEventListener('click',event=>{
 event.preventDefault();
 event.stopPropagation();
 if(activeRoom)void act('leave').catch(()=>{});
 else{enterLobbyLayout();if(selectedGrade)void refreshLobby();else showGradePicker();}
});
// Rankings are read on demand only, never from the active battle/lobby polling loop.
const rankingDialog=$('onlineRankingDialog'),rankingTitle=$('onlineRankingTitle'),rankingDate=$('onlineRankingDate'),rankingStatus=$('onlineRankingStatus'),rankingRows=$('onlineRankingRows');
let rankingRequest=0;
function previousJapanDate(){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(Date.now()-86400000));
 const fields=Object.fromEntries(parts.map(part=>[part.type,part.value]));
 return fields.year+'-'+fields.month+'-'+fields.day;
}
function openRankedPet(uid){try{if(typeof window.parent.monstudyPetView==='function')return window.parent.monstudyPetView(uid);}catch{}location.href=new URL('../index.html?petView='+encodeURIComponent(uid),import.meta.url).href;}
function renderDailyRanking(data){
 rankingRows.replaceChildren();
 for(const entry of (Array.isArray(data.leaders)?data.leaders:[]).slice(0,10)){
  const tr=document.createElement('tr');
  const rank=document.createElement('td');rank.textContent=(Number(entry.rank)||'—')+'位';
  const name=document.createElement('td'),nickname=document.createElement('span'),pet=document.createElement('small');
  nickname.className='online-ranking-name';nickname.textContent=String(entry.nickname||'なまえ未設定');
  pet.className='online-ranking-pet';pet.textContent='ペット：'+String(entry.petName||'ペット');
  name.append(nickname,pet);const view=document.createElement('button');view.type='button';view.textContent='ぺっとを見る';view.style.cssText='display:block;margin-top:5px;padding:4px 7px;border:1px solid #99bda3;border-radius:7px;cursor:pointer;background:#e8f4ec;color:#245744';view.onclick=()=>openRankedPet(entry.uid);name.append(view);
  const record=document.createElement('td');record.textContent=(Number(entry.games)||0)+'戦 '+(Number(entry.wins)||0)+'勝';
  const rate=document.createElement('td');rate.textContent=(Number(entry.winRate)||0).toFixed(1)+'%';
  tr.append(rank,name,record,rate);rankingRows.append(tr);
 }
}
async function openDailyRanking(){
 if(!selectedGrade||!user)return;
 const grade=selectedGrade,requestId=++rankingRequest,expectedDate=previousJapanDate();
 rankingTitle.textContent='🏆 '+gradeLabel(grade)+' 対戦ランキング';
 rankingDate.textContent='昨日（'+expectedDate+'）までの通算成績';
 rankingStatus.textContent='ランキングを読み込んでいます…';
 rankingStatus.classList.remove('error');rankingRows.replaceChildren();
 if(!rankingDialog.open)rankingDialog.showModal();
 const cacheKey='monstudy-online-standings-v1:'+grade+':'+expectedDate;
 try{
  let data=null;
  try{const saved=sessionStorage.getItem(cacheKey);if(saved)data=JSON.parse(saved);}catch{}
  if(!data){
   data=await api('/rankings/'+grade);
   if(data?.asOfDate===expectedDate){try{sessionStorage.setItem(cacheKey,JSON.stringify(data));}catch{}}
  }
  if(requestId!==rankingRequest||!rankingDialog.open)return;
  renderDailyRanking(data);
  if(data.asOfDate)rankingDate.textContent='通算成績：'+data.asOfDate+' 終了時点';
  if(data.asOfDate!==expectedDate){
   rankingStatus.textContent='前日の集計はまだ完了していません。最新の確定結果を表示しています。';
  }else if(!data.leaders?.length){
   rankingStatus.textContent='まだランキング対象の勝利記録がありません。';
  }else{
   rankingStatus.textContent='上位'+data.leaders.length+'名を表示しています。';
  }
 }catch(error){
  if(requestId!==rankingRequest||!rankingDialog.open)return;
  rankingStatus.textContent=error.message||'ランキングを取得できませんでした。';
  rankingStatus.classList.add('error');
 }
}
$('rankingBtn').addEventListener('click',()=>void openDailyRanking());
$('onlineRankingClose').addEventListener('click',()=>rankingDialog.close());
rankingDialog.addEventListener('close',()=>{rankingRequest++;});

$('refreshBtn').addEventListener('click',()=>void refreshLobby());
$('backToGradesBtn').addEventListener('click',()=>showGradePicker());
gradePicker.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>void selectGrade(button.dataset.grade)));
els.readyBtn.addEventListener('click',()=>void handleReadyClick());
els.retryBtn.addEventListener('click',()=>void act('continue').catch(()=>{}));
els.leaveBtn.addEventListener('click',()=>void act('leave').catch(()=>{}));
els.exitRunBtn.addEventListener('click',()=>void act('leave').catch(()=>{}));
els.magicBtn.addEventListener('click',()=>void openMagic());els.itemBtn.addEventListener('click',()=>void openItem());
els.magicClose.addEventListener('click',()=>els.magicDialog.close());els.itemClose.addEventListener('click',()=>els.itemDialog.close());

async function init(){
 try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();enterLobbyLayout();showGradePicker();const saved=localStorage.getItem(ROOM_STORAGE_KEY)||'';if(/^(?:4|3|pre2|2)-(?:10|[1-9])$/.test(saved)){activeRoom=saved;selectedGrade=saved.split('-')[0];await refreshRoom();}autoPausedForIdle=false;armIdlePause();startAutoRefresh();}catch(e){say(e.message||'初期化できませんでした。',true);}
}
window.addEventListener('pointerdown',registerActivity,{capture:true,passive:true});
window.addEventListener('touchstart',registerActivity,{capture:true,passive:true});
window.addEventListener('keydown',registerActivity,true);
document.addEventListener('visibilitychange',handleVisibility);
window.addEventListener('focus',handleVisibility);
// Parent shell navigation removes the iframe without reloading the top-level page.
if(window.MonstudyMaterial)window.MonstudyMaterial.onNavigateAway=leaveOnNavigate;
window.addEventListener('pagehide',()=>{void leaveOnNavigate();stopAutoRefresh();clearTimeout(idleTimer);});
init();