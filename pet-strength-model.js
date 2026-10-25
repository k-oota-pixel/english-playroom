export const BASE_STATS=Object.freeze({hp:10,attack:1,defense:1});
export const MAX_INDIVIDUAL_BONUS=5;
const STAT_KEYS=Object.freeze(['hp','attack','defense']);

export function titleCount(titles=[]){return new Set(titles.filter(t=>t.unlocked&&typeof t.id==='string').map(t=>t.id)).size;}

export function normalizeBaseStats(base={}){
 const next={};
 for(const key of STAT_KEYS){
  const minimum=BASE_STATS[key],n=Number(base?.[key]);
  next[key]=Number.isSafeInteger(n)?Math.max(minimum,Math.min(minimum+MAX_INDIVIDUAL_BONUS,n)):minimum;
 }
 return next;
}

export function hasIndividualBaseStats(base){
 return !!base&&STAT_KEYS.every(key=>{const n=Number(base[key]),minimum=BASE_STATS[key];return Number.isSafeInteger(n)&&n>=minimum&&n<=minimum+MAX_INDIVIDUAL_BONUS;});
}

export function randomBaseStats(random=Math.random){
 const bonus=()=>Math.max(0,Math.min(MAX_INDIVIDUAL_BONUS,Math.floor((Number(random())||0)*(MAX_INDIVIDUAL_BONUS+1))));
 return {hp:BASE_STATS.hp+bonus(),attack:BASE_STATS.attack+bonus(),defense:BASE_STATS.defense+bonus()};
}

export function strengthState(count,allocation={},baseStats=BASE_STATS){
 const earned=Math.floor(Math.max(0,Number(count)||0)/3);
 const points={hp:0,attack:0,defense:0};let left=earned;
 for(const key of Object.keys(points)){const n=Number(allocation?.[key]);points[key]=Math.min(left,Number.isSafeInteger(n)&&n>0?n:0);left-=points[key];}
 const base=normalizeBaseStats(baseStats);
 return {
  earned,available:left,points,base,
  bonuses:{hp:base.hp-BASE_STATS.hp,attack:base.attack-BASE_STATS.attack,defense:base.defense-BASE_STATS.defense},
  stats:{hp:base.hp+points.hp*2,attack:base.attack+points.attack,defense:base.defense+points.defense}
 };
}

export function allocatePoint(count,allocation,key){
 if(!Object.hasOwn(BASE_STATS,key))throw Error('能力を選んでください。');
 const state=strengthState(count,allocation);
 if(state.available<1)throw Error('強化ポイントがありません。');
 return {...state.points,[key]:state.points[key]+1};
}

export function incomingDamage(power,defense){return Math.max(1,power-defense);}
