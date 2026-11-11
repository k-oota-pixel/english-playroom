import {createCampaign,normalizedDefenseTyping,revealedWord,enemyInvasionTime,scrambledTokens,TOTAL_QUESTIONS,STAGE_NAMES,PHASE_NAMES,EASY_WORD_PHASE_NAMES,PHASES_PER_STAGE,STAGE_COUNT,QUESTIONS_PER_PHASE} from './data.js?v=2.4.51';

const $=id=>document.getElementById(id);
const FACES=['👾','🦇','👹','🐙','🧟'];
const TOTAL=TOTAL_QUESTIONS;
let campaign=null,run=null,frame=0,shownQuestion=null,shownQuestionAt=0,wordReveal='';
const MAX_HP=6,ENEMY_START_X=970,CASTLE_X=155;
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
 $('phaseName').textContent=stage===0&&run.mode==='hard'?'英検2級・第'+(phase+1)+'フェーズ':stage===0&&run.mode==='easy'?EASY_WORD_PHASE_NAMES[phase]:PHASE_NAMES[stage][phase];
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
   $('questionTemplate').textContent='フェーズを終了しています';
   $('questionType').textContent='終了';
  }
  return;
 }
 if(shownQuestion===enemy.q.id){
  if(stageIndex()===0&&run.mode!=='easy')refreshWordReveal(enemy);
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
 if(isWordStage){if(run.mode==='easy'){$('questionTemplate').textContent=enemy.q.answer;wordReveal=enemy.q.answer;}else refreshWordReveal(enemy);}
 $('answerBar').style.width='0%';
 setFeedback('先頭の魔物を撃退しよう！');
 $('typing').focus({preventScroll:true});
 drawFocus();
}
function drawFocus(){
 if(!run)return;
 const active=currentEnemy();
 for(const e of run.enemies)if(e.node)e.node.classList.toggle('active',e===active);
}
function makeEnemy(e,i,stage){
 const node=document.createElement('div');
 node.className='foe';
 node.style.left=(ENEMY_START_X/10)+'%';
 const monster=document.createElement('span');monster.className='monster';monster.textContent=FACES[(stage+i)%FACES.length];
 const shadow=document.createElement('span');shadow.className='shadow';
 node.append(monster,shadow);
 $('enemyLayer').appendChild(node);
 e.node=node;
}
// Exactly one enemy is active at a time. Its deadline starts when it appears.
function spawnNextEnemy(){
 if(!run?.active||currentEnemy())return false;
 const index=run.enemies.findIndex(enemy=>!enemy.spawned&&!enemy.resolved);
 if(index<0)return false;
 const enemy=run.enemies[index];
 const now=performance.now();
 enemy.spawned=true;
 enemy.spawnedAt=now;
 enemy.deadlineAt=now+enemyInvasionTime(stageIndex(),run.mode)*1000;
 enemy.x=ENEMY_START_X;
 makeEnemy(enemy,index,stageIndex());
 return true;
}
function advanceAfterEnemy(){
 if(run.enemies.every(enemy=>enemy.resolved)){waveComplete();return}
 spawnNextEnemy();
 showQuestion();
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
 run.enemies=questions.map(q=>({q,x:ENEMY_START_X,spawned:false,resolved:false,node:null,spawnedAt:0,deadlineAt:0}));
 run.active=true;shownQuestion=null;shownQuestionAt=0;wordReveal=null;
 $('typing').value='';$('typing').disabled=true;$('typing').classList.remove('wrong');
 $('wordMeaning').hidden=true;
 $('wordChoices').hidden=true;
 $('questionTemplate').hidden=false;
 $('answerBar').style.width='0%';
 $('questionTemplate').textContent='タイピングの準備！';
 setFeedback(stage===0?(run.mode==='easy'?'日本語訳と英単語を見ながらタイプしよう！':'日本語訳から単語を入力！ 2秒で頭文字、4秒で全体表示。'):run.mode==='hard'?'和訳とバラバラの単語を見て、正しい順番でタイプしよう！':'和訳と英文を確認してタイプしよう！ スペースは入力不要です。');
 hud();
 spawnNextEnemy();
 showQuestion();
 if(frame)cancelAnimationFrame(frame);
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
function pendingCoins(target=run){
 return target.mode==='easy'?Math.floor(target.clearedPhases/5):target.clearedPhases*(target.mode==='hard'?2:1);
}
function availableCoinApi(){
 try{if(parent!==window&&parent.location.origin===location.origin&&parent.EnglishPlayroomCoins?.settleTypingDefenseRun)return parent.EnglishPlayroomCoins}catch{}
 return window.EnglishPlayroomCoins||null;
}
async function rewardApi(){
 const api=availableCoinApi();
 if(api?.settleTypingDefenseRun)return api;
 await import('../coin-reward.js?v=2.4.69');
 return window.EnglishPlayroomCoins||availableCoinApi();
}
function queueProgress(target=run,finished=false){
 if(!target)return;
 const api=availableCoinApi();
 if(api?.queueTypingDefenseProgress){
  api.queueTypingDefenseProgress(target.mode,target.sessionId,target.clearedPhases,finished,{misses:target.misses,perfectStages:target.perfectStages});
 }else{
  void rewardApi().then(mod=>mod?.queueTypingDefenseProgress?.(target.mode,target.sessionId,target.clearedPhases,finished,{misses:target.misses,perfectStages:target.perfectStages}))
   .catch(error=>console.warn('Defense progress queue delayed',error));
 }
}
async function settleRun(target=run){
 if(!target)return {ok:true};
 if(target.settling)return target.settling;
 target.ended=true;target.active=false;
 if(frame)cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const next=$('nextPhase'),status=$('rewardStatus'),retry=$('retryReward');
 next.disabled=true;retry.hidden=true;
 status.textContent='🪙 '+pendingCoins(target)+'コインと到達記録をまとめて保存しています…';
 target.settling=(async()=>{
  let result={ok:false};
  try{
   const api=await rewardApi();
   if(!api?.settleTypingDefenseRun)throw Error('一括精算機能を取得できませんでした');
   result=await api.settleTypingDefenseRun(target.mode,target.sessionId,target.clearedPhases,{misses:target.misses,perfectStages:target.perfectStages});
  }catch(error){console.warn('Defense settlement failed',error)}
  if(run===target){
   if(result.ok){
    status.textContent='✅ '+(result.duplicate?'保存済みの記録を確認しました。':result.earnedCoins+'コインと到達記録を保存しました。');
    next.disabled=false;
   }else if(result.queued){
    status.textContent='📱 通信待ち：端末に保存しました。次回ログイン時に自動再送します。';
    next.disabled=false;retry.hidden=false;
   }else{
    status.textContent='⚠️ 未保存です。ログインを確認して再試行してください。';
    next.disabled=true;retry.hidden=false;
   }
   retry.onclick=()=>{void settleRun(target)};
  }
  target.settling=null;
  return result;
 })();
 return target.settling;
}
function interruptPlay(buttonLabel,callback){
 if(!run)return callback();
 const target=run;
 if(target.ended){callback();return}
 target.active=false;if(frame)cancelAnimationFrame(frame);frame=0;
 showOverlay('PLAY END','今回のプレイを終了','ここまでのクリア結果を一括保存します。',buttonLabel,callback);
 queueProgress(target,true);
 void settleRun(target);
}
function waveComplete(){
 if(!run?.active)return;
 run.active=false;cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const phase=run.phaseIndex%PHASES_PER_STAGE,stage=Math.floor(run.phaseIndex/PHASES_PER_STAGE);
 run.clearedPhases=run.phaseIndex+1;
 // One stage is 5 phases (25 enemies). A no-breach stage is a perfect stage.
 if(phase===4){
  if(run.misses===run.stageStartMisses)run.perfectStages++;
  run.stageStartMisses=run.misses;
 }
 queueProgress(run);
 if(phase===4&&stage===STAGE_COUNT-1){finish(true);return}
 if(phase===4){
  showOverlay('STAGE CLEAR','ステージ '+(stage+1)+' クリア！','残りのお城の耐久力：'+run.hp+'。次は「'+STAGE_NAMES[stage+1]+'」！','次のステージへ',()=>{run.phaseIndex++;openPhase()});
 }else{
  showOverlay('PHASE CLEAR','フェーズ '+(phase+1)+' クリア！','魔物5体の波をしのいだ！ あと'+(4-phase)+'フェーズ。','次のフェーズへ',()=>{run.phaseIndex++;openPhase()});
 }
 $('rewardStatus').textContent='🪙 獲得予定：'+pendingCoins(run)+'コイン（プレイ終了時に一括保存）';
}
function finish(success){
 if(!run||run.ended)return;
 run.active=false;if(frame)cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const summary='撃退：'+run.kills+'体 ／ 城への侵入：'+run.misses+'体 ／ 耐久力：'+run.hp;
 if(success)showOverlay('ALL STAGES COMPLETE','🏆 お城を守り切った！',summary+'。5ステージ・25フェーズを突破！','もう一度遊ぶ',()=>start(run.mode));
 else showOverlay('GAME OVER','お城が落とされた…',summary+'。獲得したコインと到達記録を保存します。','リトライ',()=>start(run.mode));
 queueProgress(run,true);
 void settleRun(run);
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
 // A delayed input event must not count as a victory after the enemy has arrived.
 if(performance.now()>=e.deadlineAt){breach(e);return}
 e.resolved=true;run.kills++;
 fireProjectile(e.x);
 $('pet').classList.remove('attack');void $('pet').offsetWidth;$('pet').classList.add('attack');
 e.node.remove();
 shownQuestion=null;hud();
 advanceAfterEnemy();
 setFeedback('正解！ 魔法が命中！','ok');
}
function breach(e){
 if(e.resolved)return;
 e.resolved=true;e.node.remove();run.misses++;run.hp--;
 shownQuestion=null;hud();
 $('arena').classList.remove('breach');void $('arena').offsetWidth;$('arena').classList.add('breach');
 if(run.hp<=0){finish(false);return}
 advanceAfterEnemy();
 setFeedback('魔物が城に到達！ 耐久力が1減った。','error');
}
function tick(now){
 if(!run?.active)return;
 const enemy=currentEnemy();
 if(enemy){
  const duration=enemyInvasionTime(stageIndex(),run.mode)*1000;
  const progress=Math.min(1,Math.max(0,(now-enemy.spawnedAt)/duration));
  enemy.x=ENEMY_START_X-(ENEMY_START_X-CASTLE_X)*progress;
  enemy.node.style.left=(enemy.x/10)+'%';
  if(progress>=1)breach(enemy);
 }
 if(!run?.active)return;
 showQuestion();drawFocus();
 frame=requestAnimationFrame(tick);
}
function onType(){
 if(!run?.active)return;
 const target=currentEnemy();if(!target)return;
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
 mode=['easy','normal','hard'].includes(mode)?mode:'normal';
 try{campaign=createCampaign(Math.random,mode)}catch(error){
  alert('問題データの準備に失敗しました。'+(error?.message||''));return;
 }
 if(frame)cancelAnimationFrame(frame);frame=0;
 $('opening').hidden=true;$('game').hidden=false;
 document.body.classList.add('typing-in-progress');
 run={phaseIndex:0,clearedPhases:0,hp:MAX_HP,kills:0,misses:0,mode,sessionId:'td-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12),enemies:[],active:false,ended:false,settling:null,perfectStages:0,stageStartMisses:0};
 choosePet();openPhase();void rewardApi().catch(error=>console.warn('Defense rewards init deferred',error));
}
$('easyStart').addEventListener('click',()=>start('easy'));
$('normalStart').addEventListener('click',()=>start('normal'));
$('hardStart').addEventListener('click',()=>start('hard'));
$('nextPhase').addEventListener('click',()=>{});
$('restart').addEventListener('click',()=>{
 if(run?.ended){start(run.mode);return}
 if(confirm('現在のプレイを終了し、最初からやり直しますか？'))
  interruptPlay('もう一度遊ぶ',()=>start(run.mode));
});
const adventureLink=document.querySelector('.game-actions a[href="../pet-adventure/"]');
if(adventureLink)adventureLink.addEventListener('click',event=>{
 if(!run||run.ended)return;
 event.preventDefault();
 interruptPlay('冒険先に戻る',()=>{location.href=adventureLink.href});
});
$('typing').addEventListener('input',onType);
$('typing').addEventListener('keydown',event=>{
 if(event.key==='Enter'){
  event.preventDefault();
  if(!run?.active)return;
  if(currentEnemy()&&normalizedDefenseTyping($('typing').value,stageIndex())===normalizedDefenseTyping(currentEnemy().q.answer,stageIndex()))strike();
 }
});
window.addEventListener('pagehide',()=>{
 if(frame)cancelAnimationFrame(frame);
 if(run&&!run.ended){
  run.ended=true;run.active=false;
  queueProgress(run,true);
  // Best effort: a keepalive request can finish even when the iframe is removed.
  const api=availableCoinApi();
  if(api?.settleTypingDefenseRun)
   void api.settleTypingDefenseRun(run.mode,run.sessionId,run.clearedPhases,{misses:run.misses,perfectStages:run.perfectStages});
 }
});
window.addEventListener('pageshow',event=>{
 if(event.persisted&&run?.ended)location.reload();
});
