import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from '../auth-session.js?v=2.3.15';
import {getFirestore,doc,getDoc,setDoc,runTransaction} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.3.8';
import {MAP,FARMS,CROPS,SUPPLIES,cropIds,plotKey,locate,freshFarm,normalizeFarm,growthPhase,remaining,applyFarmAction,applyPurchase,useProduce} from './model.js?v=1';

const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(cfg);enableAppCheck(app);
const auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const tile=MAP.tile;
let user=null,petData={},farm=freshFarm(),balance=0,selected=null,chosenSeed='carrot',shopTab='seed';
let busy=false,dirty=false,saving=null,saveTimer=0,toastTimer=0,zoom=.8,petX=7.5,petY=9.5,walking=false,ready=false,authSequence=0;
function walletRef(){return doc(db,'users',user.uid,'apps','english-playroom');}
function farmRef(){return doc(db,'users',user.uid,'apps','pet-farm');}
const coords=(x,y)=>({left:(x*tile)+'px',top:(y*tile)+'px'});
function status(message,kind=''){const el=$('status');el.textContent=message;el.className='notice'+(kind?' '+kind:'');}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
function updateCoin(){ $('coins').textContent=Number(balance).toLocaleString('ja-JP'); }
function refresh(){
 updateCoin();renderPlots();renderSelection();renderShop();renderInventory();
 $('bond').textContent='💚 なかよし度 '+farm.bond+'　｜　収穫 '+farm.harvests+'回';
 $('saveBtn').disabled=!user||busy||!dirty;
}
function node(tag,cls,txt){
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
}
function initWorld(){
 const world=$('world');
 world.style.width=(MAP.w*tile)+'px';world.style.height=(MAP.h*tile)+'px';
 const paths=[
  {x:4.5,y:7.5,w:2,h:3.5,v:true},
  {x:5,y:9.5,w:23,h:1.05},
  {x:15.5,y:9.5,w:1,h:2.3,v:true},
  {x:21.5,y:9.5,w:1,h:2.3,v:true},
  {x:12,y:9.5,w:1,h:8,v:true},
  {x:22,y:13.6,w:1,h:4.3,v:true},
  {x:16.5,y:12.9,w:1,h:4,v:true},
  {x:13.8,y:17.6,w:7.8,h:1}
 ];
 for(const path of paths){
  const el=node('div','path'+(path.v?' vertical':''));
  Object.assign(el.style,{left:(path.x*tile)+'px',top:(path.y*tile)+'px',width:(path.w*tile)+'px',height:(path.h*tile)+'px'});
  $('paths').appendChild(el);
 }
 const p=node('div','pond');$('deco').appendChild(p);
 let seed=12477;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const skip=(x,y)=> (x<9&&y<9)||(x>9&&x<28&&y>8&&y<23)||(x>25&&y<9);
 for(let n=0;n<160;n++){
  const x=1+Math.floor(random()*32),y=1+Math.floor(random()*23);
  if(skip(x,y))continue;
  const e=node('span',n%9===0?'flower':'grass-clump',n%9===0?['🌼','🌺','🌸'][n%3]:'❧');
  Object.assign(e.style,{left:(x*tile+random()*22)+'px',top:(y*tile+random()*20)+'px'});
  $('grass').appendChild(e);
 }
 for(const pt of [[1,2],[1,7],[2,17],[5,18],[7,22],[28,13],[29,20],[31,22],[28,3],[10,2],[13,3],[18,3],[24,3],[31,11]]){
  const e=node('span','tree','🌳');
  Object.assign(e.style,coords(pt[0],pt[1]));$('deco').appendChild(e);
 }
 const flowerbed=[[6.1,5.4],[6.7,6],[8,5.8],[3,5.2],[9,14],[26,17]];
 for(const xy of flowerbed){const e=node('span','flower','🌷');Object.assign(e.style,coords(...xy));$('deco').appendChild(e);}
 for(let area=0;area<FARMS.length;area++){
  const a=FARMS[area];
  const wrapper=node('div','farm-area');wrapper.id='area-'+area;
  Object.assign(wrapper.style,{left:((a.x-.14)*tile)+'px',top:((a.y-.14)*tile)+'px',width:((a.w+.28)*tile)+'px',height:((a.h+.28)*tile)+'px'});
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
 setZoom(.8,false);
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
 selected={area,index};refresh();
 const point=locate(area,index);
 if(point){$('viewport').scrollTo({left:Math.max(0,point.x*tile*zoom-$('viewport').clientWidth/2),top:Math.max(0,point.y*tile*zoom-$('viewport').clientHeight/2),behavior:'smooth'});}
}
function actionButton(text,cls,fn,disabled=false){
 const b=node('button','action-btn'+(cls?' '+cls:''),text);b.type='button';b.disabled=busy||!ready||disabled;b.addEventListener('click',fn);return b;
}
function renderSelection(){
 const title=$('selectionTitle'),desc=$('selectionDetail'),ctrl=$('actionControls');
 ctrl.replaceChildren();
 if(!selected){title.textContent='畑を選んでください';desc.textContent='好きなマスをタップすると、種まきや水やりができます。';return;}
 const a=FARMS[selected.area],p=farm.plots[plotKey(selected.area,selected.index)];
 title.textContent=a.name+' · '+(selected.index+1)+'番の畑';
 const row=node('div','action-row'),box=node('div','action-box');
 if(!farm.unlocked[selected.area]){
  desc.textContent='まだ入れない土地です。第'+selected.area+'農園の解放費用 '+a.price+'C。';
  if(farm.unlocked[selected.area-1])row.appendChild(actionButton('🔓 '+a.price+'Cで農園を解放','gold',()=>buy('area',String(selected.area))));
  else desc.textContent+=' ひとつ前の農園を先に解放してください。';
 }else if(!p){
  desc.textContent='ふかふかの土。何を育てようかな？';
  const choice=node('select');choice.setAttribute('aria-label','植えるタネ');
  for(const id of cropIds){
   const opt=node('option','',CROPS[id].icon+' '+CROPS[id].name+'（残り'+farm.inventory.seeds[id]+'）');
   opt.value=id;choice.appendChild(opt);
  }
  if(!cropIds.includes(chosenSeed))chosenSeed='carrot';
  choice.value=chosenSeed;choice.addEventListener('change',()=>{chosenSeed=choice.value;renderSelection();});
  box.appendChild(choice);
  row.appendChild(actionButton('🌱 タネをまく','',()=>actPlot('plant',{crop:chosenSeed}),!farm.inventory.seeds[chosenSeed]));
 }else{
  const phase=growthPhase(p);
  desc.textContent=CROPS[p.crop].icon+' '+CROPS[p.crop].name+'　｜　'+remaining(p);
  if(phase==='ready')row.appendChild(actionButton('🧺 収穫する','gold',()=>actPlot('harvest')));
  else{
   if(!p.wateredAt)row.appendChild(actionButton('💧 水やり','',()=>actPlot('water'),!farm.inventory.water));
   if(!p.boosted)row.appendChild(actionButton('🌿 肥料を使う','secondary',()=>actPlot('fertilize'),!farm.inventory.fertilizer));
  }
 }
 if(row.children.length){box.appendChild(row);ctrl.appendChild(box);}
}
function renderShop(){
 const list=$('shopList');list.replaceChildren();
 for(const tab of document.querySelectorAll('[data-shop]'))tab.classList.toggle('active',tab.dataset.shop===shopTab);
 const items=shopTab==='seed'?cropIds.map(id=>({kind:'seed',id,label:CROPS[id].name+'のタネ',icon:CROPS[id].icon,price:CROPS[id].seed,sub:'育成 '+CROPS[id].minutes+'分'}))
  :shopTab==='supply'?Object.entries(SUPPLIES).map(([id,s])=>({kind:'supply',id,label:s.name,icon:s.icon,price:s.price,sub:id==='water'?'水やり1回で消費':'成長時間が短くなる'}))
  :FARMS.slice(1).map((a,i)=>({kind:'area',id:String(i+1),label:a.name,icon:'🌾',price:a.price,sub:(a.w*a.h)+'マス・'+(farm.unlocked[i+1]?'解放済み':'未解放')}));
 for(const item of items){
  const b=node('button','shop-item');b.type='button';
  b.append(node('span','emoji',item.icon),node('strong','',item.label),node('small','',item.price+'C · '+item.sub));
  if(item.kind==='area'&&(farm.unlocked[Number(item.id)]||!farm.unlocked[Number(item.id)-1]))b.disabled=true;
  else b.disabled=busy||!ready||balance<item.price;
  b.addEventListener('click',()=>buy(item.kind,item.id));
  list.appendChild(b);
 }
}
function renderInventory(){
 const container=$('inventory');container.replaceChildren();
 const addTitle=(label)=>container.appendChild(node('div','inv-title',label));
 const addChips=(entries,kind)=>{
  const wrap=node('div','inv-row');
  for(const [id,n] of entries){
   if(!n)continue;
   const chip=node('span','inv-chip',CROPS[id].icon+' '+CROPS[id].name+' ×'+n);
   if(kind==='produce'){
    const feed=node('button','','食べる');feed.disabled=busy||!ready;feed.addEventListener('click',()=>produce('feed',id));
    const pack=node('button','','贈り物に');pack.disabled=busy||!ready;pack.addEventListener('click',()=>produce('pack',id));
    chip.append(feed,pack);
   }else if(kind==='gift'){
    const undo=node('button','','取り出す');undo.disabled=busy||!ready;undo.addEventListener('click',()=>produce('unpack',id));chip.appendChild(undo);
   }
   wrap.appendChild(chip);
  }
  if(!wrap.childNodes.length)wrap.appendChild(node('span','tiny','まだありません'));
  container.appendChild(wrap);
 };
 addTitle('🌰 タネの袋');
 addChips(cropIds.map(id=>[id,farm.inventory.seeds[id]]),'seed');
 const sup=node('div','inv-row');
 sup.append(node('span','inv-chip','💧 水 ×'+farm.inventory.water),node('span','inv-chip','🌿 肥料 ×'+farm.inventory.fertilizer));
 container.appendChild(sup);
 addTitle('🧺 収穫した野菜');
 addChips(cropIds.map(id=>[id,farm.inventory.produce[id]]),'produce');
 addTitle('🎁 プレゼント箱（送信準備中）');
 addChips(cropIds.map(id=>[id,farm.inventory.giftBox[id]]),'gift');
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
 try{root.innerHTML=renderPetSVG(petData.petAppearance,petData.petShop||{},'',{background:false});}
 catch{root.textContent='🐾';}
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function movePoint(x,y){
 const dist=Math.hypot(x-petX,y-petY),duration=Math.min(1900,Math.max(160,dist*120));
 if(dist<.12)return;
 setPetPosition(x,y,duration);await sleep(duration+30);
}
async function walkTo(x,y){
 if(walking)return;
 walking=true;const el=$('petWalker');el.classList.add('walking');
 try{
  if(Math.abs(petY-9.5)>1)await movePoint(petX,9.5);
  await movePoint(x,9.5);
  await movePoint(x,y);
 }finally{walking=false;el.classList.remove('walking');}
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
 busy=true;refresh();
 const spot=locate(params.area,params.index);
 try{
  await walkTo(spot.x+.5,spot.y+1.55);
  await showWork(type,spot.x+.5,spot.y+1);
  farm=result.farm;queueSave();toast(result.message);
 }catch(e){toast(e.message||'作業に失敗しました。');}
 finally{busy=false;refresh();}
}
async function produce(kind,id){
 if(busy||!ready)return;
 let result;
 try{result=useProduce(farm,kind,id);}catch(e){toast(e.message);return;}
 busy=true;refresh();
 try{
  if(kind==='feed'){await walkTo(6.5,7.9);await showWork('feed',6.5,7.8);}
  farm=result.farm;queueSave();toast(result.message);
 }catch(e){toast('操作が完了しませんでした。');}
 finally{busy=false;refresh();}
}
async function buy(kind,id){
 if(busy||!ready||!user)return;
 const preview=applyPurchase.bind(null,farm,kind,id,balance);
 try{preview();}catch(e){toast(e.message);return;}
 const item=kind==='area'?FARMS[Number(id)].name:kind==='seed'?CROPS[id].name+'のタネ':SUPPLIES[id].name;
 if(!confirm(item+'を '+preview().cost+'コインで購入しますか？'))return;
 busy=true;refresh();status('コイン残高と購入情報を確認しています…');
 try{
  await flushSave();
  let purchased,latestBalance;
  // Wallet and farm are committed atomically: two devices cannot spend the same coins twice.
  await runTransaction(db,async tx=>{
   const wallet=await tx.get(walletRef());
   const fdoc=await tx.get(farmRef());
   if(!wallet.exists())throw Error('コイン情報が見つかりません。');
   const c=Math.max(0,Math.floor(Number(wallet.data().coins)||0));
   purchased=applyPurchase(fdoc.exists()?fdoc.data():freshFarm(),kind,id,c);
   latestBalance=c-purchased.cost;
   tx.update(walletRef(),{coins:latestBalance});
   tx.set(farmRef(),{...purchased.farm,updatedAt:Date.now()});
  });
  balance=latestBalance;farm=purchased.farm;dirty=false;toast(purchased.message);
  if(kind==='area')selected={area:Number(id),index:0};
  status('購入を保存しました。','ok');
 }catch(e){console.error('pet farm purchase failed',e);status('購入できませんでした：'+(e.message||'通信エラー'),'error');toast('購入は反映されていません。');}
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
function setZoom(next,center=true){
 zoom=clamp(next,.55,1.25);
 const size=$('sceneSize'),world=$('world'),view=$('viewport');
 const oldX=(view.scrollLeft+view.clientWidth/2)/Math.max(.01,Number(world.dataset.zoom)||.8);
 const oldY=(view.scrollTop+view.clientHeight/2)/Math.max(.01,Number(world.dataset.zoom)||.8);
 size.style.width=(MAP.w*tile*zoom)+'px';size.style.height=(MAP.h*tile*zoom)+'px';
 world.style.transform='scale('+zoom+')';world.dataset.zoom=zoom;
 $('zoomLabel').textContent=Math.round(zoom*100)+'%';
 if(center)view.scrollTo({left:oldX*zoom-view.clientWidth/2,top:oldY*zoom-view.clientHeight/2,behavior:'instant'});
}
function focusAt(x,y){
 const v=$('viewport');
 v.scrollTo({left:Math.max(0,(x*tile)*zoom-v.clientWidth/2),top:Math.max(0,(y*tile)*zoom-v.clientHeight/2),behavior:'smooth'});
}
async function initialize(current){
 const sequence=++authSequence;
 user=current;
 if(!user){ready=false;status('もんすたでぃでログインしてください。','error');return;}
 busy=true;ready=false;refresh();
 try{
  const [wallet,snapshot]=await Promise.all([getDoc(walletRef()),getDoc(farmRef())]);
  if(sequence!==authSequence)return;
  if(!wallet.exists())throw Error('ペットのデータが見つかりません。');
  petData=wallet.data();balance=Math.max(0,Math.floor(Number(petData.coins)||0));
  farm=normalizeFarm(snapshot.exists()?snapshot.data():freshFarm());
  petVisual();selected={area:0,index:0};ready=true;busy=false;refresh();
  focusAt(16,12);
  status('農園にようこそ！ 畑をタップして始めましょう。','ok');
 }catch(e){
  if(sequence!==authSequence)return;
  busy=false;ready=false;
  status('農園を読み込めませんでした：'+(e.message||'不明なエラー'),'error');
  console.error('pet farm load failed',e);
 }
}
for(const tab of document.querySelectorAll('[data-shop]'))tab.addEventListener('click',()=>{
 shopTab=tab.dataset.shop;renderShop();
});
$('saveBtn').addEventListener('click',()=>{void flushSave();});
$('homeBtn').addEventListener('click',()=>focusAt(5,5));
$('centerBtn').addEventListener('click',()=>focusAt(16,12));
$('zoomOut').addEventListener('click',()=>setZoom(zoom-.1));
$('zoomIn').addEventListener('click',()=>setZoom(zoom+.1));
window.addEventListener('pagehide',()=>{if(dirty)void flushSave();});
setInterval(()=>{if(ready){renderPlots();renderSelection();}},10000);
setInterval(async()=>{
 if(!ready||busy||walking||document.hidden)return;
 const choices=[7.5,9.5,15.5,18,21.5,25.5];
 const target=choices[Math.floor(Math.random()*choices.length)];
 await walkTo(target,9.5);
},8500);
initWorld();
onAuthStateChanged(auth,u=>{void initialize(u);},e=>status('認証エラー：'+e.message,'error'));
