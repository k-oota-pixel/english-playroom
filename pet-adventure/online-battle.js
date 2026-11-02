import {auth,db,authReady,walletRef} from '../coin-reward.js?v=2.1.11';
import {getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {renderPetSVG} from '../pet-art.js?v=2.1.49';

const API='https://task-quest.onrender.com/api/online-battle';
const $=id=>document.getElementById(id);
const notice=$('notice'),roomList=$('roomList'),roomView=$('roomView'),roomsEl=$('rooms');
let user=null,activeRoom='',lastSeq=-1,pollTimer=0,coins=0,roomsTimer=0,questionPool=[],currentCard=null;
function say(message,error=false){notice.textContent=message;notice.classList.toggle('error',error);}
async function api(path,method='GET'){
 const token=await user.getIdToken();
 const response=await fetch(API+path,{method,headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},body:method==='POST'?'{}':undefined,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'通信に失敗しました。');
 return data;
}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function updateCoins(){try{const snap=await getDoc(walletRef(user));coins=Math.max(0,Math.floor(Number(snap.data()?.coins)||0));$('coinCount').textContent=coins;}catch{$('coinCount').textContent='—';}}
function roomStatus(room){if(room.status==='playing')return '対戦中';if(room.status==='finished')return '結果発表';if(room.players?.length===1)return '１人が待機中';if(room.players?.length===2)return '２人が準備中';return '空室';}
function roomRuleText(room){return '英検'+(room.grade||'4級')+' · '+(room.noItems?'魔法・アイテムなし':'魔法・アイテムあり');}
function renderRooms(list){
 roomsEl.replaceChildren();
 for(const room of list){
  const card=document.createElement('article');card.className='room-card';
  const heading=document.createElement('strong');heading.textContent='ルーム '+room.roomId;
  const rule=document.createElement('span');rule.className='room-rule';rule.textContent=roomRuleText(room);
  const state=document.createElement('span');state.className='room-state';state.textContent=roomStatus(room)+' · '+(room.players?.length||0)+'/2人';
  const btn=document.createElement('button');btn.type='button';btn.textContent='入室する';
  btn.disabled=['playing','finished'].includes(room.status)||(room.players?.length||0)>=2&&!(room.players||[]).some(p=>p.uid===user.uid);
  btn.addEventListener('click',()=>enterRoom(room.roomId));
  card.append(heading,rule,state,btn);roomsEl.append(card);
 }
}
function petArt(player){
 if(!player)return '';
 if(!player.petHatched)return '<span class="egg" role="img" aria-label="たまご">🥚</span>';
 try{return renderPetSVG(player.petAppearance,{...player.petShop,equipped:{...player.petShop?.equipped,'pet-frame':''}},player.petAdult?'adult':'baby',{background:false});}catch{return '🐾';}
}
function fighter(player,me){
 if(!player)return '<div class="fighter"><div class="waiting">相手の入室を待っています…</div></div>';
 const max=Math.max(1,Number(player.stats?.hp)||1),hp=Math.max(0,Number(player.hp)||0),percent=Math.max(0,Math.min(100,hp/max));
 return '<article class="fighter '+(me?'me':'opponent')+'" data-fighter="'+(me?'me':'opponent')+'"><div class="fighter-name">'+esc(player.petName)+'</div><div class="pet-view">'+petArt(player)+'</div><div>'+esc(player.nickname)+'</div><div class="hp-line"><div class="hp-bar" style="width:'+percent+'%"></div></div><div class="hp-text">HP '+hp+' / '+max+'</div><div class="stats">攻撃 '+Number(player.stats?.attack||1)+' · 防御 '+Number(player.stats?.defense||1)+'</div></article>';
}
function gradeLevel(grade){return ({'4級':'junior1','3級':'junior2','準2級':'junior3','2級':'high1'})[grade]||'junior1';}
function chooseCard(room){
 const rows=questionPool.filter(q=>q.level===gradeLevel(room.grade));
 const source=rows.length?rows:questionPool;
 if(!source.length)return null;
 const q=source[Math.floor(Math.random()*source.length)];
 const choices=[q.meaning,...source.filter(x=>x.meaning!==q.meaning).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.meaning)].sort(()=>Math.random()-.5);
 return {...q,choices};
}
function battlePanel(room){
 if(!currentCard)currentCard=chooseCard(room);
 if(!currentCard)return '<div class="waiting">問題を読み込んでいます…</div>';
 const cards=questionPool.filter(q=>q.level===gradeLevel(room.grade)).slice(0,4);
 const selected=currentCard?'<div class="selected-word"><span>選択した単語</span><strong>'+esc(currentCard.word)+'</strong><small>日本語の意味を選んでください</small><div class="answer-grid">'+currentCard.choices.map((choice,i)=>'<button class="answer-choice" data-answer="'+i+'">'+esc(choice)+'</button>').join('')+'</div></div>':'';
 return '<div class="attack-panel"><p class="panel-title">攻撃する単語を選んでください</p><div class="word-grid">'+cards.map(card=>'<button class="word-card" data-word="'+esc(card.id)+'"><strong>'+esc(card.word)+'</strong><small>'+esc(card.levelLabel||'')+'</small></button>').join('')+'</div>'+selected+'</div>';
}
function showResult(room){
 const fx=$('resultFx'),win=room.winnerUid===user.uid;
 $('resultMark').textContent=win?'🏆':'💫';$('resultTitle').textContent=win?'VICTORY':'BATTLE END';$('resultText').textContent=win?'勝利！ ２コイン獲得':'敗北… 次の対戦へ';
 fx.hidden=false;
 const card=fx.querySelector('.result-card');card.querySelector('[data-result-actions]')?.remove();
 const actions=document.createElement('div');actions.dataset.resultActions='';actions.className='controls';
 actions.innerHTML='<button class="primary" data-result="continue">もう一度対戦</button><button class="danger" data-result="leave">対戦を終了する</button>';
 card.append(actions);
 card.querySelector('[data-result="continue"]').addEventListener('click',()=>act('continue'));
 card.querySelector('[data-result="leave"]').addEventListener('click',()=>act('leave'));
}
function renderRoom(room){
 const mine=(room.players||[]).find(p=>p.uid===user.uid),other=(room.players||[]).find(p=>p.uid!==user.uid);
 roomList.hidden=true;roomView.hidden=false;
 const waiting=room.status==='waiting',playing=room.status==='playing',finished=room.status==='finished';
 const readyCount=(room.players||[]).filter(p=>p.ready).length,rematchCount=(room.players||[]).filter(p=>p.rematchReady).length;
 const canReady=waiting&&room.players?.length===2&&!mine?.ready;
 const waitingText=waiting?(room.players?.length<2?'相手の入室を待っています。':'２人が準備完了を押すと対戦が始まります。'):'';
 const readyLine=waiting?'<div class="count-line">準備完了 '+readyCount+'/2</div>':finished?'<div class="count-line">再戦準備 '+rematchCount+'/2</div>':'';
 roomView.innerHTML='<section class="room-panel"><div class="room-head"><div><h2>ルーム '+esc(room.roomId)+'</h2><div class="room-rule">英検'+esc(room.grade||'4級')+' · '+(room.noItems?'魔法・アイテムなし':'魔法・アイテムあり')+'</div></div><span class="room-state">'+roomStatus(room)+'</span></div><div class="duel">'+fighter(mine,true)+'<div class="versus">VS</div>'+fighter(other,false)+'</div><p class="battle-log" id="battleLog">'+esc(room.lastEvent?.type==='attack'?(room.lastEvent.from===user.uid?'正解！ 相手に'+room.lastEvent.damage+'ダメージ！':'相手の攻撃！ '+room.lastEvent.damage+'ダメージを受けた！'):room.lastEvent?.type==='miss'?(room.lastEvent.from===user.uid?'不正解… 自分に1ダメージ。':'相手が不正解。'):'')+'</p>'+readyLine+(waiting?'<div class="waiting">'+waitingText+(mine?.ready?' あなたは準備完了です。':'')+(other?.ready?' 相手は準備完了です。':'')+'</div>':'')+(playing?battlePanel(room):'')+'<div class="controls">'+(canReady?'<button class="primary" data-act="ready">準備完了</button>':'')+(finished?'<button class="primary" data-act="continue">もう一度対戦</button>':'')+((waiting||finished)?'<button class="danger" data-act="leave">対戦を終了する</button>':'')+'</div></section>';
 roomView.querySelector('[data-act="ready"]')?.addEventListener('click',()=>act('ready'));
 roomView.querySelector('[data-act="continue"]')?.addEventListener('click',()=>act('continue'));
 roomView.querySelector('[data-act="leave"]')?.addEventListener('click',()=>act('leave'));
 roomView.querySelectorAll('[data-word]').forEach(btn=>btn.addEventListener('click',()=>{const q=questionPool.find(x=>x.id===btn.dataset.word);if(q){currentCard={...q,choices:[q.meaning,...questionPool.filter(x=>x.meaning!==q.meaning).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.meaning)].sort(()=>Math.random()-.5)};renderRoom(room);}}));
 roomView.querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>{const correct=currentCard&&currentCard.choices[Number(btn.dataset.answer)]===currentCard.meaning;currentCard=null;void act(correct?'attack':'miss');}));
 if(finished&&room.seq!==lastSeq){lastSeq=room.seq;showResult(room);void updateCoins();}else if(!finished)$('resultFx').hidden=true;
 if(room.lastEvent?.type==='attack'&&room.seq!==lastSeq){lastSeq=room.seq;const target=room.lastEvent.to===user.uid?'[data-fighter="me"]':'[data-fighter="opponent"]';roomView.querySelector(target)?.classList.add('impact');}
}
async function refreshRooms(){
 try{
  const data=await api('/rooms');const list=data.rooms||[];
  const active=list.find(r=>(r.players||[]).some(p=>p.uid===user.uid)&&['waiting','playing','finished'].includes(r.status));
  if(active){activeRoom=active.roomId;await refreshRoom();return;}
  roomList.hidden=false;roomView.hidden=true;renderRooms(list);say('空いているルームを選んでください。');
 }catch(e){say(e.message,true);}
}
async function refreshRoom(){
 if(!activeRoom)return;
 try{
  const data=await api('/room/'+activeRoom);const room=data.room;
  if(!(room.players||[]).some(p=>p.uid===user.uid)){activeRoom='';$('resultFx').hidden=true;await refreshRooms();return;}
  renderRoom(room);
 }catch(e){say(e.message,true);}
}
async function enterRoom(id){
 try{say('ルームに入室しています…');const data=await api('/room/'+id+'/join','POST');activeRoom=id;lastSeq=-1;renderRoom(data.room);say('入室しました。');}
 catch(e){say(e.message,true);await refreshRooms();}
}
async function act(action){
 const button=roomView.querySelector('[data-act="'+action+'"]');if(button)button.disabled=true;
 try{const data=await api('/room/'+activeRoom+'/'+action,'POST');if(action==='leave'){activeRoom='';$('resultFx').hidden=true;await loadQuestionPool();await updateCoins();await refreshRooms();return;}renderRoom(data.room);await updateCoins();say(action==='attack'?'攻撃を処理しました。':'対戦状態を更新しました。');}
 catch(e){say(e.message,true);await refreshRoom();}
}
async function loadQuestionPool(){
 try{
  const response=await fetch('https://k-oota-pixel.github.io/word-breaker/monstudy_vocab_master.json?v=1.5',{cache:'force-cache'});
  const payload=await response.json(),source=payload?.levels||payload?.courses||payload,rows=[];
  for(const [level,items] of Object.entries(source||{})){const list=Array.isArray(items)?items:items?.words||[];for(const [i,item] of list.entries()){const word=String(item?.word||'').trim(),meaning=(Array.isArray(item?.answers)?item.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||String(item?.meaning||'').trim();if(word&&meaning)rows.push({id:level+'-'+(item.id||i),level,word,meaning,levelLabel:level});}}
  questionPool=rows;
 }catch(e){console.warn('online battle question load failed',e);questionPool=[{id:'fallback-1',level:'junior1',word:'apple',meaning:'りんご',levelLabel:'中1'},{id:'fallback-2',level:'junior1',word:'book',meaning:'本',levelLabel:'中1'},{id:'fallback-3',level:'junior1',word:'water',meaning:'水',levelLabel:'中1'},{id:'fallback-4',level:'junior1',word:'school',meaning:'学校',levelLabel:'中1'}];}
}
async function init(){
 try{
  await authReady;user=auth.currentUser;
  if(!user){say('ログインが必要です。もんすたでぃにログインしてからご利用ください。',true);return;}
  await updateCoins();await refreshRooms();
  pollTimer=window.setInterval(()=>{if(activeRoom)void refreshRoom();},2500);
  roomsTimer=window.setInterval(()=>{if(!activeRoom)void refreshRooms();},10000);
 }catch(e){say(e.message||'初期化できませんでした。',true);}
}
$('refreshBtn').addEventListener('click',()=>void refreshRooms());
init();
