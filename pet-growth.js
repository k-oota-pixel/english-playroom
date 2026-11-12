// Calendar days since hatching; each day's draw is stable across tabs and retries.
export const GROWTH_VERSION=1428;
export const GROWTH_CHANCES=[0,0,.60,1];
export function hatchDay(data,today){const start=data.petHatchDate;return start?Math.max(1,Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1):1;}
// The hatch-day baseline counts distinct login days, even after an absence.
// Existing juveniles without a baseline retain their old calendar-based progress.
export function growthDay(data,today){
 const loginDays=Number(data.petLoginDays),baseline=Number(data.petHatchLoginDays);
 if(data.petHatchLoginDays!=null&&Number.isFinite(loginDays)&&Number.isFinite(baseline))return Math.max(1,Math.floor(loginDays)-Math.floor(baseline)+1);
 return hatchDay(data,today);
}
export function growthRoll(uid,generation,day){let h=2166136261;for(const c of uid+'|'+generation+'|growth|'+day){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
function publishWalletSnapshot(uid,data){
 if(typeof window==='undefined'||typeof CustomEvent!=='function'||!uid||!data)return;
 const detail={uid:String(uid),data};
 window.EnglishPlayroomWallet=detail;
 window.dispatchEvent(new CustomEvent('english-playroom-wallet',{detail}));
}
export function growthPatch(data,today,uid){
 publishWalletSnapshot(uid,data);
 const day=growthDay(data,today);
 if(data.petGrowthVersion!==GROWTH_VERSION){
  const migrated={petGrowthVersion:GROWTH_VERSION};
  if(data.petHatched&&data.petAppearance)return {...migrated,petAdult:true};
  if(!data.petHatched||data.petAdult)return migrated;
  for(let d=2;d<=Math.min(3,day);d++)if(growthRoll(uid,data.petGeneration||1,d)<GROWTH_CHANCES[d])return {...migrated,petGrowthPending:true,petGrowthCheckedDay:d};
  return {...migrated,petGrowthCheckedDay:Math.max(1,Math.min(3,day))};
 }
 if(!data.petHatched||data.petAdult||data.petGrowthPending)return {};
 const last=Number(data.petGrowthCheckedDay)||1;
 for(let d=Math.max(2,last+1);d<=Math.min(3,day);d++)if(growthRoll(uid,data.petGeneration||1,d)<GROWTH_CHANCES[d])return {petGrowthPending:true,petGrowthCheckedDay:d};
 return day>last?{petGrowthCheckedDay:day}:{};
}
export function hatchPatch(today,loginDays){const n=Number(loginDays);return {petGrowthVersion:GROWTH_VERSION,petHatched:true,petAdult:false,petGrowthPending:false,petAppearance:null,petHatchDate:today,petGrowthCheckedDay:1,...(loginDays!=null&&Number.isFinite(n)?{petHatchLoginDays:Math.max(0,Math.floor(n))}:{})};}
