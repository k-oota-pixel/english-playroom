import { previousHappy } from './pet-care-model.js?v=1.5.9';

export function chanceFor(days) {
  if(days<=5)return 0;
  if(days<=10)return .03;
  if(days<=15)return .08;
  if(days<=20)return .12;
  if(days<=25)return .15;
  return .20;
}
export function departureChance(data,today,days) {
  // Full means yesterday's saved hunger/HAPPY gauge reached its cap of 10.
  // Reuse existing FEED history; no additional Firestore reads or writes.
  return chanceFor(days)*(previousHappy(data,today)===10?.5:1);
}
function hashString(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function shouldDepart(uid,generation,today,days,data={}) {
  const chance=departureChance(data,today,days);
  // Stable across reloads, tabs and Firestore transaction retries.
  return chance>0&&(hashString(`${uid}|${generation}|${today}|${days}`)%10000)/10000<chance;
}
