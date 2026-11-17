import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';
import {clampCamera,centeredCamera,followCamera,flingTarget} from './camera-math.js?v=2.5.23';

const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp({
 apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',
 storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',
 appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'
});
enableAppCheck(app);
const auth=getAuth(app);
const API='wss://task-quest.onrender.com/ws/quest-plaza',CELL=36;
const WORLD_WIDTH=48*CELL,WORLD_HEIGHT=32*CELL;
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
let selectedAction={kind:'attack'},selectedTab='attack',selectedCasterIndex=0,selectedTarget=0,selectedReviveTarget=-1,
 nearbyId=null,answerPending=false,feedback='';
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
// Don't draw the shop pet frame in the plaza, but preserve owned visual effects.
function plazaShop(p){
 const equipped={...(p.shop?.equipped||{})};
 delete equipped['pet-frame'];
 return {equipped,ownedItems:Array.isArray(p.shop?.ownedItems)?p.shop.ownedItems:[]};
}
function sprite(p){
 const wrap=node('span','','avatar');
 if(!p.hatched){wrap.textContent='🥚';return wrap;}
 try{
  const juvenile=p.adult===false||!p.appearance;
  wrap.innerHTML=renderPetSVG(juvenile?null:p.appearance,plazaShop(p),juvenile?'baby':'adult',{background:false});
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
 }else if((old?.appearance!==merged.appearance||old?.petName!==merged.petName||old?.hatched!==merged.hatched||old?.adult!==merged.adult||old?.shop!==merged.shop)&&p.appearance!==undefined){
  tile.replaceChildren(sprite(merged),node('span',merged.petName||merged.nickname,'name'));
 }
 tile.style.left=(merged.x*CELL+CELL/2)+'px';
 tile.style.top=(merged.y*CELL+CELL/2)+'px';
 tile.classList.toggle('mine',p.id===clientId);
 tile.classList.toggle('busy',merged.status==='battle');
 tile.setAttribute('aria-label',(merged.nickname||'冒険者')+' のぺっと '+(merged.petName||'ぺっと')+(merged.status==='battle'?'（対戦中）':''));
 if(p.id===clientId&&camera.ready&&old&&(merged.x!==old.x||merged.y!==old.y))followMyPet(merged.x,merged.y);
 updateNearby();
}
function removePlayer(id){
 players.delete(id);elements.get(id)?.remove();elements.delete(id);updateNearby();
}
// Camera moves independently of the pet. Most steps only animate the pet tile.
const camera={ready:false,manual:false,left:0,top:0,frame:0,lastFrame:0,inertiaFrame:0};
const prefersLessMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
function stopCamera(){
 if(camera.frame)cancelAnimationFrame(camera.frame);
 if(camera.inertiaFrame)cancelAnimationFrame(camera.inertiaFrame);
 camera.frame=0;camera.inertiaFrame=0;camera.lastFrame=0;
}
function cameraStep(now){
 camera.frame=0;
 const elapsed=camera.lastFrame?Math.min(45,now-camera.lastFrame):16;
 camera.lastFrame=now;
 const view=els.viewport,alpha=1-Math.exp(-elapsed/95);
 const dx=camera.left-view.scrollLeft,dy=camera.top-view.scrollTop;
 if(Math.abs(dx)<.6&&Math.abs(dy)<.6){
  view.scrollLeft=camera.left;view.scrollTop=camera.top;
  camera.lastFrame=0;return;
 }
 view.scrollLeft+=dx*alpha;view.scrollTop+=dy*alpha;
 camera.frame=requestAnimationFrame(cameraStep);
}
function setCamera(left,top,immediate=false){
 // A recenter or auto-follow interrupts any still-running swipe inertia.
 if(camera.inertiaFrame){cancelAnimationFrame(camera.inertiaFrame);camera.inertiaFrame=0;}
 const view=els.viewport;
 const next=clampCamera(left,top,view.clientWidth,view.clientHeight,WORLD_WIDTH,WORLD_HEIGHT);
 camera.left=next.left;camera.top=next.top;
 if(immediate||prefersLessMotion){
  stopCamera();view.scrollLeft=next.left;view.scrollTop=next.top;
  return;
 }
 if(!camera.frame)camera.frame=requestAnimationFrame(cameraStep);
}
function followMyPet(x,y){
 if(!camera.ready||camera.manual)return;
 const view=els.viewport;
 const next=followCamera(x*CELL+CELL/2,y*CELL+CELL/2,
  camera.left,camera.top,view.clientWidth,view.clientHeight,WORLD_WIDTH,WORLD_HEIGHT);
 if(next.left!==camera.left||next.top!==camera.top)setCamera(next.left,next.top);
}
function returnToMyPet(immediate=false){
 const player=players.get(clientId);
 if(!player)return;
 camera.manual=false;
 const view=els.viewport;
 const target=centeredCamera(player.x*CELL+CELL/2,player.y*CELL+CELL/2,
  view.clientWidth,view.clientHeight,WORLD_WIDTH,WORLD_HEIGHT);
 camera.ready=true;
 setCamera(target.left,target.top,immediate);
}
// Momentum is local viewport motion only; no positional network updates.
function animateFling(target){
 stopCamera();
 const view=els.viewport;
 const startLeft=view.scrollLeft,startTop=view.scrollTop;
 const leftDelta=target.left-startLeft,topDelta=target.top-startTop;
 if(Math.abs(leftDelta)<1&&Math.abs(topDelta)<1)return;
 const started=performance.now(),duration=480;
 const frame=now=>{
  const progress=Math.min(1,Math.max(0,(now-started)/duration));
  const eased=1-Math.pow(1-progress,3);
  view.scrollLeft=startLeft+leftDelta*eased;
  view.scrollTop=startTop+topDelta*eased;
  if(progress<1)camera.inertiaFrame=requestAnimationFrame(frame);
  else{camera.inertiaFrame=0;view.scrollLeft=target.left;view.scrollTop=target.top;}
 };
 camera.inertiaFrame=requestAnimationFrame(frame);
}
// Pan with mouse or touch; only moves beyond a click threshold count as dragging.
let drag=null,suppressPlayerClickUntil=0;
els.viewport.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'&&event.button!==0)return;
 if(drag||!els.modal.hidden||!els.battle.hidden||!$('formation-panel').hidden)return;
 // New touches stop the previous fling immediately instead of jumping.
 if(camera.inertiaFrame){
  stopCamera();camera.left=els.viewport.scrollLeft;camera.top=els.viewport.scrollTop;
 }
 drag={id:event.pointerId,x:event.clientX,y:event.clientY,
  left:els.viewport.scrollLeft,top:els.viewport.scrollTop,
  pointerType:event.pointerType,scale:event.pointerType==='touch'?1.85:1,
  samples:[{x:event.clientX,y:event.clientY,t:performance.now()}],active:false};
});
els.viewport.addEventListener('pointermove',event=>{
 if(!drag||drag.id!==event.pointerId)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
 if(!drag.active&&Math.hypot(dx,dy)<9)return;
 if(!drag.active){
  drag.active=true;camera.manual=true;stopCamera();
  els.viewport.classList.add('is-panning');
  try{els.viewport.setPointerCapture(event.pointerId);}catch{}
 }
 event.preventDefault();
 const now=performance.now();
 drag.samples.push({x:event.clientX,y:event.clientY,t:now});
 // Keep only the last ~100ms to estimate the speed of a short flick.
 while(drag.samples.length>2&&drag.samples[1].t<now-100)drag.samples.shift();
 const next=clampCamera(drag.left-dx*drag.scale,drag.top-dy*drag.scale,
  els.viewport.clientWidth,els.viewport.clientHeight,WORLD_WIDTH,WORLD_HEIGHT);
 camera.left=next.left;camera.top=next.top;
 els.viewport.scrollLeft=next.left;els.viewport.scrollTop=next.top;
});
function finishDrag(event){
 if(!drag||(event&&drag.id!==event.pointerId))return;
 if(drag.active){
  suppressPlayerClickUntil=performance.now()+450;
  if(event?.type==='pointerup'&&drag.pointerType==='touch'&&!prefersLessMotion){
   const samples=drag.samples,first=samples[0],last=samples.at(-1);
   // Holding still before lifting must not start a delayed fling.
   if(last&&performance.now()-last.t<85){
    const ms=Math.max(16,last.t-first.t);
    const vx=-(last.x-first.x)*drag.scale/ms;
    const vy=-(last.y-first.y)*drag.scale/ms;
    const v=els.viewport;
    const target=flingTarget(v.scrollLeft,v.scrollTop,vx,vy,
     v.clientWidth,v.clientHeight,WORLD_WIDTH,WORLD_HEIGHT);
    camera.left=target.left;camera.top=target.top;
    animateFling(target);
   }
  }
 }
 drag=null;els.viewport.classList.remove('is-panning');
}
els.viewport.addEventListener('pointerup',finishDrag);
els.viewport.addEventListener('pointercancel',finishDrag);
els.viewport.addEventListener('lostpointercapture',finishDrag);
els.viewport.addEventListener('click',event=>{
 if(performance.now()>=suppressPlayerClickUntil)return;
 event.preventDefault();event.stopImmediatePropagation();
},true);
$('recenter-camera').addEventListener('click',()=>returnToMyPet());
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
// Reuse the Monster Quest unit structure/classes so the same card effects,
 // rarity badges, HP/MP meters and energy projectile language carry into PvP.
function paintTeam(team,mine){
 const section=node('section','','team '+(mine?'team-mine':'team-foe'));
 section.append(node('h3',(mine?'自分の編成：':'対戦相手：')+team.nickname));
 const units=node('div','','unit-row');
 team.units.forEach((unit,index)=>{
  const tile=button('',()=>{
   if(!mine&&unit.hp>0){selectedTarget=index;drawTeams();}
  },'unit battle-unit');
  tile.dataset.player=team.id;
  tile.dataset.unitIndex=String(index);
  if(!mine&&selectedTarget===index)tile.classList.add('picked');
  if(unit.hp===0)tile.classList.add('dead');
  if(index===0){
   tile.classList.add('party-pet');
   const p=players.get(team.id),wrap=node('span','','battle-pet');
   if(p?.hatched){
    try{
     const juvenile=p.adult===false||!p.appearance;
     wrap.innerHTML=renderPetSVG(juvenile?null:p.appearance,
      plazaShop(p),juvenile?'baby':'adult',{background:false});
    }catch{wrap.textContent='🐣';}
   }else wrap.textContent='🥚';
   tile.append(wrap);
  }else{
   const rarity=['n','r','sr','ssr'][unit.rarity]||'n';
   tile.classList.add('ranked-card','rarity-'+rarity);
   tile.append(node('span',rarity.toUpperCase(),'card-rank'));
   const art=node('span','','card-art'),image=document.createElement('img');
   image.src='../monster-maze/art/card-'+unit.id+'.webp'+([1,6].includes(unit.id)?'?v=2':'');
   image.alt='';image.decoding='async';art.append(image);tile.append(art);
  }
  tile.append(node('strong',unit.name));
  const meter=node('span','','hp-meter'),fill=node('span','','hp-fill');
  fill.style.transform='scaleX('+Math.max(0,unit.hp/Math.max(1,unit.maxHp))+')';
  meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',unit.name+' HP');
  meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(unit.maxHp));
  meter.setAttribute('aria-valuenow',String(unit.hp));
  meter.append(fill);tile.append(meter,node('small',unit.hp+' / '+unit.maxHp,'battle-hp'));
  if(unit.maxMp>0){
   const mpMeter=node('span','','mp-meter'),mpFill=node('span','','mp-fill');
   mpFill.style.transform='scaleX('+Math.max(0,unit.mp/Math.max(1,unit.maxMp))+')';
   mpMeter.setAttribute('role','progressbar');mpMeter.setAttribute('aria-label',unit.name+' MP');
   mpMeter.setAttribute('aria-valuemin','0');mpMeter.setAttribute('aria-valuemax',String(unit.maxMp));
   mpMeter.setAttribute('aria-valuenow',String(unit.mp));mpMeter.append(mpFill);
   tile.append(mpMeter,node('small','MP '+unit.mp+' / '+unit.maxMp,'battle-mp'));
  }
  if(unit.role===0&&unit.rarity>0)tile.append(node('small','特技 · CT '+Math.ceil(unit.ct||0),'battle-ct'));
  tile.disabled=mine||unit.hp===0;
  units.append(tile);
 });
 section.append(units);return section;
}
function drawTeams(){
 if(!battleState)return;
 const own=battleState.teams.find(t=>t.id===clientId),foe=battleState.teams.find(t=>t.id!==clientId);
 if(!own||!foe)return;
 if(!foe.units[selectedTarget]||foe.units[selectedTarget].hp<=0)selectedTarget=foe.units.findIndex(u=>u.hp>0);
 els.teams.replaceChildren(paintTeam(foe,false),paintTeam(own,true));
 els.battleLog.textContent=battleState.log.slice(-3).join('　｜　')+(feedback?'　｜　'+feedback:'');
 els.grade.textContent='英検'+(gradeNames[battleState.grade]||battleState.grade);
 if(question&&!answerPending)drawActions();
}
const spellKnown=(u,s)=>{
 if(u.role===-1)return (u.level||1)>=s.level;
 if(u.role===0)return false;
 if(u.role===1)return ['mirogoro',...(u.rarity>=2?['mirogoron']:[])].includes(s.id);
 return ['mimuros',...(u.rarity>=2?['mimurose','meinon']:[]),...(u.rarity>=3?['meinoora']:[])].includes(s.id);
};
function setBattleTab(tab){
 if(!['attack','magic','items'].includes(tab))return;
 selectedTab=tab;
 if(tab!=='magic')selectedAction={kind:'attack'};
 drawActions();
}
for(const tabButton of document.querySelectorAll('[data-battle-tab]')){
 tabButton.addEventListener('click',()=>setBattleTab(tabButton.dataset.battleTab));
}
function selectAction(action){
 selectedAction=action;
 selectedTab=action.kind==='magic'?'magic':'attack';
 if(action.spell==='meinon'||action.spell==='meinoora'){
  const own=battleState?.teams.find(t=>t.id===clientId);
  if(!own?.units[selectedReviveTarget]||own.units[selectedReviveTarget].hp>0)
   selectedReviveTarget=own?.units.findIndex(u=>u.hp===0)??-1;
 }
 drawActions();
}
function drawActions(){
 if(!battleState||!question)return;
 const own=battleState.teams.find(t=>t.id===clientId);
 if(!own)return;
 const wrap=els.battleActions;wrap.replaceChildren();
 for(const tab of document.querySelectorAll('[data-battle-tab]')){
  tab.setAttribute('aria-pressed',String(tab.dataset.battleTab===selectedTab));
 }
 const summary=$('battle-action-hint');
 const addOption=(container,label,action,chosen=false,disabled=false)=>{
  const el=button(label,action);
  el.disabled=disabled;
  el.setAttribute('aria-pressed',String(chosen));
  container.append(el);return el;
 };
 if(selectedTab==='attack'){
  addOption(wrap,'⚔ 通常攻撃',()=>selectAction({kind:'attack'}),
   selectedAction.kind==='attack'&&!selectedAction.special);
  const specials=own.units.filter((u,i)=>i>0&&u.role===0&&u.rarity>0&&u.hp>0);
  for(const unit of specials){
   addOption(wrap,'★ '+unit.name+'の特技 · CT '+Math.ceil(unit.ct||0),
    ()=>selectAction({kind:'attack',special:unit.key}),
    selectedAction.special===unit.key,unit.ct>0);
  }
  summary.textContent=selectedAction.special?'特技を選択中。正解すると発動します。':'通常攻撃を選択中。正解すると攻撃します。';
 }else if(selectedTab==='magic'){
  // Select a single caster, just as Quest exposes one spell picker at a time.
  // Fallen pets may be revived by living companions, so include index 0.
  const fallen=own.units.map((u,i)=>({u,i})).filter(({u})=>u.hp===0);
  const casters=own.units.map((u,i)=>({u,i,known:spells.filter(s=>spellKnown(u,s))}))
   .filter(({known,u})=>u.hp>0&&known.length);
  if(!casters.length){
   wrap.append(node('p','魔法を使用できるキャラクターがいません。'));
  }else{
   if(!casters.some(row=>row.i===selectedCasterIndex))
    selectedCasterIndex=selectedAction.kind==='magic'&&casters.some(row=>row.i===selectedAction.owner)
     ?selectedAction.owner:casters[0].i;
   const picker=node('div','','caster-options');
   for(const {u,i} of casters){
    addOption(picker,u.name+' · MP '+u.mp+'/'+u.maxMp,()=>{
     selectedCasterIndex=i;
     if(selectedAction.kind==='magic'&&selectedAction.owner!==i)selectedAction={kind:'attack'};
     drawActions();
    },selectedCasterIndex===i);
   }
   wrap.append(picker);
   const caster=casters.find(row=>row.i===selectedCasterIndex);
   const spellRow=node('div','','spell-options');
   for(const spell of caster.known){
    const revive=spell.kind==='revive';
    const usable=caster.u.mp>=spell.mp&&(!revive||fallen.length>0);
    const suffix=!usable?(revive&&!fallen.length?' · 蘇生対象なし':' · MP不足'):'';
    addOption(spellRow,spell.name+' · '+spell.mp+'MP'+suffix,
      ()=>selectAction({kind:'magic',owner:caster.i,spell:spell.id}),
      selectedAction.kind==='magic'&&selectedAction.owner===caster.i&&selectedAction.spell===spell.id,
      !usable);
   }
   wrap.append(spellRow);
   if(selectedAction.kind==='magic'&&selectedAction.owner===caster.i&&
      ['meinon','meinoora'].includes(selectedAction.spell)&&fallen.length){
    const targets=node('div','','revive-options');
    targets.append(node('span','蘇生：','caster-hint'));
    for(const {u,i} of fallen){
     addOption(targets,u.name+'（HP 0）',()=>{selectedReviveTarget=i;drawActions();},selectedReviveTarget===i);
    }
    wrap.append(targets);
   }
  }
  summary.textContent=selectedAction.kind==='magic'
   ?'選択した魔法は正解時に発動（選択対象も反映）。'
   :'使用者と魔法を選択。未選択なら通常攻撃。';
 }else{
  for(const [id,count] of Object.entries(battleState.inventory||{})){
   if(!itemNames[id]||count<1)continue;
   addOption(wrap,itemNames[id]+' ×'+count,()=>{
    if(send({type:'item',id}))note(itemNames[id]+' を使います。');
   });
  }
  if(!wrap.childElementCount)wrap.append(node('p','使用できるアイテムがありません。'));
  summary.textContent='アイテムは押した時点で使用。英語問題の解答は続けられます。';
 }
}
// Copy the original Quest's animated energy orb trajectory. The server decides
// which attack actually happened; clients only animate an authoritative event.
function playBattleEffect(event){
 if(els.battle.hidden||!event)return;
 const tiles=[...els.teams.querySelectorAll('.battle-unit')];
 const lookup=(uid,i)=>tiles.find(el=>el.dataset.player===uid&&el.dataset.unitIndex===String(i));
 const flash=(el,cls)=>{
  if(!el)return;
  el.classList.remove('taking-hit','being-healed');
  void el.offsetWidth;el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls),450);
 };
 if(event.kind==='mistake'){
  for(const tile of tiles.filter(el=>el.dataset.player===event.actor))flash(tile,'taking-hit');
  return;
 }
 const source=lookup(event.actor,event.sourceIndex);
 const receiver=lookup(event.receiver,event.targetIndex);
 if(!source||!receiver)return;
 const healing=['heal','revive','guard'].includes(event.kind);
 if(healing)flash(receiver,'being-healed');
 else flash(receiver,'taking-hit');
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
 const fx=$('battle-fx');
 const orb=node('span','','battle-energy energy-'+event.kind);
 const base=fx.getBoundingClientRect(),from=source.getBoundingClientRect(),to=receiver.getBoundingClientRect();
 const x=from.left+from.width/2-base.left,y=from.top+from.height*.35-base.top;
 const dx=to.left+to.width/2-base.left-x,dy=to.top+to.height*.48-base.top-y;
 orb.style.left=x+'px';orb.style.top=y+'px';fx.append(orb);
 if(typeof orb.animate!=='function'){orb.remove();return;}
 orb.animate([
  {opacity:.25,transform:'translate(-50%,-50%) scale(.25)'},
  {opacity:1,transform:'translate(-50%,-50%) scale(1.15)',offset:.42},
  {opacity:1,transform:'translate(-50%,-50%) translate('+dx+'px,'+dy+'px) scale(.75)'}
 ],{duration:390,easing:'ease-in-out'}).finished.catch(()=>{}).finally(()=>orb.remove());
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
 const request={type:'answer',seq:q.seq,value,action:{...selectedAction,target:selectedTarget,reviveTarget:selectedReviveTarget}};
 if(!send(request)){answerPending=false;note('通信が切れています。再接続します。');return;}
 for(const b of els.quiz.querySelectorAll('button'))b.disabled=true;
 const msg=$('quiz-feedback');if(msg)msg.textContent='判定中…';
}
function startBattle(data){
 closeModal();els.battle.hidden=false;els.finish.hidden=true;els.quiz.hidden=false;els.battleActions.hidden=false;
 els.grade.textContent='英検'+(gradeNames[data.grade]||data.grade);
 els.quiz.replaceChildren(node('p','対戦問題を読み込んでいます…'));
 selectedAction={kind:'attack'};selectedTab='attack';selectedCasterIndex=0;selectedReviveTarget=-1;
 selectedTarget=0;question=null;answerPending=false;battleState=null;feedback='';
 $('battle-tabs').hidden=false;$('battle-action-hint').hidden=false;
 $('battle-forfeit').hidden=false;$('battle-forfeit').disabled=false;
 $('battle-fx').replaceChildren();
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
 $('battle-tabs').hidden=true;$('battle-action-hint').hidden=true;$('battle-forfeit').hidden=true;
 $('battle-outcome').textContent=(message.winner===clientId?'勝利！':message.winner?'敗北':'引き分け')+'　'+message.reason;
}
$('back-to-plaza').addEventListener('click',()=>{
 els.battle.hidden=true;els.quiz.hidden=false;els.battleActions.hidden=false;els.finish.hidden=true;
 $('battle-tabs').hidden=false;$('battle-action-hint').hidden=false;
 $('battle-forfeit').hidden=false;
 $('battle-fx').replaceChildren();
 battleState=null;question=null;selectedAction={kind:'attack'};selectedTab='attack';updateNearby();
});
$('battle-forfeit').addEventListener('click',()=>{
 if(!battleState||els.finish.hidden===false)return;
 if(!confirm('対戦を終了しますか？\n終了すると敗北となり、相手の勝利になります。'))return;
 if(send({type:'forfeit'})){
  $('battle-forfeit').disabled=true;
  note('対戦の終了をリクエストしました。');
 }
});
function receive(message){
 switch(message.type){
  case 'welcome':
   clientId=message.self;closeModal();els.battle.hidden=true;els.finish.hidden=true;battleState=null;question=null;answerPending=false;players.clear();
   for(const tile of elements.values())tile.remove();elements.clear();
   camera.ready=false;camera.manual=false;stopCamera();
   for(const p of message.players||[])putPlayer(p);
   returnToMyPet(true);
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
  case 'battleActions':
   (message.events||[]).slice(0,16).forEach((action,i)=>setTimeout(()=>playBattleEffect(action),i*165));return;
  case 'battleAction':playBattleEffect(message);return;
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
 if(!camera.ready)return;
 const v=els.viewport;
 if(camera.manual)setCamera(v.scrollLeft,v.scrollTop,true);
 else {
  const p=players.get(clientId);
  if(p)followMyPet(p.x,p.y);
 }
});
window.addEventListener('pagehide',()=>{clearTimeout(retryTimer);socket?.close(1000,'leaving');});
setInterval(updateClock,150);
initDecor();
onAuthStateChanged(auth,async user=>{
 if(!user){note('ログインが必要です。');return;}
 try{await accountSession(user);authUser=user;void connect();}
 catch(error){note('ログイン情報を確認できませんでした。'+error.message);}
},error=>note(error?.message||'ログインを確認できませんでした。'));
