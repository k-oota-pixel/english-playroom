import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.4.37';
import {getFirestore,doc,getDoc,setDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.3.8';
import {MAP,FIELD_TYPES,FIELD_SIZES,DISPLAY_TYPES,displayIds,FLOWERS,flowerIds,CROPS,SUPPLIES,cropIds,allCropIds,cropUnlockProgress,isCropUnlocked,plotKey,locateField,findWorkStand,canPlace,canPlaceRoad,canPlaceFlower,canPlaceDisplay,freshFarm,normalizeFarm,growthPhase,remaining,applyFarmAction,applyLayoutAction,applyPurchase,applyDisplayAction,useProduce} from './model.js?v=12';
import {flowerTileSVG} from './flower-art.js?v=1';
import {installScenery,FARM_SCENE_SIZE} from './scenery.js?v=6';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(cfg);enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const tile=MAP.tile;
let user=null,petData={},farm=freshFarm(),balance=0,selected=null,chosenSeed='lettuce',shopTab='field';
let busy=false,dirty=false,saving=null,saveTimer=0,toastTimer=0,zoom=1,baseZoom=1,petX=8.0,petY=6.5,walking=false,ready=false,authSequence=0;
let actionChoice=null,chosenPurchase=null,chosenProduce=null,placement=null,pendingNamePlacement=null,managedFieldId=null,managedDisplayId=null;
function walletRef(){return doc(db,'users',user.uid,'apps','english-playroom');}
function farmRef(){return doc(db,'users',user.uid,'apps','pet-farm');}
const coords=(x,y)=>({left:(x*tile)+'px',top:(y*tile)+'px'});
function status(message,kind=''){const el=$('status');el.textContent=message;el.className='game-status'+(kind?' '+kind:'');}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function updateCoin(){ $('coins').textContent=Number(balance).toLocaleString('ja-JP'); }
function updateTileManageButton(){
 const btn=$('tileManageBtn');if(!btn)return;
 const active=!!placement&&['manage-tile','move-tile'].includes(placement.type);
 btn.disabled=!ready||busy||(!farm.roads.length&&!farm.flowers.length&&!active);
 btn.classList.toggle('active',active);
 btn.setAttribute('aria-pressed',String(active));
}
function refresh(){
 updateCoin();renderRoads();renderFlowers();renderPlots();renderDisplays();renderPlacement();renderSelection();renderShop();renderInventory();renderManage();renderDisplayDialog();
 updateTileManageButton();
 $('saveBtn').disabled=!user||busy||!dirty;
}
function node(tag,cls,txt){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
}
function initWorld(){
 const world=$('world'),size=FARM_SCENE_SIZE;
 world.style.width=size.width+'px';world.style.height=size.height+'px';
 installScenery($('scenery'));
 const grid=$('placementLayer');
 for(let y=1;y<MAP.h-1;y++){
  for(let x=1;x<MAP.w-1;x++){
   const tileButton=node('button','placement-cell');
   tileButton.type='button';tileButton.dataset.x=String(x);tileButton.dataset.y=String(y);
   tileButton.setAttribute('aria-label',x+'列 '+y+'行に配置');
   Object.assign(tileButton.style,coords(x,y));
   tileButton.addEventListener('click',()=>choosePlacement(x,y));
   tileButton.addEventListener('pointerenter',()=>previewPlacement(x,y));
   grid.appendChild(tileButton);
  }
 }
 const preview=node('div','placement-preview');preview.id='placementPreview';grid.appendChild(preview);
 setPetPosition(petX,petY,0);
 requestAnimationFrame(()=>fitScene());
}
// Road tiles share one soil surface. Only exposed edges are shaded; connected
// sides have no tile borders, including through corners and intersections.
function roadConnections(keys,x,y){
 return {
  n:keys.has(x+','+(y-1)),
  e:keys.has((x+1)+','+y),
  s:keys.has(x+','+(y+1)),
  w:keys.has((x-1)+','+y)
 };
}
function drawRoadGrain(road,x,y){
 // Stable, tiny soil scratches: no circular marks, planks or repeating stripes.
 let seed=(Math.imul(x+11,73856093)^Math.imul(y+17,19349663))>>>0;
 for(let i=0;i<13;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const left=5+seed%45;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const top=5+seed%45;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const width=3+seed%9,rotation=(seed%45)-22;
  const grain=node('span','road-grain '+(i%3===0?'road-grain--light':'road-grain--dark'));
  grain.style.cssText='left:'+left+'px;top:'+top+'px;width:'+width+'px;transform:rotate('+rotation+'deg)';
  road.appendChild(grain);
 }
}
let roadRenderKey=null;
function renderRoads(){
 const roads=new Set(farm.roads);
 const signature=[...roads].sort().join('|');
 if(signature===roadRenderKey)return;
 roadRenderKey=signature;
 const layer=$('roadsLayer');
 layer.replaceChildren();
 for(const key of roads){
  const [x,y]=key.split(',').map(Number),connection=roadConnections(roads,x,y);
  const road=node('div','road-tile');
  Object.assign(road.style,coords(x,y));
  // Round only exposed exterior corners, not the seams between neighbors.
  road.style.borderRadius=[
   !connection.n&&!connection.w?'10px':'0',
   !connection.n&&!connection.e?'10px':'0',
   !connection.s&&!connection.e?'10px':'0',
   !connection.s&&!connection.w?'10px':'0'
  ].join(' ');
  for(const side of ['n','e','s','w']){
   if(!connection[side])road.appendChild(node('span','road-edge road-edge--'+side));
  }
  drawRoadGrain(road,x,y);
  layer.appendChild(road);
 }
}
let flowerRenderKey=null;
function renderFlowers(){
 const signature=farm.flowers.map(f=>f.type+':'+f.x+','+f.y).sort().join('|');
 if(signature===flowerRenderKey)return;
 flowerRenderKey=signature;
 const layer=$('flowersLayer');layer.replaceChildren();
 for(const flower of farm.flowers){
  const tileEl=node('div','flower-tile');
  Object.assign(tileEl.style,coords(flower.x,flower.y));
  tileEl.innerHTML=flowerTileSVG(flower.type);
  layer.appendChild(tileEl);
 }
}
function renderPlots(){
 const layer=$('plotLayer');layer.replaceChildren();
 const now=Date.now();
 for(const field of farm.fields){
  const shape=FIELD_TYPES[field.size];
  if(!shape)continue;
  const wrapper=node('div','farm-area');
  Object.assign(wrapper.style,{left:((field.x-.08)*tile)+'px',top:((field.y-.08)*tile)+'px',
    width:((shape.w+.16)*tile)+'px',height:((shape.h+.16)*tile)+'px'});
  const label=node('button','farm-label',field.name);label.type='button';
  label.setAttribute('aria-label',field.name+' の配置と名前を変更する');
  label.addEventListener('click',()=>openManage(field.id));
  wrapper.appendChild(label);layer.appendChild(wrapper);
  for(let index=0;index<shape.w*shape.h;index++){
   const x=field.x+index%shape.w,y=field.y+Math.floor(index/shape.w);
   const p=farm.plots[plotKey(field.id,index)],phase=growthPhase(p,now);
   const btn=node('button','plot'+(selected?.area===field.id&&selected.index===index?' active':''));
   btn.type='button';btn.setAttribute('aria-label',field.name+' '+(index+1)+'番の畑');
   Object.assign(btn.style,coords(x+.03,y+.03));
   btn.addEventListener('click',()=>selectPlot(field.id,index));
   if(!p)btn.appendChild(node('span','seed-art','＋'));
   else{
    const artwork=phase==='sprout'?'🌱':phase==='growing'?'🌿':CROPS[p.crop].icon;
    btn.appendChild(node('span','crop-art '+(phase==='sprout'||phase==='growing'?phase:''),artwork));
    if(p.wateredAt)btn.appendChild(node('span','plot-water','💧'));
    if(phase==='ready')btn.appendChild(node('span','ready-spark','✨'));
   }
   layer.appendChild(btn);
  }
 }
}
function selectPlot(area,index){
 if(!ready||busy)return;
 selected={area:String(area),index};actionChoice=null;
 refresh();showDialog('actionDialog');
}
function actionButton(text,cls,fn,disabled=false){
 const b=node('button','action-btn'+(cls?' '+cls:''),text);b.type='button';b.disabled=busy||!ready||disabled;b.addEventListener('click',fn);return b;
}

function showDialog(id){
 const dialog=$(id);
 if(!dialog?.open)dialog?.showModal();
}
function hideDialog(id){const dialog=$(id);if(dialog?.open)dialog.close();}
function selectedItem(label,subtitle,action){
 const btn=node('button','item-choice'+(actionChoice?.key===action.key?' selected':''));
 btn.type='button';
 btn.append(node('span','emoji',action.icon),node('span','',label));
 const text=btn.lastChild;
 text.appendChild(node('small','',subtitle));
 btn.addEventListener('click',()=>{actionChoice=action;renderSelection();});
 return btn;
}
function actionConfirmation(container,label,verb,callback){
 const summary=node('p','confirm-label',label);
 const row=node('div','modal-actions');
 row.append(
  actionButton(verb,'gold',callback),
  actionButton('やめる','secondary',()=>{actionChoice=null;renderSelection();})
 );
 container.append(summary,row);
}
function storageConfirmation(){
 const box=$('storageConfirmation');box.replaceChildren();
 if(!chosenProduce)return;
 const crop=CROPS[chosenProduce.id];
 if(!crop)return;
 const verbs={feed:'ペットに食べさせる',pack:'プレゼント箱に入れる',unpack:'倉庫に戻す'};
 const action=chosenProduce;
 box.appendChild(node('p','confirm-label',crop.icon+' '+crop.name+'を'+verbs[action.kind]+'？'));
 const row=node('div','modal-actions');
 row.append(
  actionButton(verbs[action.kind],'gold',async()=>{chosenProduce=null;await produce(action.kind,action.id);}),
  actionButton('やめる','secondary',()=>{chosenProduce=null;renderInventory();})
 );
 box.appendChild(row);
}

function renderSelection(){
 const title=$('selectionTitle'),desc=$('selectionDetail'),ctrl=$('actionControls');
 const previousScroll=ctrl.querySelector('.farm-action-choices')?.scrollTop||0;
 ctrl.replaceChildren();
 // Always reserve the same three regions so selecting a seed cannot enlarge
 // or re-center the modal. Only the item list scrolls; the controls stay put.
 const choices=node('div','farm-action-choices');
 const confirm=node('div','farm-action-confirm');
 const footer=node('div','farm-action-footer');
 footer.appendChild(actionButton('閉じる','secondary',()=>hideDialog('actionDialog')));
 ctrl.append(choices,confirm,footer);
 if(!selected){
  title.textContent='畑を選んでください';
  desc.textContent='好きなマスをタップしてください。';
  return;
 }
 const area=selected.area,index=selected.index,a=farm.fields.find(item=>item.id===area);
 if(!a){
  selected=null;title.textContent='畑を選んでください';
  desc.textContent='圃場を置いてください。';
  return;
 }
 const p=farm.plots[plotKey(area,index)];
 title.textContent=a.name+' · '+(index+1)+'番の畑';
 const items=node('div','item-options');
 const select=(key,icon,label,quantity,action)=>items.appendChild(selectedItem(label,'持ち物 ×'+quantity,{key,icon,...action}));
 if(!p){
  desc.textContent='🌱 手持ちのタネから1種類選んでください。';
  for(const id of allCropIds){
   if(farm.inventory.seeds[id]>0&&isCropUnlocked(farm,id))
    select('plant:'+id,CROPS[id].icon,CROPS[id].name+'のタネ',farm.inventory.seeds[id],{type:'plant',crop:id});
  }
 }else{
  const phase=growthPhase(p);
  desc.textContent=CROPS[p.crop].icon+' '+CROPS[p.crop].name+'　｜　'+remaining(p)+'　'+(p.wateredAt?'💧使用済み':'💧未使用')+' / '+(p.boosted?'🌱使用済み':'🌱未使用');
  if(phase==='ready'){
   choices.appendChild(node('p','modal-hint','✨ 収穫の時期です！'));
   confirm.appendChild(node('p','confirm-label','育った'+CROPS[p.crop].name+'を収穫しますか？'));
   const row=node('div','modal-actions');
   row.append(actionButton('🧺 収穫する','gold',()=>actPlot('harvest')),actionButton('やめる','secondary',()=>hideDialog('actionDialog')));
   confirm.appendChild(row);
   return;
  }
  if(!p.wateredAt&&farm.inventory.water>0)select('water','💧','水',farm.inventory.water,{type:'water'});
  if(!p.boosted&&farm.inventory.fertilizer>0)select('fertilize','🌿','肥料',farm.inventory.fertilizer,{type:'fertilize'});
 }
 if(!items.childNodes.length){
  choices.appendChild(node('p','modal-hint','使える持ち物がありません。おみせで購入できます。'));
  const row=node('div','modal-actions');
  row.append(actionButton('🏪 おみせへ','gold',async()=>{hideDialog('actionDialog');await visitBuilding('shop');}),actionButton('やめる','secondary',()=>hideDialog('actionDialog')));
  confirm.appendChild(row);
  return;
 }
 choices.appendChild(items);
 choices.scrollTop=previousScroll;
 if(actionChoice){
  const found=[...items.children].some(el=>el.classList.contains('selected'));
  if(found){
   const chosen=actionChoice;
   const label=chosen.type==='plant'?CROPS[chosen.crop].name+'のタネをまきますか？':chosen.type==='water'?'水をあげますか？':'肥料をあげますか？';
   const verb=chosen.type==='plant'?'🌱 まく':chosen.type==='water'?'💧 水をやる':'🌿 肥料を使う';
   actionConfirmation(confirm,label,verb,()=>actPlot(chosen.type,chosen.crop?{crop:chosen.crop}:{}));
  }else actionChoice=null;
 }
 if(!confirm.childNodes.length)confirm.appendChild(node('p','farm-action-prompt','持ち物を選ぶと、ここに確認ボタンが表示されます。'));
}

// Hide locked crops as mysteries. Only reveal the next unlock milestone;
// more distant crops reveal neither their identity nor their prerequisites.
// Stock and purchase-limit helpers are used on every initial SHOP render.
// Keep these declarations with the SHOP renderer so the admin preview can load.
function shopStock(kind,id){
 if(kind==='seed')return Math.max(0,Number(farm.inventory.seeds[id])||0);
 if(kind==='supply')return Math.max(0,Number(farm.inventory[id])||0);
 if(kind==='field')return id==='free'?Number(farm.starterClaimed):Math.max(0,Number(farm.inventory.fields[id])||0);
 if(kind==='road')return Math.max(0,Number(farm.inventory.roads)||0);
 if(kind==='flower')return Math.max(0,Number(farm.inventory.flowers[id])||0);
 if(kind==='display')return Math.max(0,Number(farm.inventory.displays[id])||0);
 return 0;
}
function maxPurchaseQuantity(item){
 if(!item)return 0;
 const stock=shopStock(item.kind,item.id);
 const units=item.kind==='seed'?(CROPS[item.id]?.pack||1):1;
 const availableStock=item.id==='free'
  ?(farm.starterClaimed?0:1)
  :Math.max(0,Math.floor((99999-stock)/units));
 const coins=item.price===0?1:Math.floor(balance/item.price);
 return Math.max(0,Math.min(99,availableStock,coins));
}
function shopSeedReveal(state,id){
 const info=cropUnlockProgress(state,id);
 if(info.unlocked)return null;
 const previousKnown=isCropUnlocked(state,info.previous);
 const prerequisite=previousKnown?CROPS[info.previous].name:'？？？';
 return {
  icon:'❔',
  label:'？？？のタネ',
  requirement:'🔒 '+prerequisite+'をあと'+(previousKnown?info.remaining:10)+'個収穫'
 };
}
function shopItems(){
 if(shopTab==='seed')return cropIds.map(id=>({kind:'seed',id,label:CROPS[id].name+'のタネ',icon:CROPS[id].icon,price:CROPS[id].seed,units:CROPS[id].pack,sub:'成長 '+CROPS[id].minutes/60+'時間'}));
 if(shopTab==='supply')return Object.entries(SUPPLIES).map(([id,t])=>({kind:'supply',id,label:t.name,icon:t.icon,price:t.price,sub:id==='water'?'残り時間を2/3に短縮':'残り時間を1/3に短縮'}));
 if(shopTab==='flower')return flowerIds.map(id=>({kind:'flower',id,label:FLOWERS[id].name+'の花畑',icon:FLOWERS[id].icon,price:FLOWERS[id].price,sub:'1マスに花が4つ・枠なし'}));
 if(shopTab==='display')return displayIds.map(id=>({kind:'display',id,label:DISPLAY_TYPES[id].name,
  icon:DISPLAY_TYPES[id].icon,price:DISPLAY_TYPES[id].price,
  sub:DISPLAY_TYPES[id].w+'×'+DISPLAY_TYPES[id].h+'マス・最大'+DISPLAY_TYPES[id].capacity+'個補充'}));
 if(shopTab==='field')return [{kind:'field',id:'free',label:'初回限定・4マス圃場',icon:'🌱',price:0,sub:'1つ目は無料'},
  ...FIELD_SIZES.map(id=>({kind:'field',id,label:FIELD_TYPES[id].name,icon:'🌾',price:FIELD_TYPES[id].price,sub:'好きな場所へ置けます'}))];
 return [{kind:'road',id:'dirt',label:'土の道',icon:'🟫',price:1,sub:'1マス1C・自由な配置'}];
}
function renderShop(){
 const list=$('shopList'),scroll=list.scrollTop,items=shopItems();
 list.replaceChildren();
 $('shopBalance').textContent=Number(balance).toLocaleString('ja-JP');
 for(const tab of document.querySelectorAll('[data-shop]'))tab.classList.toggle('active',tab.dataset.shop===shopTab);
 for(const item of items){
  const active=chosenPurchase?.kind===item.kind&&chosenPurchase.id===item.id;
  const b=node('button','shop-item'+(active?' selected':''));b.type='button';
  b.setAttribute('aria-pressed',String(active));
  const details=node('span','shop-item-details');
  const secret=item.kind==='seed'?shopSeedReveal(farm,item.id):null;
  const unit=item.kind==='seed'?item.units+'個 / '+item.price+'C':item.price===0?'無料':item.price+'C / 1個';
  details.append(node('strong','',secret?.label||item.label),node('small','',unit+' · '+item.sub));
  if(secret)details.appendChild(node('span','shop-unlock',secret.requirement));
  if(item.id==='free'&&farm.starterClaimed)details.appendChild(node('span','shop-unlock','✓ 無料分は受け取り済み'));
  else if(item.id!=='free')details.appendChild(node('span','shop-owned','所持数：'+shopStock(item.kind,item.id).toLocaleString('ja-JP')+(['road','flower'].includes(item.kind)?'マス':'個')));
  if(item.kind==='field'&&item.id!=='free'&&!farm.starterClaimed)
   details.appendChild(node('span','shop-unlock','🔒 まず無料の圃場を受け取ってね'));
  if(item.kind==='flower'){
    const artwork=node('span','flower-shop-art');
    artwork.innerHTML=flowerTileSVG(item.id);
    b.append(artwork,details);
   }else b.append(node('span','emoji',secret?.icon||item.icon),details);
  b.disabled=busy||!ready||maxPurchaseQuantity(item)<1||(item.kind==='seed'&&!isCropUnlocked(farm,item.id))||
   (item.kind==='field'&&item.id!=='free'&&!farm.starterClaimed);
  b.addEventListener('click',()=>{if(!b.disabled){chosenPurchase={...item,quantity:1};renderShop();}});
  list.appendChild(b);
 }
 list.scrollTop=scroll;
 const confirm=$('shopConfirmation');confirm.replaceChildren();
 if(!chosenPurchase){confirm.appendChild(node('p','shop-selection-hint','商品を選んで購入数と合計金額を確認できます。'));return;}
 const p=chosenPurchase,current=items.find(i=>i.kind===p.kind&&i.id===p.id);
 if(!current||maxPurchaseQuantity(current)<1){chosenPurchase=null;renderShop();return;}
 p.quantity=Math.min(maxPurchaseQuantity(current),Math.max(1,p.quantity||1));
 confirm.appendChild(node('p','confirm-label',p.icon+' '+p.label));
 if(p.id!=='free'){
  const row=node('div','shop-quantity');
  const suffix=p.kind==='seed'?'袋':['road','flower'].includes(p.kind)?'マス':'個';
  row.appendChild(node('span','shop-quantity-label',p.kind==='seed'?'購入する袋数':'一度に買う数'));
  const minus=node('button','shop-qty-btn','−'),plus=node('button','shop-qty-btn','＋');
  minus.type='button';plus.type='button';minus.disabled=p.quantity<=1;plus.disabled=p.quantity>=maxPurchaseQuantity(current);
  minus.setAttribute('aria-label','購入数を1個減らす');plus.setAttribute('aria-label','購入数を1個増やす');
  minus.addEventListener('click',()=>{p.quantity=Math.max(1,p.quantity-1);renderShop();});
  plus.addEventListener('click',()=>{p.quantity=Math.min(maxPurchaseQuantity(current),p.quantity+1);renderShop();});
  row.append(minus,node('output','shop-qty-value',p.quantity+suffix),plus);confirm.appendChild(row);
 }
 const total=node('div','shop-order-total');
 total.append(node('span','','合計 '+(p.kind==='seed'?p.quantity+'袋（タネ'+p.quantity*p.units+'個）':p.quantity+(['road','flower'].includes(p.kind)?'マス':'個'))),node('strong','',p.price*p.quantity+' C'));
 confirm.appendChild(total);
 const row=node('div','modal-actions');
 row.append(actionButton(p.price===0?'無料で受け取る':'🪙 購入する','gold',async()=>{
   const success=await buy(p.kind,p.id,p.quantity);
   if(!success)return;
   chosenPurchase=null;
   if(['field','road','flower','display'].includes(p.kind)){
    hideDialog('shopDialog');
    beginPlacement(p.kind,p.id==='free'?'4':p.id);
   }else renderShop();
  }),
  actionButton('やめる','secondary',()=>{chosenPurchase=null;renderShop();}));
 confirm.appendChild(row);
}
function renderInventory(){
 const container=$('inventory');container.replaceChildren();
 const heading=label=>container.appendChild(node('div','inv-title',label));
 const row=()=>{const e=node('div','inv-row');container.appendChild(e);return e;};
 heading('🌾 圃場の持ち物・配置する');
 let wrap=row();
 for(const size of FIELD_SIZES){
  const count=farm.inventory.fields[size]||0;
  const btn=node('button','inv-chip inv-action',FIELD_TYPES[size].name+' ×'+count+'　配置');
  btn.type='button';btn.disabled=!ready||busy||!count;
  btn.addEventListener('click',()=>beginPlacement('field',size));wrap.appendChild(btn);
 }
 heading('🛠 配置済みの圃場・移動や名前変更');
 wrap=row();
 if(!farm.fields.length)wrap.appendChild(node('span','tiny','まだ圃場を置いていません'));
 for(const field of farm.fields){
  const btn=node('button','inv-chip inv-action',field.name+'（'+field.size+'マス）⚙️');
  btn.type='button';btn.addEventListener('click',()=>openManage(field.id));wrap.appendChild(btn);
 }
 heading('🟫 道路');
 wrap=row();
 const roadButton=node('button','inv-chip inv-action','道路の持ち物 ×'+farm.inventory.roads+'マス　敷く');
 roadButton.type='button';roadButton.disabled=!ready||busy||!farm.inventory.roads;
 roadButton.addEventListener('click',()=>beginPlacement('road','dirt'));wrap.appendChild(roadButton);
 const erase=node('button','inv-chip inv-action','道路を取り除く');
 erase.type='button';erase.disabled=!ready||busy||!farm.roads.length;
 erase.addEventListener('click',()=>beginPlacement('erase-road',''));wrap.appendChild(erase);
 heading('🌸 花畑の持ち物・配置する');
 wrap=row();
 for(const id of flowerIds){
  const count=farm.inventory.flowers[id]||0;
  const btn=node('button','inv-chip inv-action');
  btn.type='button';btn.disabled=!ready||busy||!count;
  const icon=node('span','flower-inventory-art');icon.innerHTML=flowerTileSVG(id);
  btn.append(icon,node('span','',FLOWERS[id].name+' ×'+count+'　配置'));
  btn.addEventListener('click',()=>beginPlacement('flower',id));wrap.appendChild(btn);
 }
 const eraseFlower=node('button','inv-chip inv-action','🌸 花畑を取り除く');
 eraseFlower.type='button';eraseFlower.disabled=!ready||busy||!farm.flowers.length;
 eraseFlower.addEventListener('click',()=>beginPlacement('erase-flower',''));wrap.appendChild(eraseFlower);
 heading('🧺 陳列家具の持ち物・配置する');
 wrap=row();
 for(const id of displayIds){
  const count=farm.inventory.displays[id]||0;
  const btn=node('button','inv-chip inv-action',DISPLAY_TYPES[id].icon+' '+DISPLAY_TYPES[id].name+' ×'+count+'　配置');
  btn.type='button';btn.disabled=!ready||busy||!count;
  btn.addEventListener('click',()=>beginPlacement('display',id));wrap.appendChild(btn);
 }
 heading('🍓 配置済みの陳列家具');
 wrap=row();
 if(!farm.displays.length)wrap.appendChild(node('span','tiny','まだ陳列家具を置いていません'));
 for(const display of farm.displays){
  const item=DISPLAY_TYPES[display.type];
  const btn=node('button','inv-chip inv-action',item.icon+' '+item.name+'　'+display.quantity+'/'+item.capacity+'　管理');
  btn.type='button';btn.disabled=!ready||busy;
  btn.addEventListener('click',()=>openDisplay(display.id));wrap.appendChild(btn);
 }
 heading('🌰 タネの持ち物');
 wrap=row();
 for(const id of allCropIds)if(farm.inventory.seeds[id])wrap.appendChild(node('span','inv-chip',CROPS[id].icon+' '+CROPS[id].name+' ×'+farm.inventory.seeds[id]));
 if(!wrap.childNodes.length)wrap.appendChild(node('span','tiny','まだありません'));
 heading('💧 水と肥料');
 wrap=row();wrap.append(node('span','inv-chip','💧 水 ×'+farm.inventory.water),node('span','inv-chip','🌿 肥料 ×'+farm.inventory.fertilizer));
 heading('🧺 収穫した野菜');
 wrap=row();
 for(const id of allCropIds){
  const n=farm.inventory.produce[id]||0;
  if(!n)continue;
  const chip=node('span','inv-chip',CROPS[id].icon+' '+CROPS[id].name+' ×'+n);
  const btn=node('button','','贈り物に');btn.disabled=busy||!ready;
  btn.addEventListener('click',()=>{chosenProduce={kind:'pack',id};storageConfirmation();});
  chip.appendChild(btn);wrap.appendChild(chip);
 }
 if(!wrap.childNodes.length)wrap.appendChild(node('span','tiny','まだありません'));
 heading('🎁 プレゼント箱（送信は今後公開）');
 wrap=row();
 for(const id of allCropIds){
  const n=farm.inventory.giftBox[id]||0;
  if(!n)continue;
  const chip=node('span','inv-chip',CROPS[id].icon+' '+CROPS[id].name+' ×'+n);
  const btn=node('button','','取り出す');btn.disabled=busy||!ready;
  btn.addEventListener('click',()=>{chosenProduce={kind:'unpack',id};storageConfirmation();});
  chip.appendChild(btn);wrap.appendChild(chip);
 }
 if(!wrap.childNodes.length)wrap.appendChild(node('span','tiny','まだありません'));
 storageConfirmation();
}
function beginPlacement(type,value){
 if(!ready||busy)return;
 if(type==='field'&&!(farm.inventory.fields[value]>0)){toast('圃場の持ち物がありません。');return;}
 if(type==='road'&&!farm.inventory.roads){toast('道路の持ち物がありません。');return;}
 if(type==='flower'&&!(farm.inventory.flowers[value]>0)){toast('花畑の持ち物がありません。');return;}
 if(type==='move'&&!farm.fields.some(f=>f.id===value)){toast('圃場が見つかりません。');return;}
 placement={type,value};
 hideDialog('itemsDialog');hideDialog('shopDialog');hideDialog('manageDialog');hideDialog('tileManageDialog');
 renderPlacement();updateTileManageButton();
 toast(type==='manage-tile'?'道路または花畑をタップして選んでください。':
  type==='move-tile'?'移動先のマスをタップしてください。':'好きな場所をタップして配置してください。');
}
function stopPlacement(){
 placement=null;pendingNamePlacement=null;
 renderPlacement();updateTileManageButton();
}
function placementAllowed(x,y){
 if(!placement)return false;
 if(placement.type==='field')return (farm.inventory.fields[placement.value]||0)>0&&canPlace(farm,placement.value,x,y);
 if(placement.type==='move'){
  const field=farm.fields.find(f=>f.id===placement.value);
  return !!field&&canPlace(farm,field.size,x,y,field.id);
 }
 if(placement.type==='road')return farm.inventory.roads>0&&canPlaceRoad(farm,x,y);
 if(placement.type==='flower')return farm.inventory.flowers[placement.value]>0&&canPlaceFlower(farm,x,y);
 if(placement.type==='manage-tile')return farm.roads.includes(x+','+y)||farm.flowers.some(f=>f.x===x&&f.y===y);
 if(placement.type==='move-tile'){
  const origin=placement.value;
  const stillPlaced=origin?.kind==='road'?farm.roads.includes(origin.fromX+','+origin.fromY):
   origin?.kind==='flower'&&farm.flowers.some(f=>f.x===origin.fromX&&f.y===origin.fromY);
  return !!stillPlaced&&canPlaceRoad(farm,x,y);
 }
 if(placement.type==='erase-flower')return farm.flowers.some(f=>f.x===x&&f.y===y);
 return placement.type==='erase-road'&&farm.roads.includes(x+','+y);
}
function previewPlacement(x,y){
 const p=$('placementPreview');
 if(!placement||placement.type==='manage-tile'||!placementAllowed(x,y)){p.hidden=true;return;}
 const field=placement.type==='move'?farm.fields.find(f=>f.id===placement.value):null;
 const type=field?.size||(placement.type==='field'?placement.value:null);
 const shape=FIELD_TYPES[type]||{w:1,h:1};
 Object.assign(p.style,{left:x*tile+'px',top:y*tile+'px',width:shape.w*tile+'px',height:shape.h*tile+'px'});
 p.hidden=false;
}
function renderPlacement(){
 const grid=$('placementLayer'),bar=$('placementBar');
 grid.hidden=!placement;bar.hidden=!placement;
 $('placementPreview').hidden=true;
 if(!placement)return;
 const type=placement.type;
 const size=type==='move'?farm.fields.find(f=>f.id===placement.value)?.size:placement.value;
 $('placementHint').textContent=type==='field'?FIELD_TYPES[size].name+'の左上をタップ（所持 '+farm.inventory.fields[size]+'個）':
  type==='move'?'移動先の左上をタップ':
  type==='road'?'道路を敷くマスをタップ（残り '+farm.inventory.roads+'枚）':
  type==='flower'?FLOWERS[placement.value].name+'を植えるマスをタップ（残り '+farm.inventory.flowers[placement.value]+'マス）':
  type==='manage-tile'?'移動・撤去する道路または花畑をタップ':
  type==='move-tile'?'移動先の空いているマスをタップ（コイン不要）':
  type==='erase-flower'?'取り除く花畑をタップ':'取り除く道路をタップ';
 for(const btn of grid.querySelectorAll('button.placement-cell')){
  const x=Number(btn.dataset.x),y=Number(btn.dataset.y),allowed=placementAllowed(x,y);
  btn.disabled=!allowed;
  btn.hidden=type==='manage-tile'&&!allowed;
  btn.classList.toggle('eligible',allowed);
  btn.classList.toggle('edit-target',type==='manage-tile'&&allowed);
  btn.setAttribute('aria-label',type==='manage-tile'&&allowed?
   (farm.roads.includes(x+','+y)?'道路':'花畑')+' '+(x+1)+'列 '+(y+1)+'行を選ぶ':
   (x+1)+'列 '+(y+1)+'行に配置');
 }
}
function applyLayout(action){
 try{
  const result=applyLayoutAction(farm,action);
  farm=result.farm;queueSave();toast(result.message);refresh();
  return true;
 }catch(e){toast(e.message||'その場所には配置できません。');return false;}
}
function openTileManage(x,y){
 const flower=farm.flowers.find(item=>item.x===x&&item.y===y);
 const kind=flower?'flower':farm.roads.includes(x+','+y)?'road':null;
 if(!kind)return;
 const label=flower?FLOWERS[flower.type].name+'の花畑':'土の道';
 $('tileManageTitle').textContent='↗️ '+label;
 $('tileManageDetail').textContent=(x+1)+'列・'+(y+1)+'行の'+label+'をどうしますか？';
 const controls=$('tileManageControls');controls.replaceChildren();
 controls.append(
  actionButton('↗️ 移動する','gold',()=>beginPlacement('move-tile',{kind,fromX:x,fromY:y})),
  actionButton('📦 撤去してアイテムへ','secondary',()=>{
   if(!applyLayout({type:kind==='road'?'remove-road':'remove-flower',x,y}))return;
   hideDialog('tileManageDialog');
   if(!farm.roads.length&&!farm.flowers.length)stopPlacement();
  })
 );
 showDialog('tileManageDialog');
}
function choosePlacement(x,y){
 if(!ready||busy||!placement||!placementAllowed(x,y))return;
 if(placement.type==='manage-tile'){openTileManage(x,y);return;}
 if(placement.type==='move-tile'){
  const {kind,fromX,fromY}=placement.value;
  if(applyLayout({type:kind==='road'?'move-road':'move-flower',fromX,fromY,x,y}))stopPlacement();
  return;
 }
 if(placement.type==='field'){
  pendingNamePlacement={type:'place-field',size:placement.value,x,y};
  $('fieldNameTitle').textContent='圃場の名前をつける';
  $('fieldNameInput').value='マイ農園'+(farm.fields.length+1);
  showDialog('fieldNameDialog');
  $('fieldNameInput').focus();
  return;
 }
 if(placement.type==='move'){
  if(applyLayout({type:'move-field',id:placement.value,x,y}))stopPlacement();
  return;
 }
 if(placement.type==='road'){
  if(applyLayout({type:'place-road',x,y})&&!farm.inventory.roads)stopPlacement();
  return;
 }
 if(placement.type==='flower'){
  if(applyLayout({type:'place-flower',flower:placement.value,x,y})&&!farm.inventory.flowers[placement.value])stopPlacement();
  return;
 }
 if(placement.type==='erase-flower'){applyLayout({type:'remove-flower',x,y});return;}
 if(placement.type==='erase-road')applyLayout({type:'remove-road',x,y});
}
function confirmFieldName(){
 const name=$('fieldNameInput').value.trim();
 if(!name){toast('圃場の名前を入力してください。');return;}
 if(!pendingNamePlacement)return;
 const action=pendingNamePlacement;
 const success=applyLayout(action.type==='rename-field'?{type:'rename-field',id:action.id,name}:
  {type:'place-field',size:action.size,x:action.x,y:action.y,name});
 if(!success)return;
 pendingNamePlacement=null;hideDialog('fieldNameDialog');
 if(placement?.type==='field'&&!(farm.inventory.fields[placement.value]>0))stopPlacement();
}
function openManage(id){
 if(!ready||busy||placement)return;
 const field=farm.fields.find(f=>f.id===String(id));if(!field)return;
 managedFieldId=field.id;hideDialog('itemsDialog');renderManage();showDialog('manageDialog');
}
function renderManage(){
 const controls=$('manageControls');controls.replaceChildren();
 const field=farm.fields.find(f=>f.id===managedFieldId);
 if(!field)return;
 $('manageTitle').textContent='⚙️ '+field.name;
 const hasCrops=Object.keys(farm.plots).some(key=>key.startsWith(field.id+'-'));
 controls.appendChild(node('p','modal-hint',field.size+'マス・位置 '+(field.x+1)+'列 '+(field.y+1)+'行' +(hasCrops?'／栽培中の作物あり':'')));
 const row=node('div','modal-actions');
 row.append(
  actionButton('✏️ 名前を変える','secondary',()=>{
   pendingNamePlacement={type:'rename-field',id:field.id};
   $('fieldNameTitle').textContent='圃場の名前を変更';$('fieldNameInput').value=field.name;
   hideDialog('manageDialog');showDialog('fieldNameDialog');$('fieldNameInput').focus();
  }),
  actionButton('↗️ 移動する','gold',()=>beginPlacement('move',field.id)),
  actionButton('📦 撤去する','secondary',()=>{
   if(hasCrops){toast('作物をすべて収穫してから撤去してください。');return;}
   const check=node('div','modal-confirm');check.appendChild(node('p','confirm-label','圃場を持ち物に戻しますか？'));
   const confirmRow=node('div','modal-actions');
   confirmRow.append(actionButton('撤去を確定','gold',()=>{
    if(applyLayout({type:'remove-field',id:field.id})){hideDialog('manageDialog');managedFieldId=null;selected=null;}
   }),actionButton('やめる','secondary',()=>renderManage()));
   check.appendChild(confirmRow);controls.replaceChildren(check);
  })
 );
 controls.appendChild(row);
}
function setPetPosition(x,y,duration=0){
 const pet=$('petWalker');
 pet.style.transition=duration?'left '+duration+'ms linear,top '+duration+'ms linear':'none';
 Object.assign(pet.style,{left:(x*tile)+'px',top:(y*tile)+'px'});
 pet.style.setProperty('--face',x<petX?'-1':'1');
 petX=x;petY=y;
}
function petVisual(){
 const root=$('petWalker');
 if(!petData.petHatched){root.innerHTML='<span role="img" aria-label="たまご" style="font-size:47px">🥚</span>';return;}
 try{
  // The farm shows the pet and its equipped effects, but never the decorative pet frame.
  // Clone the shop equipment so other pages retain the user's chosen frame unchanged.
  const shop=petData.petShop||{};
  const equipped={...(shop.equipped||{})};
  delete equipped['pet-frame'];
  root.innerHTML=renderPetSVG(petData.petAppearance,{...shop,equipped},'',{background:false});
 }catch{root.textContent='🐾';}
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function movePoint(x,y,leisurely=false){
 const dist=Math.hypot(x-petX,y-petY);
 // Task movement stays exactly as before; idle strolls move approximately 4x slower.
 const duration=leisurely
  ? Math.min(3800,Math.max(450,dist*480))
  : Math.min(1900,Math.max(160,dist*120));
 if(dist<.12)return;
 setPetPosition(x,y,duration);await sleep(duration+30);
}
async function walkTo(x,y,{leisurely=false}={}){
 while(walking)await sleep(60);
 walking=true;
 const el=$('petWalker');
 el.classList.add('walking');
 el.classList.toggle('strolling',leisurely);
 try{
  if(Math.abs(petY-6.5)>1)await movePoint(petX,6.5,leisurely);
  await movePoint(x,6.5,leisurely);
  await movePoint(x,y,leisurely);
 }finally{
  walking=false;
  el.classList.remove('walking','strolling');
 }
}
async function showWork(kind,x,y){
 // Show a brief in-world particle effect, not an emoji or speech bubble.
 // Planting uses soft soil puffs, a faint expanding ring and a few glints.
 const pet=$('petWalker');
 pet.classList.add('working');
 const effect=node('div','work-effect work-effect--'+kind);
 effect.setAttribute('aria-hidden','true');
 Object.assign(effect.style,coords(x,y));
 effect.appendChild(node('span','work-effect__ring'));
 const directions=[[-26,-15],[-14,-29],[15,-27],[28,-12],[-7,-22],[11,-9]];
 for(let i=0;i<directions.length;i++){
  const [dx,dy]=directions[i];
  const particle=node('span','work-effect__particle');
  particle.style.setProperty('--dx',dx+'px');
  particle.style.setProperty('--dy',dy+'px');
  particle.style.setProperty('--delay',(i%3*35)+'ms');
  effect.appendChild(particle);
 }
 for(let i=0;i<3;i++){
  const spark=node('span','work-effect__spark');
  spark.style.setProperty('--dx',[-19,18,0][i]+'px');
  spark.style.setProperty('--dy',[-25,-21,-34][i]+'px');
  spark.style.setProperty('--delay',(i*75+80)+'ms');
  effect.appendChild(spark);
 }
 $('effect').appendChild(effect);
 try{await sleep(700);}
 finally{pet.classList.remove('working');setTimeout(()=>effect.remove(),260);}
}
async function actPlot(type,extra={}){
 if(busy||!ready||!selected)return;
 const params={type,area:selected.area,index:selected.index,...extra};
 let result;
 try{result=applyFarmAction(farm,params);}catch(e){toast(e.message);return;}
 hideDialog('actionDialog');actionChoice=null;
 busy=true;refresh();
 const spot=locateField(farm,params.area,params.index);
 const stand=findWorkStand(farm,params.area,params.index,petX,petY);
 try{
  // The pet acts from a nearby clearing; the crop tile stays visible throughout.
  if(stand)await walkTo(stand.x,stand.y);
  await showWork(type,spot.x+.5,spot.y+.5);
  farm=result.farm;queueSave();toast(result.message);
 }catch(e){toast(e.message||'作業に失敗しました。');}
 finally{busy=false;refresh();}
}
async function produce(kind,id){
 if(busy||!ready)return;
 let result;
 try{result=useProduce(farm,kind,id);}catch(e){toast(e.message);return;}
 if(kind==='feed')hideDialog('itemsDialog');
 busy=true;refresh();
 try{
  if(kind==='feed'){await walkTo(5.4,6.5);await showWork('feed',5.4,6.3);}
  farm=result.farm;queueSave();toast(result.message);
 }catch(e){toast('操作が完了しませんでした。');}
 finally{busy=false;refresh();}
}
async function buy(kind,id,quantity=1){
 if(busy||!ready||!user)return false;
 const preview=applyPurchase.bind(null,farm,kind,id,balance,quantity);
 try{preview();}catch(e){toast(e.message);return false;}
 busy=true;refresh();status('コイン残高と購入情報を確認しています…');
 try{
  await flushSave();
  if(dirty)throw Error('先ほどの作業の保存に失敗しました。もう一度保存してください。');
  let purchased,latestBalance;
  // Wallet and farm are committed atomically: two devices cannot spend the same coins twice.
  await runTransaction(db,async tx=>{
   const wallet=await tx.get(walletRef());
   const fdoc=await tx.get(farmRef());
   if(!wallet.exists())throw Error('コイン情報が見つかりません。');
   const c=Math.max(0,Math.floor(Number(wallet.data().coins)||0));
   purchased=applyPurchase(fdoc.exists()?fdoc.data():freshFarm(),kind,id,c,quantity);
   latestBalance=c-purchased.cost;
   if(purchased.cost)tx.update(walletRef(),{coins:latestBalance});
   tx.set(farmRef(),{...purchased.farm,updatedAt:Date.now()});
  });
  balance=latestBalance;farm=purchased.farm;dirty=false;toast(purchased.message);
  // A purchased field/road remains in inventory until the player places it.
  status('購入を保存しました。','ok');
  return true;
 }catch(e){console.error('pet farm purchase failed',e);status('購入できませんでした：'+(e.message||'通信エラー'),'error');toast('購入は反映されていません。');return false;}
 finally{busy=false;refresh();}
}
function queueSave(){
 if(!user)return;
 dirty=true;
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{void flushSave();},1300);
 $('saveBtn').disabled=false;
 status('変更を保存しています…');
}
async function flushSave(){
 clearTimeout(saveTimer);
 if(saving)await saving;
 if(!dirty||!user)return;
 const currentUser=user,copy=normalizeFarm(farm);
 dirty=false;
 saving=setDoc(doc(db,'users',currentUser.uid,'apps','pet-farm'),{...copy,updatedAt:Date.now()});
 try{
  await saving;status('農園の変更を保存しました。','ok');
 }catch(e){
  console.warn('pet farm save failed',e);
  dirty=true;status('保存できませんでした。通信を確認し、保存ボタンを押してください。','error');
 }finally{
  saving=null;$('saveBtn').disabled=!dirty||busy;
 }
}
function fitScene(){
 const view=$('viewport'),scene=FARM_SCENE_SIZE;
 if(!view.clientWidth||!view.clientHeight)return;
 const fit=Math.max(view.clientWidth/scene.width,view.clientHeight/scene.height);
 baseZoom=fit;
 setZoom(fit,false);
 const x=scene.width*zoom-view.clientWidth,y=scene.height*zoom-view.clientHeight;
 view.scrollLeft=Math.max(0,x/2);
 view.scrollTop=Math.max(0,y/2);
}
function setZoom(next,center=true){
 zoom=clamp(next,baseZoom*.72,baseZoom*2.1);
 const size=$('sceneSize'),world=$('world'),view=$('viewport');
 const oldZoom=Math.max(.01,Number(world.dataset.zoom)||zoom);
 const oldX=(view.scrollLeft+view.clientWidth/2)/oldZoom;
 const oldY=(view.scrollTop+view.clientHeight/2)/oldZoom;
 size.style.width=(FARM_SCENE_SIZE.width*zoom)+'px';
 size.style.height=(FARM_SCENE_SIZE.height*zoom)+'px';
 world.style.transform='scale('+zoom+')';world.dataset.zoom=zoom;
 $('zoomLabel').textContent=Math.round(zoom/baseZoom*100)+'%';
 if(center)view.scrollTo({left:Math.max(0,oldX*zoom-view.clientWidth/2),top:Math.max(0,oldY*zoom-view.clientHeight/2),behavior:'instant'});
}
function focusAt(x,y){
 const v=$('viewport');
 v.scrollTo({left:Math.max(0,(x*tile)*zoom-v.clientWidth/2),top:Math.max(0,(y*tile)*zoom-v.clientHeight/2),behavior:'smooth'});
}
function gateStatus(message,error=false){
 const gate=$('previewGate');
 if(!gate)return;
 gate.hidden=false;
 gate.replaceChildren();
 const label=node('div','preview-gate-label',message);
 gate.appendChild(label);
 if(error){
  const actions=node('div','preview-gate-actions');
  const retry=node('button','preview-retry','もう一度読み込む');
  retry.type='button';
  retry.addEventListener('click',()=>{void initialize(auth.currentUser);});
  const home=node('a','preview-back','もんすたでぃへ戻る');
  home.href='../index.html';
  actions.append(retry,home);
  gate.appendChild(actions);
 }
}
function withLoadTimeout(promise,ms,stage){
 let timer;
 return Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(new Error(stage+'がタイムアウトしました。通信状態を確認して再試行してください。')),ms);
  })
 ]).finally(()=>clearTimeout(timer));
}
async function initialize(current){
 const sequence=++authSequence;
 user=current;
 if(!user){
  ready=false;busy=false;
  gateStatus('もんすたでぃでログインしてください。',true);
  status('もんすたでぃでログインしてください。','error');
  return;
 }
 busy=true;ready=false;
 gateStatus('管理者確認中…');
 try{
  // The first refresh used to run *outside* the try block. Any exception there
  // stranded the user on the permanently covering "管理者確認中…" screen.
  refresh();
  const session=await withLoadTimeout(accountSession(current),18000,'管理者確認');
  if(sequence!==authSequence)return;
  if(!session?.admin || session.resetRequired)throw Error('この先行プレビューは管理者アカウントだけが利用できます。');
  gateStatus('農園データを読み込んでいます…');
  const [wallet,snapshot]=await withLoadTimeout(
   Promise.all([getDoc(walletRef()),getDoc(farmRef())]),20000,'農園データの取得'
  );
  if(sequence!==authSequence)return;
  if(!wallet.exists())throw Error('ペットのデータが見つかりません。');
  petData=wallet.data();balance=Math.max(0,Math.floor(Number(petData.coins)||0));
  farm=normalizeFarm(snapshot.exists()?snapshot.data():freshFarm());
  $('previewGate').hidden=true;petVisual();selected=null;ready=true;busy=false;refresh();
  if($('viewport').clientWidth<760)focusAt(12.7,7.7);
  status(farm.fields.length?'圃場をタップして栽培。「アイテム」から移動や配置もできます。':
   farm.inventory.fields['4']?'「アイテム」に4マス圃場があります。好きな場所へ配置しましょう！':
   'SHOPで無料の4マス圃場を受け取り、好きな場所へ配置しましょう！','ok');
 }catch(e){
  if(sequence!==authSequence)return;
  busy=false;ready=false;
  const msg=e?.message||'先行プレビューへのアクセスを確認できませんでした。';
  gateStatus('農園を開けませんでした：'+msg,true);
  status('農園を読み込めませんでした：'+msg,'error');
  console.error('pet farm load failed',e);
 }
}
async function visitBuilding(kind){
 if(!ready||busy||kind!=='shop')return;
 busy=true;refresh();
 try{
  await walkTo(27.3,6.5);
  shopTab='field';chosenPurchase=null;$('shopList').scrollTop=0;
  renderShop();showDialog('shopDialog');
 }finally{busy=false;refresh();}
}
$('shopBuilding').addEventListener('click',()=>{void visitBuilding('shop');});
$('tileManageBtn').addEventListener('click',()=>{
 if(!ready||busy)return;
 if(placement&&['manage-tile','move-tile'].includes(placement.type))stopPlacement();
 else if(farm.roads.length||farm.flowers.length)beginPlacement('manage-tile',null);
 else toast('まだ道路や花畑は配置されていません。');
});
$('itemsBtn').addEventListener('click',()=>{
 if(!ready||busy)return;
 chosenProduce=null;renderInventory();showDialog('itemsDialog');
});
$('placementCancel').addEventListener('click',stopPlacement);
$('confirmFieldName').addEventListener('click',confirmFieldName);
$('fieldNameInput').addEventListener('keydown',event=>{
 if(event.key==='Enter'){event.preventDefault();confirmFieldName();}
});
for(const tab of document.querySelectorAll('[data-shop]'))tab.addEventListener('click',()=>{
 shopTab=tab.dataset.shop;chosenPurchase=null;$('shopList').scrollTop=0;renderShop();
});
for(const close of document.querySelectorAll('[data-close-dialog]'))close.addEventListener('click',()=>hideDialog(close.dataset.closeDialog));
for(const modal of document.querySelectorAll('dialog.farm-dialog')){
 modal.addEventListener('click',event=>{if(event.target===modal)modal.close();});
}
$('saveBtn').addEventListener('click',()=>{void flushSave();});
$('homeBtn').addEventListener('click',()=>focusAt(4.2,3.4));
$('centerBtn').addEventListener('click',()=>focusAt(13.5,8.1));
$('house').addEventListener('click',()=>toast('ペットのおへやは準備中です。'));
$('zoomOut').addEventListener('click',()=>setZoom(zoom-baseZoom*.12));
$('zoomIn').addEventListener('click',()=>setZoom(zoom+baseZoom*.12));
window.addEventListener('resize',()=>fitScene());
window.addEventListener('pagehide',()=>{if(dirty)void flushSave();});
setInterval(()=>{if(ready){renderPlots();renderSelection();}},10000);
setInterval(async()=>{
 if(!ready||busy||walking||document.hidden||document.querySelector('dialog[open]'))return;
 // Small, gentle wandering steps rather than a fast walk across the whole map.
 // Keep each stroll short so a tap to work/shop is not delayed for long.
 const drift=(Math.random()-.5)*3.4;
 const target=Math.max(4.2,Math.min(25.5,petX+drift));
 if(Math.abs(target-petX)<.3)return;
 await walkTo(target,6.5,{leisurely:true});
},8500);
try{
 initWorld();
 onAuthStateChanged(auth,u=>{void initialize(u);},e=>{
  const msg=e?.message||'認証に失敗しました。';
  gateStatus('認証エラー：'+msg,true);
  status('認証エラー：'+msg,'error');
 });
}catch(e){
 gateStatus('画面の初期化に失敗しました：'+(e?.message||'不明なエラー'),true);
 console.error('pet farm bootstrap failed',e);
}
