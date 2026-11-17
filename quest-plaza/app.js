import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';

const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp({
 apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',
 storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',
 appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'
});
enableAppCheck(app);
const auth=getAuth(app);
const API='wss://task-quest.onrender.com/ws/quest-plaza',CELL=36;
const $=id=>document.getElementById(id);
const els={notice:$('notice'),connection:$('connection'),capacity:$('capacity'),viewport:$('viewport'),
 world:$('world'),players:$('players'),nearest:$('nearest'),modal:$('modal'),
 modalTitle:$('modal-title'),modalBody:$('modal-body'),modalActions:$('modal-actions'),
 battle:$('battle'),teams:$('battle-teams'),battleLog:$('battle-log'),grade:$('battle-grade'),
 battleClock:$('battle-clock'),battleActions:$('battle-actions'),quiz:$('quiz'),finish:$('battle-finished')};
const gradeNames={'4':'4級','3':'3級','pre2':'準2級','2':'2級'};
const spells=[
 {id:'mimuros',name:'ミムロス',level:5,kind:'heal',mp:4},
 {id:'mirogoro',name:'ミロゴロ',level:15,kind:'attack',mp:6},
 {id:'mimurose',name:'ミムローズ',level:25,kind:'heal',mp:10},
 {id:'mirogoron',name:'ミロゴロン',level:35,kind:'attack',mp:14},
 {id:'meinon',name:'メイノン',level:30,kind:'revive',mp:8},
 {id:'meinoora',name:'メイノーラ',level:45,kind:'revive',mp:20}
];
const itemNames={bandage:'🩹 ばんそうこう',medicine:'🧴 きずぐすり',
 'date-hospital-prescription':'📄 伊達医院の処方箋',
 'inter-prescription':'📄 インターの処方箋',
 'date-water':'💧 だてのみず','yoteizan-water':'🏔️ ようていざんのみず'};
let socket=null,authUser=null,clientId='',connected=false,retryTimer=null,battleState=null,battleEndAt=0,question=null;
let selectedAction={kind:'attack'},selectedTarget=0,nearbyId=null,answerPending=false,feedback='';
const players=new Map(),elements=new Map();
const button=(label,action,cls='')=>{
 const el=document.createElement('button');el.type='button';el.textContent=label;if(cls)el.className=cls;
 if(action)el.addEventListener('click',action);return el;
};
const node=(tag,content='',cls='')=>{
 const el=document.createElement(tag);el.textContent=content;if(cls)el.className=cls;return el;
};
function note(message){
 els.notice.textContent=message;
}
function send(message){
 if(!connected||!socket||socket.readyState!==WebSocket.OPEN)return false;
 socket.send(JSON.stringify(message));return true;
}
function sprite(p){
 const wrap=node('span','','avatar');
 if(!p.appearance){wrap.textContent='🥚';return wrap;}
 try{
  const appearance=p.appearance,shop={equipped:p.shop?.equipped||{}};
  wrap.innerHTML=renderPetSVG(appearance,shop,'adult',{background:false});
 }catch{wrap.textContent='🐣';}
 return wrap;
}
function putPlayer(p){
 const old=players.get(p.id),merged={...old,...p};
 players.set(p.id,merged);
 let tile=elements.get(p.id);
 if(!tile){
  tile=button('',()=>visitPlayer(p.id),'player');
  tile.dataset.id=p.id;tile.append(sprite(merged),node('span',merged.petName||merged.nickname,'name'));
  els.players.append(tile);elements.set(p.id,tile);
 }else if((old?.appearance!==merged.appearance||old?.petName!==merged.petName)&&p.appearance!==undefined){
  tile.replaceChildren(sprite(merged),node('span',merged.petName||merged.nickname,'name'));
 }
 tile.style.left=(merged.x*CELL+CELL/2)+'px';
 tile.style.top=(merged.y*CELL+CELL/2)+'px';
 tile.classList.toggle('mine',p.id===clientId);
 tile.classList.toggle('busy',merged.status==='battle');
 tile.setAttribute('aria-label',(merged.nickname||'冒険者')+' のぺっと '+(merged.petName||'ぺっと')+(merged.status==='battle'?'（対戦中）':''));
 if(p.id===clientId)centerCamera(merged.x,merged.y);
 updateNearby();
}
function removePlayer(id){
 players.delete(id);elements.get(id)?.remove();elements.delete(id);updateNearby();
}
function centerCamera(x,y){
 const view=els.viewport;
 const left=Math.max(0,Math.min(48*CELL-view.clientWidth,x*CELL+CELL/2-view.clientWidth/2));
 const top=Math.max(0,Math.min(32*CELL-view.clientHeight,y*CELL+CELL/2-view.clientHeight/2));
 view.scrollLeft=left;view.scrollTop=top;
}
function updateNearby(){
 const me=players.get(clientId);
 if(!me){nearbyId=null;return;}
 const near=[...players.values()].find(p=>p.id!==clientId&&p.status!=='battle'&&Math.abs(p.x-me.x)+Math.abs(p.y-me.y)<=1);
 nearbyId=near?.id||null;
 for(const [id,tile] of elements)tile.classList.toggle('near',id===nearbyId);
 els.nearest.replaceChildren();
 if(near){
  els.nearest.append(button('⚔ '+near.nickname+' と対戦',()=>openRequest(near.id)));
 }else els.nearest.textContent='近くのプレイヤーを探そう';
}
function initDecor(){
 const root=$('decorations');
 const placements=[
  ...[[1,1],[4,1],[7,2],[41,1],[45,2],[2,27],[6,29],[43,28],[46,27],
   [1,9],[1,19],[46,8],[46,21],[10,1],[37,1],[11,30],[38,30]].map(([x,y])=>[x,y,'🌳','tree']),
  ...[[17,2],[19,3],[28,3],[29,29],[18,29],[35,29],[8,10],[39,11],[39,23],[8,23]].map(([x,y])=>[x,y,'🌸','flower']),
  ...[[17,12],[28,19],[29,12],[17,20]].map(([x,y])=>[x,y,'🪑','bench'])
 ];
 for(const [x,y,emoji,cls] of placements){
  const el=node('span',emoji,'decoration '+cls);el.style.left=(x*CELL)+'px';el.style.top=(y*CELL)+'px';root.append(el);
 }
}
function openModal(title,body,actions){
 els.modalTitle.textContent=title;els.modalBody.replaceChildren(...body);els.modalActions.replaceChildren(...actions);els.modal.hidden=false;
}
function closeModal(){els.modal.hidden=true;}
function openRequest(id){
 const p=players.get(id),me=players.get(clientId);
 if(!p||!me||p.status==='battle'||Math.abs(p.x-me.x)+Math.abs(p.y-me.y)>1){
  note('相手の隣のマスまで近づいてください。');return;
 }
 const lead=node('p',p.nickname+' に英語問題の級を指定して対戦申請します。');
 const group=node('div','','grade-grid');let first=null;
 for(const [value,label] of Object.entries(gradeNames)){
  const row=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='request-grade';input.value=value;
  if(!first){input.checked=true;first=input;}
  row.append(input,node('span','英検'+label));group.append(row);
 }
 openModal('対戦を申し込む',[lead,group],[
  button('キャンセル',closeModal),
  button('この級で申請',()=>{
   const grade=els.modalBody.querySelector('input[name="request-grade"]:checked')?.value||'4';
   if(send({type:'invite',to:id,grade}))note('対戦申請を送信しました。');
   closeModal();
  },'primary')
 ]);
}
function visitPlayer(id){
 if(id===clientId)return;
 openRequest(id);
}
function showInvite(message){
 if(!players.has(message.from))return;
 openModal('対戦の申し込み',[
  node('p',message.nickname+' から対戦を申し込まれました。'),
  node('p','問題の級：英検'+(gradeNames[message.grade]||message.grade)),
  node('p','承認すると現在のもんすたクエスト編成で戦います。')
 ],[
  button('断る',()=>{send({type:'respond',from:message.from,accept:false});closeModal();}),
  button('承認する',()=>{send({type:'respond',from:message.from,accept:true});closeModal();},'primary')
 ]);
 const delay=Math.max(0,Math.min(10000,message.expires-Date.now()));
 setTimeout(()=>{if(!els.modal.hidden&&els.modalTitle.textContent==='対戦の申し込み')closeModal();},delay);
}
function paintTeam(team,mine){
 const section=node('section','','team');section.append(node('h3',team.nickname+(mine?'（自分）':'（相手）')));
 const units=node('div','','unit-row');
 team.units.forEach((unit,index)=>{
  const tile=button('',()=>{if(!mine){selectedTarget=index;drawTeams();}},'battle-unit');
  if(!mine&&selectedTarget===index)tile.classList.add('picked');
  if(unit.hp===0)tile.classList.add('dead');
  if(index===0){
   const p=players.get(team.id);const wrap=node('span','','battle-pet');
   if(p?.appearance){try{wrap.innerHTML=renderPetSVG(p.appearance,{equipped:p.shop?.equipped||{}},'adult',{background:false});}catch{wrap.textContent='🐣';}}
   else wrap.textContent='🥚';
   tile.append(wrap);
  }else{
   const image=document.createElement('img');image.src='../monster-maze/art/card-'+unit.id+'.webp';
   image.alt='';image.loading='lazy';tile.append(image);
  }
  tile.append(node('strong',unit.name));
  const meter=node('div','','meter'),fill=node('span');fill.style.width=Math.max(0,unit.hp/Math.max(unit.maxHp,1)*100)+'%';
  meter.append(fill);tile.append(meter,node('small',unit.hp+'/'+unit.maxHp));
  if(unit.maxMp>0)tile.append(node('small','MP '+unit.mp+'/'+unit.maxMp));
  if(mine&&unit.rarity>0&&unit.role===0)tile.append(node('small','CT '+Math.ceil(unit.ct||0)));
  if(mine)tile.disabled=true;
  units.append(tile);
 });
 section.append(units);return section;
}
function drawTeams(){
 if(!battleState)return;
 const own=battleState.teams.find(t=>t.id===clientId),foe=battleState.teams.find(t=>t.id!==clientId);
 if(!own||!foe)return;
 els.teams.replaceChildren(paintTeam(own,true),paintTeam(foe,false));
 els.battleLog.textContent=battleState.log.slice(-2).join('　｜　')+(feedback?'　｜　'+feedback:'');
 els.grade.textContent='英検'+(gradeNames[battleState.grade]||battleState.grade);
 if(!question||answerPending)return;
 drawActions();
}
function selectAction(action){selectedAction=action;drawActions();}
function drawActions(){
 if(!battleState||!question)return;
 const own=battleState.teams.find(t=>t.id===clientId);if(!own)return;
 const wrap=els.battleActions;wrap.replaceChildren();
 const attack=button('⚔ 通常攻撃',()=>selectAction({kind:'attack'}));
 attack.setAttribute('aria-pressed',String(selectedAction.kind==='attack'));wrap.append(attack);
 const spellOwnerAllowed=(u,s)=>{
  if(u.hp<=0||u.mp<s.mp)return false;
  if(u.role===-1)return (u.level||1)>=s.level;
  if(u.role===0)return false;
  if(u.role===1)return ['mirogoro',...(u.rarity>=2?['mirogoron']:[])].includes(s.id);
  return ['mimuros',...(u.rarity>=2?['mimurose','meinon']:[]),...(u.rarity>=3?['meinoora']:[])].includes(s.id);
 };
 own.units.forEach((unit,i)=>{
  for(const s of spells){
   if(!spellOwnerAllowed(unit,s))continue;
   const label=(i===0?'ぺっと':unit.name)+' '+s.name+' (MP'+s.mp+')';
   const el=button(label,()=>selectAction({kind:'magic',owner:i,spell:s.id}));
   el.setAttribute('aria-pressed',String(selectedAction.kind==='magic'&&selectedAction.owner===i&&selectedAction.spell===s.id));
   wrap.append(el);
  }
  if(i>0&&unit.role===0&&unit.rarity>0&&unit.hp>0&&unit.ct<=0){
   const el=button('★ '+unit.name+' 特技',()=>selectAction({kind:'attack',special:unit.key}));
   el.setAttribute('aria-pressed',String(selectedAction.special===unit.key));
   wrap.append(el);
  }
 });
 for(const [id,count] of Object.entries(battleState.inventory||{})){
  if(!itemNames[id]||count<1)continue;
  const tile=button(itemNames[id]+' ×'+count,()=>send({type:'item',id}));
  tile.setAttribute('aria-label',itemNames[id]+' 使用。残り'+count+'個');
  wrap.append(tile);
 }
}
function showQuiz(q){
 question=q;answerPending=false;
 const box=els.quiz;box.replaceChildren();
 const title=node('small',q.label+' · 残り時間 ');
 const remaining=node('span','','countdown');remaining.id='quiz-time';title.append(remaining);
 box.append(title,node('h3',q.prompt));
 const message=node('p','','quiz-feedback');message.id='quiz-feedback';box.append(message);
 if(q.kind==='ordering'){
  const picked=[],chosen=node('div','','order-chosen'),tiles=node('div','','word-tiles');
  const submit=button('この語順で解答',()=>answer(picked.map(x=>x.text).join(' ')),'order-submit');
  function render(){
   chosen.replaceChildren();tiles.replaceChildren();
   for(const part of picked)chosen.append(button(part.text,()=>{const index=picked.indexOf(part);if(index>=0)picked.splice(index,1);render();}));
   for(const part of q.tokens||[]){
    const item=button(part.text,()=>{picked.push(part);render();});
    item.disabled=picked.some(v=>v.id===part.id);tiles.append(item);
   }
   submit.disabled=picked.length!==(q.tokens||[]).length||answerPending;
  }
  render();box.append(chosen,tiles,submit);
 }else{
  const choiceBox=node('div','','choices');
  for(const option of q.options||[])choiceBox.append(button(option,()=>answer(option)));
  box.append(choiceBox);
 }
 drawActions();
}
function answer(value){
 if(!question||answerPending)return;
 const q=question;answerPending=true;feedback='';
 const request={type:'answer',seq:q.seq,value,target:selectedTarget,action:{...selectedAction,target:selectedTarget}};
 if(!send(request)){answerPending=false;note('通信が切れています。再接続します。');return;}
 for(const b of els.quiz.querySelectorAll('button'))b.disabled=true;
 const msg=$('quiz-feedback');if(msg)msg.textContent='判定中…';
}
function startBattle(data){
 closeModal();els.battle.hidden=false;els.finish.hidden=true;els.quiz.hidden=false;els.battleActions.hidden=false;
 els.grade.textContent='英検'+(gradeNames[data.grade]||data.grade);
 els.quiz.replaceChildren(node('p','対戦問題を読み込んでいます…'));
 selectedAction={kind:'attack'};selectedTarget=0;question=null;answerPending=false;battleState=null;
}
function updateClock(){
 if(els.battle.hidden||!battleEndAt)return;
 const seconds=Math.max(0,Math.ceil((battleEndAt-Date.now())/1000));
 els.battleClock.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 if(question){
  const timer=$('quiz-time');
  if(timer)timer.textContent=Math.max(0,Math.ceil((question.deadline-Date.now())/1000))+'秒';
 }
}
function battleFinished(message){
 question=null;answerPending=true;els.finish.hidden=false;els.quiz.hidden=true;els.battleActions.hidden=true;
 $('battle-outcome').textContent=(message.winner===clientId?'勝利！':message.winner?'敗北':'引き分け')+'　'+message.reason;
}
$('back-to-plaza').addEventListener('click',()=>{
 els.battle.hidden=true;els.quiz.hidden=false;els.battleActions.hidden=false;els.finish.hidden=true;
 battleState=null;question=null;selectedAction={kind:'attack'};updateNearby();
});
function receive(message){
 switch(message.type){
  case 'welcome':
   clientId=message.self;closeModal();els.battle.hidden=true;els.finish.hidden=true;battleState=null;question=null;answerPending=false;players.clear();
   for(const tile of elements.values())tile.remove();elements.clear();
   for(const p of message.players||[])putPlayer(p);
   els.capacity.textContent=players.size+' / '+message.maxPlayers+' 人';
   els.connection.classList.add('connected');els.connection.textContent='● 接続中';
   note('広場に接続しました。ほかのプレイヤーに近づいてみよう。');
   return;
  case 'statuses':
   for(const p of message.players||[])putPlayer(p);
   els.capacity.textContent=players.size+' / 40 人';
   return;
  case 'positions':
   for(const [id,x,y] of message.positions||[]){
    const p=players.get(id);if(p)putPlayer({...p,x,y});
   }
   return;
  case 'left':
   removePlayer(message.id);els.capacity.textContent=players.size+' / 40 人';return;
  case 'notice':note(message.message||'');return;
  case 'error':note(message.message||'接続できませんでした。');return;
  case 'invite':showInvite(message);return;
  case 'battleStart':startBattle(message);return;
  case 'battleState':battleState=message;battleEndAt=Date.now()+message.remaining;drawTeams();updateClock();return;
  case 'question':showQuiz(message);return;
  case 'feedback':
   feedback=message.correct?'正解！ 攻撃・行動成功':'不正解！ 味方全員に10％ダメージ';
   feedback+='　正解：'+message.answer;
   note(feedback);if(battleState)drawTeams();return;
  case 'battleEnd':battleFinished(message);return;
 }
}
async function connect(){
 if(!authUser)return;
 try{
  const token=await authUser.getIdToken();
  const ws=new WebSocket(API);socket=ws;connected=false;
  els.connection.classList.remove('connected');els.connection.textContent='接続中…';
  ws.addEventListener('open',()=>{if(socket!==ws)return;connected=true;send({type:'auth',token});});
  ws.addEventListener('message',event=>{
   if(socket!==ws)return;
   try{receive(JSON.parse(event.data));}catch(error){console.error('Quest plaza message error',error);}
  });
  ws.addEventListener('close',()=>{
   if(socket!==ws)return;
   connected=false;els.connection.classList.remove('connected');els.connection.textContent='再接続中…';
   note('通信が切れました。再接続します。');
   clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(authUser)void connect();},2500);
  });
  ws.addEventListener('error',()=>{note('オンライン広場への通信が不安定です。');});
 }catch(error){note('通信を開始できませんでした。'+error.message);}
}
function move(dx,dy){
 if(!connected||!clientId||!els.battle.hidden||!els.modal.hidden||!$('formation-panel').hidden)return;
 if(Date.now()-(move.last||0)<250)return;
 move.last=Date.now();send({type:'move',dx,dy});
}
const keys={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0],
 KeyW:[0,-1],KeyD:[1,0],KeyS:[0,1],KeyA:[-1,0]};
document.addEventListener('keydown',event=>{
 const direction=keys[event.code]||keys[event.key];
 if(!direction||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||
    event.target?.closest?.('input,textarea,select,[contenteditable]'))return;
 if(!els.battle.hidden||!els.modal.hidden||!$('formation-panel').hidden)return;
 event.preventDefault();move(...direction);
});
for(const pad of document.querySelectorAll('.pad button')){
 let timer;
 const stop=()=>{clearInterval(timer);timer=null;};
 pad.addEventListener('pointerdown',event=>{
  event.preventDefault();pad.setPointerCapture?.(event.pointerId);
  move(Number(pad.dataset.dx),Number(pad.dataset.dy));
  stop();timer=setInterval(()=>move(Number(pad.dataset.dx),Number(pad.dataset.dy)),275);
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,stop);
}
$('formation').addEventListener('click',()=>{
 if(!clientId||!connected)return note('広場に接続してから編成してください。');
 if(!els.battle.hidden)return note('対戦中は編成を変更できません。');
 $('formation-frame').src='../monster-maze/?screen=collection&embed=1';
 $('formation-panel').hidden=false;
});
$('close-formation').addEventListener('click',()=>{
 const frame=$('formation-frame');
 try{
  if(frame.contentWindow?.MonstudyMaterial?.isActive?.()&&!confirm('未保存の編成・強化があります。保存せずに広場へ戻りますか？'))return;
 }catch{}
 $('formation-panel').hidden=true;frame.src='about:blank';send({type:'refresh'});
});
window.addEventListener('resize',()=>{
 const p=players.get(clientId);if(p)centerCamera(p.x,p.y);
});
window.addEventListener('pagehide',()=>{clearTimeout(retryTimer);socket?.close(1000,'leaving');});
setInterval(updateClock,150);
initDecor();
onAuthStateChanged(auth,async user=>{
 if(!user){note('ログインが必要です。');return;}
 try{await accountSession(user);authUser=user;void connect();}
 catch(error){note('ログイン情報を確認できませんでした。'+error.message);}
},error=>note(error?.message||'ログインを確認できませんでした。'));
