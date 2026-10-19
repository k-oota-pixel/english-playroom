import { previousHappy } from './pet-care-model.js?v=1.5.9';

const HAPPY_MULTIPLIERS=Object.freeze([1,.9,.8,.7,.6,.5,.42,.34,.26,.18,.1]);
export function chanceFor(days) {
  if(days<=5)return 0;
  if(days<=10)return .10;
  if(days<=15)return .25;
  if(days<=20)return .50;
  if(days<=25)return .80;
  return 1;
}
export function departureChance(data,today,days) {
  return chanceFor(days)*HAPPY_MULTIPLIERS[previousHappy(data,today)];
}
function hashString(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function shouldDepart(uid,generation,today,days,data={}) {
  const chance=departureChance(data,today,days);
  // Stable across reloads, tabs and Firestore transaction retries.
  return chance>0&&(hashString(`${uid}|${generation}|${today}|${days}`)%10000)/10000<chance;
}
