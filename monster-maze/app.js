import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {EIKEN_QUESTIONS_URL,loadFishingEikenBank} from '../pet-fishing/question-bank.js';
import {loadVocabulary} from '../data/vocab/index.js';
import {buildBilingualIdiomBank} from '../data/vocab/target1000-bilingual.js';
import {DUNGEON_ITEMS,normalizeDungeonInventory,unlockedMagic} from '../pet-dungeons-model.js?v=2.4.96';
import {
  cards,roles,rarities,levelCaps,courses,enemies,bosses,normalizeProfile,stats,specialDescription,materialCost,maxUpgradeMaterialCount,previewUpgradeBatch,applyUpgradeBatch,
  addReward,directions,floorCount,planChests,generateMaze,movePet,makeFoes,mazeSpells,createCaster,spellAvailable,canJoinAction,retryVocabulary,prepareQuestions,question,shuffle,playTurn,injuredAlly,healWhileWalking,canUseItem,useItem,settleItems,drawChest,drawReward,gacha as gachaRules,drawGacha
} from './model.js?v=2.5.10';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(entry=>entry.name==='[DEFAULT]')||initializeApp(cfg);
enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const pane=document.querySelector('#game'); const splash=document.querySelector('#quest-splash'); const startButton=document.querySelector('#quest-start');
const status=document.querySelector('#status');
let profile,legacyProfile,petData,walletRef,questions,run,walkView,busy=false,clock,generation=0;
let collectionDismissAbort=null;
let editSession=null;
const hasUnsavedEdits=()=>Boolean(editSession&&(editSession.operations.length||editSession.team.join()!==profile?.team.join()));
// The parent shell uses this guard before navigating away from unsaved edits.
if(window.MonstudyMaterial?.setActivityGuard)window.MonstudyMaterial.setActivityGuard(hasUnsavedEdits);
else if(!window.MonstudyMaterial)window.MonstudyMaterial={isActive:hasUnsavedEdits,setPaused(){}};
function ensureEditSession(){
  if(!editSession)editSession={working:normalizeProfile(profile),team:[...profile.team],operations:[]};
  return editSession;
}
function rebuildEditSession(session){
  const working=normalizeProfile(profile);
  for(const operation of session.operations){
    if(!applyUpgradeBatch(working,operation.targetKey,operation.selections,session.team))return false;
  }
  session.working=working;
  return true;
}
function discardCollectionEdits(){
  if(hasUnsavedEdits()&&!confirm('未保存の編成・強化を破棄して探索に戻りますか？'))return;
  editSession=null;
  lobby();
}

function node(tag,content='',cls=''){
  const el=document.createElement(tag);
  el.textContent=content;
  if(cls) el.className=cls;
  return el;
}
function button(label,handler,disabled=false,cls=''){
  const el=node('button',label,cls);
  el.type='button';
  el.disabled=disabled;
  el.onclick=handler;
  return el;
}
function clear(){
  clearInterval(clock);
  collectionDismissAbort?.abort();
  collectionDismissAbort=null;
  pane.replaceChildren();
}
function group(cls,...children){
  const el=node('div','',cls);
  el.append(...children);
  return el;
}
function art(kind,id){
  const img=node('img');
  const version=kind==='card'&&(id===1||id===6)?'?v=2':'';
  img.src='./art/'+kind+'-'+id+'.webp'+version;
  img.alt='';
  img.decoding='async';
  return img;
}
function cardArt(id){
  return group('card-art',art('card',id));
}
function rankedCard(tile,rarity){
  const rank=rarities[rarity];
  tile.classList.add('ranked-card','rarity-'+rank.toLowerCase());
  tile.prepend(node('span',rank,'card-rank'));
  return tile;
}
function unitView(unit,kind){
  const hp=node('progress');
  hp.max=unit.maxHp;
  hp.value=unit.hp;
  hp.setAttribute('aria-label',unit.name+' HP');
  const tile=group('unit'+(unit.hp===0?' down':''),(kind==='card'?cardArt(unit.id):art(kind,unit.id)),node('strong',unit.name),hp,node('small',unit.hp+' / '+unit.maxHp));
  return kind==='card'?rankedCard(tile,unit.rarity):tile;
}
function battleUnit(unit,portrait){
  const fill=node('span','','hp-fill');
  const meter=group('hp-meter',fill);
  meter.setAttribute('role','progressbar');
  meter.setAttribute('aria-label',unit.name+' HP');
  meter.setAttribute('aria-valuemax',String(unit.maxHp));
  const number=node('small','','battle-hp');
  const badge=node('span','','battle-delta');
  badge.setAttribute('aria-hidden','true');
  const tile=group('unit battle-unit',portrait,node('strong',unit.name),meter,number,badge);
  const update=hp=>{
    fill.style.transform='scaleX('+hp/unit.maxHp+')';
    meter.setAttribute('aria-valuenow',String(hp));
    number.textContent=hp+' / '+unit.maxHp;
    tile.classList.toggle('down',hp===0);
  };
  update(unit.hp);
  return {tile,update,badge};
}
function petSprite(className){
  const sprite=node('span','',className);
  sprite.setAttribute('role','img');
  sprite.setAttribute('aria-label',petData?.petName||'あなたのぺっと');
  if(!petData?.petHatched){
    sprite.textContent='🥚';
    return sprite;
  }
  const shop=petData.petShop||{};
  const equipped={...shop.equipped};
  delete equipped['pet-frame'];
  const juvenile=petData.petAdult===false||!petData.petAppearance;
  sprite.innerHTML=renderPetSVG(juvenile?null:petData.petAppearance,
    {...shop,equipped},juvenile?'baby':'adult',{background:false});
  return sprite;
}
function partyPet(){
  const label=node('small');
  const view=battleUnit(run.caster,petSprite('party-pet-art'));
  view.tile.classList.add('party-pet');
  view.tile.append(label);
  const updateMp=()=>{label.textContent='MP '+run.caster.mp+' / '+run.caster.maxMp;};
  updateMp();
  return {...view,updateMp};
}
function message(text=''){
  status.textContent=text;
  status.hidden=!text;
}
async function save(change,onSuccess,{id,delta=0,itemDelta=null,onFailure}={}){
  if(busy||!walletRef)return;
  busy=true;
  const current=generation;
  const wallet=walletRef;
  pane.inert=true;
  message('保存中…');
  try{
    const updated=await runTransaction(db,async tx=>{
      const data=(await tx.get(wallet)).data()||{};
      const next=normalizeProfile(data.monsterMaze??legacyProfile);
      const balance=coinBalance(data);
      const inventory=data.petDungeonItems;
      if(id&&next.recentRuns.includes(id))return {next,balance,inventory};
      if(balance+delta<0)return {next,balance,inventory,insufficient:true};
      if(change(next)===false)throw Error('最新の所持カードや素材を確認してください。');
      const patch={monsterMaze:next};
      if(delta)patch.coins=balance+delta;
      if(itemDelta)patch.petDungeonItems=settleItems(inventory,itemDelta);
      tx.set(wallet,patch,{merge:true});
      return {next,balance:balance+delta,inventory:patch.petDungeonItems??inventory};
    });
    if(current!==generation)return;
    profile=updated.next;
    petData={...petData,coins:updated.balance,petDungeonItems:updated.inventory};
    if(updated.insufficient){
      const detail='コインが足りません。現在の残高は'+updated.balance+'コインです。';
      message(detail);
      onFailure?.(detail);
      return;
    }
    message('保存しました。');
    onSuccess();
  }catch(error){
    if(current!==generation)return;
    const detail='保存できませんでした。'+error.message;
    message(detail);
    onFailure?.(detail);
  }finally{
    if(current===generation){
      busy=false;
      pane.inert=false;
    }
  }
}
function companionStats(unit){
  const roleStats=[['物理攻撃',unit.physical],['魔法攻撃',unit.magic],['回復力',unit.heal]];
  return [['最大HP',unit.maxHp],roleStats[unit.role]];
}
function statList(entries,className){
  const list=node('dl','',className);
  for(const [label,value] of entries)list.append(node('dt',label),node('dd',String(value)));
  return list;
}
function rosterCard(art,name,subtitle,entries,special=null){
  const info=group('roster-info',node('strong',name),node('small',subtitle),statList(entries,'roster-stats'));
  if(special)info.append(special);
  return group('unit roster-card',art,info);
}
function lobby(){
  run=null;
  walkView=null;
  clear();
  const pet=createCaster(petData);
  const learned=unlockedMagic(pet.level);
  const spellList=group('roster-spells',node('strong','習得魔法'),...(learned.length
    ?learned.map(spell=>node('small',spell.name+' · MP '+spell.mpCost+
      (mazeSpells.includes(spell)?'':'（迷宮では使用不可）')))
    :[node('small','まだ覚えていません')]));
  const petCard=rosterCard(petSprite('roster-pet-art'),pet.name,'ぺっと · Lv.'+pet.level,
    [['最大HP',pet.maxHp],['最大MP',pet.maxMp],['物理攻撃',pet.attack]],spellList);
  petCard.classList.add('party-pet');
  const allies=profile.team.map(key=>{
    const entry=profile.owned[key];
    const unit=stats(key,entry);
    const special=unit.rarity?skillInfo(unit):null;
    return rankedCard(rosterCard(cardArt(unit.id),unit.name,roles[unit.role]+' · Lv.'+entry.level,
      companionStats(unit),special),unit.rarity);
  });
  pane.append(node('h2','探索隊'),group('roster',petCard,...allies),
    group('choices',button('仲間カード編成',()=>collection()),button('仲間カードガチャ',()=>{message();showGacha();})));
  pane.append(group('world-map-entry',button('🗺 迷宮にすすむ',worldMap,false,'primary world-map-enter')));
}

// Map selection is a client-only transition. Existing course/start logic retains the
// previously loaded profile, inventory and quiz bank without another Firestore read.
const WORLD_MAP_ENTRIES=[
  {name:'はじまりの森の迷宮',x:21,y:40},
  {name:'きらめきの洞窟迷宮',x:21,y:67},
  {name:'文法の試練の迷宮',x:67,y:42},
  {name:'魔獣たちの火山迷宮',x:81,y:66},
  {name:'魔王の影の迷宮',x:65,y:87}
];
function worldMap(){
  clear();
  message();
  const title=node('h2','もんすた王国');
  const instructions=node('p','迷宮の入口にカーソルを合わせると対応する英検級がわかります。入口を選ぶと探索を開始します。','world-map-instructions');
  const frame=group('world-map-frame');
  const mapImage=node('img');
  mapImage.src='./art/monsta-kingdom-map.webp?v=2.4.134';
  mapImage.alt='もんすた王国の地図。はじまりの森、きらめきの洞窟、文法の試練、魔獣たちの火山、魔王の影の5つの迷宮';
  mapImage.width=1448;
  mapImage.height=1086;
  mapImage.loading='lazy';
  mapImage.decoding='async';
  mapImage.className='world-map-art';
  // If the optional artwork has not been installed yet, the list below remains operable.
  mapImage.addEventListener('error',()=>frame.classList.add('world-map-art-unavailable'),{once:true});
  frame.append(mapImage);
  // Only show the tooltip while pointing at (or focusing) a maze entrance.
  // Its position follows the pointer and is kept within the world map bounds.
  const tooltip=group('world-map-tooltip');
  tooltip.id='world-map-dungeon-tooltip';
  tooltip.setAttribute('role','tooltip');
  tooltip.hidden=true;
  const hideTooltip=()=>{tooltip.hidden=true;};
  const placeTooltip=(clientX,clientY)=>{
    if(tooltip.hidden)return;
    const rect=frame.getBoundingClientRect();
    const x=clientX-rect.left,y=clientY-rect.top;
    const gap=14,pad=8,w=tooltip.offsetWidth,h=tooltip.offsetHeight;
    let left=x+gap,top=y+gap;
    if(left+w>rect.width-pad)left=x-w-gap;
    if(top+h>rect.height-pad)top=y-h-gap;
    left=Math.max(pad,Math.min(left,rect.width-w-pad));
    top=Math.max(pad,Math.min(top,rect.height-h-pad));
    tooltip.style.left=left+'px';
    tooltip.style.top=top+'px';
  };
  const present=(entry,course,index,clientX,clientY)=>{
    tooltip.replaceChildren(
      node('strong','Lv.'+(index+1)+' '+entry.name),
      node('span',course.name+' · '+('★'.repeat(index+1)+'☆'.repeat(4-index))),
      node('small',course.coins+'コイン')
    );
    tooltip.hidden=false;
    placeTooltip(clientX,clientY);
  };
  const hotspotButtons=[];
  courses.forEach((course,index)=>{
    const entry=WORLD_MAP_ENTRIES[index];
    const target=button('Lv.'+(index+1)+' '+entry.name+'（'+course.name+'）',()=>start(course),false,'world-map-hotspot');
    target.style.setProperty('--left',entry.x+'%');
    target.style.setProperty('--top',entry.y+'%');
    target.setAttribute('aria-label','レベル'+(index+1)+' '+entry.name+'。'+course.name+'、難易度'+(index+1)+'つ星、'+course.coins+'コイン。探索を開始');
    target.setAttribute('aria-describedby',tooltip.id);
    target.addEventListener('mouseenter',event=>present(entry,course,index,event.clientX,event.clientY));
    target.addEventListener('mousemove',event=>placeTooltip(event.clientX,event.clientY));
    target.addEventListener('mouseleave',hideTooltip);
    target.addEventListener('focus',()=>{
      const rect=target.getBoundingClientRect();
      present(entry,course,index,rect.left+rect.width/2,rect.top+rect.height/2);
    });
    target.addEventListener('blur',hideTooltip);
    hotspotButtons.push(target);
  });
  frame.append(...hotspotButtons,tooltip);
  const list=group('world-map-course-list',...courses.map((course,index)=>{
    const entry=WORLD_MAP_ENTRIES[index];
    return button('Lv.'+(index+1)+' '+entry.name+' · '+course.name+' · '+('★'.repeat(index+1)+'☆'.repeat(4-index))+' · '+course.coins+'コイン',()=>start(course),false,'world-map-course');
  }));
  pane.append(group('world-map-screen',group('world-map-heading',title,button('← 探索隊に戻る',lobby)),instructions,frame,list));
}
function coinBalance(data){
  const balance=Number(data?.coins);
  return Number.isSafeInteger(balance)&&balance>0?balance:0;
}
function gachaLabel({cost,count}){
  return count+'連ガチャ（'+cost+'コイン）';
}
function showGacha(){
  clear();
  const balance=coinBalance(petData);
  const oddsText=rarities.map((rank,index)=>rank+' '+gachaRules.odds[index]+'％').join('　');
  pane.append(node('h2','仲間カードガチャ'),node('p','所持 '+balance+'コイン'),
    node('p','1枚ごとの排出率　'+oddsText,'gacha-odds'),
    group('choices',...gachaRules.packs.map(pack=>
      button(gachaLabel(pack),()=>openGacha(pack),balance<pack.cost,'primary'))),
    group('choices',button('仲間カード編成',()=>{message();collection();}),
      button('探索に戻る',()=>{message();lobby();})));
}
function openGacha(pack){
  const dialog=node('dialog','','gacha-dialog');
  const title=node('h2',gachaLabel(pack));
  title.id='gacha-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const globe=group('gacha-globe',...Array.from({length:5},()=>node('span','','gacha-capsule')));
  const machine=group('gacha-machine',node('span','','gacha-cap'),globe,
    group('gacha-base',node('span','','gacha-handle'),node('span','','gacha-chute')));
  machine.setAttribute('aria-hidden','true');
  const cue=node('p','「回す」でカードを引く','gacha-cue');
  cue.setAttribute('role','status');
  const close=button('閉じる',()=>dialog.close());
  let pending=null;
  const roll=button('回す',()=>{
    if(busy||roll.disabled)return;
    roll.disabled=true;
    close.disabled=true;
    machine.classList.add('rolling');
    cue.textContent='ガチャを回しています…';
    pending??={id:'gacha-'+crypto.randomUUID(),delta:-pack.cost,cards:drawGacha(pack.count),
      onFailure:detail=>{
        machine.classList.remove('rolling');
        cue.textContent=detail;
        roll.disabled=coinBalance(petData)<pack.cost;
        close.disabled=false;
      }};
    void save(next=>addReward(next,pending.id,{cards:pending.cards,crystals:0}),()=>{
      machine.classList.remove('rolling');
      const rainbow=pending.cards.some(key=>key.endsWith('-3'));
      if(rainbow){
        const sparkles=group('gacha-sparkles',...Array.from({length:24},()=>node('span','✦')));
        sparkles.setAttribute('aria-hidden','true');
        dialog.append(sparkles);
      }
      cue.textContent='獲得したカード';
      const results=group('collection gacha-results');
      const lead=rainbow?980:180;
      for(const [index,key] of pending.cards.entries()){
        const [id,rank]=key.split('-').map(Number);
        const card=rankedCard(group('unit',cardArt(id),node('strong',cards[id-1].name)),rank);
        const reveal=group('gacha-reveal',card);
        reveal.style.setProperty('--delay',lead+index*85+'ms');
        results.append(reveal);
      }
      dialog.insertBefore(results,actions);
      roll.remove();
      close.disabled=false;
      close.focus();
    },pending);
  },false,'primary');
  const actions=group('choices gacha-dialog-actions',roll,close);
  dialog.append(title,machine,cue,actions);
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{
    dialog.remove();
    message();
    showGacha();
  },{once:true});
  pane.append(dialog);
  dialog.showModal();
}
function cardPortrait(card,key,rank,unit){
  const detailId='card-stats-'+key;
  const portrait=button('',()=>{
    portrait.setAttribute('aria-expanded',String(portrait.getAttribute('aria-expanded')!=='true'));
  },false,'card-portrait');
  portrait.setAttribute('aria-label',card.name+' '+rank+'の能力値');
  portrait.setAttribute('aria-expanded','false');
  portrait.setAttribute('aria-controls',detailId);
  portrait.setAttribute('aria-describedby',detailId);
  portrait.onkeydown=event=>{
    if(event.key==='Escape')portrait.setAttribute('aria-expanded','false');
  };
  portrait.append(cardArt(card.id));

  const details=statList(companionStats(unit),'card-stats');
  details.id=detailId;
  return group('card-preview',portrait,details);
}
function skillInfo(unit){
  const detail=node('span',specialDescription(unit),'skill-detail');
  detail.id='skill-'+unit.key;
  const toggle=button(unit.skill,()=>{
    toggle.setAttribute('aria-expanded',String(toggle.getAttribute('aria-expanded')!=='true'));
  },false,'skill-toggle');
  toggle.setAttribute('aria-expanded','false');
  toggle.setAttribute('aria-controls',detail.id);
  toggle.setAttribute('aria-describedby',detail.id);
  toggle.onblur=()=>toggle.setAttribute('aria-expanded','false');
  toggle.onkeydown=event=>{
    if(event.key==='Escape')toggle.setAttribute('aria-expanded','false');
  };
  return group('skill-info',toggle,node('small','CT '+unit.maxCt),detail);
}
function companionCard(key,entry,caption){
  const unit=stats(key,entry);
  const rank=rarities[unit.rarity];
  const tile=rankedCard(group('unit owned-card',
    cardPortrait(unit,key,rank,unit),node('strong',unit.name)),unit.rarity);
  const line=group('card-line',node('small','Lv.'+entry.level+' / '+levelCaps[unit.rarity]+caption));
  if(unit.rarity)line.append(skillInfo(unit));
  tile.append(line);
  return {tile,line};
}
function rewardCards(counts){
  return group('collection owned-cards reward-cards',...[...counts].map(([key,count])=>
    companionCard(key,{level:1},' · 獲得 '+count+'枚').tile));
}
function materialCardOptions(targetKey,session){
  const working=session.working;
  const rarity=Number(targetKey.split('-')[1]);
  const options=[];
  if(working.crystals>0){
    options.push({key:'crystal',name:'経験の結晶',rank:'結晶',available:working.crystals,cost:1,remainingOriginal:false});
  }
  for(const [materialKey,materialEntry] of Object.entries(working.owned)){
    const [id,sourceRarity]=materialKey.split('-').map(Number);
    const cost=materialCost(rarity,sourceRarity);
    if(cost===null)continue;
    const available=maxUpgradeMaterialCount(working,targetKey,materialKey,session.team);
    if(!available)continue;
    options.push({key:materialKey,name:cards[id-1].name,rank:rarities[sourceRarity],available,cost,
      remainingOriginal:available>materialEntry.copies,duplicates:materialEntry.copies});
  }
  return options.sort((a,b)=>{
    if(a.key==='crystal')return -1;
    if(b.key==='crystal')return 1;
    const aRarity=Number(a.key.split('-')[1]),bRarity=Number(b.key.split('-')[1]);
    return bRarity-aRarity||Number(a.remainingOriginal)-Number(b.remainingOriginal)||a.name.localeCompare(b.name,'ja');
  });
}
function compareCardStats(key,beforeLevel,afterLevel,working){
  const oldEntry={...working.owned[key],level:beforeLevel};
  const newerEntry={...oldEntry,level:afterLevel};
  const oldStats=companionStats(stats(key,oldEntry));
  const newStats=new Map(companionStats(stats(key,newerEntry)));
  const board=group('upgrade-stat-comparison');
  const head=group('upgrade-comparison-head',
    node('span','能力'),node('strong','強化前'),node('strong','強化後'));
  board.append(head);
  for(const [label,oldValue] of oldStats){
    const newValue=newStats.get(label);
    board.append(group('upgrade-comparison-row',
      node('span',label),node('span',String(oldValue),'upgrade-before'),
      node('span',String(newValue)+(newValue>oldValue?'  (+'+(newValue-oldValue)+')':''),'upgrade-after')));
  }
  return board;
}
function showUpgradeSuccess(card,key,oldLevel,newLevel,working,materials){
  const dialog=node('dialog','','card-upgrade upgrade-success');
  const title=node('h3','✨ 強化成功！');
  const sourceText=Object.entries(materials).map(([materialKey,count])=>{
    if(materialKey==='crystal')return '経験の結晶 ×'+count;
    const [id,rarity]=materialKey.split('-').map(Number);
    return rarities[rarity]+' '+cards[id-1].name+' ×'+count;
  }).join('、');
  dialog.append(title,
    node('p',card.name+'　Lv.'+oldLevel+' → Lv.'+newLevel),
    compareCardStats(key,oldLevel,newLevel,{owned:{[key]:{...working.owned[key]}}}),
    node('small','使用素材：'+sourceText),
    node('p','※ まだ保存されていません。「編成・強化を保存」で確定します。','material-caution'),
    group('choices',
      button('続けて強化',()=>{dialog.close();if(editSession?.working.owned[key])openCardUpgrade(card,key);}),
      button('一覧へ戻る',()=>dialog.close(),false,'primary')));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  pane.append(dialog);
  dialog.showModal();
}
function openCardUpgrade(card,key){
  const session=ensureEditSession();
  const working=session.working;
  const entry=working.owned[key];
  if(!entry)return;
  const cap=levelCaps[Number(key.split('-')[1])];
  if(entry.level>=cap)return;
  const dialog=node('dialog','','card-upgrade bulk-upgrade');
  const title=node('h3',card.name+'を強化');
  title.id='card-upgrade-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const options=materialCardOptions(key,session);
  const selections={};
  const list=group('material-card-list bulk-material-list');
  const preview=group('bulk-upgrade-preview');
  const submit=button('まとめて強化する',()=>commit(),true,'primary');
  for(const option of options){
    const input=node('input');
    input.type='number';input.min='0';input.max=String(option.available);
    input.step='1';input.value='0';input.inputMode='numeric';
    input.setAttribute('aria-label',option.rank+' '+option.name+' の使用枚数');
    const minus=button('−',()=>{input.value=String(Math.max(0,(Number(input.value)||0)-1));change();},false,'material-quantity-step');
    const plus=button('＋',()=>{input.value=String(Math.min(option.available,(Number(input.value)||0)+1));change();},false,'material-quantity-step');
    const change=()=>{
      const n=Math.min(option.available,Math.max(0,Math.trunc(Number(input.value)||0)));
      input.value=String(n);
      if(n)selections[option.key]=n;else delete selections[option.key];
      row.classList.toggle('selected',Boolean(n));
      updatePreview();
    };
    input.addEventListener('change',change);
    input.addEventListener('input',()=>{
      const n=Math.min(option.available,Math.max(0,Math.trunc(Number(input.value)||0)));
      if(n)selections[option.key]=n;else delete selections[option.key];
      row.classList.toggle('selected',Boolean(n));
      updatePreview();
    });
    const sourceInfo=group('bulk-material-info',
      node('strong',option.rank+' '+option.name),
      node('small','所持 '+option.available+'枚　／　1Lv分 '+option.cost+'枚'));
    if(option.remainingOriginal)sourceInfo.append(node('small','最後の1枚はカード本体を消費','material-original-warning'));
    const row=group('bulk-material-row',sourceInfo,group('material-quantity',minus,input,plus));
    list.append(row);
  }
  function updatePreview(){
    const result=previewUpgradeBatch(working,key,selections,session.team);
    const afterLevel=Math.min(cap,entry.level+result.levels);
    const difference=result.points-result.levels*result.unit;
    let explanation='素材を選んでください。';
    if(result.invalid)explanation='選択した素材枚数を確認してください。';
    else if(result.points>0&&result.levels<1)explanation='あと'+(result.unit-result.points)+'ポイントで1レベル分になります。';
    else if(result.levels>result.maxLevels)explanation='最大Lv.'+cap+'を超えています。素材を減らしてください。';
    else if(difference)explanation='強化ポイントが'+difference+'余っています。端数がなくなるよう調整してください。';
    else if(result.valid)explanation='この内容で'+result.levels+'レベル一括強化できます。';
    preview.replaceChildren(
      node('p','Lv.'+entry.level+' → Lv.'+afterLevel+'　（'+(afterLevel-entry.level)+'レベルUP）','bulk-upgrade-level'),
      node('p','素材換算 '+result.points+'ポイント　／　1Lv '+result.unit+'ポイント','bulk-upgrade-points'),
      compareCardStats(key,entry.level,afterLevel,working),
      node('p',explanation,result.valid?'bulk-upgrade-valid':'material-caution'));
    submit.disabled=!result.valid;
  }
  function commit(){
    const result=previewUpgradeBatch(working,key,selections,session.team);
    if(!result.valid)return;
    const countMap={...selections};
    const originals=Object.entries(countMap).filter(([materialKey,count])=>
      materialKey!=='crystal'&&materialKey!==key&&count>working.owned[materialKey]?.copies);
    if(originals.length){
      const names=originals.map(([materialKey])=>{
        const [id,rarity]=materialKey.split('-').map(Number);
        return rarities[rarity]+' '+cards[id-1].name;
      }).join('、');
      if(!confirm('次のカードの最後の1枚が消費され、所持一覧から消えます。\n'+names+'\nこの素材で強化しますか？'))return;
    }
    const before=entry.level;
    if(!applyUpgradeBatch(working,key,countMap,session.team))return;
    session.operations.push({targetKey:key,selections:countMap});
    const after=working.owned[key].level;
    dialog.close();
    collection();
    showUpgradeSuccess(card,key,before,after,working,countMap);
  }
  dialog.append(title,
    node('p','素材をまとめて選べます。違う種類・レアリティも合算できます。'),
    node('p','SSRなら同レア1枚、SR3枚、R6枚、N12枚がそれぞれ1レベル分です。','bulk-upgrade-hint'),
    list,preview,group('choices',submit,button('閉じる',()=>dialog.close())));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  pane.append(dialog);
  updatePreview();
  dialog.showModal();
}
function collection(){
  const session=ensureEditSession();
  const working=session.working;
  const draft=session.team;
  clear();
  const dismissController=new AbortController();
  collectionDismissAbort=dismissController;
  let activeCard=null;
  const closeMenu=()=>{
    if(!activeCard)return;
    activeCard.classList.remove('is-open');
    const trigger=activeCard.querySelector('.compact-card-trigger');
    trigger?.setAttribute('aria-expanded','false');
    activeCard=null;
  };
  const placeOverlay=tile=>{
    const rect=tile.getBoundingClientRect();
    tile.classList.toggle('overlay-right',rect.left+218>window.innerWidth-10);
    tile.classList.toggle('overlay-up',rect.bottom+175>window.innerHeight-8&&rect.top>175);
  };
  document.addEventListener('pointerdown',event=>{
    if(activeCard&&!activeCard.contains(event.target))closeMenu();
  },{signal:dismissController.signal});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeCard){
      const trigger=activeCard.querySelector('.compact-card-trigger');
      closeMenu();
      trigger?.focus();
      event.stopPropagation();
    }
  },{signal:dismissController.signal});
  const teamChanged=draft.join()!==profile.team.join();
  const modified=hasUnsavedEdits();
  const saveChanges=()=>{
    const operations=session.operations.map(op=>({targetKey:op.targetKey,selections:{...op.selections}}));
    const selectedTeam=[...session.team];
    void save(next=>{
      // Reject stale materials if another device changed cards during editing.
      const touched=new Set(operations.flatMap(op=>[op.targetKey,
        ...Object.keys(op.selections).filter(key=>key!=='crystal')]));
      for(const key of touched){
        const oldEntry=profile.owned[key],live=next.owned[key];
        if(!oldEntry||!live||oldEntry.level!==live.level||oldEntry.copies!==live.copies)return false;
      }
      if(operations.some(op=>op.selections.crystal)&&next.crystals!==profile.crystals)return false;
      if(next.team.join()!==profile.team.join())return false;
      for(const op of operations){
        if(!applyUpgradeBatch(next,op.targetKey,op.selections,selectedTeam))return false;
      }
      if(selectedTeam.length!==3||new Set(selectedTeam).size!==3||!selectedTeam.every(key=>next.owned[key]))return false;
      next.team=selectedTeam;
    },()=>{editSession=null;lobby();});
  };
  const restore=()=>{
    if(!confirm('保存前の編成・強化をすべて取り消しますか？'))return;
    editSession=null;
    collection();
  };
  const undoLast=()=>{
    const op=session.operations.pop();
    if(!op)return;
    if(!rebuildEditSession(session)){
      session.operations.push(op);
      rebuildEditSession(session);
      message('取り消しできませんでした。');
      return;
    }
    collection();
  };
  pane.append(node('h2','仲間カード編成'),
    node('p','編成 '+draft.length+' / 3　経験の結晶 '+working.crystals+
      (modified?'　● 保存待ち'+(session.operations.length?'（強化'+session.operations.length+'件）':''):''),
      'collection-save-status'),
    group('choices',
      button('探索に戻る',discardCollectionEdits),
      button('最後の強化を取り消す',undoLast,!session.operations.length),
      button('変更をすべて取り消す',restore,!modified),
      button('編成・強化を保存',saveChanges,!modified||draft.length!==3,'primary')));
  for(const [role,label] of roles.entries()){
    const section=group('collection owned-cards compact-owned-cards');
    for(const card of cards.filter(item=>item.role===role)){
      for(const [rarity,rank] of rarities.entries()){
        const key=card.id+'-'+rarity;
        const entry=working.owned[key];
        if(!entry)continue;
        const unit=stats(key,entry);
        const picked=draft.includes(key);
        const tile=rankedCard(group('unit compact-owned-card'),rarity);
        if(picked)tile.classList.add('is-equipped');
        const menuId='compact-card-menu-'+key;
        const trigger=button('',()=>{
          placeOverlay(tile);
          const alreadyOpen=activeCard===tile;
          closeMenu();
          if(!alreadyOpen){
            tile.classList.add('is-open');
            trigger.setAttribute('aria-expanded','true');
            activeCard=tile;
          }
        },false,'compact-card-trigger');
        trigger.setAttribute('aria-expanded','false');
        trigger.setAttribute('aria-controls',menuId);
        trigger.setAttribute('aria-label',rank+' '+unit.name+' レベル'+entry.level+' 最大HP'+unit.maxHp+'。クリックで操作メニュー');
        trigger.append(cardArt(unit.id),node('span',unit.name,'compact-card-name'));
        trigger.addEventListener('pointerenter',()=>placeOverlay(tile));
        trigger.addEventListener('focus',()=>placeOverlay(tile));
        const values=[['レベル',entry.level+' / '+levelCaps[rarity]],...companionStats(unit),['重複',entry.copies]];
        if(rarity)values.push(['スキル',unit.skill+' · CT '+unit.maxCt]);
        const tip=group('compact-card-tooltip',node('strong',unit.name+' · '+rank),
          node('small',roles[unit.role]),statList(values,'compact-stat-list'));
        tip.setAttribute('role','tooltip');
        if(picked){
          const mark=node('span','✓','compact-card-equipped');
          mark.setAttribute('aria-hidden','true');
          tile.append(mark);
        }
        const teamToggle=button(picked?'はずす':'いれる',()=>{
          session.team=picked?draft.filter(id=>id!==key):[...draft,key];
          collection();
        },!picked&&draft.length>=3);
        teamToggle.setAttribute('aria-pressed',String(picked));
        teamToggle.setAttribute('aria-label',card.name+' '+rank+(picked?'を編成からはずす':'を編成にいれる'));
        const atCap=entry.level>=levelCaps[rarity];
        const hasMaterials=!atCap&&(
          working.crystals>0||
          Object.keys(working.owned).some(materialKey=>
            maxUpgradeMaterialCount(working,key,materialKey,session.team)>0));
        const strengthen=button(atCap?'最大Lv.':'強化',()=>openCardUpgrade(card,key),
          atCap||!hasMaterials);
        const menu=group('compact-card-menu',node('strong',unit.name+' · '+rank),
          node('small','Lv.'+entry.level+' / '+levelCaps[rarity]+'　HP '+unit.maxHp+'　重複 '+entry.copies),
          group('compact-card-actions',teamToggle,strengthen));
        menu.id=menuId;
        tile.append(trigger,tip,menu);
        section.append(tile);
      }
    }
    if(section.childElementCount)pane.append(node('h3',label),section);
  }
}
function start(course){
  message();
  const initialInventory=normalizeDungeonInventory(petData.petDungeonItems);
  run={id:crypto.randomUUID(),course,floor:1,turns:0,correct:0,crystals:0,found:[],foundItems:{},mistakes:new Map(),chestPlan:planChests(course),
    initialInventory,inventory:{...initialInventory},
    caster:createCaster(petData),maze:generateMaze(1,course),team:profile.team.map(key=>stats(key,profile.owned[key]))};
  explore();
}
const moveLabels=['上','右','下','左'];
function explore(){
  clear();
  message();
  const {maze}=run;
  const title=node('h2',run.course.name+' · '+run.floor+' / '+floorCount+'階');
  const hint=node('p','矢印キー・WASDキー・方向ボタン・隣のマスをタップして移動。','walk-hint');
  const map=group('maze-map');
  map.setAttribute('role','group');
  map.setAttribute('aria-label','迷宮マップ');
  const world=group('maze-world');
  world.style.setProperty('--cols',maze.tiles[0].length);
  const vision=group('maze-vision',world);
  map.append(vision);
  const tiles=maze.tiles.map((row,y)=>row.map((passable,x)=>{
    if(!passable){
      const wall=node('span','','maze-wall');
      wall.setAttribute('aria-hidden','true');
      world.append(wall);
      return null;
    }
    const tile=button('',()=>walk(x-maze.x,y-maze.y),false,'maze-tile');
    world.append(tile);
    return tile;
  }));
  const pet=petSprite('maze-pet');
  const controls=group('maze-controls',...directions.map(([dx,dy],i)=>{
    const control=button(['↑','→','↓','←'][i],()=>walk(dx,dy));
    control.setAttribute('aria-label',moveLabels[i]+'に移動');
    return control;
  }));
  const report=node('p','','walk-report');
  report.setAttribute('role','status');
  const exit=maze.bossId?'👑 ボス部屋':'🚪 次の階';
  const navigation=group('maze-navigation',controls,node('small','🧰 宝箱　'+exit),report);
  const party=group('team party-row',partyPet().tile,...run.team.map(unit=>unitView(unit,'card')));
  const tools=group('choices',button('回復魔法',()=>openSupplies('heal'),run.caster.hp<=0),
    button('アイテム',()=>openSupplies('items')),button('探索を終了',leave,false,'leave-expedition'));
  pane.append(group('explore-stage',title,hint,group('maze-layout',map,navigation),party,tools));
  map.append(pet);
  walkView={world,tiles,report};
  updateMap();
}
function updateMap(){
  const {maze}=run;
  const {world,tiles,report}=walkView;
  for(const [y,row] of tiles.entries()){
    for(const [x,tile] of row.entries()){
      if(!tile)continue;
      const distance=Math.hypot(x-maze.x,y-maze.y);
      const here=distance===0;
      tile.disabled=distance!==1;
      tile.setAttribute('aria-hidden',String(distance>2));
      const chest=maze.chests.some(item=>item.x===x&&item.y===y&&!item.opened);
      const exit=x===maze.exitX&&y===maze.exitY;
      const label=chest?'宝箱':exit?(maze.bossId?'ボス部屋':'次の階'):'通路';
      tile.classList.toggle('here',here);
      tile.classList.toggle('landmark',chest||exit);
      tile.setAttribute('aria-label',here?'ペットの位置':label);
      tile.tabIndex=-1;
      tile.textContent=here?'':chest?'🧰':exit?(maze.bossId?'👑':'🚪'):'';
    }
  }
  world.style.setProperty('--x',maze.x);
  world.style.setProperty('--y',maze.y);
  report.textContent=run.found.length?'見つけたカード '+run.found.length+'枚':'';
}
function openSupplies(kind,inBattle=false){
  const expedition=run;
  const itemMenu=kind==='items';
  const remaining=inBattle?run.deadline-Date.now():0;
  if(inBattle&&remaining<=0)return;
  if(inBattle)clearInterval(clock);
  const dialog=node('dialog','','review-dialog supply-dialog');
  const title=node('h2',itemMenu?'アイテム':'回復魔法');
  title.id='maze-supplies';
  dialog.setAttribute('aria-labelledby',title.id);
  let report='';
  const options=itemMenu?DUNGEON_ITEMS.map(item=>
    button(item.icon+' '+item.name+' · '+item.description+' · '+run.inventory[item.id]+'個',()=>{
      const restored=useItem(run,item);
      if(restored)report=item.name+'で '+run.caster.name+'の'+item.kind.toUpperCase()+'が'+restored+'回復した。';
      dialog.close();
    },!canUseItem(run,item))):mazeSpells.filter(spell=>spell.kind==='heal'&&run.caster.level>=spell.level).map(spell=>
    button(spell.name+' · MP '+spell.mpCost,()=>{
      const healed=healWhileWalking(run,spell);
      if(healed)report=spell.name+'で '+healed.unit.name+'のHPが'+healed.amount+'回復した。';
      dialog.close();
    },!spellAvailable(run.caster,spell)||!injuredAlly(run)));
  dialog.append(title,node('p','HP '+run.caster.hp+' / '+run.caster.maxHp+'　MP '+run.caster.mp+' / '+run.caster.maxMp));
  if(options.length)dialog.append(group('choices supply-options',...options));
  else dialog.append(node('p','回復魔法をまだ覚えていません。'));
  dialog.append(button('閉じる',()=>dialog.close()));
  dialog.addEventListener('close',()=>{
    dialog.remove();
    if(run!==expedition)return;
    if(inBattle){
      if(report)run.battleLog.unshift(report);
      run.deadline=Date.now()+remaining;
      battle();
    }else if(report){
      explore();
      message(report);
    }
  },{once:true});
  pane.append(dialog);
  dialog.showModal();
}
function walk(dx,dy){
  if(!run||!walkView||busy)return;
  const event=movePet(run.maze,dx,dy);
  if(!event)return;
  if(event.kind==='walk')return updateMap();
  walkView=null;
  clear();
  if(event.kind==='chest'){
    const {card,item}=drawChest(run.course);
    pane.append(node('h2','宝箱を開けた！'));
    if(card){
      run.found.push(card);
      pane.append(rewardCards([[card,1]]));
    }else{
      run.inventory[item.id]++;
      run.foundItems[item.id]=(run.foundItems[item.id]||0)+1;
      pane.append(node('p',item.icon+' '+item.name+' ×1'),node('p',item.description));
    }
    pane.append(button('探索を続ける',explore,false,'primary'));
    return;
  }
  if(event.kind==='exit')return advance();
  run.foes=makeFoes(event,run.floor);
  run.battleLog=[];
  run.guard=null;
  run.bossFight=event.kind==='boss';
  const title=run.bossFight?run.foes[0].name+' が道をふさいでいる！':'野生のモンスターが現れた！';
  pane.append(group('battle-stage',node('h2',title),
    group('team battle-enemies',...run.foes.map(unit=>unitView(unit,unit.major?'boss':'enemy'))),
    group('team party-row',partyPet().tile,...run.team.map(unit=>unitView(unit,'card'))),
    button('戦う',nextQuestion,false,'primary')));
}
function leave(){
  if(!confirm('今回の探索を終了しますか？'))return;
  walkView=null;
  finish(false);
}
// Arrow keys and WASD share the same movement flow. Avoid hijacking text
// entry and IME composition; while a modal is open, exploration is paused.
const moveKeyIndex=Object.freeze({
  ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3,
  KeyW:0,KeyD:1,KeyS:2,KeyA:3,
  w:0,d:1,s:2,a:3
});
document.addEventListener('keydown',event=>{
  const i=moveKeyIndex[event.code]??moveKeyIndex[event.key]??moveKeyIndex[event.key?.toLowerCase()]??-1;
  if(!walkView||i<0||pane.querySelector('dialog[open]')||
    event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||
    event.isComposing||event.keyCode===229||
    event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
  event.preventDefault();
  walk(...directions[i]);
});
function nextQuestion(continuing=false){
  const current=question(questions[run.course.grade],run.quiz?.id);
  run.quiz=current;
  const spell=mazeSpells.find(item=>item.id===run.selectedSpell);
  if(continuing!==true||!spell||!spellAvailable(run.caster,spell)){
    run.selectedSpell=null;
    if(continuing!==true||run.action==='heal')run.action='physical';
  }
  if(continuing!==true||!(run.foes[run.target]?.hp>0)){
    run.target=run.foes.findIndex(foe=>foe.hp>0);
  }
  run.special=null;
  run.deadline=Date.now()+(current.type==='grammar'||current.type==='idiom'||run.course.grade==='pre1'?25000:15000);
  battle();
}
function quizPrompt(text){
  return node('h3',text.replace(/\s+(?=B\s*:)/,'\n'),'quiz-prompt');
}
function answerExplanation(quiz){
  const content=group('quiz-help',node('p','正解　'+quiz.answer,'quiz-correct-answer'));
  if(quiz.type==='vocabulary'){
    const [english,japanese]=quiz.direction==='ja-en'?[quiz.answer,quiz.prompt]:[quiz.prompt,quiz.answer];
    content.append(node('p',english+' は「'+japanese+'」という意味です。'));
  }else{
    if(quiz.prompt.includes('(____)'))content.append(node('p',quiz.prompt.replace('(____)',()=>quiz.answer),'quiz-completed'));
    if(quiz.tip)content.append(node('p',quiz.tip,'quiz-tip'));
  }
  return content;
}
function pauseForExplanation(quiz,title,selected){
  return new Promise(resolve=>{
    const dialog=node('dialog','','review-dialog');
    const heading=node('h2',title);
    heading.id='battle-explanation';
    dialog.setAttribute('aria-labelledby',heading.id);
    dialog.append(heading,quizPrompt(quiz.prompt));
    if(selected)dialog.append(node('p','あなたの回答　'+selected));
    dialog.append(answerExplanation(quiz),button('戦闘に戻る',()=>dialog.close(),false,'primary'));
    dialog.addEventListener('cancel',event=>event.preventDefault());
    dialog.addEventListener('close',()=>{
      dialog.remove();
      resolve();
    },{once:true});
    pane.append(dialog);
    dialog.showModal();
  });
}
function battle(){
  clear();
  const stage=group('battle-stage',node('h2',run.floor+'階 · バトル'));
  const views=new Map();
  const enemyRow=group('team battle-enemies');
  for(const [index,foe] of run.foes.entries()){
    const target=button('',()=>{run.target=index;battle();},foe.hp===0,'target');
    target.setAttribute('aria-pressed',String(run.target===index));
    const view=battleUnit(foe,art(foe.major?'boss':'enemy',foe.id));
    views.set(foe,view);
    target.append(view.tile);
    enemyRow.append(target);
  }
  const pet=partyPet();
  views.set(run.caster,pet);
  const allies=group('team party-row',pet.tile,...run.team.map(unit=>{
    const view=battleUnit(unit,cardArt(unit.id));
    views.set(unit,view);
    const tile=rankedCard(view.tile,unit.rarity);
    if(unit.rarity){
      const special=button(unit.skill+' · '+(unit.ct?'CT '+unit.ct:'発動可'),()=>{
        run.special=run.special===unit.key?null:unit.key;
        battle();
      },unit.ct>0||!canJoinAction(unit,run.action));
      special.setAttribute('aria-pressed',String(run.special===unit.key));
      tile.append(special);
    }
    return tile;
  }));
  const chooseAction=(action,spell=null)=>{
    if(action!==run.action)run.special=null;
    run.action=action;
    run.selectedSpell=spell;
    battle();
  };
  const attack=button('攻撃',()=>chooseAction('physical'));
  attack.setAttribute('aria-pressed',String(run.action==='physical'));
  const magic=button('魔法',()=>{
    if(run.action==='physical')chooseAction('magic');
  });
  magic.setAttribute('aria-pressed',String(run.action!=='physical'));
  const actions=group('choices battle-actions',attack,magic,button('アイテム',()=>openSupplies('items',true)));
  const log=node('ol','','battle-log');
  log.setAttribute('aria-label','戦闘ログ（新しい順）');
  log.setAttribute('aria-live','polite');
  log.setAttribute('aria-relevant','additions');
  log.tabIndex=0;
  for(const line of run.battleLog)log.append(node('li',line));

  const resultArea=group('battle-result',log);
  const controls=group('battle-controls',actions);
  const timer=node('span','','timer');
  const resolve=option=>void resolveTurn(option,{stage,views,pet,log,resultArea,timer});
  const quizLabel=run.quiz.type==='idiom'?'熟語 · '+(run.quiz.direction==='ja-en'?'日本語 → 英語':'英語 → 日本語'):run.quiz.type==='grammar'?'語彙・文法問題':'単語問題 · '+(run.quiz.direction==='ja-en'?'日本語 → 英語':'英語 → 日本語');
  const quiz=group('quiz',
    group('quiz-title',node('small',quizLabel),timer),
    quizPrompt(run.quiz.prompt),
    group('choices answers',...run.quiz.options.map(option=>button(option,()=>resolve(option),false,'primary'))));
  stage.append(enemyRow,allies,resultArea,controls);
  pane.append(stage);
  if(run.action!=='physical'){
    const {caster}=run;
    const options=group('choices');
    const allyMagic=button('仲間の攻撃魔法',()=>chooseAction('magic'),!run.team.some(unit=>canJoinAction(unit,'magic')));
    allyMagic.setAttribute('aria-pressed',String(run.action==='magic'&&!run.selectedSpell));
    options.append(allyMagic);
    for(const spell of mazeSpells){
      const action=spell.kind==='heal'?'heal':'magic';
      const lock=caster.hp===0?' · 戦闘不能':caster.level<spell.level?' · Lv.'+spell.level+'で習得':caster.mp<spell.mpCost?' · MP不足':'';
      const choice=button(spell.name+' · MP '+spell.mpCost+lock,()=>chooseAction(action,spell.id),
        !spellAvailable(caster,spell));
      choice.setAttribute('aria-pressed',String(run.selectedSpell===spell.id));
      options.append(choice);
    }
    options.setAttribute('aria-label','魔法を選ぶ');
    controls.append(group('spell-picker',options));
  }
  controls.append(quiz,button('探索を終了',leave,false,'leave-expedition'));
  const tick=()=>{
    const seconds=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
    timer.textContent=seconds+'秒';
    if(!seconds)resolve(null);
  };
  clock=setInterval(tick,100);
  tick();
}
function addBattleLog(log,text){
  run.battleLog.unshift(text);
  log.hidden=false;
  log.prepend(node('li',text));
  log.scrollTop=0;
}
async function launchEnergy(stage,source,target,kind){
  const orb=node('span','','battle-energy energy-'+kind);
  if(typeof orb.animate!=='function')return;
  const origin=stage.getBoundingClientRect();
  const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
  const x=from.left+from.width/2-origin.left;
  const y=from.top+from.height*.35-origin.top;
  const dx=to.left+to.width/2-origin.left-x;
  const dy=to.top+to.height*.48-origin.top-y;
  orb.style.left=x+'px';
  orb.style.top=y+'px';
  orb.setAttribute('aria-hidden','true');
  stage.append(orb);
  const start='translate(-50%,-50%)';
  try{
    await orb.animate([
      {opacity:.25,transform:start+' scale(.25)'},
      {opacity:1,transform:start+' scale(1.15)',offset:.42},
      {opacity:1,transform:start+' translate('+dx+'px,'+dy+'px) scale(.75)'}
    ],{duration:390,easing:'ease-in-out'}).finished;
  }finally{orb.remove();}
}
async function resolveTurn(answer,{stage,views,pet,log,resultArea,timer}){
  if(stage.dataset.resolving||!stage.isConnected)return;
  stage.dataset.resolving='true';
  clearInterval(clock);
  const timely=Date.now()<run.deadline;
  const quiz=run.quiz;
  const correct=timely&&answer===quiz.answer;
  for(const el of stage.querySelectorAll('button'))el.disabled=true;
  for(const choice of stage.querySelectorAll('.answers button')){
    if(choice.textContent===quiz.answer)choice.classList.add('answer-correct');
    else if(choice.textContent===answer)choice.classList.add('answer-incorrect');
  }
  const outcomeLabel=answer&&timely?'不正解':'時間切れ';
  addBattleLog(log,correct?'正解！':outcomeLabel+' · 正解は「'+quiz.answer+'」');
  if(!correct){
    if(run.mistakes.size<2&&!run.mistakes.has(quiz.id))run.mistakes.set(quiz.id,quiz);
    timer.textContent='解説中';
    await pauseForExplanation(quiz,outcomeLabel+' · 解説',timely?answer:null);
    if(!stage.isConnected)return;
  }
  timer.textContent='行動中';
  const events=[];
  const result=playTurn(run,correct,run.action,run.target,run.special,Math.random,event=>events.push(event));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  if(!reduced&&events.length)await delay(240);
  for(const {actor,unit,hp,delta,kind,actionName} of events){
    if(!stage.isConnected)return;
    const source=views.get(actor);
    const {tile,update,badge}=views.get(unit);
    const effect=kind==='heal'?'being-healed':'taking-hit';
    if(source)source.tile.classList.add('acting');
    if(!reduced&&source)await launchEnergy(stage,source.tile,tile,kind);
    if(!stage.isConnected)return;
    if(source===pet)pet.updateMp();
    tile.classList.add(effect);
    badge.textContent=(kind==='heal'?'＋':'−')+Math.abs(delta)+' HP';
    update(hp);
    addBattleLog(log,(actor?.name||petData?.petName||'ぺっと')+'の'+actionName+'！ '+unit.name+
      (kind==='heal'?(delta?'がHPを'+delta+'回復':'のHPは満タン'):'に'+Math.abs(delta)+'ダメージ')+(hp===0?' · 撃破':''));
    if(!reduced)await delay(360);
    if(source)source.tile.classList.remove('acting');
    tile.classList.remove(effect);
  }
  if(!stage.isConnected)return;
  if(result==='continue'){
    nextQuestion(true);
    return;
  }
  timer.textContent='戦闘終了';
  const outcome=node('p',result==='won'?'敵を倒した！':'探索隊は全滅した。','battle-outcome');
  outcome.setAttribute('role','status');
  resultArea.append(outcome);
  const next=result==='lost'?button('探索結果',()=>finish(false),false,'primary'):
    button('進む',run.bossFight?advance:explore,false,'primary');
  resultArea.append(next);
  next.focus({preventScroll:true});
}
function advance(){
  run.bossFight=false;
  if(run.floor===floorCount)return finish(true);
  run.floor++;
  // HP/MP persist between floors; recovery requires an explicit spell or item.
  run.maze=generateMaze(run.floor,run.course,run.chestPlan[run.floor]);
  explore();
}
function finish(cleared){
  const bonus=cleared?drawReward(run.course,run.crystals):{crystals:0,card:null};
  run.cleared=cleared;
  run.reward={crystals:bonus.crystals,cards:bonus.card?[...run.found,bonus.card]:[...run.found],
    coins:cleared?run.course.coins:0};
  const mistakes=[...run.mistakes.values()];
  if(mistakes.length)reviewMistakes(mistakes);
  else results();
}
function reviewMistakes(mistakes,index=0){
  clear();
  const quiz=mistakes[index];
  const options=shuffle(quiz.options);
  const prompt=quizPrompt(quiz.prompt);
  prompt.tabIndex=-1;
  const feedback=group('review-feedback');
  feedback.setAttribute('aria-live','polite');
  const answers=group('choices answers',...options.map(option=>button(option,()=>{
    const correct=option===quiz.answer;
    for(const choice of answers.children){
      choice.disabled=true;
      if(choice.textContent===quiz.answer)choice.classList.add('answer-correct');
      else if(choice.textContent===option)choice.classList.add('answer-incorrect');
    }
    feedback.append(node('h3',correct?'正解！':'解説を確認して、もう一度'),answerExplanation(quiz));
    const last=index+1===mistakes.length;
    const next=correct
      ?button(last?'復習を終える':'次の問題',()=>last?results():reviewMistakes(mistakes,index+1),false,'primary')
      :button('もう一度答える',()=>reviewMistakes(mistakes,index),false,'primary');
    feedback.append(next);
    next.focus();
  },false,'primary')));
  pane.append(group('battle-stage review-stage',node('h2','探索の復習'),
    group('quiz',node('p',(index+1)+' / '+mistakes.length+' 問','review-progress'),prompt,answers,feedback)));
  prompt.focus();
}
function results(saved=false){
  clear();
  const {id,reward,correct,turns,floor}=run;
  pane.append(node('h2',run.cleared?'迷宮クリア！':'探索終了'),
    node('p',floor+'階 · '+turns+'ターン · 正解率 '+Math.round(100*correct/Math.max(1,turns))+'%'));
  if(reward.coins)pane.append(node('p','クリア報酬 '+reward.coins+'コイン'));
  if(reward.crystals) pane.append(node('p','経験の結晶 ×'+reward.crystals));
  const counts=new Map();
  for(const key of reward.cards)counts.set(key,(counts.get(key)||0)+1);
  if(counts.size){
    pane.append(node('h3','見つけた仲間カード'),rewardCards(counts));
  }
  const items=DUNGEON_ITEMS.filter(item=>run.foundItems[item.id]);
  if(items.length)pane.append(node('h3','見つけたアイテム'),
    ...items.map(item=>node('p',item.icon+' '+item.name+' ×'+run.foundItems[item.id])));
  const itemChanges=Object.keys(run.inventory).filter(key=>run.inventory[key]!==run.initialInventory[key]);
  if(saved||(!reward.coins&&!reward.crystals&&!counts.size&&!itemChanges.length)){
    pane.append(button('探索に戻る',lobby,false,'primary'));
  }else{
    const itemDelta=itemChanges.length?Object.fromEntries(itemChanges.map(key=>
      [key,run.inventory[key]-run.initialInventory[key]])):null;
    const label=reward.coins||reward.crystals||counts.size||items.length?'報酬を受け取る':'探索結果を保存';
    pane.append(button(label,()=>save(next=>addReward(next,id,reward),()=>results(true),
      {id,delta:reward.coins,itemDelta}),false,'primary'));
  }
}
async function loadRetryChoiceMeanings(){
  const url=new URL('choice-ja-data.js',EIKEN_QUESTIONS_URL);
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('リトライノートの和訳データを取得できませんでした。');
  const data=(await response.text()).match(/^\s*window\.RETRY_CHOICE_JA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if(!data)throw Error('リトライノートの和訳データを確認できませんでした。');
  return JSON.parse(data[1]);
}
async function initialize(user){
  const current=++generation;
  busy=false;
  run=null;
  walkView=null;
  pane.inert=false;
  pane.hidden=true;
  splash.hidden=true;
  startButton.onclick=null;
  clear();
  legacyProfile=null;
  walletRef=null;
  editSession=null;
  message('ログイン情報を確認中…');
  try{
    const session=user&&await accountSession(user);
    if(current!==generation)return;
    if(!session||session.resetRequired){
      message('もんすたクエストを遊ぶにはログインが必要です。');
      return;
    }
    // Delay game data reads until a signed-in player clicks the splash screen.
    splash.hidden=false;
    message();
    await new Promise(resolve=>{startButton.onclick=resolve;});
    if(current!==generation)return;
    startButton.onclick=null;
    splash.hidden=true;
    message('冒険の準備中…');
    const wordBank=fetch('../pet-adventure/online-battle-vocab.json').then(response=>{
      if(!response.ok)throw Error('問題データを取得できませんでした。');
      return response.json();
    });
    const wallet=doc(db,'users',user.uid,'apps','english-playroom');
    const [data,retryRows,meanings,pet,idiomData]=await Promise.all([
      wordBank,loadFishingEikenBank(),loadRetryChoiceMeanings(),getDoc(wallet),
      loadVocabulary('target1000').catch(error=>{console.warn('Target 1000 offline',error);return {entries:[]};})
    ]);
    if(current!==generation)return;
    const userData=pet.data()||{};
    const oldProfile=userData.monsterMaze==null?await getDoc(doc(db,'users',user.uid,'apps','monster-maze')):null;
    if(current!==generation)return;
    legacyProfile=oldProfile?.data();
    walletRef=wallet;
    const idioms=buildBilingualIdiomBank(idiomData.entries);
    questions=prepareQuestions({...data.grades,pre1:{words:retryVocabulary(retryRows,meanings,'準1級')}},retryRows,idioms);
    petData=userData;
    profile=normalizeProfile(userData.monsterMaze??legacyProfile);
    pane.hidden=false;
    message();
    lobby();
  }catch(error){
    if(current!==generation)return;
    message('読み込めませんでした。'+error.message);
    pane.hidden=false;
    pane.append(button('もう一度読み込む',()=>initialize(auth.currentUser)));
  }
}
onAuthStateChanged(auth,initialize,error=>message(error.message));
