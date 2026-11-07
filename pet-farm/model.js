// もんすたふぁーむ — state rules (no English quiz or coin rewards).
// Coordinates use a rectangular 3/4 top-down tile map, not an isometric diamond grid.
export const MAP = {w:34,h:25,tile:38};
export const FARMS = Object.freeze([
  {name:'第1農園',x:15,y:11,w:2,h:2,price:0},
  {name:'第2農園',x:21,y:11,w:2,h:3,price:30},
  {name:'第3農園',x:11,y:17,w:3,h:3,price:80},
  {name:'第4農園',x:21,y:17,w:4,h:4,price:160}
]);
export const CROPS = Object.freeze({
 carrot:{name:'にんじん',icon:'🥕',seed:2,minutes:1,reply:'ぴょんぴょん跳ねた！'},
 tomato:{name:'トマト',icon:'🍅',seed:4,minutes:3,reply:'うれしそうに踊っている！'},
 potato:{name:'じゃがいも',icon:'🥔',seed:3,minutes:2,reply:'満足そうにほほえんだ！'},
 pumpkin:{name:'かぼちゃ',icon:'🎃',seed:6,minutes:7,reply:'おなかいっぱいでうとうと…'},
 strawberry:{name:'いちご',icon:'🍓',seed:7,minutes:5,reply:'ハートがふわっと浮かんだ！'},
 pepper:{name:'とうがらし',icon:'🌶️',seed:5,minutes:4,reply:'からくてびっくり、走り回った！'}
});
export const SUPPLIES = Object.freeze({water:{name:'水×3',icon:'💧',price:2,count:3},fertilizer:{name:'肥料×2',icon:'🌱',price:4,count:2}});
export const cropIds=Object.keys(CROPS);
export const plotKey=(area,index)=>String(area)+'-'+String(index);
export function locate(area,index) {
 const a=FARMS[area];
 if(!a || !Number.isInteger(index) || index<0 || index>=a.w*a.h) return null;
 return {x:a.x+(index%a.w),y:a.y+Math.floor(index/a.w)};
}
const integer=(value,max=99999)=>Math.min(max,Math.max(0,Math.floor(Number(value)||0)));
const stock=(v,ids)=>Object.fromEntries(ids.map(id=>[id,integer(v?.[id])]));
export function freshFarm(){
 return {schemaVersion:1,unlocked:[true,false,false,false],
  plots:{},inventory:{seeds:{carrot:3},water:3,fertilizer:0,produce:{},giftBox:{}},
  bond:0,harvests:0,feedCount:0,giftsPacked:0,updatedAt:0};
}
export function normalizeFarm(raw){
 const f=freshFarm(),v=raw&&typeof raw==='object'?raw:{};
 f.unlocked=FARMS.map((a,i)=>i===0||v.unlocked?.[i]===true);
 f.inventory.seeds=stock(v.inventory?.seeds,cropIds);
 f.inventory.water=integer(v.inventory?.water);
 f.inventory.fertilizer=integer(v.inventory?.fertilizer);
 f.inventory.produce=stock(v.inventory?.produce,cropIds);
 f.inventory.giftBox=stock(v.inventory?.giftBox,cropIds);
 f.bond=integer(v.bond,999999);
 f.harvests=integer(v.harvests,999999);
 f.feedCount=integer(v.feedCount,999999);
 f.giftsPacked=integer(v.giftsPacked,999999);
 f.updatedAt=integer(v.updatedAt,9999999999999);
 const plots=v.plots&&typeof v.plots==='object'?v.plots:{};
 for(let area=0;area<FARMS.length;area++){
  if(!f.unlocked[area])continue;
  for(let index=0;index<FARMS[area].w*FARMS[area].h;index++){
   const key=plotKey(area,index),p=plots[key];
   if(!p || !Object.hasOwn(CROPS,p.crop))continue;
   const started=integer(p.plantedAt,9999999999999),watered=integer(p.wateredAt,9999999999999);
   const ready=integer(p.readyAt,9999999999999);
   if(!started)continue;
   f.plots[key]={crop:p.crop,plantedAt:started,wateredAt:watered,readyAt:ready,boosted:!!p.boosted};
  }
 }
 return f;
}
export function growthPhase(plot,now=Date.now()){
 if(!plot)return 'empty';
 if(!plot.wateredAt)return 'dry';
 if(plot.readyAt<=now)return 'ready';
 const span=Math.max(1,plot.readyAt-plot.wateredAt),progress=1-(plot.readyAt-now)/span;
 return progress<.33?'sprout':progress<.7?'growing':'almost';
}
export function remaining(plot,now=Date.now()){
 if(!plot?.wateredAt)return '水やり待ち';
 const ms=Math.max(0,plot.readyAt-now);
 if(!ms)return '収穫できます';
 return ms<60000?'あと'+Math.ceil(ms/1000)+'秒':'あと'+Math.ceil(ms/60000)+'分';
}
function copy(state){return normalizeFarm(state);}
function fail(message){throw new Error(message);}
export function applyFarmAction(current,action,now=Date.now()){
 const f=copy(current),id=action?.area,index=action?.index;
 if(!Number.isInteger(id)||!Number.isInteger(index)||!locate(id,index))fail('畑の選択が正しくありません。');
 if(!f.unlocked[id])fail('この農園はまだ解放されていません。');
 const key=plotKey(id,index),p=f.plots[key];
 switch(action.type){
 case 'plant':{
  const crop=String(action.crop||'');
  if(!Object.hasOwn(CROPS,crop))fail('タネを選んでください。');
  if(p)fail('このマスにはすでに作物があります。');
  if(!f.inventory.seeds[crop])fail('タネがありません。SHOPで購入してください。');
  f.inventory.seeds[crop]--;
  f.plots[key]={crop,plantedAt:now,wateredAt:0,readyAt:0,boosted:false};
  return {farm:f,action:'plant',message:CROPS[crop].name+'のタネをまきました。'};
 }
 case 'water':
  if(!p)fail('先にタネをまいてください。');
  if(p.wateredAt)fail('この畑にはすでに水をあげています。');
  if(!f.inventory.water)fail('水がありません。SHOPで購入してください。');
  f.inventory.water--;
  p.wateredAt=now;
  p.readyAt=now+CROPS[p.crop].minutes*60000*(p.boosted ? 0.5 : 1);
  return {farm:f,action:'water',message:'じょうろで水やりしました！'};
 case 'fertilize':
  if(!p)fail('先にタネをまいてください。');
  if(p.boosted)fail('この畑には肥料を使っています。');
  if(!f.inventory.fertilizer)fail('肥料がありません。');
  f.inventory.fertilizer--;
  p.boosted=true;
  if(p.wateredAt&&p.readyAt>now)p.readyAt=now+Math.max(5000,Math.round((p.readyAt-now)*.5));
  return {farm:f,action:'fertilize',message:'肥料をあげました。成長が早くなります！'};
 case 'harvest':
  if(!p||growthPhase(p,now)!=='ready')fail('まだ収穫できません。');
  f.inventory.produce[p.crop]++;
  f.harvests++;
  delete f.plots[key];
  return {farm:f,action:'harvest',message:CROPS[p.crop].name+'を1個収穫しました！'};
 default:fail('この操作はできません。');
 }
}
export function applyPurchase(current,kind,id,coins){
 const f=copy(current),balance=integer(coins,999999999);
 let price=0,message='';
 if(kind==='seed'){
  if(!Object.hasOwn(CROPS,id))fail('商品が見つかりません。');
  price=CROPS[id].seed;f.inventory.seeds[id]=(f.inventory.seeds[id]||0)+1;
  message=CROPS[id].name+'のタネを買いました。';
 }else if(kind==='supply'){
  if(!Object.hasOwn(SUPPLIES,id))fail('商品が見つかりません。');
  const item=SUPPLIES[id];price=item.price;
  f.inventory[id]+=item.count;message=item.name+'を購入しました。';
 }else if(kind==='area'){
  const i=Number(id),a=FARMS[i];
  if(!a||i===0)fail('農園が見つかりません。');
  if(f.unlocked[i])fail('すでに解放しています。');
  if(!f.unlocked[i-1])fail('前の農園から順番に解放してください。');
  price=a.price;f.unlocked[i]=true;
  message=a.name+'が解放されました！';
 }else fail('商品が見つかりません。');
 if(balance<price)fail('コインが足りません（必要 '+price+'C）。');
 return {farm:f,cost:price,message};
}
export function useProduce(current,kind,crop){
 const f=copy(current);
 if(!Object.hasOwn(CROPS,crop))fail('作物が選択されていません。');
 if(kind==='feed'){
  if(!f.inventory.produce[crop])fail('野菜がありません。');
  f.inventory.produce[crop]--;f.bond++;f.feedCount++;
  return {farm:f,message:CROPS[crop].name+'を食べた！ '+CROPS[crop].reply,action:'feed'};
 }
 if(kind==='pack'){
  if(!f.inventory.produce[crop])fail('野菜がありません。');
  f.inventory.produce[crop]--;f.inventory.giftBox[crop]++;f.giftsPacked++;
  return {farm:f,message:'プレゼント箱に入れました。お友達への送信は交流機能の公開後に使えます。',action:'pack'};
 }
 if(kind==='unpack'){
  if(!f.inventory.giftBox[crop])fail('プレゼント箱は空です。');
  f.inventory.giftBox[crop]--;f.inventory.produce[crop]++;
  return {farm:f,message:'プレゼント箱から倉庫に戻しました。',action:'unpack'};
 }
 fail('この操作はできません。');
}
