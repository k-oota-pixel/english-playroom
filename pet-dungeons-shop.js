import {auth,db,walletRef} from './coin-reward.js';
import {getDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {DUNGEON_ITEMS,normalizeDungeonInventory} from './pet-dungeons-model.js?v=1.10.22';

let active=false,busy=false,loading=false;

function ensureStyle(){
 if(document.getElementById('petDungeonsShopStyle'))return;
 const style=document.createElement('style');style.id='petDungeonsShopStyle';style.textContent=`
 .dungeon-shop-note{margin:0 0 10px;padding:9px 11px;border-radius:11px;background:#e9f2ee;color:#4d675d;font-size:10px;line-height:1.55}.dungeon-shop-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.dungeon-shop-item{display:grid;grid-template-columns:42px minmax(0,1fr);gap:8px;padding:11px;border:1px solid #e1e6de;border-radius:14px;background:#fff}.dungeon-shop-item .dsi-icon{grid-row:1/4;font-size:29px;display:grid;place-items:center}.dungeon-shop-item strong{font-size:12px}.dungeon-shop-item span{font-size:10px;color:#65766e}.dungeon-shop-item small{font-size:9px;color:#8a6a19}.dungeon-shop-item button{grid-column:1/-1;border:0;border-radius:9px;padding:8px;background:#285f50;color:#fff;font:inherit;font-size:10px;font-weight:900;cursor:pointer}.dungeon-shop-item button:disabled{opacity:.45;cursor:default}.dungeon-shop-status{min-height:18px;margin:9px 2px 0;font-size:10px;font-weight:800;color:#28664f}.dungeon-shop-status.error{color:#a34c3f}@media(max-width:560px){.dungeon-shop-grid{grid-template-columns:1fr}}
 `;document.head.append(style);
}

function panelOf(){return document.querySelector('#petShopDialog .pet-shop-panel');}
function tabsOf(){return document.querySelector('#petShopDialog .pet-shop-tabs');}
function balanceOf(){return document.querySelector('#petShopDialog .pet-shop-balance');}

function render(data,message='',error=false){
 const panel=panelOf();if(!panel||!active)return;ensureStyle();
 const inventory=normalizeDungeonInventory(data?.petDungeonItems),coins=Math.max(0,Math.floor(Number(data?.coins)||0));
 panel.innerHTML='';const root=document.createElement('div');root.dataset.dungeonShopPanel='1';
 root.innerHTML='<div class="pet-shop-panel-title">⚔️ ダンジョンズ</div><p class="dungeon-shop-note">エイゴダンジョンズの冒険中に使える消費アイテムです。購入すると持ち物に追加され、使うまでなくなりません。</p>';
 const grid=document.createElement('div');grid.className='dungeon-shop-grid';
 for(const item of DUNGEON_ITEMS){
  const card=document.createElement('article');card.className='dungeon-shop-item';
  card.innerHTML=`<div class="dsi-icon">${item.icon}</div><strong>${item.name}</strong><span>${item.description}</span><small>所持 ${inventory[item.id]}個　·　🪙 ${item.price}</small><button type="button">${item.price}コインで購入</button>`;
  const button=card.querySelector('button');button.disabled=busy||coins<item.price;button.addEventListener('click',()=>buy(item));grid.append(card);
 }
 root.append(grid);const status=document.createElement('p');status.className='dungeon-shop-status'+(error?' error':'');status.setAttribute('role','status');status.textContent=message;root.append(status);panel.append(root);
 const balance=balanceOf();if(balance)balance.textContent=`🪙 ${coins} コイン`;
}

async function loadAndRender(message='',error=false){
 const user=auth.currentUser;if(!user||!active||loading)return;loading=true;
 try{const snap=await getDoc(walletRef(user));if(active&&auth.currentUser?.uid===user.uid)render(snap.data()||{},message,error);}catch(e){if(active)render({},e?.message||'持ち物を読み込めませんでした。',true);}finally{loading=false;}
}

async function buy(item){
 const user=auth.currentUser;if(!user||busy||!active)return;
 if(!window.confirm(`${item.price}コインで「${item.name}」を1個購入しますか？\n${item.description}`))return;
 busy=true;await loadAndRender('購入中…');
 try{
  const data=await runTransaction(db,async tx=>{
   const ref=walletRef(user),snap=await tx.get(ref),current=snap.data()||{},coins=Math.max(0,Math.floor(Number(current.coins)||0));
   if(coins<item.price)throw Error('コインが足りません。');
   const petDungeonItems=normalizeDungeonInventory(current.petDungeonItems);petDungeonItems[item.id]+=1;
   const next={...current,coins:coins-item.price,petDungeonItems};
   tx.set(ref,{coins:next.coins,petDungeonItems,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});return next;
  });
  if(active&&auth.currentUser?.uid===user.uid)render(data,`${item.icon} ${item.name}を1個購入しました！`);
 }catch(e){await loadAndRender(e?.message||'購入できませんでした。',true);}finally{busy=false;}
}

function install(){
 const dialog=document.getElementById('petShopDialog'),tabs=tabsOf(),panel=panelOf();if(!dialog||!tabs||!panel)return;
 ensureStyle();
 if(!tabs.dataset.dungeonsListener){tabs.dataset.dungeonsListener='1';tabs.addEventListener('click',event=>{const target=event.target.closest('.pet-shop-tab');if(target&&!target.dataset.dungeonsTab)active=false;});dialog.addEventListener('close',()=>{active=false;});}
 let button=tabs.querySelector('[data-dungeons-tab]');
 if(!button){button=document.createElement('button');button.type='button';button.className='pet-shop-tab';button.dataset.dungeonsTab='1';button.textContent='⚔️ ダンジョンズ';button.addEventListener('click',()=>{active=true;for(const b of tabs.querySelectorAll('.pet-shop-tab'))b.classList.remove('active');button.classList.add('active');panel.innerHTML='<div data-dungeon-shop-panel="1" class="pet-shop-panel-title">⚔️ ダンジョンズ　読み込み中…</div>';void loadAndRender();});tabs.append(button);}
 if(active){for(const b of tabs.querySelectorAll('.pet-shop-tab'))b.classList.toggle('active',b===button);if(!panel.querySelector('[data-dungeon-shop-panel]'))void loadAndRender();}
}

if(typeof document!=='undefined'){const observer=new MutationObserver(install);observer.observe(document.documentElement,{childList:true,subtree:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();}
