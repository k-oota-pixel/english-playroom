export const BASE_STATS=Object.freeze({hp:10,attack:1,defense:1});
export function titleCount(titles=[]){return new Set(titles.filter(t=>t.unlocked&&typeof t.id==='string').map(t=>t.id)).size;}
export function strengthState(count,allocation={}){
 const earned=Math.floor(Math.max(0,Number(count)||0)/3);
 const points={hp:0,attack:0,defense:0};let left=earned;
 for(const key of Object.keys(points)){const n=Number(allocation?.[key]);points[key]=Math.min(left,Number.isSafeInteger(n)&&n>0?n:0);left-=points[key];}
 return {earned,available:left,points,stats:{hp:10+points.hp*2,attack:1+points.attack,defense:1+points.defense}};
}
export function allocatePoint(count,allocation,key){
 if(!Object.hasOwn(BASE_STATS,key))throw Error('能力を選んでください。');
 const state=strengthState(count,allocation);
 if(state.available<1)throw Error('強化ポイントがありません。');
 return {...state.points,[key]:state.points[key]+1};
}
export function incomingDamage(power,defense){return Math.max(1,power-defense);}
