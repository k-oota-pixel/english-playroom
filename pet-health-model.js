import {wasteState} from './pet-waste-model.js?v=1';
export function healthRoll(uid,generation,today,kind){let h=2166136261;for(const c of `${uid}|${generation}|${today}|health-${kind}`){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;}
export const illnessRisk=(waste,zeros)=>Math.max(waste>=3?.30:waste>=2?.25:waste>=1?.10:0,zeros>=4?.30:zeros===3?.20:zeros===2?.15:0);
export const illnessDeathRisk=days=>days>=3?.15:days===2?.05:days===1?.02:0;
export function advanceHealth(data,today,uid,roll=healthRoll){
 if(!data.petHatched)return {patch:{},fatal:false};
 const generation=data.petGeneration||1,old=data.petHealth?.generation===generation?data.petHealth:null;
 if(old?.checkedDate>=today)return {patch:{},fatal:false};
 const waste=wasteState(data),overdue=old?Math.min(old.wasteSeen||0,waste.count):0;
 const happy=data.petCare?.happyDate===today&&data.petCare.happy>0;
 const zeroDays=happy?0:Math.min(4,(old?.zeroDays||0)+1);
 let sick=!!old?.sick,sickDays=sick?(old.sickDays||0)+1:0;
 const fatal=sick&&roll(uid,generation,today,'death')<illnessDeathRisk(sickDays);
 const risk=illnessRisk(overdue,zeroDays);
 if(!sick&&old?.curedDate!==today)sick=roll(uid,generation,today,'condition')<risk||roll(uid,generation,today,'ordinary')<.03;
 const petHealth={generation,checkedDate:today,sick,sickDays,zeroDays,wasteSeen:waste.count,risk,overdue,sickSince:sick?(old?.sickSince||today):'',curedDate:old?.curedDate||''};
 return {patch:{petHealth},fatal};
}
export function injectionPatch(data,today){
 if(!data.petHatched||!data.petHealth?.sick)throw Error('注射は病気のペットに使えます。');
 const coins=Math.max(0,Math.floor(Number(data.coins)||0));if(coins<5)throw Error('コインが足りません。');
 return {coins:coins-5,petHealth:{...data.petHealth,sick:false,sickDays:0,sickSince:'',curedDate:today,checkedDate:today}};
}
