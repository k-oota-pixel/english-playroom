// Calendar days since hatching; each day's draw is stable across tabs and retries.
export const GROWTH_VERSION=1428;
export const GROWTH_CHANCES=[0,0,.40,.80,1];
export function hatchDay(data,today){const start=data.petHatchDate;return start?Math.max(1,Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1):1;}
export function growthRoll(uid,generation,day){let h=2166136261;for(const c of uid+'|'+generation+'|growth|'+day){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
export function growthPatch(data,today,uid){
 const day=hatchDay(data,today);
 if(data.petGrowthVersion!==GROWTH_VERSION){
  const migrated={petGrowthVersion:GROWTH_VERSION};
  if(data.petHatched&&data.petAppearance)return {...migrated,petAdult:true};
  if(!data.petHatched||data.petAdult)return migrated;
  for(let d=2;d<=Math.min(4,day);d++)if(growthRoll(uid,data.petGeneration||1,d)<GROWTH_CHANCES[d])return {...migrated,petGrowthPending:true,petGrowthCheckedDay:d};
  return {...migrated,petGrowthCheckedDay:Math.max(1,Math.min(4,day))};
 }
 if(!data.petHatched||data.petAdult||data.petGrowthPending)return {};
 const last=Number(data.petGrowthCheckedDay)||1;
 for(let d=Math.max(2,last+1);d<=Math.min(4,day);d++)if(growthRoll(uid,data.petGeneration||1,d)<GROWTH_CHANCES[d])return {petGrowthPending:true,petGrowthCheckedDay:d};
 return day>last?{petGrowthCheckedDay:day}:{};
}
export function hatchPatch(today){return {petGrowthVersion:GROWTH_VERSION,petHatched:true,petAdult:false,petGrowthPending:false,petAppearance:null,petHatchDate:today,petGrowthCheckedDay:1};}
