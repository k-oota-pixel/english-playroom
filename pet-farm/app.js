import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged,accountSession} from '../auth-session.js?v=2.3.15';
import {getFirestore,doc,getDoc,setDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.3.8';
import {MAP,FARMS,CROPS,SUPPLIES,cropIds,plotKey,locate,freshFarm,normalizeFarm,growthPhase,remaining,applyFarmAction,applyPurchase,useProduce} from './model.js?v=5';
import {installScenery,FARM_SCENE_SIZE} from './scenery.js?v=4';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(cfg);enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const tile=MAP.tile;
let user=null,petData={},farm=freshFarm(),balance=0,selected=null,chosenSeed='carrot',shopTab='seed';
let busy=false,dirty=false,saving=null,saveTimer=0,toastTimer=0,zoom=1,baseZoom=1,petX=8.0,petY=6.5,walking=false,ready=false,authSequence=0;
let actionChoice=null,chosenPurchase=null,chosenProduce=null;
function walletRef(){return doc(db,'users',user.uid,'apps','english-playroom');}
function farmRef(){return doc(db,'users',user.uid,'apps','pet-farm');}
const coords=(x,y)=>({left:(x*tile)+'px',top:(y*tile)+'px'});
function status(message,kind=''){const el=$('status');el.textContent=message;el.className='game-status'+(kind?' '+kind:'');}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function updateCoin(){ $('coins').textContent=Number(balance).toLocaleString('ja-JP'); }
function refresh(){
 updateCoin();renderPlots();renderSelection();renderShop();renderInventory();
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
 for(let area=0;area<FARMS.length;area++){
  const a=FARMS[area];
  const wrapper=node('div','farm-area');wrapper.id='area-'+area;
  Object.assign(wrapper.style,{left:(a.x*tile)+'px',top:(a.y*tile)+'px',width:(a.w*tile)+'px',height:(a.h*tile)+'px'});
  const label=node('button','farm-label',a.name);label.type='button';
  label.addEventListener('click',()=>selectPlot(area,0));wrapper.appendChild(label);
  $('plotLayer').appendChild(wrapper);
  for(let i=0;i<a.w*a.h;i++){
   const pos=locate(area,i),b=node('button','plot');
   b.type='button';b.id='plot-'+plotKey(area,i);
   b.setAttribute('aria-label',a.name+' '+(i+1)+'番の畑');
   Object.assign(b.style,coords(pos.x+.03,pos.y+.03));
   b.addEventListener('click',()=>selectPlot(area,i));
   $('plotLayer').appendChild(b);
  }
 }
 setPetPosition(petX,petY,0);
 requestAnimationFrame(()=>fitScene());
}
function renderPlots(){
 const now=Date.now();
 for(let area=0;area<FARMS.length;area++){
  const a=FARMS[area],unlocked=!!farm.unlocked[area];
  $('area-'+area).classList.toggle('locked',!unlocked);
  const label=$('area-'+area).querySelector('.farm-label');
  label.textContent=a.name+(unlocked?'':' · '+a.price+'C');
  for(let index=0;index<a.w*a.h;index++){
   const b=$('plot-'+plotKey(area,index)),p=farm.plots[plotKey(area,index)];
   const phase=unlocked?growthPhase(p,now):'locked';
   b.className='plot'+(!unlocked?' locked':'')+(selected?.area===area&&selected.index===index?' active':'');
   if(!unlocked){b.innerHTML='<span class="seed-art">🔒</span>';continue;}
   if(phase==='empty'){b.innerHTML='<span class="seed-art">＋</span>';continue;}
   const artwork=phase==='dry'?'·':phase==='sprout'?'🌱':phase==='growing'?'🌿':CROPS[p.crop].icon;
   const size=phase==='sprout'||phase==='growing'?phase:'';
   b.replaceChildren(node('span','crop-art '+size,artwork));
   if(p.wateredAt)b.appendChild(node('span','plot-water','💧'));
   if(phase==='ready')b.appendChild(node('span','ready-spark','✨'));
  }
 }
}
function selectPlot(area,index){
 if(!ready||busy)return;
 selected={area,index};actionChoice=null;
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
 ctrl.replaceChildren();
 if(!selected){title.textContent='畑を選んでください';desc.textContent='好きなマスをタップしてください。';return;}
 const area=selected.area,index=selected.index,a=FARMS[area],p=farm.plots[plotKey(area,index)];
 title.textContent=a.name+' · '+(index+1)+'番の畑';
 const items=node('div','item-options');
 const select=(key,icon,label,quantity,action)=>items.appendChild(selectedItem(label,'持ち物 ×'+quantity,{key,icon,...action}));
 if(!farm.unlocked[area]){
  desc.textContent='🔒 まだ入れない農園です。解放すると '+(a.w*a.h)+'マスの畑が使えます。';
  if(farm.unlocked[area-1]){
   ctrl.appendChild(node('p','modal-hint','解放には '+a.price+'コインが必要です。'));
   const row=node('div','modal-actions');
   row.append(
    actionButton(a.price+'Cで解放する','gold',async()=>{hideDialog('actionDialog');await buy('area',String(area));}),
    actionButton('やめる','secondary',()=>hideDialog('actionDialog')));
   ctrl.appendChild(row);
  }else ctrl.appendChild(node('p','modal-hint','ひとつ前の農園を先に解放してください。'));
  return;
 }
 if(!p){
  desc.textContent='🌰 手持ちのタネから1種類選んでください。';
  for(const id of cropIds)if(farm.inventory.seeds[id]>0)select('plant:'+id,CROPS[id].icon,CROPS[id].name+'のタネ',farm.inventory.seeds[id],{type:'plant',crop:id});
 }else{
  const phase=growthPhase(p);
  desc.textContent=CROPS[p.crop].icon+' '+CROPS[p.crop].name+'　｜　'+remaining(p);
  if(phase==='ready'){
   ctrl.appendChild(node('p','modal-hint','✨ 収穫の時期です！'));
   const row=node('div','modal-actions');
   row.append(actionButton('🧺 収穫する','gold',()=>actPlot('harvest')),actionButton('やめる','secondary',()=>hideDialog('actionDialog')));
   ctrl.appendChild(row);
   return;
  }
  if(!p.wateredAt&&farm.inventory.water>0)select('water','💧','水',farm.inventory.water,{type:'water'});
  if(!p.boosted&&farm.inventory.fertilizer>0)select('fertilize','🌿','肥料',farm.inventory.fertilizer,{type:'fertilize'});
 }
 if(!items.childNodes.length){
  ctrl.appendChild(node('p','modal-hint','使える持ち物がありません。おみせで購入できます。'));
  const row=node('div','modal-actions');
  row.append(actionButton('🏪 おみせへ','gold',async()=>{hideDialog('actionDialog');await visitBuilding('shop');}),actionButton('やめる','secondary',()=>hideDialog('actionDialog')));
  ctrl.appendChild(row);return;
 }
 ctrl.appendChild(items);
 if(actionChoice){
  const found=[...items.children].some(el=>el.classList.contains('selected'));
  if(found){
   const confirm=node('div','modal-confirm');
   const chosen=actionChoice;
   const label=chosen.type==='plant'?CROPS[chosen.crop].name+'のタネをまきますか？':chosen.type==='water'?'水をあげますか？':'肥料をあげますか？';
   const verb=chosen.type==='plant'?'🌱 まく':chosen.type==='water'?'💧 水をやる':'🌿 肥料を使う';
   actionConfirmation(confirm,label,verb,()=>actPlot(chosen.type,chosen.crop?{crop:chosen.crop}:{}));
   ctrl.appendChild(confirm);
  }else actionChoice=null;
 }
 const row=node('div','modal-actions');
 row.appendChild(actionButton('閉じる','secondary',()=>hideDialog('actionDialog')));
 ctrl.appendChild(row);
}

function shopStock(kind,id){
 if(kind==='seed')return Math.max(0,Number(farm.inventory.seeds[id])||0);
 if(kind==='supply')return Math.max(0,Number(farm.inventory[id])||0);
 return 0;
}
function maxPurchaseQuantity(item){
 const available=Math.floor(balance/item.price);
 const storageSpace=99999-shopStock(item.kind,item.id);
 return Math.max(0,Math.min(99,available,item.kind==='area'?1:storageSpace));
}
function renderShop(){
 const list=$('shopList');list.replaceChildren();
 $('shopBalance').textContent=Number(balance).toLocaleString('ja-JP');
 for(const tab of document.querySelectorAll('[data-shop]'))tab.classList.toggle('active',tab.dataset.shop===shopTab);
 const items=shopTab==='seed'?cropIds.map(id=>({
   kind:'seed',id,label:CROPS[id].name+'のタネ',icon:CROPS[id].icon,
   price:CROPS[id].seed,sub:'育成 '+CROPS[id].minutes+'分'
  }))
  :shopTab==='supply'?Object.entries(SUPPLIES).map(([id,t])=>({
   kind:'supply',id,label:t.name,icon:t.icon,price:t.price,
   sub:id==='water'?'水やり1回で1個使用':'成長時間を短縮'
  }))
  :FARMS.slice(1).map((a,i)=>({
   kind:'area',id:String(i+1),label:a.name,icon:'🌾',price:a.price,
   sub:(a.w*a.h)+'マス・'+(farm.unlocked[i+1]?'解放済み':'未解放')
  }));
 for(const item of items){
  const isChosen=chosenPurchase?.id===item.id&&chosenPurchase?.kind===item.kind;
  const b=node('button','shop-item'+(isChosen?' selected':''));
  b.type='button';
  b.setAttribute('aria-pressed',String(isChosen));
  const stock=item.kind==='area'?null:shopStock(item.kind,item.id);
  b.append(
   node('span','emoji',item.icon),
   node('strong','',item.label),
   node('small','',item.price+'C / 1個 · '+item.sub)
  );
  if(stock!==null)b.appendChild(node('span','shop-owned','所持数：'+stock.toLocaleString('ja-JP')+'個'));
  const cannotUnlock=item.kind==='area'&&(farm.unlocked[Number(item.id)]||!farm.unlocked[Number(item.id)-1]);
  b.disabled=busy||!ready||balance<item.price||cannotUnlock||(stock!==null&&stock>=99999);
  b.addEventListener('click',()=>{
   if(b.disabled)return;
   chosenPurchase={...item,quantity:1};
   renderShop();
  });
  list.appendChild(b);
 }
 const confirmation=$('shopConfirmation');confirmation.replaceChildren();
 if(!chosenPurchase)return;
 const p=chosenPurchase;
 const current=items.find(i=>i.kind===p.kind&&i.id===p.id);
 if(!current){chosenPurchase=null;return;}
 const limit=maxPurchaseQuantity(current);
 if(limit<1){chosenPurchase=null;return;}
 p.quantity=Math.min(limit,Math.max(1,Math.floor(Number(p.quantity)||1)));
 const selected= current.kind==='area'?current.label:current.label+'（所持 '+shopStock(p.kind,p.id).toLocaleString('ja-JP')+'個）';
 confirmation.appendChild(node('p','confirm-label',p.icon+' '+selected));
 if(p.kind!=='area'){
  const countRow=node('div','shop-quantity');
  const title=node('span','shop-quantity-label','一度に買う数');
  const decrement=node('button','shop-qty-btn','−');
  decrement.type='button';
  decrement.setAttribute('aria-label','購入数を1個減らす');
  decrement.disabled=busy||p.quantity<=1;
  decrement.addEventListener('click',()=>{p.quantity=Math.max(1,p.quantity-1);renderShop();});
  const count=node('output','shop-qty-value',p.quantity+'個');
  count.setAttribute('aria-label','購入数');
  const increment=node('button','shop-qty-btn','＋');
  increment.type='button';
  increment.setAttribute('aria-label','購入数を1個増やす');
  increment.disabled=busy||p.quantity>=limit;
  increment.addEventListener('click',()=>{p.quantity=Math.min(limit,p.quantity+1);renderShop();});
  countRow.append(title,decrement,count,increment);
  confirmation.appendChild(countRow);
 }
 const total=current.price*p.quantity;
 const totalRow=node('div','shop-order-total');
 totalRow.append(node('span','', '合計 '+p.quantity+'個'),node('strong','',total.toLocaleString('ja-JP')+' C'));
 confirmation.appendChild(totalRow);
 const row=node('div','modal-actions');
 row.append(
  actionButton('🪙 '+p.quantity+'個購入する','gold',async()=>{
   const quantity=p.quantity;
   const success=await buy(p.kind,p.id,quantity);
   if(success)chosenPurchase=null;
   renderShop();
  }),
  actionButton('やめる','secondary',()=>{chosenPurchase=null;renderShop();})
 );
 confirmation.appendChild(row);
}
function renderInventory(){
 const container=$('inventory');container.replaceChildren();
 const addTitle=label=>container.appendChild(node('div','inv-title',label));
 const addChips=(entries,kind)=>{
  const wrap=node('div','inv-row');
  for(const [id,n] of entries){
   if(!n)continue;
   const chip=node('span','inv-chip',CROPS[id].icon+' '+CROPS[id].name+' ×'+n);
   if(kind==='produce'){
    for(const [key,label] of [['feed','食べる'],['pack','贈り物に']]){
     const btn=node('button','',label);btn.disabled=busy||!ready;
     btn.addEventListener('click',()=>{chosenProduce={kind:key,id};storageConfirmation();});
     chip.appendChild(btn);
    }
   }else if(kind==='gift'){
    const btn=node('button','','取り出す');btn.disabled=busy||!ready;
    btn.addEventListener('click',()=>{chosenProduce={kind:'unpack',id};storageConfirmation();});
    chip.appendChild(btn);
   }
   wrap.appendChild(chip);
  }
  if(!wrap.childNodes.length)wrap.appendChild(node('span','tiny','まだありません'));
  container.appendChild(wrap);
 };
 addTitle('🌰 タネの袋');
 addChips(cropIds.map(id=>[id,farm.inventory.seeds[id]]),'seed');
 const supply=node('div','inv-row');
 supply.append(node('span','inv-chip','💧 水 ×'+farm.inventory.water),node('span','inv-chip','🌿 肥料 ×'+farm.inventory.fertilizer));
 container.appendChild(supply);
 addTitle('🧺 収穫した野菜');
 addChips(cropIds.map(id=>[id,farm.inventory.produce[id]]),'produce');
 addTitle('🎁 プレゼント箱（送信準備中）');
 addChips(cropIds.map(id=>[id,farm.inventory.giftBox[id]]),'gift');
 storageConfirmation();
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
 const pet=$('petWalker');pet.classList.add('working');
 const bubble=node('span','effect-bubble',({plant:'🌰 ✨',water:'💧💧',fertilize:'🌿✨',harvest:'🧺✨',feed:'💚😋'}[kind])||'✨');
 Object.assign(bubble.style,coords(x,y-1));
 $('effect').appendChild(bubble);
 await sleep(750);pet.classList.remove('working');setTimeout(()=>bubble.remove(),850);
}
async function actPlot(type,extra={}){
 if(busy||!ready||!selected)return;
 const params={type,area:selected.area,index:selected.index,...extra};
 let result;
 try{result=applyFarmAction(farm,params);}catch(e){toast(e.message);return;}
 hideDialog('actionDialog');actionChoice=null;
 busy=true;refresh();
 const spot=locate(params.area,params.index);
 try{
  await walkTo(spot.x+.5,spot.y+.77);
  await showWork(type,spot.x+.5,spot.y+1);
  farm=result.farm;queueSave();toast(result.message);
 }catch(e){toast(e.message||'作業に失敗しました。');}
 finally{busy=false;refresh();}
}
async function produce(kind,id){
 if(busy||!ready)return;
 let result;
 try{result=useProduce(farm,kind,id);}catch(e){toast(e.message);return;}
 if(kind==='feed')hideDialog('storageDialog');
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
   tx.update(walletRef(),{coins:latestBalance});
   tx.set(farmRef(),{...purchased.farm,updatedAt:Date.now()});
  });
  balance=latestBalance;farm=purchased.farm;dirty=false;toast(purchased.message);
  if(kind==='area')selected={area:Number(id),index:0};
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
async function initialize(current){
 const sequence=++authSequence;
 user=current;
 if(!user){ready=false;$('previewGate').hidden=false;$('previewGate').textContent='もんすたでぃでログインしてください。';status('もんすたでぃでログインしてください。','error');return;}
 busy=true;ready=false;$('previewGate').hidden=false;$('previewGate').textContent='管理者確認中…';refresh();
 try{
  const session=await accountSession(current);
  if(!session?.admin || session.resetRequired)throw Error('この先行プレビューは管理者アカウントだけが利用できます。');
  const [wallet,snapshot]=await Promise.all([getDoc(walletRef()),getDoc(farmRef())]);
  if(sequence!==authSequence)return;
  if(!wallet.exists())throw Error('ペットのデータが見つかりません。');
  petData=wallet.data();balance=Math.max(0,Math.floor(Number(petData.coins)||0));
  farm=normalizeFarm(snapshot.exists()?snapshot.data():freshFarm());
  $('previewGate').hidden=true;petVisual();selected=null;ready=true;busy=false;refresh();
  if($('viewport').clientWidth<760)focusAt(12.7,7.7);
  status('農園にようこそ！ 畑をタップして始めましょう。','ok');
 }catch(e){
  if(sequence!==authSequence)return;
  busy=false;ready=false;
  $('previewGate').textContent=e.message||'先行プレビューへのアクセスを確認できませんでした。';
  status('農園を読み込めませんでした：'+(e.message||'不明なエラー'),'error');
  console.error('pet farm load failed',e);
 }
}
async function visitBuilding(kind){
 if(!ready||busy)return;
 busy=true;refresh();
 try{
  if(kind==='shop')await walkTo(12.7,6.35);
  else await walkTo(20.1,6.35);
  if(kind==='shop'){shopTab='seed';chosenPurchase=null;showDialog('shopDialog');}
  else{chosenProduce=null;renderInventory();showDialog('storageDialog');}
 }finally{busy=false;refresh();}
}
$('shopBuilding').addEventListener('click',()=>{void visitBuilding('shop');});
$('storageBuilding').addEventListener('click',()=>{void visitBuilding('storage');});
for(const tab of document.querySelectorAll('[data-shop]'))tab.addEventListener('click',()=>{
 shopTab=tab.dataset.shop;chosenPurchase=null;renderShop();
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
initWorld();
onAuthStateChanged(auth,u=>{void initialize(u);},e=>status('認証エラー：'+e.message,'error'));
