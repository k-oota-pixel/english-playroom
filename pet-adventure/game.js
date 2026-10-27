import {enemyAttackInterval,createAttackClock} from './realtime.js?v=1.10.21';
import {strengthStatsFromAllocation,strengthLevel,incomingDamage,randomBaseStats,hasIndividualBaseStats} from '../pet-strength-model.js?v=1.10.23';
import {MAGIC_SPELLS,DUNGEON_ITEMS,normalizeDungeonInventory,rollMagicAmount} from '../pet-dungeons-model.js?v=1.10.22';
import {getDoc,setDoc,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {auth,db,authReady,walletRef} from '../coin-reward.js?v=2.1.12';
import {hasPet,validPetName,normalizePetName} from '../pet-model.js';
import {renderPetSVG} from '../pet-art.js?v=2.1.2';
import {ELEMENTS,LEVELS,elementMultiplier,towerCardLevelIndexes,dungeonAttackLayout,isBoss,enemyMaxHp,enemyAttack,attackPowerForLevel,attackPowerForGrade,calculateDamage,unlockedStartFloors} from './core.js?v=2.1.8';

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
const exitRunBtn=$('exitRunBtn');
const mode=new URLSearchParams(location.search).get('mode')==='dungeon'?'dungeon':'tower';
const storageKey='monstudy-pet-adventure-v1';
const els={startDialog:$('startDialog'),startTitle:$('startTitle'),startBest:$('startBest'),startFloors:$('startFloors'),modeTitle:$('modeTitle'),stageCard:$('stageCard'),battlefield:$('battlefield'),bossBadge:$('bossBadge'),areaLabel:$('areaLabel'),stageLabel:$('stageLabel'),enemyCount:$('enemyCount'),bestLabel:$('bestLabel'),petName:$('petName'),petHpBar:$('petHpBar'),petHpText:$('petHpText'),petMpBar:$('petMpBar'),petMpText:$('petMpText'),petStats:$('petStats'),petVisual:$('adventurePetVisual'),enemySide:$('enemySide'),enemyName:$('enemyName'),enemyElement:$('enemyElement'),enemyHpBar:$('enemyHpBar'),enemyHpText:$('enemyHpText'),enemyVisual:$('enemyVisual'),battleFlash:$('battleFlash'),attackPanel:$('attackPanel'),attackHeading:$('attackHeading'),attackHint:$('attackHint'),attackGrid:$('attackGrid'),quizPanel:$('quizPanel'),attackBadge:$('attackBadge'),attackPower:$('attackPower'),questionText:$('questionText'),answerGrid:$('answerGrid'),answerFeedback:$('answerFeedback'),nextBtn:$('nextBtn'),loadingCard:$('loadingCard'),loadingText:$('loadingText'),resultCard:$('resultCard'),resultIcon:$('resultIcon'),resultKicker:$('resultKicker'),resultTitle:$('resultTitle'),resultText:$('resultText'),retryBtn:$('retryBtn'),checkpointBtn:$('checkpointBtn'),dataNote:$('dataNote'),helpBtn:$('helpBtn'),helpDialog:$('helpDialog'),helpClose:$('helpClose'),helpTitle:$('helpTitle'),helpBody:$('helpBody'),pauseBtn:$('pauseBtn'),battleStatus:$('battleStatus'),magicBtn:$('magicBtn'),itemBtn:$('itemBtn'),magicDialog:$('magicDialog'),magicClose:$('magicClose'),magicList:$('magicList'),magicMpStatus:$('magicMpStatus'),magicMessage:$('magicMessage'),itemDialog:$('itemDialog'),itemClose:$('itemClose'),itemList:$('itemList'),itemMessage:$('itemMessage')};
els.exitRunBtn=exitRunBtn;

let user=null,petData={},vocab={},questions=[],stage=1,enemyIndex=0,playerHp=10,playerMp=6,enemyHp=1,enemyMax=1,enemyElement='fire',turnCards=[],selectedAttack=null,runActive=false,finishingRun=false,allowNavigation=false,busy=false,lastQuestionId='';
let stats=strengthStatsFromAllocation(),petLevel=1,titleSyncPromise=Promise.resolve();
let adventureTitleEvents=[];
let records=readRecords();
globalThis.MonstudyMaterial?.setActivityGuard(()=>runActive);
let battleFrame=0,manualPaused=false,pendingAdvanceMs=null;
let adventureRunId='',adventureRunUser='',answerSequence=0,enemyDamageTaken=0,runBestAtStart=1,adventureActivityRecorded=false;
let persistedBest=1,bestSavePromise=Promise.resolve(true);

function recordAdventureTitle(kind,payload={},eventSuffix=''){
  if(!adventureRunId||!adventureRunUser)return Promise.resolve();
  const event={kind,sessionId:adventureRunId,floor:stage,itemId:`${adventureRunId}-${stage}`,eventId:`${adventureRunId}-${eventSuffix||kind}`,expectedUid:adventureRunUser,...payload};
  adventureTitleEvents.push(event);return Promise.resolve({queued:true});
}
async function waitForTitleDialogsToClose(){
  while(true){const dialogs=[...document.querySelectorAll('.titles-dialog[open]')];if(!dialogs.length)return;await Promise.race(dialogs.map(dialog=>new Promise(resolve=>dialog.addEventListener('close',resolve,{once:true}))));}
}
async function continueAfterDefeat(titleRequest,runId,clearedStage){
  await Promise.all([Promise.resolve(titleRequest),new Promise(resolve=>setTimeout(resolve,650))]);
  await waitForTitleDialogsToClose();
  if(!runActive||adventureRunId!==runId||stage!==clearedStage||enemyHp>0||playerHp<=0)return;
  enemyIndex=0;stage++;awardMilestoneCoin();
  void updateBest(stage);createEnemy();if(!isBoss(stage,enemyIndex))flash(mode==='tower'?`${stage}F!`:`B${stage}!`);
}
function awardMilestoneCoin(){
  const interval=mode==='tower'?10:5;
  if(stage<interval||stage%interval!==0||!adventureRunId)return;
  const appId=mode==='tower'?'word-tower':'eiken-dungeon',label=mode==='tower'?`${stage}階到達ボーナス！`:`${stage}層到達ボーナス！`;
  const request=window.EnglishPlayroomCoins?.awardOncePerDay?.(appId,`${adventureRunId}-milestone-${stage}`,label);Promise.resolve(request).catch(error=>console.warn('Adventure coin reward deferred',error));
}

const enemyClock=createAttackClock(enemyAttackInterval(1,mode));
function isBattlePaused(){return window.MonstudyMaterial?.paused||manualPaused||document.hidden||els.helpDialog.open||els.magicDialog.open||els.itemDialog.open||!!document.querySelector('.titles-dialog[open]');}
function refreshPause(){
  els.pauseBtn.disabled=!runActive;if(!runActive){els.battleStatus.textContent='FINISH';return;}
  const paused=isBattlePaused();els.pauseBtn.textContent=manualPaused?'再開':'一時停止';els.pauseBtn.setAttribute('aria-pressed',String(manualPaused));els.battleStatus.textContent=paused?'PAUSED':'LIVE';
}
function battleTick(now){
  battleFrame=0;if(!runActive)return;const paused=isBattlePaused(),step=enemyClock.tick(now,paused);refreshPause();
  if(!paused&&enemyHp>0&&step.attack)enemyStrike();
  if(runActive&&!paused&&pendingAdvanceMs!==null){pendingAdvanceMs-=step.delta;if(pendingAdvanceMs<=0){pendingAdvanceMs=null;advance();}}
  if(runActive)battleFrame=requestAnimationFrame(battleTick);
}
function stopBattle(){cancelAnimationFrame(battleFrame);battleFrame=0;pendingAdvanceMs=null;}
function enemyStrike(){
  if(!runActive||playerHp<=0||enemyHp<=0)return;const damage=incomingDamage(enemyAttack(stage,enemyIndex),stats.defense);
  enemyDamageTaken+=damage;playerHp=Math.max(0,playerHp-damage);animate(els.enemyVisual,'attack');animate(els.petVisual,'hurt');flash(`ENEMY ATTACK!\n-${damage} HP`);syncHud();if(playerHp<=0)finishRun();
}
function togglePause(){if(!runActive)return;manualPaused=!manualPaused;enemyClock.tick(performance.now(),true);refreshPause();}
document.addEventListener('monstudy:pause',()=>{enemyClock.tick(performance.now(),true);refreshPause();});
document.addEventListener('visibilitychange',()=>{enemyClock.tick(performance.now(),true);refreshPause();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(battleFrame);battleFrame=0;enemyClock.tick(performance.now(),true);});
window.addEventListener('beforeunload',event=>{if((!runActive&&!finishingRun)||allowNavigation)return;event.preventDefault();event.returnValue='';});
document.addEventListener('click',event=>{const link=event.target.closest?.('#battleView a[href]');if(!runActive||!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(window.confirm('冒険中です。「終了・保存」を押すと今回の記録を保存できます。このまま画面を移動すると今回の記録は保存されません。移動しますか？')){allowNavigation=true;location.href=link.href;}});
window.addEventListener('pageshow',()=>{allowNavigation=false;if(runActive&&!battleFrame){enemyClock.tick(performance.now(),true);battleFrame=requestAnimationFrame(battleTick);}});

function readRecords(){try{return {...{towerBest:1,dungeonBest:1},...JSON.parse(localStorage.getItem(storageKey+'-'+(user?.uid||'guest'))||'{}')}}catch{return {towerBest:1,dungeonBest:1}}}
function writeRecords(){try{localStorage.setItem(storageKey+'-'+(user?.uid||'guest'),JSON.stringify(records))}catch{}}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function randomEnemyElement(){const keys=['fire','water','leaf'];return keys[Math.floor(Math.random()*keys.length)]}
function assignElements(cards){const deck=shuffle(Object.keys(ELEMENTS));return cards.map((card,index)=>({...card,element:deck[index%deck.length]}))}
function formatStage(n){return mode==='tower'?`${n}F`:`B${n}`}
function bestKey(){return mode==='tower'?'towerBest':'dungeonBest'}
function currentBest(){return Math.max(1,Number(records[bestKey()])||1,Number(petData[mode==='tower'?'wordTowerBest':'eikenDungeonBest'])||1)}
function enemyEmoji(){if(isBoss(stage,enemyIndex))return mode==='tower'?'🐉':'👹';const tower=['👾','🦇','🐺','🦂','🦉'],cave=['🦇','🕷️','🦂','👻','🗿'];const pool=mode==='tower'?tower:cave;return pool[(stage+enemyIndex-1)%pool.length]}
function areaName(){const i=Math.min(4,Math.floor((stage-1)/10));return mode==='tower'?['風の塔','雲の回廊','天空庭園','星見の塔','天界'][i]:['入口の洞窟','青晶洞','古代坑道','溶岩層','深淵遺跡'][i]}
function cleanQuestion(text){return escapeHtml(String(text||'')).replace(/\(____\)/g,'<span class="blank">?</span>')}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function generationOf(data={}){const n=Number(data.petGeneration);return Number.isSafeInteger(n)&&n>0?n:1}
function lastDepartureGeneration(data={}){const n=Number(data.petLastDeparture?.generation);return Number.isSafeInteger(n)&&n>0?n:0}

function configureMode(){
  document.body.classList.add(mode==='tower'?'tower-mode':'dungeon-mode');els.modeTitle.textContent=mode==='tower'?'魔王の塔':'魔物の巣窟';els.attackHeading.textContent=mode==='tower'?'英単語を選ぼう':'挑戦する英検級を選ぼう';els.attackHint.textContent='相性の良い攻撃でCRITICAL';els.helpTitle.textContent=mode==='tower'?'魔王の塔':'魔物の巣窟';
  els.helpBody.innerHTML=mode==='tower'?'<p>英単語の攻撃カードを選び、日本語の意味を4択で答えます。正解するとペットの攻撃がHIT！</p><ul><li>敵の弱点属性ならダメージ2倍。</li><li>難しいレベルの単語ほど攻撃力が高い。</li><li>1階に敵1体。5階ごとの敵はBOSS。倒すとHP・MP全回復！</li><li>10階ごとに単語レベルが上がります。</li><li>10階到達ごとに1コイン。再挑戦でも獲得できます。</li></ul>':'<p>属性と英検級だけを見て攻撃を選びます。押すとリトライノートと同じ問題DBから4択問題が出現します。</p><ul><li>正解で攻撃HIT。不正解は攻撃失敗。</li><li>難しい級ほど攻撃力が高い。</li><li>1層に敵1体。5層ごとの敵はBOSS。倒すとHP・MP全回復！</li><li>5層ごとに出題級が段階的に上がり、相性の良い攻撃は上位の級。41層からは準1級のみ。</li><li>5層到達ごとに1コイン。再挑戦でも獲得できます。</li></ul>';
  els.helpBody.innerHTML+='<p>「魔法」「アイテム」は戦闘中いつでも使用できます。魔法はペットレベルで習得しMPを消費します。アイテムはSHOPの「ダンジョンズ」で購入できます。冒険が終わると、獲得した称号をまとめて確認できます。</p><p>敵は一定間隔で攻撃！ 問題・解答の選択中も時間は進みます。一時停止・遊び方・魔法・アイテム・別タブ表示中は時間が止まります。</p>';
}

async function loadVocabulary(){
  try{const response=await fetch(VOCAB_URL,{cache:'force-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);const payload=await response.json(),source=payload?.levels||payload?.courses||payload,next={};for(const level of LEVELS){const raw=source?.[level.id],rows=Array.isArray(raw)?raw:Array.isArray(raw?.words)?raw.words:[];const cleaned=rows.map((x,i)=>({id:String(x?.id||`${level.id}-${i}`),word:String(x?.word||'').trim(),meaning:(Array.isArray(x?.answers)?x.answers:[]).find(v=>typeof v==='string'&&v.trim())?.trim()||''})).filter(x=>x.word&&x.meaning);if(cleaned.length<4)throw Error(`${level.id} is too small`);next[level.id]=cleaned;}vocab=next;return true;}catch(error){console.warn('魔王の塔 vocabulary fallback',error);vocab=Object.fromEntries(LEVELS.map(level=>[level.id,FALLBACK_WORDS[level.id].map((x,i)=>({id:`fallback-${level.id}-${i}`,word:x[0],meaning:x[1]}))]));return false;}
}
async function loadEikenQuestions(){
  try{const response=await fetch(RETRY_URL,{cache:'force-cache'});if(!response.ok)throw Error(`HTTP ${response.status}`);const html=await response.text(),doc=new DOMParser().parseFromString(html,'text/html'),raw=doc.getElementById('question-data')?.textContent;if(!raw)throw Error('question-data not found');const parsed=JSON.parse(raw).filter(q=>q&&q.id&&q.grade&&q.question&&Array.isArray(q.choices)&&q.choices.length>=4&&Number(q.answer_number)>0);if(parsed.length<20)throw Error('question bank is too small');questions=parsed;return true;}catch(error){console.warn('魔物の巣窟 question fallback',error);questions=FALLBACK_EIKEN;return false;}
}
function petMarkup(data){const juvenile=data.petAdult===false||!data.petAppearance;try{return renderPetSVG(juvenile?null:data.petAppearance,data.petShop||{},juvenile?'baby':'adult',{background:false})}catch{return '🐾'}}
function installPet(){const juvenile=petData.petAdult===false||!petData.petAppearance;els.petVisual.innerHTML=petMarkup(petData);els.petName.textContent=juvenile?'赤ちゃんペット':validPetName(petData.petName)?normalizePetName(petData.petName):'MY PET'}
async function ensureAdventurePetStats(data){
  const generation=generationOf(data),storedGeneration=Number(data.petBaseStatsGeneration)||0,generationChanged=storedGeneration>0&&storedGeneration!==generation,migratedAfterDeparture=!storedGeneration&&lastDepartureGeneration(data)>0&&lastDepartureGeneration(data)<generation;
  if(hasIndividualBaseStats(data.petBaseStats)&&storedGeneration===generation)return data;
  const patch={petBaseStats:randomBaseStats(),petBaseStatsGeneration:generation,petUpdatedAt:serverTimestamp()};if(generationChanged||migratedAfterDeparture){patch.petStrength={hp:0,attack:0,defense:0,mp:0};patch.petStrengthLevelPoints=0;}
  await setDoc(walletRef(user),patch,{merge:true});return {...data,...patch};
}

function syncActionAvailability(){const usable=runActive&&playerHp>0&&enemyHp>0;els.magicBtn.disabled=!usable;els.itemBtn.disabled=!usable;exitRunBtn.disabled=!runActive||finishingRun;}
function syncStatLine(){els.petStats.textContent=`Lv.${petLevel} · HP ${stats.hp} · 攻撃力 ${stats.attack} · 防御力 ${stats.defense} · MP ${stats.mp}`;}
function syncHud(){
  els.areaLabel.textContent=areaName();els.stageLabel.textContent=formatStage(stage);els.enemyCount.textContent=isBoss(stage,enemyIndex)?'BOSS 1 / 1':'ENEMY 1 / 1';els.bestLabel.textContent=formatStage(currentBest());
  els.petHpBar.style.width=`${Math.max(0,playerHp)/stats.hp*100}%`;els.petHpText.textContent=`${Math.max(0,playerHp)} / ${stats.hp}`;els.petMpBar.style.width=`${Math.max(0,playerMp)/stats.mp*100}%`;els.petMpText.textContent=`${Math.max(0,playerMp)} / ${stats.mp} MP`;
  const pct=enemyMax?Math.max(0,enemyHp)/enemyMax*100:0;els.enemyHpBar.style.width=`${pct}%`;els.enemyHpText.textContent=`${Math.max(0,enemyHp)} / ${enemyMax}`;const meta=ELEMENTS[enemyElement];els.enemyElement.textContent=`${meta.icon} ${meta.label}`;els.enemyName.textContent=isBoss(stage,enemyIndex)?'BOSS':'ENEMY';els.enemyVisual.textContent=enemyEmoji();syncActionAvailability();
}
function createEnemy(){enemyClock.reset(enemyAttackInterval(stage,mode));pendingAdvanceMs=null;enemyDamageTaken=0;enemyElement=randomEnemyElement();enemyMax=enemyMaxHp(stage,enemyIndex);enemyHp=enemyMax;els.enemyVisual.className='enemy-visual';const boss=isBoss(stage,enemyIndex);els.battlefield.classList.toggle('boss-battle',boss);els.stageCard.classList.toggle('boss-stage',boss);els.bossBadge.hidden=!boss;syncHud();prepareTurn();if(boss)flash(`BOSS BATTLE!\n${formatStage(stage)}`)}
function sampleDifferent(pool,count,excludeId=''){const choices=shuffle(pool.filter(x=>x.id!==excludeId));return choices.slice(0,count)}
function towerCards(){const indexes=shuffle(towerCardLevelIndexes(stage)),used=new Set();return assignElements(indexes.map((idx,pos)=>{const level=LEVELS[idx],pool=vocab[level.id]||[];let item=null;for(const candidate of shuffle(pool)){if(!used.has(candidate.id)){item=candidate;break}}item=item||pool[0]||Object.values(vocab)[0][0];used.add(item.id);return {id:`${item.id}-${pos}-${Date.now()}`,kind:'word',item,level,power:attackPowerForLevel(level.id,stage)+stats.attack};}))}
function dungeonCards(){return shuffle(dungeonAttackLayout(stage,enemyElement)).map(({grade,element},pos)=>({id:`${grade}-${pos}-${Date.now()}`,kind:'eiken',grade,element,power:attackPowerForGrade(grade,stage)+stats.attack}))}
function prepareTurn(){if(!runActive||busy)return;selectedAttack=null;turnCards=mode==='tower'?towerCards():dungeonCards();els.quizPanel.hidden=true;els.attackPanel.hidden=false;renderAttackCards()}
function renderAttackCards(){els.attackGrid.replaceChildren();for(const card of turnCards){const critical=elementMultiplier(card.element,enemyElement)>1,meta=ELEMENTS[card.element],button=document.createElement('button');button.type='button';button.className=`attack-card${critical?' critical':''}`;const name=card.kind==='word'?card.item.word:card.grade,sub=card.kind==='word'?card.level.label:'EIKEN';button.innerHTML=`<span class="element">${meta.icon} ${meta.label}</span><span class="attack-name">${escapeHtml(name)}</span><span class="attack-sub"><span>${sub}</span><span>POWER ${card.power}</span></span>`;button.addEventListener('click',()=>openQuestion(card));els.attackGrid.appendChild(button);}}
function towerQuestion(card){const all=Object.values(vocab).flat(),distractors=sampleDifferent(all.filter(x=>x.meaning!==card.item.meaning),3,card.item.id);const answers=shuffle([{number:1,text:card.item.meaning,correct:true},...distractors.map((x,i)=>({number:i+2,text:x.meaning,correct:false}))]);return {id:card.item.id,html:`<strong>${escapeHtml(card.item.word)}</strong> の意味は？`,answers:answers.map((a,i)=>({...a,number:i+1})),correctIndex:answers.findIndex(a=>a.correct)}}
function pickEikenQuestion(grade){const pool=questions.filter(q=>q.grade===grade),filtered=pool.filter(q=>q.id!==lastQuestionId),list=filtered.length?filtered:pool;const q=list[Math.floor(Math.random()*list.length)]||FALLBACK_EIKEN.find(x=>x.grade===grade)||FALLBACK_EIKEN[0];lastQuestionId=q.id;return q;}
function eikenQuestion(card){const q=pickEikenQuestion(card.grade);return {id:q.id,html:cleanQuestion(q.question),answers:q.choices.map(c=>({number:Number(c.number),text:String(c.text),correct:Number(c.number)===Number(q.answer_number)})),correctIndex:q.choices.findIndex(c=>Number(c.number)===Number(q.answer_number))}}
function fitQuestionText(){if(els.quizPanel.hidden)return;for(const node of [els.questionText,...els.answerGrid.children]){node.style.fontSize='';let size=parseFloat(getComputedStyle(node).fontSize);while((node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)&&size>12){size=Math.max(12,size-.5);node.style.fontSize=`${size}px`;}}}
window.addEventListener('resize',fitQuestionText);
function openQuestion(card){
  if(busy||!runActive||isBattlePaused()||playerHp<=0||enemyHp<=0)return;selectedAttack=card;const q=card.kind==='word'?towerQuestion(card):eikenQuestion(card);selectedAttack.question=q;const meta=ELEMENTS[card.element];els.attackBadge.textContent=`${meta.icon} ${meta.label}${elementMultiplier(card.element,enemyElement)>1?' · CRITICAL':''}`;els.attackPower.textContent=`POWER ${card.power}`;els.questionText.innerHTML=q.html;els.answerFeedback.textContent='';els.answerFeedback.className='answer-feedback';els.nextBtn.hidden=true;els.answerGrid.replaceChildren();q.answers.forEach((answer,index)=>{const b=document.createElement('button');b.type='button';b.className='answer-btn';b.innerHTML=`<strong>${index+1}.</strong> ${escapeHtml(answer.text)}`;b.addEventListener('click',()=>{if(selectedAttack?.question===q)answerQuestion(index);});els.answerGrid.appendChild(b)});els.attackPanel.hidden=true;els.quizPanel.hidden=false;fitQuestionText();
}

function flash(text){els.battleFlash.textContent=text;els.battleFlash.classList.remove('show');void els.battleFlash.offsetWidth;els.battleFlash.classList.add('show')}
function animate(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),650)}
function revealAnswers(chosenIndex,correctIndex){[...els.answerGrid.children].forEach((b,i)=>{b.disabled=true;if(i===correctIndex)b.classList.add('correct');else if(i===chosenIndex)b.classList.add('wrong')})}
function finishEnemyDefeat(titleRequest){
  const boss=isBoss(stage,enemyIndex);selectedAttack=null;[...els.answerGrid.children].forEach(b=>b.disabled=true);pendingAdvanceMs=null;
  if(boss){playerHp=stats.hp;playerMp=stats.mp;flash('BOSS CLEAR!\nHP & MP FULL!');}
  syncHud();void continueAfterDefeat(titleRequest,adventureRunId,stage);return boss;
}
function answerQuestion(index){
  if(busy||!runActive||isBattlePaused()||!selectedAttack||playerHp<=0||enemyHp<=0)return;busy=true;const q=selectedAttack.question,correct=index===q.correctIndex;revealAnswers(index,q.correctIndex);if(!adventureActivityRecorded){adventureActivityRecorded=true;void window.EnglishPlayroomCoins?.recordLearningActivity?.(mode==='tower'?'adventure-tower':'adventure-dungeon');}recordAdventureTitle('answer',{itemId:String(q.id),correct,critical:correct&&elementMultiplier(selectedAttack.element,enemyElement)>1},`answer-${++answerSequence}`);
  let defeatTitleRequest=null;
  if(correct){const mult=elementMultiplier(selectedAttack.element,enemyElement),damage=calculateDamage(selectedAttack.power,mult);enemyHp=Math.max(0,enemyHp-damage);animate(els.petVisual,'attack');animate(els.enemyVisual,'hurt');flash(mult>1?`CRITICAL HIT!\n-${damage}`:`HIT! -${damage}`);els.answerFeedback.className='answer-feedback ok';els.answerFeedback.textContent=`正解！ ${mult>1?'CRITICAL HIT! ':' '}敵に${damage}ダメージ。`;if(enemyHp===0)defeatTitleRequest=recordAdventureTitle('defeat',{noDamage:enemyDamageTaken===0},`defeat-${stage}`);}else{flash('MISS!');els.answerFeedback.className='answer-feedback no';els.answerFeedback.textContent='不正解。攻撃失敗！ 正解を確認して次の攻撃へ。';}
  selectedAttack=null;syncHud();
  if(enemyHp<=0){els.nextBtn.hidden=true;const boss=finishEnemyDefeat(defeatTitleRequest);if(boss)els.answerFeedback.textContent+=' ボス撃破！ HP・MP全回復！';}
  else{els.nextBtn.hidden=false;els.nextBtn.textContent='次の攻撃 →';pendingAdvanceMs=correct?450:1100;}
  busy=false;
}

function canUseBattleAction(){return runActive&&playerHp>0&&enemyHp>0&&!busy;}
function actionDialogClosed(){enemyClock.tick(performance.now(),true);refreshPause();}
function renderMagic(message='',error=false){
  els.magicMpStatus.textContent=`Lv.${petLevel}　MP ${playerMp} / ${stats.mp}`;els.magicMessage.textContent=message;els.magicMessage.classList.toggle('error',error);els.magicList.replaceChildren();
  for(const spell of MAGIC_SPELLS){const unlocked=petLevel>=spell.level,full=spell.kind==='heal'&&playerHp>=stats.hp,card=document.createElement('article');card.className='battle-action-card'+(unlocked?'':' locked');card.innerHTML=`<strong>${spell.name}</strong><span>${unlocked?spell.description:`Lv.${spell.level}で習得`}</span><small>${unlocked?`消費MP ${spell.mpCost}`:'LOCKED'}</small><button type="button">${unlocked?'使う':'未習得'}</button>`;const button=card.querySelector('button');button.disabled=busy||!unlocked||playerMp<spell.mpCost||full;button.addEventListener('click',()=>castMagic(spell));els.magicList.append(card);}
}
function openMagic(){if(!canUseBattleAction())return;enemyClock.tick(performance.now(),true);renderMagic();els.magicDialog.showModal();refreshPause();}
function castMagic(spell){
  if(busy||!runActive||enemyHp<=0||playerHp<=0||petLevel<spell.level||playerMp<spell.mpCost)return;if(spell.kind==='heal'&&playerHp>=stats.hp){renderMagic('HPは満タンです。',true);return;}busy=true;playerMp-=spell.mpCost;const rolled=rollMagicAmount(spell.base);
  if(spell.kind==='heal'){const before=playerHp;playerHp=Math.min(stats.hp,playerHp+rolled);const actual=playerHp-before;animate(els.petVisual,'attack');flash(`✨ ${spell.name}\nHP +${actual}`);busy=false;syncHud();els.magicDialog.close();return;}
  enemyHp=Math.max(0,enemyHp-rolled);animate(els.petVisual,'attack');animate(els.enemyVisual,'hurt');flash(`✨ ${spell.name}\n-${rolled}`);const defeated=enemyHp===0,titleRequest=defeated?recordAdventureTitle('defeat',{noDamage:enemyDamageTaken===0},`defeat-${stage}`):null;busy=false;syncHud();els.magicDialog.close();if(defeated){const boss=finishEnemyDefeat(titleRequest);if(boss)flash(`${spell.name}!\nBOSS CLEAR!`);}else{els.answerFeedback.textContent=`${spell.name}！ 敵に${rolled}ダメージ！`;els.answerFeedback.className='answer-feedback ok';}
}

async function refreshInventory(){const snap=await getDoc(walletRef(user));if(snap.exists())petData={...petData,...snap.data()};return normalizeDungeonInventory(petData.petDungeonItems);}
function renderItems(inventory,message='',error=false){
  els.itemMessage.textContent=message;els.itemMessage.classList.toggle('error',error);els.itemList.replaceChildren();
  for(const item of DUNGEON_ITEMS){const count=inventory[item.id]||0,full=item.kind==='hp'?playerHp>=stats.hp:playerMp>=stats.mp,card=document.createElement('article');card.className='battle-action-card';card.innerHTML=`<strong>${item.icon} ${item.name}</strong><span>${item.description}</span><small>所持 ${count}個</small><button type="button">使う</button>`;const button=card.querySelector('button');button.disabled=busy||count<1||full;button.addEventListener('click',()=>useItem(item));els.itemList.append(card);}
}
async function openItems(){if(!canUseBattleAction())return;enemyClock.tick(performance.now(),true);els.itemList.innerHTML='<p>持ち物を読み込み中…</p>';els.itemMessage.textContent='';els.itemDialog.showModal();refreshPause();try{const inventory=await refreshInventory();if(els.itemDialog.open)renderItems(inventory);}catch(error){if(els.itemDialog.open)renderItems(normalizeDungeonInventory(petData.petDungeonItems),error?.message||'持ち物を読み込めませんでした。',true);}}
async function useItem(item){
  if(busy||!runActive||enemyHp<=0||playerHp<=0)return;if(item.kind==='hp'&&playerHp>=stats.hp){renderItems(normalizeDungeonInventory(petData.petDungeonItems),'HPは満タンです。',true);return;}if(item.kind==='mp'&&playerMp>=stats.mp){renderItems(normalizeDungeonInventory(petData.petDungeonItems),'MPは満タンです。',true);return;}
  busy=true;
  try{
    const nextInventory=await runTransaction(db,async tx=>{const ref=walletRef(user),snap=await tx.get(ref),data=snap.data()||{},inventory=normalizeDungeonInventory(data.petDungeonItems);if((inventory[item.id]||0)<1)throw Error(`${item.name}を持っていません。`);inventory[item.id]-=1;tx.set(ref,{petDungeonItems:inventory,petUpdatedAt:serverTimestamp()},{merge:true});return inventory;});
    petData.petDungeonItems=nextInventory;let actual=0;if(item.kind==='hp'){const before=playerHp;playerHp=Math.min(stats.hp,playerHp+item.amount);actual=playerHp-before;flash(`${item.icon} ${item.name}\nHP +${actual}`);}else{const before=playerMp;playerMp=Math.min(stats.mp,playerMp+item.amount);actual=playerMp-before;flash(`${item.icon} ${item.name}\nMP +${actual}`);}busy=false;syncHud();els.itemDialog.close();
  }catch(error){busy=false;renderItems(normalizeDungeonInventory(petData.petDungeonItems),error?.message||'アイテムを使えませんでした。',true);}
}

function advance(){if(busy||!runActive||isBattlePaused()||playerHp<=0)return;pendingAdvanceMs=null;if(enemyHp<=0)return;els.quizPanel.hidden=true;prepareTurn();}
function updateBest(value){const key=bestKey(),next=Math.max(currentBest(),value);records[key]=next;syncHud();}
function persistBest(){
 if(!user)return Promise.resolve(false);
 const next=currentBest();if(next<=persistedBest)return Promise.resolve(true);
 bestSavePromise=bestSavePromise.catch(()=>{}).then(async()=>{
   const target=currentBest();if(target<=persistedBest)return true;
   const field=mode==='tower'?'wordTowerBest':'eikenDungeonBest';
   await setDoc(walletRef(user),{[field]:target,petAdventureUpdatedAt:serverTimestamp()},{merge:true});
   persistedBest=target;petData[field]=target;return true;
 }).catch(error=>{console.warn('best record save failed',error);return false;});
 return bestSavePromise;
}
async function startRun(startAt=1){
 if(startRun.loading||finishingRun)return;startRun.loading=true;
 try{await titleSyncPromise;stats=strengthStatsFromAllocation(petData.petStrength,petData.petBaseStats);petLevel=strengthLevel(petData.petStrengthLevelPoints,petData.petStrength);syncStatLine();}
 catch(error){console.error(error);alert("称号の同期を確認できませんでした。通信を確認して再度お試しください。");return;}finally{startRun.loading=false;}
els.startDialog.close();stopBattle();adventureRunId=crypto.randomUUID();adventureRunUser=user?.uid||'';answerSequence=0;adventureActivityRecorded=false;adventureTitleEvents=[];manualPaused=false;busy=false;selectedAttack=null;runBestAtStart=currentBest();stage=unlockedStartFloors(runBestAtStart).includes(startAt)?startAt:1;enemyIndex=0;playerHp=stats.hp;playerMp=stats.mp;runActive=true;els.resultCard.hidden=true;els.exitRunBtn.hidden=false;els.attackPanel.hidden=false;recordAdventureTitle('run',{score:0},'start');createEnemy();refreshPause();battleFrame=requestAnimationFrame(battleTick);}
function chooseStartFloor(){runActive=false;stopBattle();refreshPause();syncActionAvailability();els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.startTitle.textContent=mode==='tower'?'開始する階を選ぼう':'開始する層を選ぼう';els.startBest.textContent='最高到達記録 '+formatStage(currentBest());els.startFloors.replaceChildren();for(const floor of unlockedStartFloors(currentBest())){const button=document.createElement('button');button.type='button';button.className='secondary-btn';button.dataset.startFloor=String(floor);button.textContent=(mode==='tower'?floor+'階':'地下'+floor+'層')+'から挑戦';button.addEventListener('click',()=>startRun(floor));els.startFloors.append(button);}els.startDialog.showModal();}
async function finishRun(reason='defeat'){
 if(!runActive||finishingRun)return;
 finishingRun=true;runActive=false;stopBattle();refreshPause();syncActionAvailability();
 records[bestKey()]=currentBest();if(currentBest()>runBestAtStart)writeRecords();
 if(adventureTitleEvents.length){
  const run=adventureTitleEvents.find(event=>event.kind==='run');if(run){run.floor=Math.max(run.floor,stage);run.score=Math.max(run.score||0,stage);}
  const events=adventureTitleEvents.splice(0),appId=mode==='tower'?'word-tower':'eiken-dungeon';
  const coinApi=window.EnglishPlayroomCoins;const submission=typeof coinApi?.recordTitleEvents==='function'?coinApi.recordTitleEvents(appId,events):Promise.all(events.map(event=>coinApi?.recordTitleEvent?.(appId,event)));titleSyncPromise=Promise.resolve(submission).catch(error=>console.warn('Adventure title sync deferred',error));
 }
 const improved=currentBest()>persistedBest,saved=await persistBest();
 if(saved&&improved)window.dispatchEvent(new CustomEvent('pet-adventure:run-finished',{detail:{best:currentBest(),reason}}));
 finishingRun=false;refreshPause();syncActionAvailability();selectedAttack=null;[...els.answerGrid.children].forEach(b=>b.disabled=true);els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.exitRunBtn.hidden=true;els.resultCard.hidden=false;els.resultIcon.textContent=reason==='manual'?'🏁':(mode==='tower'?'🗼':'🕳️');els.resultKicker.textContent=reason==='manual'?'RUN SAVED':(mode==='tower'?'TOWER RUN COMPLETE':'DUNGEON RUN COMPLETE');els.resultTitle.textContent=reason==='manual'?`途中終了 · ${formatStage(stage)}`:`到達 ${formatStage(stage)}`;els.resultText.textContent=saved?`最高記録 ${formatStage(currentBest())}。今回の記録を保存しました。`:`最高記録 ${formatStage(currentBest())}。端末には記録しましたが、クラウド保存に失敗しました。通信を確認してください。`;els.retryBtn.textContent=mode==='tower'?'1Fから再挑戦':'B1から再挑戦';els.retryBtn.disabled=false;els.checkpointBtn.hidden=unlockedStartFloors(currentBest()).length<=1;els.checkpointBtn.textContent='開始する'+(mode==='tower'?'階':'層')+'を選ぶ';}
function showUnavailable(title,text){els.pauseBtn.disabled=true;els.magicBtn.disabled=true;els.itemBtn.disabled=true;els.loadingCard.hidden=true;els.attackPanel.hidden=true;els.quizPanel.hidden=true;els.resultCard.hidden=false;els.resultIcon.textContent='🐾';els.resultKicker.textContent='PET ADVENTURE';els.resultTitle.textContent=title;els.resultText.textContent=text;els.retryBtn.hidden=true;els.checkpointBtn.hidden=true;}

async function init(){
  configureMode();els.attackPanel.hidden=true;els.quizPanel.hidden=true;const dataPromise=mode==='tower'?loadVocabulary():loadEikenQuestions();const [dataOk]=await Promise.all([dataPromise,authReady]);user=auth.currentUser;records=readRecords();if(!user){showUnavailable('ログインが必要です','もんすたでぃのトップでGoogleログインすると、自分のペットと一緒に冒険できます。');return}
  try{const snap=await getDoc(walletRef(user));petData=snap.exists()?(snap.data()||{}):{};if(!hasPet(petData)){showUnavailable('ペットを育てよう','ペットが生まれると魔王の塔と魔物の巣窟で一緒に戦えます。');return}persistedBest=Math.max(1,Number(petData[mode==='tower'?'wordTowerBest':'eikenDungeonBest'])||1);petData=await ensureAdventurePetStats(petData);stats=strengthStatsFromAllocation(petData.petStrength,petData.petBaseStats);petLevel=strengthLevel(petData.petStrengthLevelPoints,petData.petStrength);installPet();syncStatLine();}catch(error){console.error(error);showUnavailable('読み込めませんでした','ペットデータを確認できませんでした。通信状態を確認してください。');return}
   els.loadingCard.hidden=true;els.dataNote.textContent=(mode==='tower'?(dataOk?'ワードブレイカーの中1〜高2語彙データを使用中':'予備語彙で起動中'):(dataOk?'リトライノートの英検4級〜準1級問題DBを使用中':'予備問題で起動中'))+' · 途中終了・保存を押すと今回の記録を保存します。画面移動では保存されません。';if(unlockedStartFloors(currentBest()).length>1)chooseStartFloor();else startRun(1);window.dispatchEvent(new CustomEvent('pet-adventure:ready',{detail:{best:currentBest()}}));
}

els.pauseBtn.addEventListener('click',togglePause);els.exitRunBtn.addEventListener('click',()=>void finishRun('manual'));els.nextBtn.addEventListener('click',advance);els.retryBtn.addEventListener('click',()=>startRun(1));els.checkpointBtn.addEventListener('click',chooseStartFloor);els.helpBtn.addEventListener('click',()=>{enemyClock.tick(performance.now(),true);els.helpDialog.showModal();refreshPause();});els.helpDialog.addEventListener('close',actionDialogClosed);els.helpClose.addEventListener('click',()=>els.helpDialog.close());els.helpDialog.addEventListener('click',e=>{if(e.target===els.helpDialog)els.helpDialog.close()});els.magicBtn.addEventListener('click',openMagic);els.itemBtn.addEventListener('click',()=>void openItems());els.magicClose.addEventListener('click',()=>els.magicDialog.close());els.itemClose.addEventListener('click',()=>els.itemDialog.close());els.magicDialog.addEventListener('close',actionDialogClosed);els.itemDialog.addEventListener('close',actionDialogClosed);els.magicDialog.addEventListener('click',e=>{if(e.target===els.magicDialog)els.magicDialog.close()});els.itemDialog.addEventListener('click',e=>{if(e.target===els.itemDialog)els.itemDialog.close()});els.startDialog.addEventListener('cancel',event=>event.preventDefault());
init();
