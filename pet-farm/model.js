// もんすたふぁーむ — state rules (no English quiz or coin rewards).
// Coordinates use a rectangular 3/4 top-down tile map, not an isometric diamond grid.
export const MAP = {w:32,h:16,tile:54};
// The original layout is retained only for migration from schemaVersion <= 2.
export const FARMS = Object.freeze([
  {name:'第1農園',x:12,y:7,w:2,h:2,price:0},
  {name:'第2農園',x:19,y:7,w:2,h:3,price:30},
  {name:'第3農園',x:9,y:11,w:3,h:3,price:80},
  {name:'第4農園',x:19,y:11,w:4,h:4,price:160}
]);
export const FIELD_TYPES=Object.freeze({
 '4':{w:2,h:2,price:50,name:'4マス圃場'},
 '6':{w:2,h:3,price:100,name:'6マス圃場'},
 '9':{w:3,h:3,price:150,name:'9マス圃場'},
 '16':{w:4,h:4,price:200,name:'16マス圃場'}
});
export const FIELD_SIZES=Object.keys(FIELD_TYPES);
export const RESERVED_ZONES=Object.freeze([
 {x:1,y:1,w:7,h:6}, // pet house
 {x:24,y:1,w:7,h:6} // shop
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
export const FLOWERS=Object.freeze({
 rose:{name:'ばら',icon:'🌹',price:50},
 sunflower:{name:'ひまわり',icon:'🌻',price:50},
 lavender:{name:'ラベンダー',icon:'🪻',price:50},
 hydrangea:{name:'あじさい',icon:'💠',price:50},
 marigold:{name:'マリーゴールド',icon:'🌼',price:50},
 tulip:{name:'チューリップ',icon:'🌷',price:50}
});
export const flowerIds=Object.keys(FLOWERS);
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
 return {schemaVersion:3,unlocked:[true,false,false,false],starterClaimed:false,
  fields:[],roads:[],flowers:[],nextFieldId:1,
  plots:{},inventory:{seeds:{lettuce:3},water:3,fertilizer:0,produce:{},giftBox:{},fields:{'4':0,'6':0,'9':0,'16':0},roads:0,flowers:Object.fromEntries(flowerIds.map(id=>[id,0]))},
  harvestCounts:{},bond:0,harvests:0,feedCount:0,giftsPacked:0,updatedAt:0};
}
const validPoint=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&y>=1&&x<MAP.w-1&&y<MAP.h-1;
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function canPlace(farm,kind,x,y,ignoreId=''){
 const shape=FIELD_TYPES[kind];
 if(!shape||!validPoint(x,y)||x+shape.w>MAP.w-1||y+shape.h>MAP.h-1)return false;
 const rect={x,y,w:shape.w,h:shape.h};
 if(RESERVED_ZONES.some(z=>intersects(rect,z)))return false;
 if((farm.fields||[]).some(field=>field.id!==ignoreId&&intersects(rect,{x:field.x,y:field.y,...FIELD_TYPES[field.size]})))return false;
 const roads=new Set(farm.roads||[]);
 for(let dy=0;dy<shape.h;dy++)for(let dx=0;dx<shape.w;dx++)if(roads.has((x+dx)+','+(y+dy)))return false;
 if((farm.flowers||[]).some(flower=>intersects(rect,{x:flower.x,y:flower.y,w:1,h:1})))return false;
 return true;
}
export function canPlaceRoad(farm,x,y){
 if(!validPoint(x,y)||RESERVED_ZONES.some(z=>intersects({x,y,w:1,h:1},z)))return false;
 if((farm.fields||[]).some(f=>intersects({x,y,w:1,h:1},{x:f.x,y:f.y,...FIELD_TYPES[f.size]})))return false;
 return !(farm.roads||[]).includes(x+','+y)&&!(farm.flowers||[]).some(f=>f.x===x&&f.y===y);
}
export const canPlaceFlower=(farm,x,y)=>canPlaceRoad(farm,x,y);
export const locateField=(farm,id,index)=>{
 const field=farm.fields?.find(f=>f.id===String(id));
 const shape=field&&FIELD_TYPES[field.size];
 if(!shape||!Number.isInteger(index)||index<0||index>=shape.w*shape.h)return null;
 return {x:field.x+index%shape.w,y:field.y+Math.floor(index/shape.w)};
};
// Pick a place where the 90px pet sprite cannot cover the selected 54px plot.
// The sprite is anchored near its feet (CSS translate(-50%,-84%)), so the
// occupied region extends much farther above its position than below.
export function findWorkStand(farm,area,index,fromX=16,fromY=8){
 const field=farm?.fields?.find(f=>f.id===String(area));
 const spot=locateField(farm,area,index);
 const shape=field&&FIELD_TYPES[field.size];
 if(!field||!shape||!spot)return null;
 const occupied=[
  ...RESERVED_ZONES,
  ...(farm.fields||[]).flatMap(f=>{
   const size=FIELD_TYPES[f.size];
   return size?[{x:f.x,y:f.y,w:size.w,h:size.h}]:[];
  })
 ];
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const petBody=(x,y)=>({x:x-.9,y:y-1.45,w:1.8,h:1.75});
 const inside=(box)=>box.x>=0&&box.y>=0&&box.x+box.w<=MAP.w&&box.y+box.h<=MAP.h;
 const free=(x,y)=>{
  const body=petBody(x,y);
  return inside(body)&&!occupied.some(zone=>overlaps(body,zone));
 };
 const clearOfTarget=(x,y)=>{
  const body=petBody(x,y);
  return inside(body)&&!overlaps(body,{x:spot.x,y:spot.y,w:1,h:1});
 };
 // Start with nearby positions outside the whole field rather than a position
 // next to a cell that could still cover another cell in the same field.
 const candidates=[
  {x:field.x-1,y:spot.y+1},
  {x:field.x+shape.w+1,y:spot.y+1},
  {x:spot.x+.5,y:field.y-.55},
  {x:spot.x+.5,y:field.y+shape.h+1.55}
 ];
 const walkable=[];
 for(const candidate of candidates)if(free(candidate.x,candidate.y))walkable.push(candidate);
 // If surrounding gardens are tightly packed, look for a nearby open tile
 // anywhere on the map instead of standing on top of another crop.
 if(!walkable.length){
  for(let y=2;y<MAP.h;y++)for(let x=1;x<MAP.w-1;x++){
   const candidate={x:x+.5,y:y+.5};
   if(free(candidate.x,candidate.y))walkable.push(candidate);
  }
 }
 const ranking=p=>Math.hypot(p.x-spot.x-.5,p.y-spot.y-.5)*3+
   Math.hypot(p.x-fromX,p.y-fromY)*.35;
 if(walkable.length)return walkable.sort((a,b)=>ranking(a)-ranking(b))[0];
 // Even a fully occupied farm must not let the pet cover the active crop.
 return candidates.filter(p=>clearOfTarget(p.x,p.y)).sort((a,b)=>ranking(a)-ranking(b))[0]||null;
}
export function normalizeFarm(raw){
 const f=freshFarm(),v=raw&&typeof raw==='object'?raw:{};
 const version=Math.floor(Number(v.schemaVersion)||0);
 f.unlocked=FARMS.map((a,i)=>i===0||v.unlocked?.[i]===true);
 f.inventory.seeds=stock(v.inventory?.seeds,allCropIds);
 if(version<2)f.inventory.seeds.lettuce=Math.min(99999,f.inventory.seeds.lettuce+3);
 f.inventory.water=integer(v.inventory?.water);
 f.inventory.fertilizer=integer(v.inventory?.fertilizer);
 f.inventory.produce=stock(v.inventory?.produce,allCropIds);
 f.inventory.giftBox=stock(v.inventory?.giftBox,allCropIds);
 f.inventory.flowers=stock(v.inventory?.flowers,flowerIds);
 f.harvestCounts=stock(v.harvestCounts,allCropIds);
 f.bond=integer(v.bond,999999);
 f.harvests=integer(v.harvests,999999);
 f.feedCount=integer(v.feedCount,999999);
 f.giftsPacked=integer(v.giftsPacked,999999);
 f.updatedAt=integer(v.updatedAt,9999999999999);
 const oldPlots=v.plots&&typeof v.plots==='object'?v.plots:{};
 if(version<3){
  // Convert each paid legacy garden to an equivalent movable asset.
  // Gardens with growing crops remain in the original position; empty gardens
  // become inventory items, preventing any loss of purchased plots.
  f.starterClaimed=true;
  for(let i=0;i<FARMS.length;i++){
   if(i!==0&&!f.unlocked[i])continue;
   const old=FARMS[i],size=String(old.w*old.h),id=String(i);
   if(Object.keys(oldPlots).some(key=>key.startsWith(id+'-')&&oldPlots[key]?.crop)){
    f.fields.push({id,size,x:old.x,y:old.y,name:old.name});
   }else f.inventory.fields[size]++;
  }
 }else{
  f.starterClaimed=v.starterClaimed===true;
  f.inventory.fields=stock(v.inventory?.fields,FIELD_SIZES);
  f.inventory.roads=integer(v.inventory?.roads);
  const fields=Array.isArray(v.fields)?v.fields:[];
  const ids=new Set();
  for(const item of fields){
   const id=String(item?.id||'').slice(0,32),size=String(item?.size||'');
   const x=Number(item?.x),y=Number(item?.y);
   if(!id||ids.has(id)||!FIELD_TYPES[size]||!Number.isInteger(x)||!Number.isInteger(y))continue;
   if(!canPlace(f,size,x,y))continue;
   ids.add(id);
   f.fields.push({id,size,x,y,name:String(item.name||'圃場').trim().slice(0,16)||'圃場'});
  }
  f.nextFieldId=Math.max(1,integer(v.nextFieldId,999999));
  const rawRoads=Array.isArray(v.roads)?v.roads:[];
  for(const key of rawRoads){
   if(typeof key!=='string'||!/^\d{1,2},\d{1,2}$/.test(key))continue;
   const [x,y]=key.split(',').map(Number);
   if(canPlaceRoad(f,x,y))f.roads.push(key);
  }
  // Restore flowers after roads and fields to reject corrupt overlapping records.
  for(const item of (Array.isArray(v.flowers)?v.flowers:[])){
   const type=String(item?.type||'');
   const x=Number(item?.x),y=Number(item?.y);
   if(!Object.hasOwn(FLOWERS,type)||!canPlaceFlower(f,x,y))continue;
   f.flowers.push({type,x,y});
  }
 }
 const oldMinutes={carrot:1,pumpkin:7,strawberry:5,tomato:3,potato:2,pepper:4};
 for(const field of f.fields){
  const shape=FIELD_TYPES[field.size];
  for(let index=0;index<shape.w*shape.h;index++){
   const key=plotKey(field.id,index),p=oldPlots[key];
   if(!p||!Object.hasOwn(CROPS,p.crop))continue;
   const planted=integer(p.plantedAt,9999999999999);
   if(!planted)continue;
   const watered=integer(p.wateredAt,9999999999999),ready=integer(p.readyAt,9999999999999);
   f.plots[key]={crop:p.crop,plantedAt:planted,wateredAt:watered,
     readyAt:ready||planted+(oldMinutes[p.crop]||CROPS[p.crop].minutes)*60000,
     boosted:!!p.boosted};
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
 const f=copy(current),id=String(action?.area??''),index=action?.index;
 if(!locateField(f,id,index))fail('畑の選択が正しくありません。');
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
  p.wateredAt=now;p.readyAt=now+Math.round((p.readyAt-now)*2/3);
  return {farm:f,action:'water',message:'水で残り時間が2/3になりました！'};
 case 'fertilize':
  if(!p)fail('先にタネをまいてください。');
  if(p.readyAt<=now)fail('もう収穫できます。');
  if(p.boosted)fail('この畑には肥料を使っています。');
  if(!f.inventory.fertilizer)fail('肥料がありません。');
  f.inventory.fertilizer--;
  p.boosted=true;p.readyAt=now+Math.round((p.readyAt-now)/3);
  return {farm:f,action:'fertilize',message:'肥料で残り時間が1/3になりました！'};
 case 'harvest':
  if(!p||growthPhase(p,now)!=='ready')fail('まだ収穫できません。');
  f.inventory.produce[p.crop]++;f.harvests++;
  f.harvestCounts[p.crop]=Math.min(99999,(f.harvestCounts[p.crop]||0)+1);
  delete f.plots[key];
  return {farm:f,action:'harvest',message:CROPS[p.crop].name+'を1個収穫しました！'};
 default:fail('この操作はできません。');
 }
}
export function applyLayoutAction(current,action){
 const f=copy(current),type=String(action?.type||''),id=String(action?.id||'');
 const x=Number(action?.x),y=Number(action?.y);
 if(type==='place-field'){
  const size=String(action.size||'');
  if(!FIELD_TYPES[size]||!f.inventory.fields[size])fail('配置できる圃場がありません。');
  if(!canPlace(f,size,x,y))fail('そこには配置できません。別の場所を選んでください。');
  const name=String(action.name||'').trim().slice(0,16);
  if(!name)fail('圃場の名前を入力してください。');
  const fieldId='f'+f.nextFieldId++;
  f.fields.push({id:fieldId,size,x,y,name});
  f.inventory.fields[size]--;
  return {farm:f,message:'「'+name+'」を配置しました。',id:fieldId};
 }
 if(type==='move-field'){
  const field=f.fields.find(a=>a.id===id);
  if(!field)fail('圃場が見つかりません。');
  if(!canPlace(f,field.size,x,y,id))fail('そこには移動できません。');
  field.x=x;field.y=y;
  return {farm:f,message:'「'+field.name+'」を移動しました。'};
 }
 if(type==='rename-field'){
  const field=f.fields.find(a=>a.id===id);
  if(!field)fail('圃場が見つかりません。');
  const name=String(action.name||'').trim().slice(0,16);
  if(!name)fail('圃場の名前を入力してください。');
  field.name=name;return {farm:f,message:'圃場名を変更しました。'};
 }
 if(type==='remove-field'){
  const field=f.fields.find(a=>a.id===id);
  if(!field)fail('圃場が見つかりません。');
  if(Object.keys(f.plots).some(key=>key.startsWith(id+'-')))fail('作物をすべて収穫してから撤去してください。');
  f.fields=f.fields.filter(a=>a.id!==id);
  f.inventory.fields[field.size]++;
  return {farm:f,message:'圃場を持ち物に戻しました。'};
 }
 if(type==='place-flower'){
  const flower=String(action.flower||'');
  if(!Object.hasOwn(FLOWERS,flower))fail('花畑の種類が正しくありません。');
  if(!f.inventory.flowers[flower])fail('花畑の持ち物がありません。');
  if(!canPlaceFlower(f,x,y))fail('そこには花畑を置けません。');
  f.flowers.push({type:flower,x,y});f.inventory.flowers[flower]--;
  return {farm:f,message:FLOWERS[flower].name+'の花畑を配置しました。'};
 }
 if(type==='move-flower'){
  const fromX=Number(action?.fromX),fromY=Number(action?.fromY);
  const original=f.flowers.find(item=>item.x===fromX&&item.y===fromY);
  if(!original)fail('移動する花畑が見つかりません。');
  if(!canPlaceFlower(f,x,y))fail('そこには花畑を移動できません。');
  original.x=x;original.y=y;
  return {farm:f,message:FLOWERS[original.type].name+'の花畑を移動しました。'};
 }
 if(type==='remove-flower'){
  const index=f.flowers.findIndex(item=>item.x===x&&item.y===y);
  if(index<0)fail('花畑がありません。');
  const flower=f.flowers[index].type;
  f.flowers.splice(index,1);f.inventory.flowers[flower]++;
  return {farm:f,message:FLOWERS[flower].name+'の花畑を持ち物に戻しました。'};
 }
 if(type==='place-road'){
  const key=x+','+y;
  if(!f.inventory.roads)fail('道路がありません。SHOPで購入してください。');
  if(!canPlaceRoad(f,x,y))fail('そこには道路を敷けません。');
  f.roads.push(key);f.inventory.roads--;
  return {farm:f,message:'道路を敷きました。'};
 }
 if(type==='move-road'){
  const fromX=Number(action?.fromX),fromY=Number(action?.fromY);
  const original=f.roads.indexOf(fromX+','+fromY);
  if(original<0)fail('移動する道路が見つかりません。');
  if(!canPlaceRoad(f,x,y))fail('そこには道路を移動できません。');
  f.roads[original]=x+','+y;
  return {farm:f,message:'道路を移動しました。'};
 }
 if(type==='remove-road'){
  const key=x+','+y,index=f.roads.indexOf(key);
  if(index<0)fail('道路がありません。');
  f.roads.splice(index,1);f.inventory.roads++;
  return {farm:f,message:'道路を持ち物に戻しました。'};
 }
 fail('配置操作が正しくありません。');
}

// Quantity is validated again inside the wallet+farm Firestore transaction.
// Maximum 99 bundles/items per order; each seed bundle adds its specified quantity.
export function applyPurchase(current,kind,id,coins,quantity=1){
 const f=copy(current),balance=integer(coins,999999999);
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)fail('購入数は1〜99個で指定してください。');
 if(kind==='field'&&id==='free'&&quantity!==1)fail('無料圃場は1個だけ受け取れます。');
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
 }else if(kind==='field'){
  if(id==='free'){
   if(f.starterClaimed)fail('無料の4マス圃場は受け取り済みです。');
   f.starterClaimed=true;f.inventory.fields['4']++;
   message='無料の4マス圃場を受け取りました！「アイテム」から配置できます。';
  }else{
   const item=FIELD_TYPES[id];
   if(!item)fail('圃場が見つかりません。');
   if(!f.starterClaimed)fail('先に無料の4マス圃場を受け取ってください。');
   unitPrice=item.price;
   if(f.inventory.fields[id]+quantity>99999)fail('圃場の所持上限を超えています。');
   f.inventory.fields[id]+=quantity;
   message=item.name+'を'+quantity+'個購入しました。';
  }
 }else if(kind==='flower'){
   const item=FLOWERS[id];
   if(!item)fail('花畑が見つかりません。');
   unitPrice=item.price;
   if(f.inventory.flowers[id]+quantity>99999)fail('花畑の所持上限を超えています。');
   f.inventory.flowers[id]+=quantity;
   message=item.name+'の花畑を'+quantity+'マス購入しました。';
  }else if(kind==='road'){
  if(id!=='dirt')fail('道路が見つかりません。');
  unitPrice=1;
  if(f.inventory.roads+quantity>99999)fail('道路の所持上限を超えています。');
  f.inventory.roads+=quantity;
  message='道路を'+quantity+'マス購入しました。';
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
