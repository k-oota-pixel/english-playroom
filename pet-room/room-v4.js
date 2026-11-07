import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getFirestore,doc,getDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {getAuth} from '../auth-session.js?v=2.3.15';
import {enableAppCheck} from '../firebase-security.js?v=2.1.9';
import {renderPetSVG} from '../pet-art.js?v=2.4.3';
import {roomBackground} from './room-v4-art.js?v=2';
import {facingFurnitureSVG,ROOM_FOOTPRINTS} from './room-v4-directions.js?v=2';
import {extraFurnitureSVG,EXTRA_FURNITURE} from './room-v4-extras.js?v=1';

const $=id=>document.getElementById(id);
const GRID=6,TX=132,TY=202,TILE=116,SIZE=960;
const specs=[
 {id:'shelf',name:'本だな',icon:'📚',x:0,y:0,scaleX:1.18,scaleY:1.65},
 {id:'cabinet',name:'キャビネット',icon:'🗄️',x:4,y:0,scaleX:1.16,scaleY:1.30},
 {id:'bed',name:'ベッド',icon:'🛏️',x:0,y:2,scaleX:1.04,scaleY:1.05},
 {id:'rug',name:'ラグ',icon:'🟢',x:2,y:3,scaleX:1.06,scaleY:.96,blocking:false},
 {id:'table',name:'テーブル',icon:'☕',x:0,y:5,scaleX:1.34,scaleY:1.36},
 {id:'sofa',name:'ソファ',icon:'🛋️',x:4,y:4,scaleX:1.03,scaleY:1.50},
 {id:'plant',name:'観葉植物',icon:'🪴',x:5,y:2,scaleX:1.14,scaleY:1.45},
 {id:'roomLight',name:'ルームライト',icon:'💡',x:3,y:1,scaleX:1.03,scaleY:1.72,initialPlaced:false},
 {id:'tvStand',name:'テレビ（テレビ台付き）',icon:'📺',x:3,y:0,scaleX:1.12,scaleY:1.42,sideScaleY:.93,initialPlaced:false},
 {id:'studyDesk',name:'勉強机',icon:'✏️',x:2,y:2,scaleX:1.08,scaleY:1.43,sideScaleY:.96,initialPlaced:false},
 {id:'fullMirror',name:'姿見の鏡',icon:'🪞',x:0,y:1,scaleX:1.02,scaleY:1.70,initialPlaced:false},
 {id:'wallClock',name:'壁掛け時計',icon:'🕒',x:3,y:0,scaleX:.93,scaleY:1.04,initialPlaced:false,blocking:false,wallOnly:true},
 {id:'squareTable',name:'四角いテーブル',icon:'▱',x:2,y:4,scaleX:1.1,scaleY:1.38,sideScaleY:.95,initialPlaced:false},
 {id:'kotatsu',name:'こたつ',icon:'🍊',x:3,y:3,scaleX:1.04,scaleY:1.08,initialPlaced:false}
].map(spec=>({...spec,...ROOM_FOOTPRINTS[spec.id],...EXTRA_FURNITURE[spec.id]}));
const items=new Map(specs.map(s=>[s.id,{...s,x:s.x,y:s.y,rotation:0,placed:s.initialPlaced!==false,element:null,blocking:s.blocking!==false&&!s.wallOnly}]));
let user=null,petData={},petCell={x:3,y:2},mode='view',activeId=null,snapshot=null;
let playCount=0,toastTimer=null,dirtyLayout=false,layoutKey='monstudy-pet-room-v4:guest',hasPet=false,dragState=null,suppressClickUntil=0;
const board=$('roomBoard'),layer=$('objectLayer'),grid=$('gridOverlay'),tiles=$('placementTiles'),wallSlots=$('wallSlots');
const actor=$('petActor'),egg=$('petEgg'),panel=$('editingPanel');
const editorHome=document.querySelector('.info-column'),roomStatus=$('roomStatus');
const phoneLayout=matchMedia('(max-width:740px)');
function positionEditor(){
 if(phoneLayout.matches)roomStatus.insertAdjacentElement('afterend',panel);
 else editorHome.insertBefore(panel,editorHome.firstElementChild);
}
positionEditor();
if(phoneLayout.addEventListener)phoneLayout.addEventListener('change',positionEditor);
else window.addEventListener('resize',positionEditor);

// Size the whole square board to the iframe's *actual* visible height.
// This also accommodates the common MonStudy header and browser zoom at 100%.
function fitBoardToViewport(){
 if(phoneLayout.matches){board.style.removeProperty('width');return}
 const footer=document.querySelector('.bottom-bar');
 const boardTop=board.getBoundingClientRect().top+window.scrollY;
 const roomWidth=board.parentElement?.clientWidth||760;
 const reserved=(footer?.offsetHeight||48)+(roomStatus.offsetHeight||26)+35;
 const available=Math.floor(window.innerHeight-boardTop-reserved);
 if(Number.isFinite(available))board.style.width=Math.max(170,Math.min(760,roomWidth,available))+'px';
}
requestAnimationFrame(fitBoardToViewport);
window.addEventListener('resize',()=>requestAnimationFrame(fitBoardToViewport),{passive:true});
const backdrop=$('roomArt');
backdrop.innerHTML=roomBackground();
// Create 36 reusable placement controls once; do not rebuild them on each drag frame.
const tileButtons=[];
for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
 const tile=document.createElement('button');tile.type='button';tile.className='placement-tile';tile.dataset.x=String(x);tile.dataset.y=String(y);
 tile.setAttribute('aria-label',String(x+1)+'列'+String(y+1)+'行');
 tile.addEventListener('click',()=>{
  const item=activeId?items.get(activeId):null;if(!item)return;
  const d=dims(item);item.x=clamp(x-Math.floor(d.w/2),0,GRID-d.w);item.y=clamp(y-Math.floor(d.h/2),0,GRID-d.h);render();
 });
 tiles.appendChild(tile);tileButtons.push(tile);
}
const wallSlotButtons=[];
for(let x=0;x<GRID;x++){
 const slot=document.createElement('button');slot.type='button';slot.className='wall-slot';
 slot.setAttribute('aria-label','上の壁の'+(x+1)+'番目に時計を設置');slot.dataset.x=String(x);
 slot.addEventListener('click',()=>{const item=activeId?items.get(activeId):null;if(!item?.wallOnly)return;item.x=x;item.y=0;render()});
 wallSlots.appendChild(slot);wallSlotButtons.push(slot);
}
const pos=(x,y)=>({x:TX+x*TILE,y:TY+y*TILE});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const key=(x,y)=>x+','+y;
const dims=item=>item.rotation%2===0?{w:item.w,h:item.h}:{w:item.h,h:item.w};
const itemCells=item=>{const d=dims(item),a=[];for(let j=0;j<d.h;j++)for(let i=0;i<d.w;i++)a.push({x:item.x+i,y:item.y+j});return a};
const blockedCells=(skip)=>{const result=new Set();for(const it of items.values()){if(!it.placed||!it.blocking||it.wallOnly||it.id===skip)continue;for(const c of itemCells(it))result.add(key(c.x,c.y))}return result};
const legal=item=>{
 const d=dims(item),others=blockedCells(item.id);
 return item.x>=0&&item.y>=0&&item.x+d.w<=GRID&&item.y+d.h<=GRID
 &&(!item.wallOnly||item.y===0)
 &&(!item.blocking||itemCells(item).every(c=>!others.has(key(c.x,c.y))));
};
function fit(item){const d=dims(item);item.x=clamp(Math.round(item.x),0,GRID-d.w);item.y=item.wallOnly?0:clamp(Math.round(item.y),0,GRID-d.h)}
function freeLocation(item){
 const old={x:item.x,y:item.y},candidates=[];
 const d=dims(item);
 for(let y=0;y<=(item.wallOnly?0:GRID-d.h);y++)for(let x=0;x<=GRID-d.w;x++)candidates.push({x,y,cost:Math.abs(old.x-x)+Math.abs(old.y-y)});
 candidates.sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x);
 for(const c of candidates){item.x=c.x;item.y=c.y;if(legal(item))return true}
 item.x=old.x;item.y=old.y;return false;
}
function loadLayout(uid){
 layoutKey='monstudy-pet-room-v4:'+uid;
 let data=null;
 try{const v=localStorage.getItem(layoutKey);data=v?JSON.parse(v):null}catch(error){console.warn('Room layout could not be parsed',error)}
 for(const spec of specs){
  const it=items.get(spec.id);let saved=data?.[it.id];
  if(!data){
   for(const prefix of ['monstudy-pet-room-top-v1-','monstudy-pet-room-flat-v2-']){
    try{const v=localStorage.getItem(prefix+it.id);if(v){saved=JSON.parse(v);break}}catch{}
   }
  }
  it.rotation=Number.isInteger(saved?.rotation)?((saved.rotation%4)+4)%4:0;
  it.x=Number.isInteger(saved?.x)?saved.x:spec.x;
  it.y=Number.isInteger(saved?.y)?saved.y:spec.y;
  it.placed=saved?!!saved.placed:spec.initialPlaced!==false;
  fit(it);
 }
 // Preserve the original records; resolve overlap only in this new room's working layout.
 const accepted=new Set();
 for(const it of items.values()){
  if(!it.placed||!it.blocking)continue;
  let conflict=itemCells(it).some(c=>accepted.has(key(c.x,c.y)));
  if(conflict){
   it.placed=false;
   if(freeLocation(it))it.placed=true;
  }
  if(it.placed)for(const c of itemCells(it))accepted.add(key(c.x,c.y));
 }
 dirtyLayout=false;render();
}
function saveLayout(){
 const data={__version:3};
 for(const it of items.values())data[it.id]={x:it.x,y:it.y,rotation:it.rotation,placed:it.placed};
 try{localStorage.setItem(layoutKey,JSON.stringify(data));dirtyLayout=false;return true}
 catch(error){console.error('Room save failed',error);notice('端末への保存に失敗しました。容量や設定を確認してください。');return false}
}
function notice(message){$('roomStatus').textContent=message}
function toast(message){
 const el=$('toast');el.textContent=message;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300);
}
function artFor(item){return EXTRA_FURNITURE[item.id]?extraFurnitureSVG(item.id,item.rotation):facingFurnitureSVG(item.id,item.rotation)}
function furnitureHTML(item){
 const el=document.createElement('button');
 el.type='button';el.className='object'+(item.id==='rug'?' rug-object':'');
 el.setAttribute('aria-label',item.name+'を動かす');
 el.dataset.itemId=item.id;
 el.innerHTML=artFor(item);el.dataset.facing=String(item.rotation);
 el.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();return}onItemSelect(item)});
 el.addEventListener('pointerdown',event=>{
  if(event.button!==0||mode==='store')return;
  beginEdit(item);
  const rect=board.getBoundingClientRect();
  const pt=pointAt(event.clientX,event.clientY),d=dims(item);
  dragState={id:item.id,pointer:event.pointerId,originX:event.clientX,originY:event.clientY,rect,dragged:false,offsetX:pt.x-(item.x+d.w/2),offsetY:pt.y-(item.y+d.h/2)};
  try{el.setPointerCapture(event.pointerId)}catch{}
 });
 el.addEventListener('pointermove',event=>{
  if(!dragState||dragState.pointer!==event.pointerId||dragState.id!==item.id||activeId!==item.id)return;
  if(!dragState.dragged&&Math.hypot(event.clientX-dragState.originX,event.clientY-dragState.originY)<6)return;
  dragState.dragged=true;el.classList.add('dragging');
  const pt=pointAt(event.clientX,event.clientY);
  const d=dims(item);
  item.x=clamp(Math.round(pt.x-dragState.offsetX-d.w/2),0,GRID-d.w);
  item.y=clamp(Math.round(pt.y-dragState.offsetY-d.h/2),0,GRID-d.h);
  render();event.preventDefault();
 });
 const release=()=>{if(!dragState||dragState.id!==item.id)return;el.classList.remove('dragging');const wasDragging=dragState.dragged;dragState=null;if(wasDragging){suppressClickUntil=performance.now()+250;notice(legal(item)?'位置を決めたら「✓ 決定」を押してください。':'家具が重なっています。別のマスを選んでください。')}};
 el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);
 item.element=el;layer.appendChild(el);
}
function onItemSelect(item){
 if(mode==='store'){if(!item.placed)return;item.placed=false;saveLayout();render();toast(item.name+'をしまいました');return}
 beginEdit(item);
}
function beginEdit(item){
 if(activeId===item.id)return;
 if(activeId)cancelEdit(false);
 activeId=item.id;snapshot={x:item.x,y:item.y,rotation:item.rotation,placed:item.placed};
 mode='move';item.placed=true;
 if(!legal(item))freeLocation(item);
 render();
 notice(item.wallOnly?'時計は上側の壁だけに取り付けられます。設置場所を選んでください。':item.name+'を動かせます。マスをタップするか、家具をドラッグしてください。');
}
function endEdit(save){
 const item=items.get(activeId);if(!item)return;
 if(save&&(!legal(item))){notice('ここには置けません。家具の重なりを解消してください。');toast('家具が重なっています');return}
 if(!save)Object.assign(item,snapshot);
 activeId=null;snapshot=null;mode='view';dragState=null;
 if(save){saveLayout();toast(item.name+'を配置しました')}
 render();notice('家具をタップすると、位置や向きを変更できます。');
}
function cancelEdit(message=true){if(!activeId)return;endEdit(false);if(message)toast('変更を取り消しました')}
function storeActive(){
 if(!activeId)return;const item=items.get(activeId);item.placed=false;
 activeId=null;snapshot=null;mode='view';saveLayout();render();toast(item.name+'をしまいました');notice('家具をしまいました。');
}
function moveActive(direction){
 const item=items.get(activeId);if(!item)return;
 if(item.wallOnly&&(direction==='up'||direction==='down'))return;
 if(direction==='left')item.x--;if(direction==='right')item.x++;
 if(direction==='up')item.y--;if(direction==='down')item.y++;
 fit(item);render();
}
function rotateActive(){const item=items.get(activeId);if(!item)return;const previous=dims(item),cx=item.x+previous.w/2,cy=item.y+previous.h/2;item.rotation=(item.rotation+1)%4;const next=dims(item);item.x=Math.round(cx-next.w/2);item.y=Math.round(cy-next.h/2);fit(item);render();notice(legal(item)?item.name+'を'+['正面','右向き','背面','左向き'][item.rotation]+'にしました。':'回転後に家具が重なっています。移動してから決定してください。')}
function drawItem(item){
 const el=item.element;if(!el)return;
 el.hidden=!item.placed;el.classList.toggle('selected',activeId===item.id);
 if(!item.placed)return;
 const d=dims(item),isRug=item.id==='rug';
 const x=TX+(item.x+d.w/2)*TILE;
 const y=item.wallOnly?199:TY+(item.y+(isRug?d.h/2:d.h))*TILE+(item.id==='bed'?-TILE*.5:0);
 // The four sprites share a bottom/feet anchor; only the rug is floor-centred.
 const width=TILE*d.w*item.scaleX;
 const spriteHeightScale=item.id==='sofa'&&item.rotation%2===1?1.12:item.rotation%2===1&&item.sideScaleY?item.sideScaleY:item.scaleY;
 const height=TILE*d.h*spriteHeightScale;
 el.style.left=(x/SIZE*100)+'%';el.style.top=(y/SIZE*100)+'%';
 el.style.width=(width/SIZE*100)+'%';el.style.height=(height/SIZE*100)+'%';
 el.style.transform=isRug?'translate(-50%,-66%)':'translate(-50%,-92%)';
 el.style.zIndex=activeId===item.id?'950':item.wallOnly?'8':isRug?'3':String(20+Math.floor((item.y+d.h)*20));
 if(el.dataset.facing!==String(item.rotation)){el.innerHTML=artFor(item);el.dataset.facing=String(item.rotation)};
}
function drawTiles(){
 const active=activeId?items.get(activeId):null;
 grid.hidden=!active;if(!active)return;
 const good=legal(active),foot=new Set(itemCells(active).map(c=>key(c.x,c.y)));
 for(const tile of tileButtons){
  const current=foot.has(key(Number(tile.dataset.x),Number(tile.dataset.y)));
  tile.classList.toggle('preview',current&&good);
  tile.classList.toggle('blocked',current&&!good);
 }
}
function setButtons(){
 for(const [id,value] of [['modeEdit','view'],['modeMove','move'],['modeStore','store']]){
  const b=$(id),active=mode===value;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));
 }
 const has=!!activeId;panel.hidden=!has;
 if(!has)return;
 const it=items.get(activeId),d=dims(it);$('selectedName').textContent=it.name+' ｜ '+d.w+'×'+d.h+'マス ｜ '+['正面','右向き','背面','左向き'][it.rotation]+' ｜ '+(it.x+1)+'列 '+(it.y+1)+'行';
 $('confirmItem').disabled=!legal(it);
}
function render(){
 for(const item of items.values())drawItem(item);
 drawTiles();setButtons();updatePetPosition(0);
}
function pointAt(clientX,clientY){
 const r=board.getBoundingClientRect();const px=(clientX-r.left)/r.width*SIZE,py=(clientY-r.top)/r.height*SIZE;
 return{x:(px-TX)/TILE,y:(py-TY)/TILE};
}
function renderCatalog(){
 const el=$('catalog');el.replaceChildren();
 for(const spec of specs){
  const item=items.get(spec.id),b=document.createElement('button');
  b.type='button';
  const icon=document.createElement('span');icon.className='item-icon';icon.textContent=spec.icon;
  const info=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small');
  strong.textContent=spec.name;const d=dims(item);small.textContent=(d.w+'×'+d.h+'マス｜'+['正面','右向き','背面','左向き'][item.rotation])+'｜'+(item.placed?'配置中':'手元');
  info.append(strong,small);b.append(icon,info);
  b.addEventListener('click',()=>{
   $('inventoryDialog').close();
   beginEdit(item);
  });
  el.appendChild(b);
 }
}
function openCatalog(){if(activeId)cancelEdit(false);renderCatalog();$('inventoryDialog').showModal()}
function bindUI(){
 $('modeEdit').addEventListener('click',()=>{if(activeId)cancelEdit(false);mode='view';render();notice('家具をタップすると、模様替えできます。')});
 $('modeMove').addEventListener('click',()=>{if(activeId)cancelEdit(false);mode='move';render();notice('動かしたい家具をタップしてください。')});
 $('modeStore').addEventListener('click',()=>{if(activeId)cancelEdit(false);mode=mode==='store'?'view':'store';render();notice(mode==='store'?'しまいたい家具をタップしてください。':'家具をタップすると移動できます。')});
 $('modePlace').addEventListener('click',openCatalog);
 $('closeInventory').addEventListener('click',()=>$('inventoryDialog').close());
 $('doneInventory').addEventListener('click',()=>$('inventoryDialog').close());
 $('confirmItem').addEventListener('click',()=>endEdit(true));
 $('cancelItem').addEventListener('click',()=>cancelEdit());
 $('storeItem').addEventListener('click',storeActive);
 $('rotateItem').addEventListener('click',rotateActive);
 panel.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>moveActive(b.dataset.move)));
 window.addEventListener('keydown',event=>{
  if(!activeId||event.target.closest('dialog')||event.target.matches('input,textarea'))return;
  const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  if(dirs[event.key]){event.preventDefault();moveActive(dirs[event.key])}
  if(event.key==='Escape'){event.preventDefault();cancelEdit()}
 });
 $('backHome').addEventListener('click',()=>{
  if(activeId)cancelEdit(false);
  const home=new URL('../',location.href);
  if(window.parent!==window&&window.parent.MonstudyShell?.navigate?.(home.href))return;
  location.href=home.href;
 });
 $('playPet').addEventListener('click',()=>{
  if(!hasPet){toast('ペットが孵化すると遊べます');return}
  actor.classList.remove('playing');void actor.offsetWidth;actor.classList.add('playing');
  playCount++;notice('ペットがうれしそうに跳ねています！');
  setTimeout(()=>actor.classList.remove('playing'),2100);
 });
}
function firstFree(){
 const busy=blockedCells();
 if(!busy.has(key(petCell.x,petCell.y)))return;
 for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++)if(!busy.has(key(x,y))){petCell={x,y};return}
}
function updatePetPosition(ms=0){
 if(!hasPet)return;firstFree();
 const cx=TX+(petCell.x+.5)*TILE,cy=TY+(petCell.y+.88)*TILE;
 actor.style.left=(cx/SIZE*100)+'%';actor.style.top=(cy/SIZE*100)+'%';
 actor.style.zIndex=String(20+Math.floor((petCell.y+1)*20)+2);
 if(ms){actor.style.transitionDuration=ms+'ms';actor.classList.add('walking')}
 else{actor.style.transitionDuration='0ms';actor.classList.remove('walking')}
}
function petNeighbors(c){
 const busy=blockedCells();
 return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy})).filter(n=>n.x>=0&&n.y>=0&&n.x<GRID&&n.y<GRID&&!busy.has(key(n.x,n.y)));
}
async function petWander(){
 if(!hasPet||document.hidden||activeId)return;
 const opts=petNeighbors(petCell);if(!opts.length)return;
 const next=opts[Math.floor(Math.random()*opts.length)];
 const prev=petCell;petCell=next;
 actor.classList.toggle('face-left',next.x<prev.x);
 updatePetPosition(1050);
 setTimeout(()=>actor.classList.remove('walking'),1100);
}
function getCachedData(uid){
 try{
  for(const source of [window.EnglishPlayroomWallet,window.parent!==window?window.parent.EnglishPlayroomWallet:null]){
   if(source?.uid===uid&&source.data)return source.data;
  }
 }catch{}
 return null;
}
async function loadPet(){
 try{
  const cfg={apiKey:'AIzaSyAllLjPcGhygMSEIORXhKZOaDjYvpSJ4EQ',authDomain:'eiken-retry.firebaseapp.com',projectId:'eiken-retry',storageBucket:'eiken-retry.firebasestorage.app',messagingSenderId:'231308672297',appId:'1:231308672297:web:5e8b8ede3a0246c2318b38'};
  const app=getApps().find(a=>a.name==='[DEFAULT]')||initializeApp(cfg);enableAppCheck(app);
  const auth=getAuth(app);await auth.authStateReady();user=auth.currentUser;
  if(!user){loadLayout('guest');notice('ログインすると自分のペットが表示されます。');return}
  loadLayout(user.uid);
  petData=getCachedData(user.uid);
  if(!petData){
   const snap=await getDoc(doc(getFirestore(app),'users',user.uid,'apps','english-playroom'));
   petData=snap.exists()?snap.data()||{}:{};
  }
  const name=String(petData.petName||'ペット').trim().slice(0,40);$('petName').textContent=name;
  const coins=Number(petData.coins);$('coinCount').textContent=Number.isFinite(coins)?Math.max(0,Math.floor(coins)).toLocaleString('ja-JP'):'—';
  hasPet=!!petData.petHatched;
  if(!hasPet){
   egg.hidden=false;actor.hidden=true;notice('ペットの孵化を待っています。家具の模様替えはできます。');return;
  }
  const stage=petData.petAdult===false?'mystery':'baby';
  actor.innerHTML=renderPetSVG(petData.petAdult===false?null:petData.petAppearance,petData.petShop||{},stage,{background:false});
  const svg=actor.querySelector('svg');
  if(svg)svg.querySelectorAll('.pet-frame-motion').forEach(node=>node.remove());
  actor.hidden=false;egg.hidden=true;
  firstFree();updatePetPosition(0);
  notice(name+'が、おへやを歩いています。家具を動かしてみましょう！');
 }catch(error){
  console.error('Could not load pet room profile',error);
  if(!user)loadLayout('guest');
  notice('ペット情報を読み込めませんでした。通信状態を確認してください。');
  toast('ペット情報の取得に失敗しました');
 }
}
for(const item of items.values())furnitureHTML(item);
bindUI();loadLayout('guest');loadPet();
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(petWander,2200);
