import {getDoc,setDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {auth,authReady,walletRef} from '../coin-reward.js';
import {hasPet,validPetName,normalizePetName} from '../pet-model.js';
import {renderPetSVG} from '../pet-art.js';
import {ELEMENTS,LEVELS,elementMultiplier,towerCardLevelIndexes,dungeonGradesForStage,isBoss,enemyMaxHp,enemyAttack,attackPowerForLevel,attackPowerForGrade,calculateDamage,checkpointForBest} from './core.js';

const VOCAB_URL='https://k-oota-pixel.github.io/word-breaker/monstudy_vocab_master.json?v=1.5';
const RETRY_URL='https://k-oota-pixel.github.io/eiken-retry/';
const FALLBACK_WORDS={
  junior1:[['apple','りんご'],['book','本'],['water','水'],['school','学校'],['friend','友だち'],['study','勉強する']],
  junior2:[['important','重要な'],['future','未来'],['decide','決める'],['during','〜の間に'],['without','〜なしで'],['possible','可能な']],
  junior3:[['environment','環境'],['provide','提供する'],['increase','増加する'],['instead','その代わりに'],['although','〜だけれども'],['experience','経験']],
  high1:[['avoid','避ける'],['ancient','古代の'],['require','必要とする'],['likely','ありそうな'],['despite','〜にもかかわらず'],['recognize','認識する']],
  high2:[['significant','重要な'],['maintain','維持する'],['consequence','結果'],['perspective','視点'],['inevitable','避けられない'],['approximately','およそ']]
};
const FALLBACK_EIKEN=[
  {id:'f4',grade:'4級',question:'I (____) tennis every Sunday.',choices:[{number:1,text:'play'},{number:2,text:'plays'},{number:3,text:'playing'},{number:4,text:'played'}],answer_number:1},
  {id:'f3',grade:'3級',question:'My sister is good (____) cooking.',choices:[{number:1,text:'at'},{number:2,text:'to'},{number:3,text:'for'},{number:4,text:'by'}],answer_number:1},
  {id:'fp2',grade:'準2級',question:'I was tired, so I decided (____) home early.',choices:[{number:1,text:'go'},{number:2,text:'going'},{number:3,text:'to go'},{number:4,text:'went'}],answer_number:3},
  {id:'f2',grade:'2級',question:'The new system will (____) us to work more efficiently.',choices:[{number:1,text:'enable'},{number:2,text:'prevent'},{number:3,text:'refuse'},{number:4,text:'avoid'}],answer_number:1},
  {id:'fp1',grade:'準1級',question:'The committee decided to (____) the proposal until more data became available.',choices:[{number:1,text:'defer'},{number:2,text:'derive'},{number:3,text:'deter'},{number:4,text:'devise'}],answer_number:1}
];

const $=id=>document.getElementById(id);
const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const storageKey='monstudy-pet-adventure-v1';
const els={modeTitle:$('modeTitle'),towerTab:$('towerTab'),dungeonTab:$('dungeonTab'),stageCard:$('stageCard'),areaLabel:$('areaLabel'),stageLabel:$('stageLabel'),enemyCount:$('enemyCount'),bestLabel:$('bestLabel'),petName:$('petName'),petHpBar:$('petHpBar'),petHpText:$('petHpText'),petVisual:$('petVisual'),enemySide:$('enemySide'),enemyName:$('enemyName'),enemyElement:$('enemyElement'),enemyHpBar:$('enemyHpBar'),enemyHpText:$('enemyHpText'),enemyVisual:$('enemyVisual'),battleFlash:$('battleFlash'),attackPanel:$('attackPanel'),attackHeading:$('attackHeading'),attackHint:$('attackHint'),attackGrid:$('attackGrid'),quizPanel:$('quizPanel'),attackBadge:$('attackBadge'),attackPower:$('attackPower'),questionText:$('questionText'),answerGrid:$('answerGrid'),answerFeedback:$('answerFeedback'),nextBtn:$('nextBtn'),loadingCard:$('loadingCard'),loadingText:$('loadingText'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultKicker:$('resultKicker'),resultTitle:$('resultTitle'),resultText:$('resultText'),retryBtn:$('retryBtn'),checkpointBtn:$('checkpointBtn'),dataNote:$('dataNote'),helpBtn:$('helpBtn'),helpDialog:$('helpDialog'),helpClose:$('helpClose'),helpTitle:$('helpTitle'),helpBody:$('helpBody')};

let user=null,petData={},vocab={},questions=[],stage=1,enemyIndex=0,playerHp=100,enemyHp=1,enemyMax=1,enemyElement='fire',turnCards=[],selectedAttack=null,runActive=false,busy=false,lastQuestionId='';
let records=readRecords();

function readRecords(){try{return {...{towerBest:1,dungeonBest:1},...JSON.parse(localStorage.getItem(storageKey)||'{}')}}catch{return {towerBest:1,dungeonBest:1}}}
function writeRecords(){try{localStorage.setItem(storageKey,JSON.stringify(records))}catch{}}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function randomElement(){const keys=Object.keys(ELEMENTS);return keys[Math.floor(Math.random()*keys.length)]}
function formatStage(n){return mode==='tower'?`${n}F`:`B${n}`}
function bestKey(){return mode==='tower'?'towerBest':'dungeonBest'}
function currentBest(){return Math.max(1,Number(records[bestKey()])||1,Number(petData[mode==='tower'?'wordTowerBest':'eikenDungeonBest'])||1)}
function enemyEmoji(){if(isBoss(stage,enemyIndex))return mode==='tower'?'🐉':'👹';const tower=['👾','🦇','🐺','🦂','🦉'],cave=['🦇','🕷️','🦂','👻','🗿'];const pool=mode==='tower'?tower:cave;return pool[(stage+enemyIndex-1)%pool.length]}
function areaName(){const i=Math.min(4,Math.floor((stage-1)/10));return mode==='tower'?['風の塔','雲の回廊','天空庭園','星見の塔','天界'][i]:['入口の洞窟','青晶洞','古代坑道','溶岩層','深淵遺跡'][i]}
function cleanQuestion(text){return escapeHtml(String(text||'')).replace(/\(____\)/g,'<span class="blank">?</span>')}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function configureMode(){
  document.body.classList.add(mode==='tower'?'tower-mode':'dungeon-mode');
  els.modeTitle.textContent=mode==='tower'?'WORD TOWER':'EIKEN DUNGEON';
  els.towerTab.classList.toggle('active',mode==='tower');els.dungeonTab.classList.toggle('active',mode==='dungeon');
  els.attackHeading.textContent=mode==='tower'?'英単語を選ぼう':'挑戦する英検級を選ぼう';
  els.attackHint.textContent='弱点属性なら ×2 DAMAGE';
  els.helpTitle.textContent=mode==='tower'?'WORD TOWER':'EIKEN DUNGEON';
  els.helpBody.innerHTML=mode==='tower'?'<p>英単語の攻撃カードを選び、日本語の意味を4択で答えます。正解するとペットの攻撃がHIT！</p><ul><li>敵の弱点属性ならダメージ2倍。</li><li>難しいレベルの単語ほど攻撃力が高い。</li><li>1階に敵3体。5階ごとの3体目はBOSS。</li><li>10階ごとに単語レベルが上がります。</li></ul>':'<p>属性と英検級だけを見て攻撃を選びます。押すとリトライノートと同じ問題DBから4択問題が出現します。</p><ul><li>正解で攻撃HIT。不正解では敵が反撃。</li><li>難しい級ほど攻撃力が高い。</li><li>1層に敵3体。5層ごとの3体目はBOSS。</li><li>B16以降は準1級が攻撃候補に登場。</li></ul>';
}

async function loadVocabulary(){
  try{
    const response=await fetch(VOCAB_URL,{cache:'force-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);
    const payload=await response.json(),source=payload?.levels||payload?.courses||payload,next={};
    for(const level of LEVELS){
      const raw=source?.[level.id],rows=Array.isArray(raw)?raw:Array.isArray(raw?.words)?raw.words:[];
      const cleaned=rows.map((x,i)=>({id:String(x?.id||`${level.id}-${i}`),word:String(x?.word||'').trim(),meaning:(Array.isArray(x?.answers)?x.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||''})).filter(x=>x.word&&x.meaning);
      if(cleaned.length<4)throw Error(`${level.id} is too small`);next[level.id]=cleaned;
    }
    vocab=next;return true;
  }catch(error){
    console.warn('WORD TOWER vocabulary fallback',error);
    vocab=Object.fromEntries(LEVELS.map(level=>[level.id,FALLBACK_WORDS[level.id].map((x,i)=>({id:`fallback-${level.id}-${i}`,word:x[0],meaning:x[1]}))]));return false;
  }
}

async function loadEikenQuestions(){
  try{
    const response=await fetch(RETRY_URL,{cache:'force-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);
    const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html'),raw=doc.getElementById('question-data')?.textContent;
    if(!raw)throw Error('question-data not found');
    const parsed=JSON.parse(raw).filter(q=>q&&q.id&&q.grade&&q.question&&Array.isArray(q.choices)&&q.choices.length>=4&&Number(q.answer_number)>0);
    if(parsed.length<20)throw Error('question bank is too small');questions=parsed;return true;
  }catch(error){console.warn('EIKEN DUNGEON question fallback',error);questions=FALLBACK_EIKEN;return false}
}

function petMarkup(data){const juvenile=data.petAdult===false||!data.petAppearance;try{return renderPetSVG(juvenile?null:data.petAppearance,data.petShop||{},juvenile?'baby':'adult')}catch{return '🐾'}}
function installPet(){const juvenile=petData.petAdult===false||!petData.petAppearance;els.petVisual.innerHTML=petMarkup(petData);els.petName.textContent=juvenile?'赤ちゃんペット':validPetName(petData.petName)?normalizePetName(petData.petName):'MY PET'}

function syncHud(){
  els.areaLabel.textContent=areaName();els.stageLabel.textContent=formatStage(stage);els.enemyCount.textContent=`ENEMY ${enemyIndex+1} / 3`;els.bestLabel.textContent=formatStage(currentBest());
  els.petHpBar.style.width=`${Math.max(0,playerHp)}%`;els.petHpText.textContent=`${Math.max(0,playerHp)} / 100`;
  const pct=enemyMax?Math.max(0,enemyHp)/enemyMax*100:0;els.enemyHpBar.style.width=`${pct}%`;els.enemyHpText.textContent=`${Math.max(0,enemyHp)} / ${enemyMax}`;
  const meta=ELEMENTS[enemyElement];els.enemyElement.textContent=`${meta.icon} ${meta.label}`;els.enemyName.textContent=isBoss(stage,enemyIndex)?'BOSS':'ENEMY';els.enemyVisual.textContent=enemyEmoji();
}

function createEnemy(){enemyElement=randomElement();enemyMax=enemyMaxHp(stage,enemyIndex);enemyHp=enemyMax;els.enemyVisual.className='enemy-visual';syncHud();prepareTurn()}
function sampleDifferent(pool,count,excludeId=''){const choices=shuffle(pool.filter(x=>x.id!==excludeId));return choices.slice(0,count)}
function towerCards(){
  const indexes=shuffle(towerCardLevelIndexes(stage)),used=new Set();
  return indexes.map((idx,pos)=>{
    const level=LEVELS[idx],pool=vocab[level.id]||[];let item=null;
    for(const candidate of shuffle(pool)){if(!used.has(candidate.id)){item=candidate;break}}
    item=item||pool[0]||Object.values(vocab)[0][0];used.add(item.id);
    return {id:`${item.id}-${pos}-${Date.now()}`,kind:'word',item,level,element:randomElement(),power:attackPowerForLevel(level.id,stage)};
  })
}
function dungeonCards(){return shuffle(dungeonGradesForStage(stage)).map((grade,pos)=>({id:`${grade}-${pos}-${Date.now()}`,kind:'eiken',grade,element:randomElement(),power:attackPowerForGrade(grade,stage)}))}
function prepareTurn(){if(!runActive||busy)return;selectedAttack=null;turnCards=mode==='tower'?towerCards():dungeonCards();els.quizPanel.hidden=true;els.attackPanel.hidden=false;renderAttackCards()}
function renderAttackCards(){
  els.attackGrid.replaceChildren();
  for(const card of turnCards){
    const weak=elementMultiplier(card.element,enemyElement)>1,meta=ELEMENTS[card.element],button=document.createElement('button');button.type='button';button.className=`attack-card${weak?' weak':''}`;
    const name=card.kind==='word'?card.item.word:card.grade,sub=card.kind==='word'?card.level.label:'EIKEN';
    button.innerHTML=`<span class="element">${meta.icon} ${meta.label}</span><span class="attack-name">${escapeHtml(name)}</span><span class="attack-sub"><span>${sub}</span><span>POWER ${card.power}</span></span>`;
    button.addEventListener('click',()=>openQuestion(card));els.attackGrid.appendChild(button);
  }
}

function towerQuestion(card){
  const all=Object.values(vocab).flat(),distractors=sampleDifferent(all.filter(x=>x.meaning!==card.item.meaning),3,card.item.id);
  const answers=shuffle([{number:1,text:card.item.meaning,correct:true},...distractors.map((x,i)=>({number:i+2,text:x.meaning,correct:false}))]);
  return {id:card.item.id,html:`<strong>${escapeHtml(card.item.word)}</strong> の意味は？`,answers:answers.map((a,i)=>({...a,number:i+1})),correctIndex:answers.findIndex(a=>a.correct)};
}
function pickEikenQuestion(grade){
  const pool=questions.filter(q=>q.grade===grade),filtered=pool.filter(q=>q.id!==lastQuestionId),list=filtered.length?filtered:pool;
  const q=list[Math.floor(Math.random()*list.length)]||FALLBACK_EIKEN.find(x=>x.grade===grade)||FALLBACK_EIKEN[0];lastQuestionId=q.id;return q;
}
function eikenQuestion(card){const q=pickEikenQuestion(card.grade);return {id:q.id,html:cleanQuestion(q.question),answers:q.choices.map(c=>({number:Number(c.number),text:String(c.text),correct:Number(c.number)===Number(q.answer_number)})),correctIndex:q.choices.findIndex(c=>Number(c.number)===Number(q.answer_number))}}
function openQuestion(card){
  if(busy)return;selectedAttack=card;const q=card.kind==='word'?towerQuestion(card):eikenQuestion(card);selectedAttack.question=q;
  const meta=ELEMENTS[card.element];els.attackBadge.textContent=`${meta.icon} ${meta.label}${elementMultiplier(card.element,enemyElement)>1?' · WEAK ×2':''}`;els.attackPower.textContent=`POWER ${card.power}`;els.questionText.innerHTML=q.html;els.answerFeedback.textContent='';els.answerFeedback.className='answer-feedback';els.nextBtn.hidden=true;els.answerGrid.replaceChildren();
  q.answers.forEach((answer,index)=>{const b=document.createElement('button');b.type='button';b.className='answer-btn';b.innerHTML=`<strong>${index+1}.</strong> ${escapeHtml(answer.text)}`;b.addEventListener('click',()=>answerQuestion(index));els.answerGrid.appendChild(b)});
  els.attackPanel.hidden=true;els.quizPanel.hidden=false;els.quizPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function flash(text){els.battleFlash.textContent=text;els.battleFlash.classList.remove('show');void els.battleFlash.offsetWidth;els.battleFlash.classList.add('show')}
function animate(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),650)}
function revealAnswers(chosenIndex,correctIndex){[...els.answerGrid.children].forEach((b,i)=>{b.disabled=true;if(i===correctIndex)b.classList.add('correct');else if(i===chosenIndex)b.classList.add('wrong')})}
function answerQuestion(index){
  if(busy||!selectedAttack)return;busy=true;const q=selectedAttack.question,correct=index===q.correctIndex;revealAnswers(index,q.correctIndex);
  if(correct){
    const mult=elementMultiplier(selectedAttack.element,enemyElement),damage=calculateDamage(selectedAttack.power,mult);enemyHp=Math.max(0,enemyHp-damage);animate(els.petVisual,'attack');animate(els.enemyVisual,'hurt');flash(mult>1?`WEAKNESS!\n-${damage}`:`HIT! -${damage}`);els.answerFeedback.className='answer-feedback ok';els.answerFeedback.textContent=`正解！ ${mult>1?'弱点を突いた！ ':' '}敵に${damage}ダメージ。`;
  }else{
    const damage=enemyAttack(stage,enemyIndex);playerHp=Math.max(0,playerHp-damage);animate(els.petVisual,'hurt');flash(`MISS!\n-${damage} HP`);els.answerFeedback.className='answer-feedback no';els.answerFeedback.textContent=`不正解。敵の反撃で${damage}ダメージ！`;
  }
  syncHud();els.nextBtn.hidden=false;els.nextBtn.textContent=playerHp<=0?'結果を見る →':enemyHp<=0?'次の敵へ →':'次のターン →';busy=false;
}

async function advance(){
  if(busy)return;busy=true;
  if(playerHp<=0){finishRun();busy=false;return}
  if(enemyHp<=0){
    els.enemyVisual.classList.add('defeat');await new Promise(r=>setTimeout(r,360));enemyIndex++;
    if(enemyIndex>=3){enemyIndex=0;stage++;await updateBest(stage);flash(mode==='tower'?`${stage}F!`:`B${stage}!`)}
    busy=false;createEnemy();return;
  }
  els.quizPanel.hidden=true;prepareTurn();busy=false;
}

async function updateBest(value){
  const key=bestKey(),next=Math.max(currentBest(),value);records[key]=next;writeRecords();
  if(!user)return;
  const field=mode==='tower'?'wordTowerBest':'eikenDungeonBest';
  try{await setDoc(walletRef(user),{[field]:next,petAdventureUpdatedAt:serverTimestamp()},{merge:true});petData[field]=next}catch(error){console.warn('best record save failed',error)}
  syncHud();
}
function startRun(startAt=1){stage=Math.max(1,startAt);enemyIndex=0;playerHp=100;runActive=true;els.resultCard.hidden=true;els.attackPanel.hidden=false;createEnemy();window.scrollTo({top:0,behavior:'smooth'})}
function finishRun(){runActive=false;els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.resultCard.hidden=false;els.resultIcon.textContent=mode==='tower'?'🗼':'🕳️';els.resultKicker.textContent=mode==='tower'?'TOWER RUN COMPLETE':'DUNGEON RUN COMPLETE';els.resultTitle.textContent=`到達 ${formatStage(stage)}`;els.resultText.textContent=`最高記録 ${formatStage(currentBest())}。難しい攻撃ほど強いけれど、正解できなければ敵の反撃を受けます。`;els.retryBtn.textContent=mode==='tower'?'1Fから再挑戦':'B1から再挑戦';const cp=checkpointForBest(currentBest());els.checkpointBtn.hidden=cp<=1;els.checkpointBtn.textContent=`${formatStage(cp)}から再開`;els.resultCard.scrollIntoView({behavior:'smooth',block:'center'})}

function showUnavailable(title,text){els.loadingCard.hidden=true;els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.resultCard.hidden=false;els.resultIcon.textContent='🐾';els.resultKicker.textContent='PET ADVENTURE';els.resultTitle.textContent=title;els.resultText.textContent=text;els.retryBtn.hidden=true;els.checkpointBtn.hidden=true}

async function init(){
  configureMode();els.attackPanel.hidden=true;els.quizPanel.hidden=true;
  const dataPromise=mode==='tower'?loadVocabulary():loadEikenQuestions();
  const [dataOk]=await Promise.all([dataPromise,authReady]);user=auth.currentUser;
  if(!user){showUnavailable('ログインが必要です','もんすたでぃのトップでGoogleログインすると、自分のペットと一緒に冒険できます。');return}
  try{const snap=await getDoc(walletRef(user));petData=snap.exists()?(snap.data()||{}):{};if(!hasPet(petData)){showUnavailable('ペットを育てよう','ペットが生まれるとWORD TOWERとEIKEN DUNGEONで一緒に戦えます。');return}installPet()}catch(error){console.error(error);showUnavailable('読み込めませんでした','ペットデータを確認できませんでした。通信状態を確認してください。');return}
  els.loadingCard.hidden=true;els.dataNote.textContent=mode==='tower'?(dataOk?'ワードブレイカーの中1〜高2語彙データを使用中':'予備語彙で起動中'):(dataOk?'リトライノートの英検4級〜準1級問題DBを使用中':'予備問題で起動中');startRun(1);
}

els.nextBtn.addEventListener('click',advance);els.retryBtn.addEventListener('click',()=>startRun(1));els.checkpointBtn.addEventListener('click',()=>startRun(checkpointForBest(currentBest())));els.helpBtn.addEventListener('click',()=>els.helpDialog.showModal());els.helpClose.addEventListener('click',()=>els.helpDialog.close());els.helpDialog.addEventListener('click',e=>{if(e.target===els.helpDialog)els.helpDialog.close()});
init();
