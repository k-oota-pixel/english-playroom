import {createAttackClock,enemyAttackInterval} from './realtime.js?v=1.10.24';
import {enemyMaxHp,enemyAttack} from './core.js?v=2.1.8';
import {majorBossForStage} from './royal-guard.js?v=2.3.22';
import {chooseMinibossAction} from './miniboss.js?v=2.3.17';
import {MAGIC_SPELLS,rollMagicAmount} from '../pet-dungeons-model.js?v=1.10.22';

export const FINAL_FLOOR=100;
const spell=id=>MAGIC_SPELLS.find(s=>s.id===id);
export const FINAL_WAVES=Object.freeze([
 {id:'king-1',title:'魔王が現れた！',quote:'百階を踏み越えたか。まずは我が力を知れ。',actors:[['king',1]]},
 {id:'mage-1',title:'闇の魔術師が立ちはだかった！',quote:'魔王様の前に、もう一度我が術を受けるがよい。',actors:[['mage',1]]},
 {id:'guard-1',title:'魔王親衛隊が立ちはだかった！',quote:'この命、魔王様のために！',actors:[['guard',1]]},
 {id:'allies-2',title:'二体同時！ 配下が第2形態で出現！',quote:'闇の魔術師を先に狙おう。二体とも攻撃してくる！',actors:[['mage',2],['guard',2]]},
 {id:'king-2',title:'魔王が第2形態に進化！',quote:'配下を退けたか……ここからが本当の戦いだ！',actors:[['king',2]]},
 {id:'allies-3',title:'配下が第3形態で襲いかかる！',quote:'原形を失った二体を突破せよ！ 闇の魔術師から狙おう。',actors:[['mage',3],['guard',3]]},
 {id:'king-3',title:'魔王、最終形態へ！',quote:'魔力、全解放。これが最後だ！',actors:[['king',3]]}
]);

function createActor(kind,phase,mode,guardMp){
 const floor=kind==='king'?100:kind==='mage'?50:90;
 const boss=kind==='king'?{}:majorBossForStage(floor,mode,Math.min(2,phase));
 const maxHp=Math.round(enemyMaxHp(floor)*(phase===1?1:phase===2?1.2:1.5));
 const maxMp=kind==='king'?(phase===3?10000:phase===2?100:0):phase===3?0:boss.maxMp;
 const interval=kind==='king'?({1:3000,2:4000,3:5000})[phase]:phase===3?(kind==='mage'?1500:4000):boss.attackInterval||enemyAttackInterval(floor,mode);
 const image=kind==='king'?`final-king-${phase}.svg`:kind==='mage'?`dark-mage-${phase}.svg`:phase===3?'royal-guard-lion-3.svg':boss.image;
 const name=kind==='king'?'魔王':kind==='mage'?'闇の魔術師':'魔王親衛隊';
 return {id:`${kind}-${phase}`,kind,phase,name,level:floor,element:kind==='king'?(phase===1?'leaf':phase===2?'water':'fire'):boss.element||'fire',image,royal:true,boss,maxHp,hp:maxHp,maxMp,mp:kind==='guard'&&phase===2?Math.min(maxMp,guardMp):maxMp,interval,physical:kind==='mage'&&phase===1?3:enemyAttack(floor),clock:createAttackClock(interval),lastAction:null};
}

// Enemy clocks and resources are independent, including while the other enemy is targeted.
export function createFinalEncounter(mode){
 let waveIndex=0,targetIndex=0,guardMp=50,complete=false,enemies=[];
 function loadWave(){targetIndex=0;enemies=FINAL_WAVES[waveIndex].actors.map(([kind,phase])=>createActor(kind,phase,mode,guardMp));}
 loadWave();
 return {
  get waveIndex(){return waveIndex;},get wave(){return FINAL_WAVES[waveIndex];},get enemies(){return enemies;},get target(){return enemies[targetIndex];},get complete(){return complete;},get total(){return FINAL_WAVES.length;},
  tick(now,paused=false){if(complete)return [];return enemies.filter(enemy=>{const step=enemy.clock.tick(now,paused||enemy.hp<=0);return enemy.hp>0&&!paused&&step.attack;});},
  damageTarget(amount){const target=enemies[targetIndex];target.hp=Math.max(0,target.hp-Math.max(0,amount));return target.hp;},
  isLastEnemy(){return waveIndex===FINAL_WAVES.length-1&&enemies.every((e,i)=>i===targetIndex||e.hp<=0);},
  settleDefeat(){
   if(complete||enemies[targetIndex].hp>0)return {type:'none'};
   const defeated=enemies[targetIndex];if(defeated.kind==='guard'&&defeated.phase===1)guardMp=defeated.mp;
   const next=enemies.findIndex(e=>e.hp>0);if(next>=0){targetIndex=next;return {type:'target',defeated};}
   if(waveIndex===FINAL_WAVES.length-1){complete=true;return {type:'complete',defeated};}
   waveIndex++;loadWave();return {type:'wave',defeated};
  }
 };
}

export function finalEnemyActions(enemy,playerHp,random=Math.random){
 if(enemy.hp<=0||playerHp<=0)return [];
 let spells=[],physical=false;
 if(enemy.kind==='king'){
  if(enemy.phase===1)physical=true;
  else if(enemy.phase===2){if(enemy.mp>=10&&enemy.hp/enemy.maxHp<=.65&&enemy.maxHp-enemy.hp>=25)spells=[spell('mimurose')];else physical=true;}
  else{
   physical=true;
   if(random()<.65){const pool=MAGIC_SPELLS.filter(s=>s.mpCost<=enemy.mp&&(s.kind!=='heal'||enemy.maxHp-enemy.hp>=s.base));if(pool.length){const heals=pool.filter(s=>s.kind==='heal');spells=[enemy.hp/enemy.maxHp<=.5&&heals.length?heals.at(-1):pool[Math.min(pool.length-1,Math.floor(random()*pool.length))]];}}
  }
 }else if(enemy.phase===3)physical=true;
 else{const chosen=chooseMinibossAction({boss:enemy.boss,hp:enemy.hp,maxHp:enemy.maxHp,mp:enemy.mp,playerHp,lastAction:enemy.lastAction},random);if(chosen?.kind==='wait')return [];if(chosen)spells=[chosen];else physical=true;enemy.lastAction=chosen?'spell':'attack';}
 const actions=physical?[{kind:'physical',amount:enemy.physical}]:[];
 for(const s of spells){if(enemy.mp<s.mpCost)continue;enemy.mp-=s.mpCost;const rolled=rollMagicAmount(s.base,random);if(s.kind==='heal'){const actual=Math.min(rolled,enemy.maxHp-enemy.hp);enemy.hp+=actual;actions.push({kind:'heal',spell:s,amount:actual});}else actions.push({kind:'magic',spell:s,amount:rolled});}
 return actions;
}

