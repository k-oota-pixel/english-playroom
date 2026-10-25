export const ELEMENTS=Object.freeze({
  fire:{id:'fire',icon:'🔥',label:'FIRE'},
  water:{id:'water',icon:'💧',label:'WATER'},
  leaf:{id:'leaf',icon:'🌿',label:'LEAF'},
  lightning:{id:'lightning',icon:'⚡',label:'THUNDER'}
});

export const LEVELS=Object.freeze([
  {id:'junior1',label:'中1',power:2},
  {id:'junior2',label:'中2',power:3},
  {id:'junior3',label:'中3',power:4},
  {id:'high1',label:'高1',power:5},
  {id:'high2',label:'高2',power:6}
]);

export const GRADES=Object.freeze([
  {id:'4級',power:2},
  {id:'3級',power:3},
  {id:'準2級',power:4},
  {id:'2級',power:5},
  {id:'準1級',power:7}
]);

const WEAK_TO=Object.freeze({fire:'water',water:'leaf',leaf:'fire'});

export function elementMultiplier(attackElement,enemyElement){
  return WEAK_TO[enemyElement]===attackElement?2:1;
}

export function towerLevelIndex(stage){
  const n=Math.max(1,Math.floor(Number(stage)||1));
  return Math.min(LEVELS.length-1,Math.floor((n-1)/10));
}

export function towerCardLevelIndexes(stage){
  const current=towerLevelIndex(stage),lower=Math.max(0,current-1),higher=Math.min(LEVELS.length-1,current+1);
  if(current===0)return [0,0,0,higher];
  if(current===LEVELS.length-1)return [lower,current,current,current];
  return [lower,current,current,higher];
}

export function dungeonGradesForStage(stage){
  const n=Math.max(1,Math.floor(Number(stage)||1));
  const grades=['4級','3級','準2級','2級','準1級'];
  if(n>=41)return Array(4).fill('準1級');
  const band=Math.floor((n-1)/10),lower=grades[band],upper=grades[band+1];
  return (n-1)%10<5?[lower,lower,lower,upper]:[lower,lower,upper,upper];
}

export function dungeonAttackLayout(stage,enemyElement,random=Math.random){
  const grades=dungeonGradesForStage(stage),criticalElement=WEAK_TO[enemyElement];
  const elements=Object.keys(ELEMENTS).filter(id=>id!==criticalElement);
  for(let i=elements.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[elements[i],elements[j]]=[elements[j],elements[i]];}
  // The last (highest-grade) card always targets the enemy's weakness.
  elements.push(criticalElement);
  return grades.map((grade,index)=>({grade,element:elements[index]}));
}

export function isBoss(stage,enemyIndex=0){
  return Math.max(1,Math.floor(Number(stage)||1))%5===0&&Number(enemyIndex)===0;
}

export function enemyMaxHp(stage,enemyIndex=0){
  const s=Math.max(1,Math.floor(Number(stage)||1));
  const base=5+s;
  return Math.round(base*(isBoss(s,enemyIndex)?1.75:1));
}

export function enemyAttack(stage,enemyIndex=0){
  const s=Math.max(1,Math.floor(Number(stage)||1));
  return 3+Math.floor((s-1)/5)+(isBoss(s,enemyIndex)?2:0);
}

export function attackPowerForLevel(levelId,stage=1){
  const found=LEVELS.find(x=>x.id===levelId)||LEVELS[0];
  return found.power+Math.floor((Math.max(1,Number(stage)||1)-1)/15)*2;
}

export function attackPowerForGrade(grade,stage=1){
  const found=GRADES.find(x=>x.id===grade)||GRADES[0];
  return found.power+Math.floor((Math.max(1,Number(stage)||1)-1)/20)*2;
}

export function calculateDamage(basePower,multiplier=1){
  return Math.max(1,Math.round(Math.max(1,Number(basePower)||1)*Math.max(1,Number(multiplier)||1)));
}

export function checkpointForBest(best){
  const n=Math.max(1,Math.floor(Number(best)||1));
  return n<10?1:Math.floor(n/10)*10;
}
