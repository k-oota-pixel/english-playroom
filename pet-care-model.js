export const FOODS = Object.freeze([
  {id:'snack',name:'SNACK',price:1,icon:'🍪',reaction:'music'},
  {id:'meal',name:'MEAL',price:3,icon:'🍖',reaction:'jump'},
  {id:'special',name:'SPECIAL TREAT',price:5,icon:'🎂',reaction:'celebrate'}
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
export function feedReward(data,id,today=happyDay()) {
  const food=FOODS.find(item=>item.id===id);
  if(!food)throw Error('エサを選んでください。');
  const coins=count(data.coins);
  if(coins<food.price)throw Error('コインが足りません。');
  return {coins:coins-food.price,petCare:{happy:Math.min(10,careState(data,today).happy+food.price),happyDate:today}};
}
