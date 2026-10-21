export const FOODS = Object.freeze([
  {id:'snack',name:'ふつうのエサ',price:1,icon:'🍪',reaction:'music'},
  {id:'meal',name:'ちょっといいエサ',price:3,icon:'🍖',reaction:'jump'},
  {id:'special',name:'ごちそう',price:5,icon:'🎂',reaction:'celebrate'}
]);
const count = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
// Use the user's local calendar day, matching other daily pet features.
export function happyDay(now=new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function happyLabel(happy) {
  return happy===10?'MAX HAPPY!':happy>=7?'HAPPY!':happy>=4?'ごきげん！':'ふつう';
}
export function careState(data={},today=happyDay()) {
  // Undated legacy totals must not become today's rewards.
  return {happy:data.petCare?.happyDate===today?Math.min(10,count(data.petCare?.happy)):0};
}
export function yesterdayKey(today=happyDay()) {
  const date=new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
export function previousHappy(data={},today=happyDay()) {
  const saved=data.petCare, yesterday=yesterdayKey(today);
  if(saved?.happyDate===yesterday)return Math.min(10,count(saved.happy));
  if(saved?.previousHappyDate===yesterday)return Math.min(10,count(saved.previousHappy));
  return 0;
}
export function feedReward(data,id,today=happyDay()) {
  const food=FOODS.find(item=>item.id===id);
  if(!food)throw Error('エサを選んでください。');
  const coins=count(data.coins);
  if(coins<food.price)throw Error('コインが足りません。');
  const saved=data.petCare,yesterday=yesterdayKey(today);
  // Keep one day of history in the existing FEED write, even if FEED wins
  // the transaction race with the daily lifecycle check. Stale history expires.
  const history=saved?.happyDate===yesterday||saved?.previousHappyDate===yesterday
    ?{previousHappy:previousHappy(data,today),previousHappyDate:yesterday}:{};
  return {coins:coins-food.price,petCare:{happy:Math.min(10,careState(data,today).happy+food.price),happyDate:today,...history}};
}
