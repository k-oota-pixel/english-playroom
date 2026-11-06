import {createCampaign,normalizedDefenseTyping,revealedWord,enemySpawnInterval,STAGE_NAMES,PHASE_NAMES,PHASES_PER_STAGE,STAGE_COUNT,QUESTIONS_PER_PHASE} from './data.js?v=2.3.64';

const $=id=>document.getElementById(id);
const FACES=['👾','🦇','👹','🐙','🧟'];
const TOTAL=STAGE_COUNT*PHASES_PER_STAGE*QUESTIONS_PER_PHASE;
let campaign=null,run=null,frame=0,lastFrame=0,shownQuestion=null,shownQuestionAt=0,wordReveal='',lastTypedAt=-1e9;
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
 $('phaseName').textContent=PHASE_NAMES[stage][phase];
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
 const isWordStage=stageIndex()===0;
 $('wordMeaning').hidden=!isWordStage;
 $('wordMeaning').textContent=isWordStage?enemy.q.hint:'';
 $('questionTemplate').textContent=isWordStage?'':enemy.q.answer||'';
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
 const number=document.createElement('span');number.className='number';number.textContent='魔物 '+(i+1);
 const monster=document.createElement('span');monster.className='monster';monster.textContent=FACES[(stage+i)%FACES.length];
 const shadow=document.createElement('span');shadow.className='shadow';
 node.append(number,monster,shadow);
 $('enemyLayer').appendChild(node);
 e.node=node;
}
function openPhase(){
 if(!run)return;
 const phaseIndex=run.phaseIndex;
 if(phaseIndex>=STAGE_COUNT*PHASES_PER_STAGE){finish(true);return}
 $('phaseOverlay').hidden=true;
 const stage=Math.floor(phaseIndex/PHASES_PER_STAGE),phase=phaseIndex%PHASES_PER_STAGE;
 const questions=campaign[stage][phase];
 $('enemyLayer').replaceChildren();$('effects').replaceChildren();
 run.enemies=questions.map((q,i)=>({q,x:970,spawnAt:i*enemySpawnInterval(stage),spawned:false,resolved:false,node:null}));
 run.enemies.forEach((e,i)=>makeEnemy(e,i,stage));
 run.elapsed=0;run.active=true;shownQuestion=null;shownQuestionAt=0;wordReveal=null;lastTypedAt=-1e9;
 $('typing').value='';$('typing').disabled=true;$('typing').classList.remove('wrong');
 $('wordMeaning').hidden=true;
 $('answerBar').style.width='0%';
 $('questionTemplate').textContent='タイピングの準備！';
 setFeedback(stage===0?'まず日本語訳を見て入力！ 2秒後に頭文字、4秒後に英単語を表示します。':'魔物が現れたら英文をタイプしよう！ スペース入力は不要です。');
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
 button.textContent=buttonLabel;button.onclick=fn;
 over.hidden=false;
 button.focus({preventScroll:true});
}
function waveComplete(){
 if(!run?.active)return;
 run.active=false;
 cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const phase=run.phaseIndex%PHASES_PER_STAGE;
 const stage=Math.floor(run.phaseIndex/PHASES_PER_STAGE);
 const next=()=>{run.phaseIndex++;openPhase()};
 if(phase===4&&stage===3){finish(true);return}
 if(phase===4){
  showOverlay('STAGE CLEAR','ステージ '+(stage+1)+' クリア！','残りのお城の耐久力：'+run.hp+'。次は「'+STAGE_NAMES[stage+1]+'」！','次のステージへ',next);
 }else{
  showOverlay('PHASE CLEAR','フェーズ '+(phase+1)+' クリア！','魔物5体の波をしのいだ！ あと'+(4-phase)+'フェーズ。','次のフェーズへ',next);
 }
}
function finish(success){
 if(!run)return;
 run.active=false;if(frame)cancelAnimationFrame(frame);frame=0;
 $('typing').disabled=true;
 const summary='撃退：'+run.kills+'体 ／ 城への侵入：'+run.misses+'体 ／ 耐久力：'+run.hp;
 if(success){
  showOverlay('ALL STAGES COMPLETE','🏆 お城を守り切った！',summary+'。4ステージ・20フェーズを突破！','もう一度遊ぶ',start);
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
 const speed={'gentle':33,'normal':43,'fast':61}[run.speed]||33;
 const typing=run.speed==='gentle' && now-lastTypedAt<1600;
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
function start(){
 try{campaign=createCampaign()}catch(error){
  alert('問題データの準備に失敗しました。'+(error?.message||''));return;
 }
 if(frame)cancelAnimationFrame(frame);frame=0;
 $('opening').hidden=true;$('game').hidden=false;
 run={phaseIndex:0,hp:MAX_HP,kills:0,misses:0,speed:$('speed').value,enemies:[],elapsed:0,active:false};
 choosePet();openPhase();
}
$('begin').addEventListener('click',start);
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
