export const FOODS = Object.freeze([
  {id:'snack',name:'SNACK',price:1,icon:'🍪',reaction:'music'},
  {id:'meal',name:'MEAL',price:3,icon:'🍖',reaction:'jump'},
  {id:'special',name:'SPECIAL TREAT',price:5,icon:'🎂',reaction:'celebrate'}
]);
const count = value => Number.isFinite(Number(value)) ? Math.max(0,Math.floor(Number(value))) : 0;
export function careDay(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function careState(data={},day=careDay()) {
  const care=data.petCare||{};
  return {friendship:count(care.friendship),happy:count(care.happy),date:day,petCount:care.date===day?Math.min(3,count(care.petCount)):0};
}
export function petReward(data,day=careDay()) {
  const state=careState(data,day),awarded=state.petCount<3;
  return {awarded,petCare:{...state,petCount:Math.min(3,state.petCount+1),friendship:state.friendship+(awarded?1:0)}};
}
export function feedReward(data,id,day=careDay()) {
  const food=FOODS.find(item=>item.id===id);
  if(!food)throw Error('エサを選んでください。');
  const coins=count(data.coins);
  if(coins<food.price)throw Error('コインが足りません。');
  const state=careState(data,day);
  return {coins:coins-food.price,petCare:{...state,happy:state.happy+food.price}};
}
export function petReaction(friendship,random=Math.random()) {
  if(friendship>=100)return 'celebrate';
  if(friendship>=50)return 'approach';
  if(friendship>=30)return 'hearts';
  if(friendship>=10&&random<0.35)return 'jump';
  return 'music';
}
