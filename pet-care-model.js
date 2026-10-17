export const FOODS = Object.freeze([
  {id:'snack',name:'SNACK',price:1,icon:'🍪',reaction:'music'},
  {id:'meal',name:'MEAL',price:3,icon:'🍖',reaction:'jump'},
  {id:'special',name:'SPECIAL TREAT',price:5,icon:'🎂',reaction:'celebrate'}
]);
const count = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
export function careState(data={}) {
  return {happy:count(data.petCare?.happy)};
}
export function feedReward(data,id) {
  const food=FOODS.find(item=>item.id===id);
  if(!food)throw Error('エサを選んでください。');
  const coins=count(data.coins);
  if(coins<food.price)throw Error('コインが足りません。');
  return {coins:coins-food.price,petCare:{happy:careState(data).happy+food.price}};
}
