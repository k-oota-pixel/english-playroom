import {createCampaign,normalizedDefenseTyping,revealedWord,enemySpawnInterval,scrambledTokens,TOTAL_QUESTIONS,STAGE_NAMES,PHASE_NAMES,PHASES_PER_STAGE,STAGE_COUNT,QUESTIONS_PER_PHASE} from './data.js?v=2.3.68';

const $=id=>document.getElementById(id);
const FACES=['👾','🦇','👹','🐙','🧟'];
const TOTAL=TOTAL_QUESTIONS;
let campaign=null,run=null,frame=0,lastFrame=0,shownQuestion=null,shownQuestionAt=0,wordReveal='',lastTypedAt=-1e9,rewardRunId=0;
const MAX_HP=6;
function setFeedback(message,type=''){
 $('feedback').textContent=message;
 $('feedback').className='feedback'+(type?' '+type:'');
}
function choosePet(){
 const target=$('pet');
 try{
  if(parent!==window && parent.location.origin===location.origin){
   const homePet=parent.document.getElementById('petVisual');
   if(homePet){
    const svg=homePet.querySelector('svg');
    if(svg){
     const clean=svg.cloneNode(true);
     // The parent's pet SVG has scenery before its character; strip the scenery only.
     const shadow=clean.querySelector('.pet-shadow');
     if(shadow){
      while(clean.firstElementChild&&clean.firstElementChild!==shadow)clean.firstElementChild.remove();
     }
     target.replaceChildren(clean);
     target.setAttribute('aria-label',homePet.getAttribute('aria-label')||'あなたのペット');
     return;
    }
    if(homePet.textContent.includes('🥚')){target.textContent='🥚';target.setAttribute('aria-label','ふしぎなたまご');return}
   }
  }
 }catch(error){console.debug('Home pet unavailable',error);}
 target.textContent='🐾';
}
function hud(){
 if(!run)return;
 const stage=Math.min(STAGE_COUNT-1,Math.floor(run.phaseIndex/PHASES_PER_STAGE));
 const phase=run.phaseIndex%PHASES_PER_STAGE;
 $('stageMeter').textContent=(stage+1)+' / '+STAGE_COUNT;
 $('phaseMeter').textContent=(phase+1)+' / '+PHASES_PER_STAGE;
 $('killMeter').textContent=run.kills+' / '+TOTAL;
 $('hpMeter').textContent='♥ '.repeat(run.hp).trim()+' ♡'.repeat(MAX_HP-run.hp);
 $('courseName').textContent=STAGE_NAMES[stage];
 $('phaseName').textContent=stage===0&&run.mode==='hard'?'英検2級・第'+(phase+1)+'フェーズ':PHASE_NAMES[stage][phase];
 $('waveMeter').textContent=run.enemies.filter(e=>e.resolved).length+' / '+QUESTIONS_PER_PHASE;
}
function currentEnemy(){
 if(!run)return null;
 return run.enemies.find(e=>e.spawned&&!e.resolved)||null;
}
function stageIndex(){
 return Math.floor(run.phaseIndex/PHASES_PER_STAGE);
}
function refreshWordReveal(enemy){
 const revealed=revealedWord(enemy.q.answer,performance.now()-shownQuestionAt);
 if(revealed===wordReveal)return;
 wordReveal=revealed;
 $('questionTemplate').textContent=revealed;
}
function showQuestion(){
 if(!run?.active)return;
 const enemy=currentEnemy();
 if(!enemy){
  if(shownQuestion!==null){
   shownQuestion=null;$('typing').value='';$('typing').disabled=true;
   $('answerBar').style.width='0%';
   $('wordMeaning').hidden=true;
   $('wordChoices').hidden=true;
   $('questionTemplate').hidden=false;
   $('questionTemplate').textContent='次の敵を待とう';
   $('questionType').textContent='待機中';
  }
  return;
 }
 if(shownQuestion===enemy.q.id){
  if(stageIndex()===0)refreshWordReveal(enemy);
  return;
 }
 shownQuestion=enemy.q.id;
 shownQuestionAt=performance.now();
 wordReveal=null;
 $('typing').value='';$('typing').disabled=false;$('typing').classList.remove('wrong');
 const isWordStage=stageIndex()===0,hardSentence=run.mode==='hard'&&!isWordStage;
 $('wordMeaning').hidden=false;
 $('wordMeaning').textContent=isWordStage?enemy.q.hint:enemy.q.ja;
 $('questionTemplate').hidden=hardSentence;
 $('questionTemplate').textContent=isWordStage?'':hardSentence?'':enemy.q.answer||'';
 $('wordChoices').hidden=!hardSentence;
 $('wordChoices').replaceChildren();
 if(hardSentence){
  const caption=document.createElement('strong');caption.textContent='並べ替えて入力する単語';
  $('wordChoices').append(caption);
  for(const token of scrambledTokens(enemy.q.answer)){
   const chip=document.createElement('span');chip.className='word-chip';chip.textContent=token;
   $('wordChoices').append(chip);
  }
 }
 $('questionType').textContent=enemy.q.topic||'';
 if(isWordStage)refreshWordReveal(enemy);
 $('answerBar').style.width='0%';
 setFeedback('先頭の魔物を撃退しよう！');
 $('typing').focus({preventScroll:true});
 drawFocus();
}
function drawFocus(){
 if(!run)return;
 const active=currentEnemy();
 for(const e of run.enemies)e.node.classList.toggle('active',e===active);
}
function makeEnemy(e,i,stage){
 const node=document.createElement('div');
 node.className='foe';
 node.style.left='101%';
 const monster=document.createElement('span');monster.className='monster';monster.textContent=FACES[(stage+i)%FACES.length];
 const shadow=document.createElement('span');shadow.className='shadow';
 node.append(monster,shadow);
 $('enemyLayer').appendChild(node);
 e.node=node;
}
function openPhase(){
 if(!run)return;
 const phaseIndex=run.phaseIndex;
 if(phaseIndex>=STAGE_COUNT*PHASES_PER_STAGE){finish(true);return}
 $('phaseOverlay').hidden=true;
 const stage=Math.floor(phaseIndex/PHASES_PER_STAGE),phase=phaseIndex%PHASES_PER_STAGE;
 document.body.classList.toggle('sentence-defense',run.mode==='hard'&&stage>0);
 const questions=campaign[stage][phase];
 $('enemyLayer').replaceChildren();$('effects').replaceChildren();
 run.enemies=questions.map((q,i)=>({q,x:970,spawnAt:i*enemySpawnInterval(stage,run.mode),spawned:false,resolved:false,node:null}));
 run.enemies.forEach((e,i)=>makeEnemy(e,i,stage));
 run.elapsed=0;run.active=true;shownQuestion=null;shownQuestionAt=0;wordReveal=null;lastTypedAt=-1e9;
 $('typing').value='';$('typing').disabled=true;$('typing').classList.remove('wrong');
 $('wordMeaning').hidden=true;
 $('wordChoices').hidden=true;
 $('questionTemplate').hidden=false;
 $('answerBar').style.width='0%';
 $('questionTemplate').textContent='タイピングの準備！';
 setFeedback(stage===0?'日本語訳から単語を入力！ 2秒で頭文字、4秒で全体表示。':run.mode==='hard'?'和訳とバラバラの単語を見て、正しい順番でタイプしよう！':'和訳と英文を確認してタイプしよう！ スペースは入力不要です。');
 hud();
 if(frame)cancelAnimationFrame(frame);
 lastFrame=performance.now();
 frame=requestAnimationFrame(tick);
}
function showOverlay(eyebrow,heading,body,buttonLabel,fn){
 const over=$('phaseOverlay');
 $('overlayEyebrow').textContent=eyebrow;
 $('overlayHeading').textContent=heading;
 $('overlayBody').textContent=body;
 const button=$('nextPhase');
 button.textContent=buttonLabel;button.onclick=fn;button.disabled=false;
 $('rewardStatus').textContent='';
 $('retryReward').hidden=true;
 over.hidden=false;
 button.focus({preventScroll:true});
}
function rewardDescription(mode,stage,phase){
 if(mode==='normal'&&phase!==4)return null;
 const amount=mode==='normal'?1:stage===0?1:2;
 const stageNo=stage+1,phaseNo=phase+1;
 const claims=mode==='normal'?[ 'normal-stage-'+stageNo ]:
  Array.from({length:amount},(_,i)=>'hard-stage-'+stageNo+'-phase-'+phaseNo+'-coin-'+(i+1));
 return {amount,claims,label:mode==='normal'?'ステージ '+stageNo+' クリア！':'ステージ '+stageNo+'・フェーズ '+phaseNo+' クリア！'};
}
async function rewardApi(){
 try{
  if(parent!==window&&parent.location.origin===location.origin&&typeof parent.EnglishPlayroomCoins?.recordTypingDefenseStage==='function'){
   return parent.EnglishPlayroomCoins;
  }
 }catch{}
 await import('../coin-reward.js?v=2.3.68.1');
 return window.EnglishPlayroomCoins||null;
}
async function payPhaseReward(stage,phase,id){
 const description=rewardDescription(run.mode,stage,phase);
 const receipt=$('rewardStatus'),retry=$('retryReward');
 if(!description)return;
 if(run.rewardPaid.has(id))return;
 $('nextPhase').disabled=true;
 receipt.textContent='🪙 コイン報酬を確認中…';
 retry.hidden=true;
 try{
  const api=await rewardApi();
  if(!api?.awardOncePerDay)throw Error('コイン処理を読み込めませんでした。');
  let gained=0,duplicate=0;
  for(const claim of description.claims){
   const result=await api.awardOncePerDay('pet-typing-defense',claim,description.label);
   if(result?.awarded)gained++;
   else if(['already-today','already-counted'].includes(result?.reason))duplicate++;
   else if(result?.reason==='signed-out')throw Error('ログインが必要です。');
   else throw Error('コイン付与を確認できませんでした。');
  }
  let rankingRecord=null;
  if(phase===PHASES_PER_STAGE-1){
   if(typeof api.recordTypingDefenseStage!=='function')throw Error('ランキング処理を読み込めませんでした。');
   rankingRecord=await api.recordTypingDefenseStage(run.mode,stage+1);
   if(!rankingRecord?.recorded&&!rankingRecord?.duplicate)throw Error('本日のランキング記録を確認できませんでした。');
  }
  if(id!==rewardRunId)return;
  run.rewardPaid.add(id);
  const rewardMessage=gained?'🪙 +'+gained+'コインを獲得！'+(duplicate?'（残りは本日獲得済み）':''):'🪙 本日の報酬は獲得済みです。';
  receipt.textContent=rewardMessage+(rankingRecord?' ／ 🏆 '+(rankingRecord.duplicate?'本日の順位記録済み':'本日のランキングに記録しました'):'');
 }catch(error){
  if(id!==rewardRunId)return;
  receipt.textContent='コイン・ランキングの保存を確認できませんでした。再試行できます。';
  retry.hidden=false;
  retry.onclick=()=>{void payPhaseReward(stage,phase,id)};
  console.warn('Typing defense reward error',error);
 }finally{
  if(id===rewardRunId)$('nextPhase').disabled=false;
 }
}

function waveComplete(){
 if(!run?.active)return;
 run.active=false;
 cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const phase=run.phaseIndex%PHASES_PER_STAGE;
 const stage=Math.floor(run.phaseIndex/PHASES_PER_STAGE);
 const next=()=>{run.phaseIndex++;openPhase()};
 const rewardId=++rewardRunId;
 if(phase===4&&stage===STAGE_COUNT-1){finish(true,stage,phase,rewardId);return}
 if(phase===4){
  showOverlay('STAGE CLEAR','ステージ '+(stage+1)+' クリア！','残りのお城の耐久力：'+run.hp+'。次は「'+STAGE_NAMES[stage+1]+'」！','次のステージへ',next);
 }else{
  showOverlay('PHASE CLEAR','フェーズ '+(phase+1)+' クリア！','魔物5体の波をしのいだ！ あと'+(4-phase)+'フェーズ。','次のフェーズへ',next);
 }
 void payPhaseReward(stage,phase,rewardId);
}
function finish(success,finalStage=null,finalPhase=null,finalId=null){
 if(!run)return;
 run.active=false;if(frame)cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const summary='撃退：'+run.kills+'体 ／ 城への侵入：'+run.misses+'体 ／ 耐久力：'+run.hp;
 if(success){
  showOverlay('ALL STAGES COMPLETE','🏆 お城を守り切った！',summary+'。5ステージ・25フェーズを突破！','もう一度遊ぶ',start);
  if(finalStage!==null)void payPhaseReward(finalStage,finalPhase,finalId);
 }else{
  showOverlay('GAME OVER','お城が落とされた…',summary+'。もう一度挑戦しよう！','リトライ',start);
 }
 hud();
}
function fireProjectile(x){
 const orb=document.createElement('span');
 orb.className='orb';
 $('effects').append(orb);
 const distance=$('arena').clientWidth*(Math.max(185,x)-200)/1000;
 if(typeof orb.animate==='function'){
  const motion=orb.animate([
   {transform:'translate(0,0) scale(.7)',opacity:1},
   {transform:'translate('+Math.max(0,distance)+'px, -16px) scale(1.45)',opacity:0}
  ],{duration:320,easing:'ease-out',fill:'forwards'});
  motion.onfinish=()=>orb.remove();
 }else setTimeout(()=>orb.remove(),350);
}
function strike(){
 if(!run?.active)return;
 const e=currentEnemy();if(!e)return;
 e.resolved=true;run.kills++;
 fireProjectile(e.x);
 $('pet').classList.remove('attack');void $('pet').offsetWidth;$('pet').classList.add('attack');
 e.node.remove();
 shownQuestion=null;hud();
 setFeedback('正解！ 魔法が命中！','ok');
 showQuestion();
 if(run.enemies.every(enemy=>enemy.resolved))waveComplete();
}
function breach(e){
 if(e.resolved)return;
 e.resolved=true;e.node.remove();run.misses++;run.hp--;
 shownQuestion=null;hud();
 $('arena').classList.remove('breach');void $('arena').offsetWidth;$('arena').classList.add('breach');
 setFeedback('魔物が城に到達！ 耐久力が1減った。','error');
 if(run.hp<=0){finish(false);return}
 showQuestion();
 if(run.enemies.every(enemy=>enemy.resolved))waveComplete();
}
function tick(now){
 if(!run?.active)return;
 const delta=Math.min(.06,Math.max(0,(now-lastFrame)/1000));
 lastFrame=now;
 run.elapsed+=delta;
 const speed=run.mode==='hard'?61:43;
 const typing=false;
 for(const e of run.enemies){
  if(e.resolved)continue;
  if(!e.spawned){
   if(run.elapsed<e.spawnAt)continue;
   e.spawned=true;
  }
  e.x-=speed*(typing?.35:1)*delta;
  e.node.style.left=(e.x/10)+'%';
  if(e.x<=155){breach(e);if(!run.active)break}
 }
 if(!run?.active)return;
 showQuestion();drawFocus();
 frame=requestAnimationFrame(tick);
}
function onType(){
 if(!run?.active)return;
 const target=currentEnemy();if(!target)return;
 lastTypedAt=performance.now();
 const input=normalizedDefenseTyping($('typing').value,stageIndex());
 const expected=normalizedDefenseTyping(target.q.answer,stageIndex());
 const isPrefix=expected.startsWith(input);
 $('typing').classList.toggle('wrong',!!input&&!isPrefix);
 $('answerBar').style.width=Math.min(100,Math.round(input.length/Math.max(1,expected.length)*100))+'%';
 if(input===expected && input){strike();return}
 if(input&&!isPrefix)setFeedback('赤い文字のところを直して、正しい英語にしよう。','error');
 else setFeedback('その調子！ 最後まで入力すると魔法が発動するよ。');
}
function start(mode=run?.mode||'normal'){
 mode=mode==='hard'?'hard':'normal';
 try{campaign=createCampaign(Math.random,mode)}catch(error){
  alert('問題データの準備に失敗しました。'+(error?.message||''));return;
 }
 if(frame)cancelAnimationFrame(frame);frame=0;
 $('opening').hidden=true;$('game').hidden=false;
 document.body.classList.add('typing-in-progress');
 rewardRunId++;
 run={phaseIndex:0,hp:MAX_HP,kills:0,misses:0,mode,rewardPaid:new Set(),enemies:[],elapsed:0,active:false};
 choosePet();openPhase();
}
$('normalStart').addEventListener('click',()=>start('normal'));
$('hardStart').addEventListener('click',()=>start('hard'));
$('nextPhase').addEventListener('click',()=>{});
$('restart').addEventListener('click',()=>{
 if(!run?.active||confirm('最初からやり直しますか？'))start();
});
$('typing').addEventListener('input',onType);
$('typing').addEventListener('keydown',event=>{
 if(event.key==='Enter'){
  event.preventDefault();
  if(!run?.active)return;
  if(currentEnemy()&&normalizedDefenseTyping($('typing').value,stageIndex())===normalizedDefenseTyping(currentEnemy().q.answer,stageIndex()))strike();
 }
});
window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame)});
