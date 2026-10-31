export const BASE_STATS=Object.freeze({hp:10,attack:1,defense:1,mp:6});
export const MAX_INDIVIDUAL_BONUS=5;
const STAT_KEYS=Object.freeze(['hp','attack','defense','mp']);
const LEGACY_BASE_KEYS=Object.freeze(['hp','attack','defense']);
const ZERO_STATS=Object.freeze({hp:0,attack:0,defense:0,mp:0});
const ADULT_BONUS=Object.freeze({hp:2,attack:1,defense:1,mp:2});
const AGE_MILESTONES=Object.freeze([
 {day:5,hp:2,attack:1,defense:1,mp:2},
 {day:10,hp:3,attack:2,defense:2,mp:3},
 {day:15,hp:2,attack:1,defense:1,mp:2},
 {day:20,hp:3,attack:2,defense:2,mp:3},
 {day:25,hp:2,attack:1,defense:1,mp:2},
 {day:30,hp:3,attack:2,defense:2,mp:3},
 {day:35,hp:2,attack:1,defense:1,mp:2}
]);

export function ageGrowthBonuses(ageDays=0,adult=false){
 if(!adult)return ZERO_STATS;
 const raw=Number(ageDays),days=Number.isFinite(raw)?Math.max(0,Math.floor(raw)):0;
 const bonus={...ADULT_BONUS};
 for(const milestone of AGE_MILESTONES){if(days<milestone.day)break;for(const key of STAT_KEYS)bonus[key]+=milestone[key];}
 return bonus;
}

export function titleCount(titles=[]){return new Set(titles.filter(t=>t.unlocked&&typeof t.id==='string').map(t=>t.id)).size;}

export function normalizeBaseStats(base={}){
 const next={};
 for(const key of STAT_KEYS){
  const minimum=BASE_STATS[key],n=Number(base?.[key]);
  next[key]=Number.isSafeInteger(n)?Math.max(minimum,Math.min(minimum+MAX_INDIVIDUAL_BONUS,n)):minimum;
 }
 return next;
}

// MP was added after the original three stats. A legacy pet without petBaseStats.mp
// keeps its existing individual HP/attack/defense instead of being rerolled.
export function hasIndividualBaseStats(base){
 if(!base||!LEGACY_BASE_KEYS.every(key=>{const n=Number(base[key]),minimum=BASE_STATS[key];return Number.isSafeInteger(n)&&n>=minimum&&n<=minimum+MAX_INDIVIDUAL_BONUS;}))return false;
 if(base.mp===undefined||base.mp===null)return true;
 const mp=Number(base.mp);return Number.isSafeInteger(mp)&&mp>=BASE_STATS.mp&&mp<=BASE_STATS.mp+MAX_INDIVIDUAL_BONUS;
}

export function randomBaseStats(random=Math.random){
 const bonus=()=>Math.max(0,Math.min(MAX_INDIVIDUAL_BONUS,Math.floor((Number(random())||0)*(MAX_INDIVIDUAL_BONUS+1))));
 return {hp:BASE_STATS.hp+bonus(),attack:BASE_STATS.attack+bonus(),defense:BASE_STATS.defense+bonus(),mp:BASE_STATS.mp+bonus()};
}

export function allocationTotal(allocation={}){
 return STAT_KEYS.reduce((sum,key)=>{const n=Number(allocation?.[key]);return sum+(Number.isSafeInteger(n)&&n>0?n:0);},0);
}
export function grantedStrengthPoints(data={}){
 const points=Number(data.petAdminGrantedPoints),generation=Math.max(1,Number(data.petGeneration)||1);
 return data.petAdminGrantedGeneration===generation&&Number.isSafeInteger(points)&&points>0&&points<=1000?points:0;
}

export function strengthStatsFromAllocation(allocation={},baseStats=BASE_STATS,growth={}){
 return strengthState(allocationTotal(allocation)*3,allocation,baseStats,growth).stats;
}

export function strengthLevel(levelPoints=0,allocation={}){
 const stored=Number(levelPoints),safeStored=Number.isSafeInteger(stored)&&stored>0?stored:0;
 return 1+Math.max(safeStored,allocationTotal(allocation));
}

export function strengthState(count,allocation={},baseStats=BASE_STATS,growth={}){
 const granted=Number(growth.grantedPoints),earned=Math.floor(Math.max(0,Number(count)||0)/3)+(Number.isSafeInteger(granted)&&granted>0&&granted<=1000?granted:0);
 const points={hp:0,attack:0,defense:0,mp:0};let left=earned;
 for(const key of Object.keys(points)){const n=Number(allocation?.[key]);points[key]=Math.min(left,Number.isSafeInteger(n)&&n>0?n:0);left-=points[key];}
 const base=normalizeBaseStats(baseStats),ageBonus=ageGrowthBonuses(growth.ageDays,growth.adult===true);
 return {
  earned,available:left,points,base,
  bonuses:{hp:base.hp-BASE_STATS.hp,attack:base.attack-BASE_STATS.attack,defense:base.defense-BASE_STATS.defense,mp:base.mp-BASE_STATS.mp},
  stats:{hp:base.hp+points.hp*2+ageBonus.hp,attack:base.attack+points.attack+ageBonus.attack,defense:base.defense+points.defense+ageBonus.defense,mp:base.mp+points.mp+ageBonus.mp}
 };
}

export function allocatePoint(count,allocation,key,grantedPoints=0){
 if(!Object.hasOwn(BASE_STATS,key))throw Error('能力を選んでください。');
 const state=strengthState(count,allocation,BASE_STATS,{grantedPoints});
 if(state.available<1)throw Error('強化ポイントがありません。');
 return {...state.points,[key]:state.points[key]+1};
}

export function incomingDamage(power,defense){return Math.max(1,power-defense);}

