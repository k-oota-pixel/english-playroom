import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {
  cards,roles,rarities,levelCaps,courses,enemies,bosses,normalizeProfile,stats,upgrade,sampleCardKeys,grantRaritySamples,
  addReward,directions,generateMaze,movePet,makeFoes,mazeSpells,createCaster,spellAvailable,canJoinAction,question,playTurn,drawReward,gacha as gachaRules,drawGacha
} from './model.js?v=16';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(entry=>entry.name==='[DEFAULT]')||initializeApp(cfg);
enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const pane=document.querySelector('#game');
const status=document.querySelector('#status');
let profile,petData,cardRef,walletRef,words,run,walkView,busy=false,clock,generation=0;

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
function cardName(key){
  const [id,rank]=key.split('-').map(Number);
  return rarities[rank]+' '+cards[id-1].name;
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
async function save(change,onSuccess,purchase=null){
  if(busy||!cardRef)return;
  busy=true;
  const current=generation;
  const ref=cardRef;
  const wallet=walletRef;
  pane.inert=true;
  message('保存中…');
  try{
    const updated=await runTransaction(db,async tx=>{
      const snapshot=await tx.get(ref);
      const next=normalizeProfile(snapshot.data());
      let balance=null;
      if(purchase){
        const walletSnapshot=await tx.get(wallet);
        balance=coinBalance(walletSnapshot.data());
        if(next.recentRuns.includes(purchase.id))return {next,balance};
        if(balance<purchase.cost)return {next,balance,insufficient:true};
        balance-=purchase.cost;
      }
      if(change(next)===false)throw Error('最新の所持カードや素材を確認してください。');
      if(purchase)tx.update(wallet,{coins:balance});
      tx.set(ref,next);
      return {next,balance};
    });
    if(current!==generation)return;
    profile=updated.next;
    if(updated.balance!==null)petData={...petData,coins:updated.balance};
    if(updated.insufficient){
      showGacha();
      message('コインが足りません。現在の残高は'+updated.balance+'コインです。');
      return;
    }
    message('保存しました。');
    onSuccess();
  }catch(error){
    if(current!==generation)return;
    message('保存できませんでした。'+error.message);

  }finally{
    if(current===generation){
      busy=false;
      pane.inert=false;
    }
  }
}
function lobby(){
  run=null;
  walkView=null;
  clear();
  pane.append(node('h2','探索隊'),group('team',...profile.team.map(key=>{
    const unit=stats(key,profile.owned[key]);
    return rankedCard(group('unit',cardArt(unit.id),node('strong',unit.name),node('small',roles[unit.role]+' · Lv.'+profile.owned[key].level)),unit.rarity);
  })),group('choices',button('仲間カード編成',()=>collection()),button('仲間カードガチャ',()=>{message();showGacha();})));
  pane.append(node('h2','迷宮を選ぶ'),group('choices',...courses.map(course=>
    button(course.name+' · '+course.floors+'階 · 英検'+({4:'4級',3:'3級',pre2:'準2級'}[course.grade]),()=>start(course),false,'primary'))));
}
function coinBalance(data){
  const balance=Number(data?.coins);
  return Number.isSafeInteger(balance)&&balance>0?balance:0;
}
function showGacha(drawn=[]){
  clear();
  const {cost,count,odds}=gachaRules;
  const balance=coinBalance(petData);
  const oddsText=rarities.map((rank,index)=>rank+' '+odds[index]+'％').join('　');
  pane.append(node('h2','仲間カードガチャ'),node('p',cost+'コインで'+count+'枚 · 所持 '+balance+'コイン'),
    node('p','1枚ごとの排出率　'+oddsText,'gacha-odds'));
  if(drawn.length){
    const results=group('collection gacha-results');
    for(const [index,key] of drawn.entries()){
      const [id,rank]=key.split('-').map(Number);
      const card=rankedCard(group('unit',cardArt(id),node('strong',cards[id-1].name)),rank);
      const reveal=group('gacha-reveal',card);
      reveal.style.setProperty('--delay',index*85+'ms');
      results.append(reveal);
    }
    pane.append(node('h3','獲得したカード'),results);
  }
  let pending=null;
  const draw=button(cost+'コインで'+count+'枚引く',()=>{
    if(busy)return;
    pending??={id:'gacha-'+crypto.randomUUID(),cost,cards:drawGacha()};
    void save(next=>addReward(next,pending.id,{cards:pending.cards,crystals:0}),()=>showGacha(pending.cards),pending);
  },balance<cost,'primary');
  pane.append(group('choices',draw,button('仲間カード編成',()=>{message();collection();}),
    button('探索に戻る',()=>{message();lobby();})));
  if(balance<cost)pane.append(node('p','あと'+(cost-balance)+'コインで引けます。'));
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

  const details=node('dl','','card-stats');
  for(const [label,value] of [['最大HP',unit.maxHp],['物理攻撃',unit.physical],['魔法攻撃',unit.magic],['回復力',unit.heal]]){
    details.append(node('dt',label),node('dd',String(value)));
  }
  details.id=detailId;
  return group('card-preview',portrait,details);
}
function openCardUpgrade(card,key,entry,draft){
  const dialog=node('dialog','','card-upgrade');
  const title=node('h3',card.name+'を強化');
  title.id='card-upgrade-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const spend=useCopy=>{
    dialog.close();
    void save(next=>upgrade(next,key,useCopy),()=>collection(draft));
  };
  dialog.append(title,node('p','素材を1つ使ってLv.を1上げます。'),
    group('choices',
      button('結晶で強化（'+profile.crystals+'個）',()=>spend(false),!profile.crystals),
      button('重複カードで強化（'+entry.copies+'枚）',()=>spend(true),!entry.copies)),
    button('閉じる',()=>dialog.close()));
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  pane.append(dialog);
  dialog.showModal();
}
function collection(draft=[...profile.team]){
  clear();
  pane.append(node('h2','仲間カード編成'),node('p','編成 '+draft.length+' / 3　経験の結晶 '+profile.crystals),
    group('choices',button('探索に戻る',lobby),button('編成を保存',()=>save(next=>{
      if(!draft.every(key=>next.owned[key]))return false;
      next.team=[...draft];
    },lobby),draft.length!==3||draft.join()===profile.team.join(),'primary')));
  if(sampleCardKeys.some(key=>!profile.owned[key])){
    pane.append(button('比較用の鉄甲ガメルを受け取る',()=>save(grantRaritySamples,()=>{
      message('鉄甲ガメルのN・R・SR・SSRがそろいました。');
      collection(draft);
    })));
  }
  for(const [role,label] of roles.entries()){
    const section=group('collection owned-cards');
    for(const card of cards.filter(item=>item.role===role)){
      for(const [rarity,rank] of rarities.entries()){
        const key=card.id+'-'+rarity;
        const entry=profile.owned[key];
        if(!entry)continue;
        const picked=draft.includes(key);
        const unit=stats(key,entry);
        const tile=rankedCard(group('unit owned-card',cardPortrait(card,key,rank,unit),node('strong',card.name)),rarity);
        const line=group('card-line',node('small','Lv.'+entry.level+' / '+levelCaps[rarity]+' · 重複 '+entry.copies));
        if(rarity)line.append(node('small',card.skill+' · CT '+unit.maxCt));
        const teamToggle=button(picked?'はずす':'いれる',
          ()=>collection(picked?draft.filter(id=>id!==key):[...draft,key]),!picked&&draft.length>=3);
        teamToggle.setAttribute('aria-pressed',String(picked));
        teamToggle.setAttribute('aria-label',card.name+' '+rank+(picked?'を編成からはずす':'を編成にいれる'));
        const atCap=entry.level>=levelCaps[rarity];
        const strengthen=button(atCap?'最大Lv.':'強化',()=>openCardUpgrade(card,key,entry,draft),
          atCap||(!profile.crystals&&!entry.copies));
        line.append(group('card-actions',teamToggle,strengthen));
        tile.append(line);
        section.append(tile);
      }
    }
    if(section.childElementCount) pane.append(node('h3',label),section);
  }
}
function start(course){
  message();
  run={id:crypto.randomUUID(),course,floor:1,turns:0,correct:0,crystals:0,found:[],
    caster:createCaster(petData),maze:generateMaze(1,course),team:profile.team.map(key=>stats(key,profile.owned[key]))};
  explore();
}
const moveLabels=['上','右','下','左'];
function explore(){
  clear();
  message();
  const {maze}=run;
  const title=node('h2',run.course.name+' · '+run.floor+' / '+run.course.floors+'階');
  const hint=node('p','矢印キー・方向ボタン・隣のマスをタップして移動。','walk-hint');
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
  pane.append(group('explore-stage',title,hint,group('maze-layout',map,navigation),party,
    button('探索を終了',leave,false,'leave-expedition')));
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
      const chest=x===maze.chestX&&y===maze.chestY&&!maze.chestOpened;
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
function walk(dx,dy){
  if(!run||!walkView||busy)return;
  const event=movePet(run.maze,dx,dy);
  if(!event)return;
  if(event.kind==='walk')return updateMap();
  walkView=null;
  clear();
  if(event.kind==='chest'){
    const reward=drawReward({...run.course,drop:1},0);
    run.found.push(reward.card);
    pane.append(node('h2','宝箱を開けた！'),node('p',cardName(reward.card)+' を見つけた。'),
      group('reward-art',art('card',Number(reward.card.split('-')[0]))),
      button('探索を続ける',explore,false,'primary'));
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
document.addEventListener('keydown',event=>{
  const i=['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].indexOf(event.key);
  if(!walkView||i<0||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  event.preventDefault();
  walk(...directions[i]);
});
function nextQuestion(continuing=false){
  const current=question(words[run.course.grade].words,run.quiz?.word);
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
  run.deadline=Date.now()+15000;
  battle();
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
  const actions=group('choices battle-actions',attack,magic);
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
  const quiz=group('quiz',group('quiz-title',node('h3',run.quiz.word),timer),
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
  timer.textContent='行動中';
  for(const el of stage.querySelectorAll('button'))el.disabled=true;
  for(const choice of stage.querySelectorAll('.answers button')){
    if(choice.textContent===run.quiz.answer)choice.classList.add('answer-correct');
    else if(choice.textContent===answer)choice.classList.add('answer-incorrect');
  }
  const timely=Date.now()<run.deadline;
  const correct=timely&&answer===run.quiz.answer;
  const events=[];
  const result=playTurn(run,correct,run.action,run.target,run.special,Math.random,event=>events.push(event));
  const verdict=correct?'正解！':(answer&&timely?'不正解':'時間切れ')+' · 正解は「'+run.quiz.answer+'」';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  addBattleLog(log,verdict);
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
  if(run.bossFight)run.caster.mp=run.caster.maxMp;
  run.bossFight=false;
  if(run.floor===run.course.floors)return finish(true);
  run.floor++;
  run.maze=generateMaze(run.floor,run.course);
  for(const unit of [run.caster,...run.team]){
    if(unit.hp>0)unit.hp=Math.min(unit.maxHp,unit.hp+Math.ceil(unit.maxHp*0.15));
  }
  explore();
}
function finish(cleared){
  const bonus=cleared?drawReward(run.course,run.crystals):{crystals:0,card:null};
  run.cleared=cleared;
  run.reward={crystals:bonus.crystals,cards:bonus.card?[...run.found,bonus.card]:[...run.found]};
  results();
}
function results(saved=false){
  clear();
  const {id,reward,correct,turns,floor}=run;
  pane.append(node('h2',run.cleared?'迷宮クリア！':'探索終了'),
    node('p',floor+'階 · '+turns+'ターン · 正解率 '+Math.round(100*correct/Math.max(1,turns))+'%'));
  if(reward.crystals) pane.append(node('p','経験の結晶 ×'+reward.crystals));
  const counts=new Map();
  for(const key of reward.cards)counts.set(key,(counts.get(key)||0)+1);
  if(counts.size){
    pane.append(node('h3','見つけた仲間カード'),group('collection',...[...counts].map(([key,count])=>
      group('unit',art('card',Number(key.split('-')[0])),node('strong',cardName(key)+' ×'+count)))));
  }
  if(saved||(!reward.crystals&&!counts.size))pane.append(button('探索に戻る',lobby,false,'primary'));
  else pane.append(button('報酬を受け取る',()=>save(next=>addReward(next,id,reward),()=>results(true)),false,'primary'));
}
async function initialize(user){
  const current=++generation;
  busy=false;
  walkView=null;
  pane.inert=false;
  pane.hidden=true;
  clear();
  cardRef=null;
  walletRef=null;
  message('管理者権限を確認中…');
  try{
    const session=user&&await accountSession(user);
    if(current!==generation)return;
    if(!session?.admin||session.resetRequired){
      message('もんすた迷宮は管理者向けの先行プレビューです。');
      return;
    }
    const ref=doc(db,'users',user.uid,'apps','monster-maze');
    const wordBank=fetch('../pet-adventure/online-battle-vocab.json').then(response=>{
      if(!response.ok)throw Error('問題データを取得できませんでした。');
      return response.json();
    });
    const wallet=doc(db,'users',user.uid,'apps','english-playroom');
    const [snapshot,data,pet]=await Promise.all([getDoc(ref),wordBank,getDoc(wallet)]);
    if(current!==generation)return;
    cardRef=ref;
    walletRef=wallet;
    words=data.grades;
    petData=pet.data();
    profile=normalizeProfile(snapshot.data());
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
