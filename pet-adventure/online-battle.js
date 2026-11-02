import {auth,authReady,walletRef} from '../coin-reward.js?v=2.1.11';
import {getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {renderPetSVG} from '../pet-art.js?v=2.1.49';

const API='https://task-quest.onrender.com/api/online-battle';
const $=id=>document.getElementById(id);
const ELEMENTS=[['fire','🔥','FIRE'],['thunder','⚡','THUNDER'],['leaf','🍃','LEAF'],['water','💧','WATER']];
const lobbyView=$('lobbyView'),battleView=$('battleView'),roomList=$('roomList'),roomsEl=$('rooms'),notice=$('notice');
const els={
 coinCount:$('coinCount'),modeTitle:$('modeTitle'),areaLabel:$('areaLabel'),stageLabel:$('stageLabel'),enemyCount:$('enemyCount'),bestLabel:$('bestLabel'),
 petStats:$('petStats'),petName:$('petName'),myNickname:$('myNickname'),petHpBar:$('petHpBar'),petHpText:$('petHpText'),petMpBar:$('petMpBar'),petMpText:$('petMpText'),petVisual:$('adventurePetVisual'),
 enemyName:$('enemyName'),enemyElement:$('enemyElement'),enemyHpBar:$('enemyHpBar'),enemyHpText:$('enemyHpText'),enemyMpText:$('enemyMpText'),enemyVisual:$('enemyVisual'),
 battleStatus:$('battleStatus'),battleFlash:$('battleFlash'),attackPanel:$('attackPanel'),attackGrid:$('attackGrid'),attackHeading:$('attackHeading'),attackHint:$('attackHint'),
 quizPanel:$('quizPanel'),attackBadge:$('attackBadge'),attackPower:$('attackPower'),questionText:$('questionText'),answerGrid:$('answerGrid'),answerFeedback:$('answerFeedback'),nextBtn:$('nextBtn'),
 waitingCard:$('waitingCard'),waitingTitle:$('waitingTitle'),waitingText:$('waitingText'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultTitle:$('resultTitle'),resultText:$('resultText'),
 readyBtn:$('readyBtn'),readyCount:$('readyCount'),retryBtn:$('retryBtn'),leaveBtn:$('leaveBtn'),exitRunBtn:$('exitRunBtn'),magicBtn:$('magicBtn'),itemBtn:$('itemBtn'),
 magicDialog:$('magicDialog'),magicClose:$('magicClose'),magicList:$('magicList'),magicMessage:$('magicMessage'),itemDialog:$('itemDialog'),itemClose:$('itemClose'),itemList:$('itemList'),itemMessage:$('itemMessage')
};
let user=null,activeRoom='',pollTimer=0,roomsTimer=0,coins=0,questionPool=[];
let currentRoom=null,turnCards=[],selectedAttack=null,currentQuestion=null,lastQuestionId='',lastEventSeq=-1,lastStatus='',busy=false;

function say(message,error=false){notice.textContent=message;notice.classList.toggle('error',error);}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function gradeLevel(grade){return ({'4級':'junior1','3級':'junior2','準2級':'junior3','2級':'high1'})[grade]||'junior1';}
function roomStatus(room){if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(room.players?.length===1)return '1人が待機中';if(room.players?.length===2)return '2人が準備中';return '空室';}
function roomRuleText(room){return '英検'+(room.grade||'4級')+' · '+(room.noItems?'魔法・アイテムなし':'魔法・アイテムあり');}
function setBar(el,value,max){const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;el.style.width=pct+'%';}
function petArt(player){
 if(!player)return '👾';
 if(!player.petHatched)return '<span class="online-egg" role="img" aria-label="たまご">🥚</span>';
 try{return renderPetSVG(player.petAppearance,{...player.petShop,equipped:{...player.petShop?.equipped,'pet-frame':''}},player.petAdult?'adult':'baby',{background:false});}catch{return '🐾';}
}
async function api(path,method='GET',body=null){
 const token=await user.getIdToken();
 const response=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?JSON.stringify(body||{}):undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'通信に失敗しました。');
 return data;
}
async function updateCoins(){try{const snap=await getDoc(walletRef(user));coins=Math.max(0,Math.floor(Number(snap.data()?.coins)||0));els.coinCount.textContent=coins;}catch{els.coinCount.textContent='—';}}

function renderRooms(list){
 roomsEl.replaceChildren();
 for(const room of list){
  const card=document.createElement('article');card.className='online-room-card';
  const heading=document.createElement('strong');heading.textContent='ルーム '+room.roomId;
  const rule=document.createElement('span');rule.className='online-room-rule';rule.textContent=roomRuleText(room);
  const state=document.createElement('span');state.className='online-room-state';state.textContent=roomStatus(room)+' · '+(room.players?.length||0)+'/2人';
  const btn=document.createElement('button');btn.type='button';btn.className='primary-btn';btn.textContent='入室する';
  btn.disabled=['playing','finished'].includes(room.status)||((room.players?.length||0)>=2&&!(room.players||[]).some(p=>p.uid===user.uid));
  btn.addEventListener('click',()=>void enterRoom(room.roomId));
  card.append(heading,rule,state,btn);roomsEl.append(card);
 }
}

function enterBattleLayout(){lobbyView.hidden=true;battleView.hidden=false;document.body.classList.add('battle-mode');}
function enterLobbyLayout(){battleView.hidden=true;lobbyView.hidden=false;document.body.classList.remove('battle-mode');}
function resetTurn(){turnCards=[];selectedAttack=null;currentQuestion=null;els.answerGrid.replaceChildren();els.answerFeedback.textContent='';els.quizPanel.hidden=true;}

function updateFighters(room){
 const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 if(mine){
  const max=Math.max(1,Number(mine.stats?.hp)||1),hp=Math.max(0,Number(mine.hp)||0),mp=Math.max(0,Number(mine.stats?.mp)||0);
  els.petName.textContent=mine.petName||'MY PET';els.myNickname.textContent=mine.nickname||'YOU';els.petHpText.textContent=hp+' / '+max;setBar(els.petHpBar,hp,max);
  els.petMpText.textContent=mp+' / '+mp+' MP';setBar(els.petMpBar,mp,Math.max(1,mp));els.petStats.textContent=`HP ${max} · 攻撃力 ${Number(mine.stats?.attack||1)} · 防御力 ${Number(mine.stats?.defense||1)} · MP ${mp}`;
  els.petVisual.innerHTML=petArt(mine);
 }
 if(other){
  const max=Math.max(1,Number(other.stats?.hp)||1),hp=Math.max(0,Number(other.hp)||0);
  els.enemyName.textContent=other.petName||'OPPONENT';els.enemyElement.textContent=other.nickname||'RIVAL';els.enemyHpText.textContent=hp+' / '+max;setBar(els.enemyHpBar,hp,max);els.enemyVisual.innerHTML=petArt(other);els.enemyMpText.textContent='対戦相手';
 }else{
  els.enemyName.textContent='OPPONENT';els.enemyElement.textContent='WAITING';els.enemyHpText.textContent='— / —';setBar(els.enemyHpBar,0,1);els.enemyVisual.textContent='👾';els.enemyMpText.textContent='相手を待っています';
 }
}

function flash(text){els.battleFlash.textContent=text;els.battleFlash.classList.remove('show');void els.battleFlash.offsetWidth;els.battleFlash.classList.add('show');}
function animateEvent(room){
 if(room.seq===lastEventSeq||!room.lastEvent)return;lastEventSeq=room.seq;
 const ev=room.lastEvent,mine=ev.from===user.uid;
 if(ev.type==='attack'||ev.type==='magic'){
  const target=ev.to===user.uid?els.petVisual:els.enemyVisual;target.classList.remove('hurt');void target.offsetWidth;target.classList.add('hurt');
  if(mine){els.petVisual.classList.remove('attack');void els.petVisual.offsetWidth;els.petVisual.classList.add('attack');flash((ev.type==='magic'?'魔法攻撃！':'攻撃成功！')+'\n-'+ev.damage+' HP');}
  else flash((ev.type==='magic'?'相手の魔法！':'相手の攻撃！')+'\n-'+ev.damage+' HP');
 }else if(ev.type==='miss')flash(mine?'不正解…\n自分に1ダメージ':'相手が不正解！');
 else if(ev.type==='item')flash(mine?'アイテムで回復！':'相手がアイテムで回復！');
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
 const available=source.filter(q=>q.id!==lastQuestionId),picked=shuffle(available.length>=4?available:source).slice(0,4);
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
}

function renderWaiting(room,mine,other){
 els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.resultCard.hidden=true;els.waitingCard.hidden=false;els.readyCount.textContent='準備完了 '+(room.players||[]).filter(p=>p.ready).length+'/2';
 const two=Boolean(mine&&other);els.readyBtn.hidden=!two||mine?.ready;els.readyBtn.disabled=!two||Boolean(mine?.ready);
 if(!other){els.waitingTitle.textContent='対戦相手を待っています…';els.waitingText.textContent='友だちに同じルーム番号を伝えてください';}
 else if(mine?.ready){els.waitingTitle.textContent='準備完了！';els.waitingText.textContent='相手の準備を待っています';}
 else{els.waitingTitle.textContent='対戦準備OK';els.waitingText.textContent='「準備完了」を押すと、2人そろった時点で開始します';}
}
function renderFinished(room,mine){
 resetTurn();els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.waitingCard.hidden=true;els.resultCard.hidden=false;els.readyBtn.hidden=true;
 const win=room.winnerUid===user.uid;els.resultIcon.textContent=win?'🏆':'💫';els.resultTitle.textContent=win?'VICTORY':'BATTLE END';els.resultText.textContent=win?'勝利！ 2コイン獲得しました。':'敗北… 次の対戦でリベンジしよう。';
 els.retryBtn.textContent=mine?.rematchReady?'相手の再戦準備を待っています…':'もう一度対戦';els.retryBtn.disabled=Boolean(mine?.rematchReady);els.readyCount.textContent='再戦準備 '+(room.players||[]).filter(p=>p.rematchReady).length+'/2';
}
function renderPlaying(room){
 els.waitingCard.hidden=true;els.resultCard.hidden=true;els.readyBtn.hidden=true;els.readyCount.textContent='';
 if(!selectedAttack&&turnCards.length===0)prepareTurn(room);
 else if(selectedAttack){els.attackPanel.hidden=true;els.quizPanel.hidden=false;}
 else{els.attackPanel.hidden=false;els.quizPanel.hidden=true;}
}
function renderRoom(room){
 currentRoom=room;enterBattleLayout();const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 els.areaLabel.textContent='英検'+(room.grade||'4級');els.stageLabel.textContent='ROOM '+room.roomId;els.enemyCount.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';els.bestLabel.textContent=room.noItems?'ITEM OFF':'ITEM ON';els.battleStatus.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';
 updateFighters(room);animateEvent(room);
 if(lastStatus!==room.status){if(room.status==='playing')resetTurn();lastStatus=room.status;}
 const playable=room.status==='playing'&&!busy;els.magicBtn.disabled=!playable||room.noItems;els.itemBtn.disabled=!playable||room.noItems;els.exitRunBtn.disabled=room.status==='playing';
 if(room.status==='waiting')renderWaiting(room,mine,other);else if(room.status==='playing')renderPlaying(room);else if(room.status==='finished')renderFinished(room,mine);
}

async function refreshRooms(){
 try{
  const data=await api('/rooms'),list=data.rooms||[];const active=list.find(r=>(r.players||[]).some(p=>p.uid===user.uid)&&['waiting','playing','finished'].includes(r.status));
  if(active){activeRoom=active.roomId;renderRoom(active);say('');return;}
  activeRoom='';currentRoom=null;lastStatus='';lastEventSeq=-1;resetTurn();enterLobbyLayout();roomList.hidden=false;renderRooms(list);say('空いているルームを選んでください。');
 }catch(e){say(e.message,true);}
}
async function refreshRoom(){if(!activeRoom)return;try{const data=await api('/room/'+activeRoom),room=data.room;if(!(room.players||[]).some(p=>p.uid===user.uid)){activeRoom='';await refreshRooms();return;}renderRoom(room);}catch(e){say(e.message,true);}}
async function enterRoom(id){try{say('ルームに入室しています…');const data=await api('/room/'+id+'/join','POST');activeRoom=id;lastEventSeq=data.room.seq;lastStatus='';resetTurn();renderRoom(data.room);say('');}catch(e){say(e.message,true);await refreshRooms();}}
async function act(action,{render=true}={}){
 try{
  const data=await api('/room/'+activeRoom+'/'+action,'POST');
  if(action==='leave'){activeRoom='';currentRoom=null;resetTurn();await updateCoins();await refreshRooms();return null;}
  currentRoom=data.room;if(render)renderRoom(data.room);await updateCoins();return data.room;
 }catch(e){say(e.message,true);await refreshRoom();throw e;}
}

function openMagic(){
 if(els.magicBtn.disabled)return;els.magicMessage.textContent='';els.magicMessage.className='battle-action-message';els.magicList.innerHTML=`<article class="battle-action-card"><strong>✨ オンライン魔法</strong><span>相手に魔法ダメージを与えます</span><small>対戦専用</small><button type="button" data-use-magic>使う</button></article>`;
 els.magicList.querySelector('[data-use-magic]').addEventListener('click',async e=>{e.currentTarget.disabled=true;busy=true;try{els.magicDialog.close();resetTurn();const room=await act('magic',{render:false});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}catch(err){busy=false;els.magicMessage.textContent=err.message;els.magicMessage.className='battle-action-message error';}});els.magicDialog.showModal();
}
function openItem(){
 if(els.itemBtn.disabled)return;els.itemMessage.textContent='';els.itemMessage.className='battle-action-message';els.itemList.innerHTML=`<article class="battle-action-card"><strong>🎒 回復アイテム</strong><span>HPを3回復します</span><small>対戦専用</small><button type="button" data-use-item>使う</button></article>`;
 els.itemList.querySelector('[data-use-item]').addEventListener('click',async e=>{e.currentTarget.disabled=true;busy=true;try{els.itemDialog.close();resetTurn();const room=await act('item',{render:false});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}catch(err){busy=false;els.itemMessage.textContent=err.message;els.itemMessage.className='battle-action-message error';}});els.itemDialog.showModal();
}

async function loadQuestionPool(){
 try{
  const response=await fetch('https://k-oota-pixel.github.io/word-breaker/monstudy_vocab_master.json?v=1.5',{cache:'force-cache'}),payload=await response.json(),source=payload?.levels||payload?.courses||payload,rows=[];
  for(const [level,items] of Object.entries(source||{})){const list=Array.isArray(items)?items:items?.words||[];for(const [i,item] of list.entries()){const word=String(item?.word||'').trim(),meaning=(Array.isArray(item?.answers)?item.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||String(item?.meaning||'').trim();if(word&&meaning)rows.push({id:level+'-'+(item.id||i),level,word,meaning});}}
  questionPool=rows;
 }catch(e){console.warn('online battle question load failed',e);questionPool=[{id:'f1',level:'junior1',word:'apple',meaning:'りんご'},{id:'f2',level:'junior1',word:'book',meaning:'本'},{id:'f3',level:'junior1',word:'water',meaning:'水'},{id:'f4',level:'junior1',word:'school',meaning:'学校'},{id:'f5',level:'junior1',word:'friend',meaning:'友だち'}];}
}

$('refreshBtn').addEventListener('click',()=>void refreshRooms());
els.readyBtn.addEventListener('click',()=>void act('ready'));
els.retryBtn.addEventListener('click',()=>void act('continue'));
els.leaveBtn.addEventListener('click',()=>void act('leave'));
els.exitRunBtn.addEventListener('click',()=>void act('leave'));
els.magicBtn.addEventListener('click',openMagic);els.itemBtn.addEventListener('click',openItem);
els.magicClose.addEventListener('click',()=>els.magicDialog.close());els.itemClose.addEventListener('click',()=>els.itemDialog.close());

async function init(){
 try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();await refreshRooms();pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);roomsTimer=window.setInterval(()=>{if(!activeRoom)void refreshRooms();},10000);}catch(e){say(e.message||'初期化できませんでした。',true);}
}
window.addEventListener('pagehide',()=>{clearInterval(pollTimer);clearInterval(roomsTimer);});
init();
