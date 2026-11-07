// もんすたふぁーむ — state rules (no English quiz or coin rewards).
// Coordinates use a rectangular 3/4 top-down tile map, not an isometric diamond grid.
export const MAP = {w:32,h:16,tile:54};
export const FARMS = Object.freeze([
  {name:'第1農園',x:12,y:7,w:2,h:2,price:0},
  {name:'第2農園',x:19,y:7,w:2,h:3,price:30},
  {name:'第3農園',x:9,y:11,w:3,h:3,price:80},
  {name:'第4農園',x:19,y:11,w:4,h:4,price:160}
]);
export const CROPS = Object.freeze({
 lettuce:{name:'レタス',icon:'🥬',seed:1,pack:3,minutes:120,fullness:1,reply:'しゃきしゃき食べた！'},
 carrot:{name:'にんじん',icon:'🥕',seed:1,pack:2,minutes:240,fullness:2,unlockAfter:'lettuce',reply:'ぴょんぴょん跳ねた！'},
 pumpkin:{name:'かぼちゃ',icon:'🎃',seed:2,pack:3,minutes:480,fullness:4,unlockAfter:'carrot',reply:'おなかいっぱいでうとうと…'},
 strawberry:{name:'いちご',icon:'🍓',seed:1,pack:1,minutes:840,fullness:5,unlockAfter:'pumpkin',reply:'ハートがふわっと浮かんだ！'},
 melon:{name:'メロン',icon:'🍈',seed:2,pack:1,minutes:1320,fullness:10,unlockAfter:'strawberry',reply:'おいしそうにほほえんだ！'},
 // Keep previously planted and collected crops available for their owners.
 // Legacy crops are not sold in the new 5-crop shop.
 tomato:{name:'トマト',icon:'🍅',seed:4,pack:1,minutes:3,legacy:true,reply:'うれしそうに踊っている！'},
 potato:{name:'じゃがいも',icon:'🥔',seed:3,pack:1,minutes:2,legacy:true,reply:'満足そうにほほえんだ！'},
 pepper:{name:'とうがらし',icon:'🌶️',seed:5,pack:1,minutes:4,legacy:true,reply:'からくてびっくり、走り回った！'}
});
export const SUPPLIES = Object.freeze({water:{name:'水',icon:'💧',price:1,count:1},fertilizer:{name:'肥料',icon:'🌱',price:2,count:1}});
export const cropIds=Object.keys(CROPS).filter(id=>!CROPS[id].legacy);
export const allCropIds=Object.keys(CROPS);
export function cropUnlockProgress(farm,id){
 const crop=CROPS[id];
 if(!crop||crop.legacy)return {unlocked:!!crop,remaining:0,required:0};
 if(!crop.unlockAfter)return {unlocked:true,remaining:0,required:0};
 const count=Math.max(0,Number(farm?.harvestCounts?.[crop.unlockAfter])||0);
 return {unlocked:count>=10,remaining:Math.max(0,10-count),required:10,previous:crop.unlockAfter};
}
export const isCropUnlocked=(farm,id)=>cropUnlockProgress(farm,id).unlocked;
export const plotKey=(area,index)=>String(area)+'-'+String(index);
export function locate(area,index) {
 const a=FARMS[area];
 if(!a || !Number.isInteger(index) || index<0 || index>=a.w*a.h) return null;
 return {x:a.x+(index%a.w),y:a.y+Math.floor(index/a.w)};
}
const integer=(value,max=99999)=>Math.min(max,Math.max(0,Math.floor(Number(value)||0)));
const stock=(v,ids)=>Object.fromEntries(ids.map(id=>[id,integer(v?.[id])]));
export function freshFarm(){
 return {schemaVersion:2,unlocked:[true,false,false,false],
  plots:{},inventory:{seeds:{lettuce:3},water:3,fertilizer:0,produce:{},giftBox:{}},harvestCounts:{},
  bond:0,harvests:0,feedCount:0,giftsPacked:0,updatedAt:0};
}
export function normalizeFarm(raw){
 const f=freshFarm(),v=raw&&typeof raw==='object'?raw:{};
 f.unlocked=FARMS.map((a,i)=>i===0||v.unlocked?.[i]===true);
 f.inventory.seeds=stock(v.inventory?.seeds,allCropIds);
 // Existing farm accounts were created before lettuce existed. Give those users
 // the same three starter seeds once; schemaVersion:2 persists on next write.
 if(!Number.isFinite(Number(v.schemaVersion))||Number(v.schemaVersion)<2){
  f.inventory.seeds.lettuce=Math.min(99999,f.inventory.seeds.lettuce+3);
 }
 f.inventory.water=integer(v.inventory?.water);
 f.inventory.fertilizer=integer(v.inventory?.fertilizer);
 f.inventory.produce=stock(v.inventory?.produce,allCropIds);
 f.inventory.giftBox=stock(v.inventory?.giftBox,allCropIds);
 f.harvestCounts=stock(v.harvestCounts,allCropIds);
 f.bond=integer(v.bond,999999);
 f.harvests=integer(v.harvests,999999);
 f.feedCount=integer(v.feedCount,999999);
 f.giftsPacked=integer(v.giftsPacked,999999);
 f.updatedAt=integer(v.updatedAt,9999999999999);
 const plots=v.plots&&typeof v.plots==='object'?v.plots:{};
 const legacyMinutes={carrot:1,pumpkin:7,strawberry:5,tomato:3,potato:2,pepper:4};
 for(let area=0;area<FARMS.length;area++){
  if(!f.unlocked[area])continue;
  for(let index=0;index<FARMS[area].w*FARMS[area].h;index++){
   const key=plotKey(area,index),p=plots[key];
   if(!p||!Object.hasOwn(CROPS,p.crop))continue;
   const planted=integer(p.plantedAt,9999999999999);
   if(!planted)continue;
   const watered=integer(p.wateredAt,9999999999999);
   const ready=integer(p.readyAt,9999999999999);
   // Old dry crops had readyAt=0 and were waiting for water. Let them complete
   // using the old grow time rather than converting them to multi-hour delays.
   const legacyReady=planted+(legacyMinutes[p.crop]||CROPS[p.crop].minutes)*60000;
   f.plots[key]={
    crop:p.crop,plantedAt:planted,wateredAt:watered,
    readyAt:ready||legacyReady,boosted:!!p.boosted
   };
  }
 }
 return f;
}
export function growthPhase(plot,now=Date.now()){
 if(!plot)return 'empty';
 if(plot.readyAt<=now)return 'ready';
 const start=Math.max(1,plot.plantedAt||0);
 const duration=Math.max(1,plot.readyAt-start);
 const progress=Math.max(0,Math.min(1,(now-start)/duration));
 return progress<.33?'sprout':progress<.7?'growing':'almost';
}
export function remaining(plot,now=Date.now()){
 if(!plot)return '何も植えていません';
 const ms=Math.max(0,plot.readyAt-now);
 if(!ms)return '収穫できます';
 const secs=Math.ceil(ms/1000),hours=Math.floor(secs/3600);
 const mins=Math.floor((secs%3600)/60),seconds=secs%60;
 if(hours)return 'あと'+hours+'時間'+String(mins).padStart(2,'0')+'分';
 if(mins)return 'あと'+mins+'分'+(seconds?seconds+'秒':'');
 return 'あと'+seconds+'秒';
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
  if(!isCropUnlocked(f,crop))fail(CROPS[crop].name+'はまだ解放されていません。');
  if(p)fail('このマスにはすでに作物があります。');
  if(!f.inventory.seeds[crop])fail('タネがありません。SHOPで購入してください。');
  f.inventory.seeds[crop]--;
  f.plots[key]={crop,plantedAt:now,wateredAt:0,readyAt:now+CROPS[crop].minutes*60000,boosted:false};
  return {farm:f,action:'plant',message:CROPS[crop].name+'のタネをまきました。'};
 }
 case 'water':
  if(!p)fail('先にタネをまいてください。');
  if(p.readyAt<=now)fail('もう収穫できます。');
  if(p.wateredAt)fail('この畑にはすでに水をあげています。');
  if(!f.inventory.water)fail('水がありません。SHOPで購入してください。');
  f.inventory.water--;
  p.wateredAt=now;
  p.readyAt=now+Math.round((p.readyAt-now)*2/3);
  return {farm:f,action:'water',message:'水で残り時間が2/3になりました！'};
 case 'fertilize':
  if(!p)fail('先にタネをまいてください。');
  if(p.readyAt<=now)fail('もう収穫できます。');
  if(p.boosted)fail('この畑には肥料を使っています。');
  if(!f.inventory.fertilizer)fail('肥料がありません。');
  f.inventory.fertilizer--;
  p.boosted=true;
  p.readyAt=now+Math.round((p.readyAt-now)/3);
  return {farm:f,action:'fertilize',message:'肥料で残り時間が1/3になりました！'};
 case 'harvest':
  if(!p||growthPhase(p,now)!=='ready')fail('まだ収穫できません。');
  f.inventory.produce[p.crop]++;
  f.harvests++;
  f.harvestCounts[p.crop]=Math.min(99999,(f.harvestCounts[p.crop]||0)+1);
  delete f.plots[key];
  return {farm:f,action:'harvest',message:CROPS[p.crop].name+'を1個収穫しました！'};
 default:fail('この操作はできません。');
 }
}
// Quantity is validated again inside the wallet+farm Firestore transaction.
// Maximum 99 bundles/items per order; each seed bundle adds its specified quantity.
export function applyPurchase(current,kind,id,coins,quantity=1){
 const f=copy(current),balance=integer(coins,999999999);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail('購入数は1〜99個で指定してください。');
 if(kind==='area'&&quantity!==1)fail('敷地は1回ずつ解放してください。');
 let unitPrice=0,message='';
 if(kind==='seed'){
  if(!Object.hasOwn(CROPS,id))fail('商品が見つかりません。');
  if(CROPS[id].legacy||!isCropUnlocked(f,id))fail(CROPS[id].name+'はまだ購入できません。');
  unitPrice=CROPS[id].seed;
  const units=quantity*(CROPS[id].pack||1);
  if(f.inventory.seeds[id]+units>99999)fail('タネの所持上限を超えています。');
  f.inventory.seeds[id]+=units;
  message=CROPS[id].name+'のタネを'+units+'個購入しました。';
 }else if(kind==='supply'){
  if(!Object.hasOwn(SUPPLIES,id))fail('商品が見つかりません。');
  const item=SUPPLIES[id];
  unitPrice=item.price;
  if(f.inventory[id]+quantity>99999)fail(item.name+'の所持上限を超えています。');
  f.inventory[id]+=quantity;
  message=item.name+'を'+quantity+'個購入しました。';
 }else if(kind==='area'){
  const i=Number(id),a=FARMS[i];
  if(!a||i===0)fail('農園が見つかりません。');
  if(f.unlocked[i])fail('すでに解放しています。');
  if(!f.unlocked[i-1])fail('前の農園から順番に解放してください。');
  unitPrice=a.price;f.unlocked[i]=true;
  message=a.name+'が解放されました！';
 }else fail('商品が見つかりません。');
 const price=unitPrice*quantity;
 if(balance<price)fail('コインが足りません（必要 '+price+'C）。');
 return {farm:f,cost:price,quantity,message};
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
