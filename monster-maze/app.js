import {getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {
  cards,roles,rarities,levelCaps,courses,enemies,bosses,normalizeProfile,stats,upgrade,
  addReward,roomOptions,makeFoes,question,playTurn,drawReward
} from './model.js?v=1';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(entry=>entry.name==='[DEFAULT]')||initializeApp(cfg);
enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const pane=document.querySelector('#game');
const status=document.querySelector('#status');
let profile,cardRef,words,run,busy=false,clock,generation=0;

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
  clear();
  pane.append(node('h2','探索隊'),group('team',...profile.team.map(key=>{
    const unit=stats(key,profile.owned[key]);
    return group('unit',art('card',unit.id),node('strong',cardName(key)),node('small',roles[unit.role]+' · Lv.'+profile.owned[key].level));
  })),button('仲間カード図鑑・編成',()=>collection()));
  pane.append(node('h2','迷宮を選ぶ'),group('choices',...courses.map(course=>
    button(course.name+' · '+course.floors+'階 · 英検'+({4:'4級',3:'3級',pre2:'準2級'}[course.grade]),()=>start(course),false,'primary'))));
}
function collection(draft=[...profile.team]){
  clear();
  pane.append(node('h2','仲間カード図鑑'),node('p','編成 '+draft.length+' / 3　経験の結晶 '+profile.crystals),
    group('choices',button('探索に戻る',lobby),button('編成を保存',()=>save(next=>{
      if(!draft.every(key=>next.owned[key]))return false;
      next.team=[...draft];
    },lobby),draft.length!==3||draft.join()===profile.team.join(),'primary')));
  for(let role=0;role<3;role++){
    const section=group('collection');
    for(const card of cards.filter(item=>item.role===role)){
      const tile=group('unit',art('card',card.id),node('strong',card.name));
      for(let rarity=0;rarity<4;rarity++){
        const key=card.id+'-'+rarity;
        const entry=profile.owned[key];
        if(!entry){
          tile.append(node('small',rarities[rarity]+'　未入手'));
          continue;
        }
        const picked=draft.includes(key);
        const line=group('card-line',node('small',rarities[rarity]+' Lv.'+entry.level+' / '+levelCaps[rarity]+' · 重複 '+entry.copies));
        if(rarity)line.append(node('small',card.skill+' · CT '+stats(key,entry).maxCt));
        line.append(button(picked?'編成から外す':'編成に入れる',()=>collection(picked?draft.filter(id=>id!==key):[...draft,key]),!picked&&draft.length>=3));
        if(entry.level<levelCaps[rarity]){
          line.append(button('結晶で強化',()=>save(next=>upgrade(next,key,false),()=>collection(draft)),!profile.crystals));
          if(entry.copies)line.append(button('重複カードで強化',()=>save(next=>upgrade(next,key,true),()=>collection(draft))));
        }
        tile.append(line);
      }
      section.append(tile);
    }
    pane.append(node('h3',roles[role]),section);
  }
}
function start(course){
  message();
  run={id:crypto.randomUUID(),course,floor:1,turns:0,correct:0,crystals:0,
    team:profile.team.map(key=>stats(key,profile.owned[key]))};
  route();
}
function route(){
  clear();
  pane.append(node('h2',run.course.name+' · '+run.floor+' / '+run.course.floors+'階'));
  pane.append(group('team',...run.team.map(unit=>unitView(unit,'card'))));
  pane.append(node('h3','進む部屋を選ぶ'));
  const options=roomOptions(run.floor,run.course);
  pane.append(group('choices',...options.map(room=>{
    const boss=room.kind==='boss';
    const label=boss?(room.id>6?'怪しげな気配 · ':'ボス · ')+bosses[room.id-1]:
      room.kind==='battle'?enemies[room.id-1]:room.kind==='treasure'?'宝箱':'？';
    return button(label,()=>enter(room),false,'primary');
  })),button('探索をやめる',()=>{if(confirm('今回の探索を終了しますか？'))lobby();}));
}
function enter(room){
  if(room.kind==='treasure'){
    run.crystals++;
    return advance('経験の結晶を1個見つけた！');
  }
  if(room.kind==='mystery'){
    for(const unit of run.team.filter(ally=>ally.hp>0))unit.hp=Math.min(unit.maxHp,unit.hp+Math.ceil(unit.maxHp/4));
    return advance('休息の泉で仲間のHPが回復した！');
  }
  run.foes=makeFoes(room,run.floor);
  run.guard=null;
  nextQuestion();
}
function nextQuestion(){
  const current=question(words[run.course.grade].words,run.quiz?.word);
  run.quiz=current;
  run.action='physical';
  run.target=run.foes.findIndex(foe=>foe.hp>0);
  run.special=null;
  run.deadline=Date.now()+15000;
  battle();
}
function battle(){
  clear();
  pane.append(node('h2',run.floor+'階 · バトル'));
  const enemyRow=group('team');
  for(const [index,foe] of run.foes.entries()){
    const target=button('',()=>{run.target=index;battle();},foe.hp===0,'target');
    target.setAttribute('aria-pressed',String(run.target===index));
    target.append(unitView(foe,foe.major?'boss':'enemy'));
    enemyRow.append(target);
  }
  const allies=group('team',...run.team.map(unit=>{
    const tile=unitView(unit,'card');
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
    const choice=button(roles[i],()=>{run.action=action;battle();});
    choice.setAttribute('aria-pressed',String(action===run.action));
    return choice;
  }));
  const timer=node('span','','timer');
  const quiz=group('quiz',group('quiz-title',node('h3',run.quiz.word),timer),
    group('choices answers',...run.quiz.options.map(option=>button(option,()=>resolveTurn(option),false,'primary'))));
  pane.append(enemyRow,allies,actions,quiz,button('探索をやめる',()=>{if(confirm('今回の探索を終了しますか？'))lobby();}));
  const tick=()=>{
    const seconds=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
    timer.textContent=seconds+'秒';
    if(!seconds)resolveTurn(null);
  };
  clock=setInterval(tick,100);
  tick();
}
function resolveTurn(answer){
  clear();
  const timely=Date.now()<run.deadline;
  const correct=timely&&answer===run.quiz.answer;
  const result=playTurn(run,correct,run.action,run.target,run.special);
  const feedback=correct?'正解！':(answer&&timely?'不正解':'時間切れ')+' · 正解は「'+run.quiz.answer+'」';
  const detail=result==='won'?'敵を倒した！':result==='lost'?'探索隊は全滅した。':'残った敵が反撃した。';
  pane.append(node('h2',feedback),node('p',detail),group('team',...run.team.map(unit=>unitView(unit,'card'))));
  if(result==='lost')pane.append(button('探索に戻る',lobby,false,'primary'));
  else if(result==='won')pane.append(button('進む',()=>advance(),false,'primary'));
  else pane.append(button('次の問題',nextQuestion,false,'primary'));
}
function advance(event){
  if(run.floor===run.course.floors){
    run.reward=drawReward(run.course,run.crystals);
    return results();
  }
  if(event){
    clear();
    pane.append(node('h2',event),button('次の階へ',()=>advance(),false,'primary'));
    return;
  }
  run.floor++;
  route();
}
function results(saved=false){
  clear();
  const {id,reward,correct,turns,floor}=run;
  pane.append(node('h2','迷宮クリア！'),node('p',floor+'階 · '+turns+'ターン · 正解率 '+Math.round(100*correct/Math.max(1,turns))+'%'),
    node('p','経験の結晶 ×'+reward.crystals),node('p',reward.card?'仲間カード · '+cardName(reward.card):'今回の仲間カード獲得はありません。'));
  if(reward.card)pane.append(group('reward-art',art('card',Number(reward.card.split('-')[0]))));
  if(saved)pane.append(button('探索に戻る',lobby,false,'primary'));
  else pane.append(button('報酬を受け取る',()=>save(next=>addReward(next,id,reward),()=>results(true)),false,'primary'));
}
async function initialize(user){
  const current=++generation;
  busy=false;
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
    const [snapshot,data]=await Promise.all([getDoc(ref),wordBank]);
    if(current!==generation)return;
    cardRef=ref;
    words=data.grades;
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
