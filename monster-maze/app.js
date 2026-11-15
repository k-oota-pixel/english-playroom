import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {
  cards,roles,rarities,levelCaps,courses,enemies,bosses,normalizeProfile,stats,upgrade,
  addReward,directions,generateMaze,movePet,makeFoes,mazeSpells,createCaster,spellAvailable,question,playTurn,drawReward
} from './model.js?v=6';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(entry=>entry.name==='[DEFAULT]')||initializeApp(cfg);
enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const pane=document.querySelector('#game');
const status=document.querySelector('#status');
let profile,petData,cardRef,words,run,walkView,busy=false,clock,generation=0;

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
  img.src='./art/'+kind+'-'+id+'.webp';
  img.alt='';
  img.decoding='async';
  return img;
}
function cardName(key){
  const [id,rank]=key.split('-').map(Number);
  return rarities[rank]+' '+cards[id-1].name;
}
function unitView(unit,kind){
  const hp=node('progress');
  hp.max=unit.maxHp;
  hp.value=unit.hp;
  hp.setAttribute('aria-label',unit.name+' HP');
  const tile=group('unit'+(unit.hp===0?' down':''),art(kind,unit.id),node('strong',unit.name),hp,node('small',unit.hp+' / '+unit.maxHp));
  return tile;
}
function battleUnit(unit,kind){
  const fill=node('span','','hp-fill');
  const meter=group('hp-meter',fill);
  meter.setAttribute('role','progressbar');
  meter.setAttribute('aria-label',unit.name+' HP');
  meter.setAttribute('aria-valuemax',String(unit.maxHp));
  const number=node('small','','battle-hp');
  const badge=node('span','','battle-delta');
  badge.setAttribute('aria-hidden','true');
  const tile=group('unit battle-unit',art(kind,unit.id),node('strong',unit.name),meter,number,badge);
  const update=hp=>{
    fill.style.transform='scaleX('+hp/unit.maxHp+')';
    meter.setAttribute('aria-valuenow',String(hp));
    number.textContent=hp+' / '+unit.maxHp;
    tile.classList.toggle('down',hp===0);
  };
  update(unit.hp);
  return {tile,update,badge};
}
function message(text=''){
  status.textContent=text;
  status.hidden=!text;
}
async function save(change,onSuccess,onFailure){
  if(busy||!cardRef)return;
  busy=true;
  const current=generation;
  const ref=cardRef;
  pane.inert=true;
  message('保存中…');
  try{
    const updated=await runTransaction(db,async tx=>{
      const snapshot=await tx.get(ref);
      const next=normalizeProfile(snapshot.data());
      if(change(next)===false)throw Error('最新の所持カードや素材を確認してください。');
      tx.set(ref,next);
      return next;
    });
    if(current!==generation)return;
    profile=updated;
    message('保存しました。');
    onSuccess();
  }catch(error){
    if(current!==generation)return;
    message('保存できませんでした。'+error.message);
    onFailure?.();
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
    return group('unit',art('card',unit.id),node('strong',cardName(key)),node('small',roles[unit.role]+' · Lv.'+profile.owned[key].level));
  })),button('仲間カード編成',()=>collection()));
  pane.append(node('h2','迷宮を選ぶ'),group('choices',...courses.map(course=>
    button(course.name+' · '+course.floors+'階 · 英検'+({4:'4級',3:'3級',pre2:'準2級'}[course.grade]),()=>start(course),false,'primary'))));
}
function collection(draft=[...profile.team]){
  clear();
  pane.append(node('h2','仲間カード編成'),node('p','編成 '+draft.length+' / 3　経験の結晶 '+profile.crystals),
    group('choices',button('探索に戻る',lobby),button('編成を保存',()=>save(next=>{
      if(!draft.every(key=>next.owned[key]))return false;
      next.team=[...draft];
    },lobby),draft.length!==3||draft.join()===profile.team.join(),'primary')));
  for(const [role,label] of roles.entries()){
    const section=group('collection owned-cards');
    for(const card of cards.filter(item=>item.role===role)){
      for(const [rarity,rank] of rarities.entries()){
        const key=card.id+'-'+rarity;
        const entry=profile.owned[key];
        if(!entry)continue;
        const picked=draft.includes(key);
        const portrait=group('card-portrait',art('card',card.id),node('span',rank,'card-rank'));
        const tile=group('unit owned-card rarity-'+rank.toLowerCase(),portrait,node('strong',card.name));
        const line=group('card-line',node('small','Lv.'+entry.level+' / '+levelCaps[rarity]+' · 重複 '+entry.copies));
        if(rarity)line.append(node('small',card.skill+' · CT '+stats(key,entry).maxCt));
        const teamToggle=button(picked?'編成から外す':'編成に入れる',
          ()=>collection(picked?draft.filter(id=>id!==key):[...draft,key]),!picked&&draft.length>=3);
        teamToggle.setAttribute('aria-pressed',String(picked));
        line.append(teamToggle);
        if(entry.level<levelCaps[rarity]){
          line.append(button('結晶で強化',()=>save(next=>upgrade(next,key,false),()=>collection(draft)),!profile.crystals));
          if(entry.copies)line.append(button('重複カードで強化',()=>save(next=>upgrade(next,key,true),()=>collection(draft))));
        }
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
  pane.append(node('h2',run.course.name+' · '+run.floor+' / '+run.course.floors+'階'));
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
  const pet=node('span','','maze-pet');
  pet.setAttribute('role','img');
  pet.setAttribute('aria-label','あなたのペット');
  if(petData?.petHatched){
    const shop=petData.petShop||{};
    const equipped={...shop.equipped};
    delete equipped['pet-frame'];
    pet.innerHTML=renderPetSVG(petData.petAdult===false?null:petData.petAppearance,{...shop,equipped},'',{background:false});
  }else pet.textContent='🥚';
  const controls=group('maze-controls',...directions.map(([dx,dy],i)=>{
    const control=button(['↑','→','↓','←'][i],()=>walk(dx,dy));
    control.setAttribute('aria-label',moveLabels[i]+'に移動');
    return control;
  }));
  const report=node('p','','walk-report');
  report.setAttribute('role','status');
  const exit=maze.bossId?'👑 ボス部屋':'🚪 次の階';
  pane.append(hint,map,controls,node('small','🧰 宝箱　'+exit),report,
    group('team',...run.team.map(unit=>unitView(unit,'card'))),
    button('探索を終了',leave));
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
  run.guard=null;
  run.bossFight=event.kind==='boss';
  const title=run.bossFight?run.foes[0].name+' が道をふさいでいる！':'野生のモンスターが現れた！';
  pane.append(node('h2',title),group('team',...run.foes.map(unit=>unitView(unit,unit.major?'boss':'enemy'))),
    button('戦う',nextQuestion,false,'primary'));
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
function nextQuestion(){
  const current=question(words[run.course.grade].words,run.quiz?.word);
  run.quiz=current;
  run.action='physical';
  run.selectedSpell=null;
  run.target=run.foes.findIndex(foe=>foe.hp>0);
  run.special=null;
  run.deadline=Date.now()+15000;
  battle();
}
function battle(){
  clear();
  pane.append(node('h2',run.floor+'階 · バトル'));
  const stage=group('battle-stage');
  const views=new Map();
  const enemyRow=group('team battle-enemies');
  for(const [index,foe] of run.foes.entries()){
    const target=button('',()=>{run.target=index;battle();},foe.hp===0,'target');
    target.setAttribute('aria-pressed',String(run.target===index));
    const view=battleUnit(foe,foe.major?'boss':'enemy');
    views.set(foe,view);
    target.append(view.tile);
    enemyRow.append(target);
  }
  const allies=group('team',...run.team.map(unit=>{
    const view=battleUnit(unit,'card');
    views.set(unit,view);
    const {tile}=view;
    if(unit.rarity){
      const special=button(unit.skill+' · '+(unit.ct?'CT '+unit.ct:'発動可'),()=>{
        run.special=run.special===unit.key?null:unit.key;
        battle();
      },unit.ct>0||unit.hp===0);
      special.setAttribute('aria-pressed',String(run.special===unit.key));
      tile.append(special);
    }
    return tile;
  }));
  const actions=group('choices',...['physical','magic','heal'].map((action,i)=>{
    const choice=button(roles[i],()=>{run.action=action;run.selectedSpell=null;battle();});
    choice.setAttribute('aria-pressed',String(action===run.action));
    return choice;
  }));
  const feedback=node('p','','battle-feedback');
  feedback.setAttribute('role','status');
  const resultArea=group('battle-result',feedback);
  const controls=group('battle-controls',actions);
  const resolve=option=>void resolveTurn(option,{stage,views,feedback,resultArea,controls});
  const timer=node('span','','timer');
  const quiz=group('quiz',group('quiz-title',node('h3',run.quiz.word),timer),
    group('choices answers',...run.quiz.options.map(option=>button(option,()=>resolve(option),false,'primary'))));
  stage.append(enemyRow,allies,resultArea,controls);
  pane.append(stage);
  if(run.action!=='physical'){
    const {caster}=run;
    const spells=mazeSpells.filter(spell=>spell.kind===(run.action==='heal'?'heal':'attack'));
    const options=group('choices');
    const basic=button('仲間の魔法のみ',()=>{run.selectedSpell=null;battle();});
    basic.setAttribute('aria-pressed',String(!run.selectedSpell));
    options.append(basic);
    for(const spell of spells){
      const lock=caster.level<spell.level?' · Lv.'+spell.level+'で習得':caster.mp<spell.mpCost?' · MP不足':'';
      const choice=button(spell.name+' · MP '+spell.mpCost+lock,()=>{
        run.selectedSpell=spell.id;
        battle();
      },!spellAvailable(caster,spell));
      choice.setAttribute('aria-pressed',String(run.selectedSpell===spell.id));
      options.append(choice);
    }
    controls.append(group('spell-picker',node('p','ぺっとの魔法　MP '+caster.mp+' / '+caster.maxMp),options));
  }
  controls.append(quiz,button('探索を終了',leave));
  const tick=()=>{
    const seconds=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
    timer.textContent=seconds+'秒';
    if(!seconds)resolve(null);
  };
  clock=setInterval(tick,100);
  tick();
}
async function resolveTurn(answer,{stage,views,feedback,resultArea,controls}){
  if(controls.hidden||!stage.isConnected)return;
  clearInterval(clock);
  controls.hidden=true;
  for(const el of stage.querySelectorAll('button')){
    el.disabled=true;
    el.removeAttribute('aria-pressed');
  }
  const timely=Date.now()<run.deadline;
  const correct=timely&&answer===run.quiz.answer;
  const events=[];
  const result=playTurn(run,correct,run.action,run.target,run.special,Math.random,event=>events.push(event));
  const verdict=correct?'正解！':(answer&&timely?'不正解':'時間切れ')+' · 正解は「'+run.quiz.answer+'」';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  feedback.textContent=verdict;
  if(!reduced&&events.length)await delay(240);
  for(const {actor,unit,hp,delta,actionName} of events){
    if(!stage.isConnected)return;
    const source=views.get(actor);
    const {tile,update,badge}=views.get(unit);
    const effect=delta<0?'taking-hit':'being-healed';
    if(source)source.tile.classList.add('acting');
    tile.classList.add(effect);
    badge.textContent=delta>0?'+'+delta:'−'+Math.abs(delta);
    update(hp);
    feedback.textContent=(actor?.name||'ぺっと')+'の'+actionName+'！ '+unit.name+
      (delta>0?'がHPを'+delta+'回復':'に'+Math.abs(delta)+'ダメージ')+(hp===0?' · 撃破':'');
    if(!reduced)await delay(360);
    if(source)source.tile.classList.remove('acting');
    tile.classList.remove(effect);
  }
  if(!stage.isConnected)return;
  const detail=result==='won'?'敵を倒した！':result==='lost'?'探索隊は全滅した。':
    events.some(event=>event.actionName==='反撃')?'敵の反撃が終わった。':'次のターンへ。';
  feedback.textContent=verdict+' '+(run.cast?run.cast+'を唱えた！ ':'')+detail;
  const next=result==='lost'?button('探索結果',()=>finish(false),false,'primary'):
    result==='won'?button('進む',run.bossFight?advance:explore,false,'primary'):
    button('次の問題',nextQuestion,false,'primary');
  resultArea.append(next);
  next.focus({preventScroll:true});
}
function advance(){
  if(run.bossFight)run.caster.mp=run.caster.maxMp;
  run.bossFight=false;
  if(run.floor===run.course.floors)return finish(true);
  run.floor++;
  run.maze=generateMaze(run.floor,run.course);
  for(const unit of run.team){
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
