import {auth,authReady,walletRef} from '../coin-reward.js?v=2.1.11';
import {getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {renderPetSVG} from '../pet-art.js?v=2.1.49';
import {strengthLevel} from '../pet-strength-model.js?v=2.3.23';
import {MAGIC_SPELLS,DUNGEON_ITEMS,normalizeDungeonInventory} from '../pet-dungeons-model.js?v=1.10.22';

const API='https://task-quest.onrender.com/api/online-battle';
const $=id=>document.getElementById(id);
const ELEMENTS=[['fire','🔥','FIRE'],['thunder','⚡','THUNDER'],['leaf','🍃','LEAF'],['water','💧','WATER']];
const lobbyView=$('lobbyView'),battleView=$('battleView'),gradePicker=$('gradePicker'),roomList=$('roomList'),roomsEl=$('rooms'),notice=$('notice'),selectedGradeTitle=$('selectedGradeTitle');
const GRADES=Object.freeze([{key:'4',label:'4級'},{key:'3',label:'3級'},{key:'pre2',label:'準2級'},{key:'2',label:'2級'}]);
const ROOM_STORAGE_KEY='monstudy-online-room-v2';
const els={
 coinCount:$('coinCount'),modeTitle:$('modeTitle'),areaLabel:$('areaLabel'),stageLabel:$('stageLabel'),enemyCount:$('enemyCount'),bestLabel:$('bestLabel'),
 petStats:$('petStats'),petName:$('petName'),myNickname:$('myNickname'),petHpBar:$('petHpBar'),petHpText:$('petHpText'),petMpBar:$('petMpBar'),petMpText:$('petMpText'),petVisual:$('adventurePetVisual'),
 enemyName:$('enemyName'),enemyElement:$('enemyElement'),enemyHpBar:$('enemyHpBar'),enemyHpText:$('enemyHpText'),enemyMpText:$('enemyMpText'),enemyVisual:$('enemyVisual'),
 battleStatus:$('battleStatus'),battleFlash:$('battleFlash'),attackPanel:$('attackPanel'),attackGrid:$('attackGrid'),attackHeading:$('attackHeading'),attackHint:$('attackHint'),
 quizPanel:$('quizPanel'),attackBadge:$('attackBadge'),attackPower:$('attackPower'),questionText:$('questionText'),answerGrid:$('answerGrid'),answerFeedback:$('answerFeedback'),nextBtn:$('nextBtn'),
 waitingCard:$('waitingCard'),waitingTitle:$('waitingTitle'),waitingText:$('waitingText'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultTitle:$('resultTitle'),resultText:$('resultText'),
 readyBtn:$('readyBtn'),readyCount:$('readyCount'),retryBtn:$('retryBtn'),leaveBtn:$('leaveBtn'),exitRunBtn:$('exitRunBtn'),magicBtn:$('magicBtn'),itemBtn:$('itemBtn'),
 magicDialog:$('magicDialog'),magicClose:$('magicClose'),magicList:$('magicList'),magicMpStatus:$('magicMpStatus'),magicMessage:$('magicMessage'),itemDialog:$('itemDialog'),itemClose:$('itemClose'),itemList:$('itemList'),itemMessage:$('itemMessage')
};
let user=null,activeRoom='',selectedGrade='',pollTimer=0,roomsTimer=0,coins=0,questionPool=[],ownData={};
let currentRoom=null,turnCards=[],selectedAttack=null,currentQuestion=null,lastQuestionId='',lastEventSeq=-1,lastStatus='',busy=false;

function say(message,error=false){notice.textContent=message;notice.classList.toggle('error',error);}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));}
function shuffle(values){const out=[...values];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function gradeLevel(grade){return ({'4級':'junior1','3級':'junior2','準2級':'junior3','2級':'high1'})[grade]||'junior1';}
function roomPlayerCount(room){return Math.max(0,Math.min(2,Number(room.playerCount??room.players?.length??0)||0));}
function roomStatus(room){const count=roomPlayerCount(room);if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(count===1)return '1人待機中';if(count===2)return '準備中';return '空室';}
function setBar(el,value,max){const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;el.style.width=pct+'%';}
function minePlayer(room=currentRoom){return (room?.players||[]).find(p=>p.uid===user?.uid)||null;}
function ownLevel(){return strengthLevel(ownData.petStrengthLevelPoints,ownData.petStrength);}
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
async function refreshOwnData(){
 const snap=await getDoc(walletRef(user));ownData=snap.exists()?(snap.data()||{}):{};coins=Math.max(0,Math.floor(Number(ownData.coins)||0));els.coinCount.textContent=coins;return ownData;
}
async function updateCoins(){try{await refreshOwnData();}catch{els.coinCount.textContent='—';}}

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
 try{const data=await api('/lobby/'+selectedGrade),lobby=data.lobby||{};selectedGradeTitle.textContent=lobby.grade||gradeLabel(selectedGrade);renderRooms(lobby.rooms||[]);say('');}
 catch(e){say(e.message,true);}
}

function enterBattleLayout(){lobbyView.hidden=true;battleView.hidden=false;document.body.classList.add('battle-mode');}
function enterLobbyLayout(){battleView.hidden=true;lobbyView.hidden=false;document.body.classList.remove('battle-mode');}
function resetTurn(){turnCards=[];selectedAttack=null;currentQuestion=null;els.answerGrid.replaceChildren();els.answerFeedback.textContent='';els.quizPanel.hidden=true;}

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
 if(room.seq===lastEventSeq||!room.lastEvent)return;lastEventSeq=room.seq;
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
 const win=room.winnerUid===user.uid,forfeit=room.lastEvent?.type==='forfeit';els.resultIcon.textContent=win?'🏆':'💫';els.resultTitle.textContent=win?'VICTORY':'BATTLE END';
 els.resultText.textContent=win?(forfeit?'相手が投了しました。不戦勝！ 2コイン獲得しました。':'勝利！ 2コイン獲得しました。'):'敗北… 次の対戦でリベンジしよう。';
 const canRematch=(room.players||[]).length===2;els.retryBtn.hidden=!canRematch;els.retryBtn.textContent=mine?.rematchReady?'相手の再戦準備を待っています…':'もう一度対戦';els.retryBtn.disabled=!canRematch||Boolean(mine?.rematchReady);els.readyCount.textContent=canRematch?'再戦準備 '+(room.players||[]).filter(p=>p.rematchReady).length+'/2':'';
}
function renderPlaying(room){
 els.waitingCard.hidden=true;els.resultCard.hidden=true;els.readyBtn.hidden=true;els.readyCount.textContent='';
 if(!selectedAttack&&turnCards.length===0)prepareTurn(room);
 else if(selectedAttack){els.attackPanel.hidden=true;els.quizPanel.hidden=false;}
 else{els.attackPanel.hidden=false;els.quizPanel.hidden=true;}
}
function renderRoom(room){
 currentRoom=room;enterBattleLayout();const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 els.areaLabel.textContent='英検'+(room.grade||'4級');els.stageLabel.textContent='ROOM '+(room.roomNo||String(room.roomId||'').split('-').pop());els.enemyCount.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';els.bestLabel.textContent='MAGIC / ITEM';els.battleStatus.textContent=room.status==='playing'?'LIVE':room.status==='finished'?'FINISH':'WAITING';
 updateFighters(room);animateEvent(room);
 if(lastStatus!==room.status){if(room.status==='playing')resetTurn();lastStatus=room.status;}
 const playable=room.status==='playing'&&!busy;els.magicBtn.disabled=!playable||room.noItems;els.itemBtn.disabled=!playable||room.noItems;els.exitRunBtn.disabled=false;els.exitRunBtn.textContent=room.status==='playing'?'投了する':'対戦を終了する';
 if(room.status==='waiting')renderWaiting(room,mine,other);else if(room.status==='playing')renderPlaying(room);else if(room.status==='finished')renderFinished(room,mine);
}

async function refreshRoom(){
 if(!activeRoom)return;
 try{const data=await api('/room/'+activeRoom),room=data.room;if(!(room.players||[]).some(p=>p.uid===user.uid)){activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;enterLobbyLayout();if(selectedGrade)await refreshLobby();else showGradePicker();return;}renderRoom(room);say('');}
 catch(e){say(e.message,true);}
}
async function enterRoom(id){
 try{say('ルームに入室しています…');selectedGrade=String(id).split('-')[0]||selectedGrade;const data=await api('/room/'+id+'/join','POST');activeRoom=id;localStorage.setItem(ROOM_STORAGE_KEY,id);lastEventSeq=data.room.seq;lastStatus='';resetTurn();renderRoom(data.room);say('');}
 catch(e){say(e.message,true);await refreshLobby();}
}
async function act(action,{render=true,body=null}={}){
 try{
  const data=await api('/room/'+activeRoom+'/'+action,'POST',body);
  if(action==='leave'){activeRoom='';localStorage.removeItem(ROOM_STORAGE_KEY);currentRoom=null;resetTurn();await updateCoins();enterLobbyLayout();if(selectedGrade)await refreshLobby();else showGradePicker();return null;}
  currentRoom=data.room;if(render)renderRoom(data.room);await updateCoins();return data.room;
 }catch(e){say(e.message,true);await refreshRoom();throw e;}
}

function renderMagic(message='',error=false){
 const mine=minePlayer(),level=ownLevel(),maxMp=Math.max(0,Number(mine?.stats?.mp)||0),mp=Math.max(0,Number(mine?.mp??maxMp)||0);
 els.magicMpStatus.textContent=`Lv.${level}　MP ${mp} / ${maxMp}`;els.magicMessage.textContent=message;els.magicMessage.className='battle-action-message'+(error?' error':'');els.magicList.replaceChildren();
 for(const spell of MAGIC_SPELLS){
  const unlocked=level>=spell.level,full=spell.kind==='heal'&&mine&&Number(mine.hp)>=Number(mine.stats?.hp),card=document.createElement('article');card.className='battle-action-card'+(unlocked?'':' locked');
  card.innerHTML=`<strong>${esc(spell.name)}</strong><span>${unlocked?esc(spell.description):`Lv.${spell.level}で習得`}</span><small>${unlocked?`消費MP ${spell.mpCost}`:'LOCKED'}</small><button type="button">${unlocked?'使う':'未習得'}</button>`;
  const button=card.querySelector('button');button.disabled=busy||!unlocked||mp<spell.mpCost||full;button.addEventListener('click',()=>void castMagic(spell));els.magicList.append(card);
 }
}
async function openMagic(){
 if(els.magicBtn.disabled)return;els.magicList.innerHTML='<p>魔法を読み込み中…</p>';els.magicMessage.textContent='';els.magicDialog.showModal();
 try{await refreshOwnData();if(els.magicDialog.open)renderMagic();}catch(error){if(els.magicDialog.open)renderMagic(error?.message||'魔法を読み込めませんでした。',true);}
}
async function castMagic(spell){
 if(busy||!currentRoom||currentRoom.status!=='playing')return;busy=true;resetTurn();
 try{els.magicDialog.close();const room=await act('magic',{render:false,body:{spellId:spell.id}});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}
 catch(error){busy=false;try{await refreshOwnData();}catch{}renderMagic(error?.message||'魔法を使えませんでした。',true);if(!els.magicDialog.open)els.magicDialog.showModal();}
}
function renderItems(inventory,message='',error=false){
 const mine=minePlayer(),maxHp=Math.max(1,Number(mine?.stats?.hp)||1),hp=Math.max(0,Number(mine?.hp)||0),maxMp=Math.max(0,Number(mine?.stats?.mp)||0),mp=Math.max(0,Number(mine?.mp??maxMp)||0);
 els.itemMessage.textContent=message;els.itemMessage.className='battle-action-message'+(error?' error':'');els.itemList.replaceChildren();
 for(const item of DUNGEON_ITEMS){
  const count=inventory[item.id]||0,full=item.kind==='hp'?hp>=maxHp:mp>=maxMp,card=document.createElement('article');card.className='battle-action-card';
  card.innerHTML=`<strong>${item.icon} ${esc(item.name)}</strong><span>${esc(item.description)}</span><small>所持 ${count}個</small><button type="button">使う</button>`;
  const button=card.querySelector('button');button.disabled=busy||count<1||full;button.addEventListener('click',()=>void useItem(item));els.itemList.append(card);
 }
}
async function openItem(){
 if(els.itemBtn.disabled)return;els.itemList.innerHTML='<p>持ち物を読み込み中…</p>';els.itemMessage.textContent='';els.itemDialog.showModal();
 try{const data=await refreshOwnData();if(els.itemDialog.open)renderItems(normalizeDungeonInventory(data.petDungeonItems));}
 catch(error){if(els.itemDialog.open)renderItems(normalizeDungeonInventory(ownData.petDungeonItems),error?.message||'持ち物を読み込めませんでした。',true);}
}
async function useItem(item){
 if(busy||!currentRoom||currentRoom.status!=='playing')return;busy=true;resetTurn();
 try{els.itemDialog.close();const room=await act('item',{render:false,body:{itemId:item.id}});busy=false;if(room){renderRoom(room);if(room.status==='playing')prepareTurn(room);}}
 catch(error){busy=false;try{await refreshOwnData();}catch{}renderItems(normalizeDungeonInventory(ownData.petDungeonItems),error?.message||'アイテムを使えませんでした。',true);if(!els.itemDialog.open)els.itemDialog.showModal();}
}

async function loadQuestionPool(){
 try{
  const response=await fetch('https://k-oota-pixel.github.io/word-breaker/monstudy_vocab_master.json?v=1.5',{cache:'force-cache'}),payload=await response.json(),source=payload?.levels||payload?.courses||payload,rows=[];
  for(const [level,items] of Object.entries(source||{})){const list=Array.isArray(items)?items:items?.words||[];for(const [i,item] of list.entries()){const word=String(item?.word||'').trim(),meaning=(Array.isArray(item?.answers)?item.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||String(item?.meaning||'').trim();if(word&&meaning)rows.push({id:level+'-'+(item.id||i),level,word,meaning});}}
  questionPool=rows;
 }catch(e){console.warn('online battle question load failed',e);questionPool=[{id:'f1',level:'junior1',word:'apple',meaning:'りんご'},{id:'f2',level:'junior1',word:'book',meaning:'本'},{id:'f3',level:'junior1',word:'water',meaning:'水'},{id:'f4',level:'junior1',word:'school',meaning:'学校'},{id:'f5',level:'junior1',word:'friend',meaning:'友だち'}];}
}

$('refreshBtn').addEventListener('click',()=>void refreshLobby());
$('backToGradesBtn').addEventListener('click',()=>showGradePicker());
gradePicker.querySelectorAll('[data-grade]').forEach(button=>button.addEventListener('click',()=>void selectGrade(button.dataset.grade)));
els.readyBtn.addEventListener('click',()=>void act('ready'));
els.retryBtn.addEventListener('click',()=>void act('continue'));
els.leaveBtn.addEventListener('click',()=>void act('leave'));
els.exitRunBtn.addEventListener('click',()=>void act('leave'));
els.magicBtn.addEventListener('click',()=>void openMagic());els.itemBtn.addEventListener('click',()=>void openItem());
els.magicClose.addEventListener('click',()=>els.magicDialog.close());els.itemClose.addEventListener('click',()=>els.itemDialog.close());

async function init(){
 try{await authReady;user=auth.currentUser;if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}await loadQuestionPool();await updateCoins();enterLobbyLayout();showGradePicker();const saved=localStorage.getItem(ROOM_STORAGE_KEY)||'';if(/^(?:4|3|pre2|2)-(?:10|[1-9])$/.test(saved)){activeRoom=saved;selectedGrade=saved.split('-')[0];await refreshRoom();}pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);roomsTimer=window.setInterval(()=>{if(!activeRoom&&selectedGrade)void refreshLobby();},15000);}catch(e){say(e.message||'初期化できませんでした。',true);}
}
window.addEventListener('pagehide',()=>{clearInterval(pollTimer);clearInterval(roomsTimer);});
init();