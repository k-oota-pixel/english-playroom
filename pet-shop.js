import {injectionPatch} from './pet-health-model.js?v=1.8.1';
import { foodArt } from './pet-food-art.js?v=1.8.0';
import { prepareCleaning } from './pet-clean-animation.js?v=1';
import { wasteState, cleanWaste } from './pet-waste-model.js?v=1';
import { playCareReaction } from './pet-care-animation.js?v=1.9.3';
import { FOODS, careState, feedReward, happyDay } from './pet-care-model.js?v=1.7.8';
import { getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.3";
import { getFirestore, doc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { OPTIONS, ACCESSORY_ITEM_SLOTS, hasPet, normalizeAppearance, normalizePetName, validPetName } from './pet-model.js?v=2.1.25';
import { renderPetSVG, renderPetVisual, appearanceLabel } from './pet-art.js?v=2.1.38';

let wasteSaving=false,cleaningWaste=false;
const ITEMS = Object.freeze([
  {id:'red-ribbon',name:'赤いリボン',price:5,slot:'head',icon:'🎀'},
  {id:'blue-ribbon',name:'青いリボン',price:5,slot:'head',icon:'🎗️'},
  {id:'crown',name:'王冠',price:15,slot:'head',icon:'👑'},
  {id:'wizard-hat',name:'魔法使いの帽子',price:15,slot:'head',icon:'🧙'},
  {id:'pirate-hat',name:'海賊帽',price:15,slot:'head',icon:'🏴‍☠️'},
  {id:'flower-crown',name:'花かんむり',price:20,slot:'head',icon:'🌼'},
  {id:'knit-hat',name:'ニット帽',price:12,slot:'head',icon:'🧢'},
  {id:'beret',name:'ベレー帽',price:12,slot:'head',icon:'🎨'},
  {id:'baseball-cap',name:'キャップ',price:10,slot:'head',icon:'🧢'},
  {id:'halo',name:'天使の輪',price:18,slot:'head',icon:'😇'},
  {id:'sunglasses',name:'サングラス',price:8,slot:'face',icon:'😎'},
  {id:'round-glasses',name:'丸メガネ',price:8,slot:'face',icon:'🤓'},
  {id:'star-glasses',name:'星メガネ',price:12,slot:'face',icon:'🤩'},
  {id:'eyepatch',name:'アイパッチ',price:10,slot:'face',icon:'🏴‍☠️'},
  {id:'red-bowtie',name:'赤い蝶ネクタイ',price:8,slot:'neck',icon:'🎀'},
  {id:'blue-scarf',name:'青いマフラー',price:12,slot:'neck',icon:'🧣'},
  {id:'bell-collar',name:'鈴つき首輪',price:10,slot:'neck',icon:'🔔'},
  {id:'pearl-necklace',name:'パールネックレス',price:15,slot:'neck',icon:'📿'},
  {id:'star-effect',name:'星のエフェクト',price:20,slot:'effects',icon:'⭐'},
  {id:'sparkle-effect',name:'キラキラエフェクト',price:25,slot:'effects',icon:'✨'},
  {id:'heart-effect',name:'ハートエフェクト',price:20,slot:'effects',icon:'💗'},
  {id:'music-effect',name:'音符エフェクト',price:20,slot:'effects',icon:'🎵'},
  {id:'confetti-effect',name:'紙吹雪',price:30,slot:'effects',icon:'🎉'},
  {id:'rainbow-effect',name:'虹エフェクト',price:30,slot:'effects',icon:'🌈'},
  {id:'forest-bg',name:'森の背景',price:20,slot:'backgrounds',icon:'🌲'},
  {id:'ocean-bg',name:'海の背景',price:25,slot:'backgrounds',icon:'🌊'},
  {id:'space-bg',name:'宇宙の背景',price:30,slot:'backgrounds',icon:'🌌'},
  {id:'castle-bg',name:'お城の背景',price:30,slot:'backgrounds',icon:'🏰'},
  {id:'sunset-bg',name:'夕焼けの背景',price:25,slot:'backgrounds',icon:'🌇'},
  {id:'classroom-bg',name:'教室の背景',price:25,slot:'backgrounds',icon:'🏫'},
  {id:'cafe-bg',name:'カフェの背景',price:25,slot:'backgrounds',icon:'☕'},
  {id:'halloween-bg',name:'ハロウィンの背景',price:30,slot:'backgrounds',icon:'🎃'},
  {id:'snow-bg',name:'雪の背景',price:25,slot:'backgrounds',icon:'❄️'}
]);

const TABS = Object.freeze([
  {id:'head',label:'あたま',icon:'🎀'},
  {id:'face',label:'かお',icon:'🕶️'},
  {id:'neck',label:'くび',icon:'🧣'},
  {id:'effects',label:'エフェクト',icon:'✨'},
  {id:'backgrounds',label:'背景',icon:'🖼️'},
  {id:'health',label:'おくすり',icon:'💉'},
  {id:'names',label:'名前変更',icon:'✏️'},
  {id:'custom',label:'見た目変更',icon:'🎨'}
]);

const APPEARANCE_GROUPS = Object.freeze([
  {key:'species',label:'動物の種類',icon:'🐾',price:100},
  {key:'bodyColor',label:'からだの色',icon:'🎨',price:30},
  {key:'eyes',label:'目',icon:'👀',price:25},
  {key:'feature',label:'耳・羽・角',icon:'✨',price:30},
  {key:'pattern',label:'模様',icon:'🟡',price:20},
  {key:'baseBackground',label:'ベース背景',icon:'🖼️',price:20}
]);

const STYLE = `
.pet-wallet{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}.pet-coins{display:inline-flex;align-items:center;gap:5px;background:#fff8df;border:1px solid #ecd690;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900;color:#805f13;white-space:nowrap}.pet-shop-open{appearance:none;border:1px solid #d8c27d;background:#fff;color:#765710;border-radius:999px;padding:6px 11px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.pet-shop-open:hover{background:#fff9e7}.pet-shop-open:disabled{opacity:.48;cursor:default}.pet-shop-toast{font-size:10px;color:#846719;min-height:1.3em}
.pet-shop-dialog{width:min(980px,calc(100vw - 20px));height:min(90vh,900px);max-height:min(90vh,900px);overflow:hidden;border:0;border-radius:22px;padding:0;background:#fffdf7;color:#193d38;box-shadow:0 18px 70px #10251f44}.pet-shop-dialog::backdrop{background:#17342f88;backdrop-filter:blur(2px)}.pet-shop-shell{padding:18px;height:100%;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}.pet-shop-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex:0 0 auto;background:#fffdf7;padding-bottom:10px;z-index:5}.pet-shop-kicker{font-size:9px;font-weight:900;letter-spacing:.14em;color:#9a7830}.pet-shop-title{font-size:25px;font-weight:900;margin-top:2px}.pet-shop-balance{font-size:13px;font-weight:900;color:#805f13;margin-top:3px}.pet-shop-close{appearance:none;border:1px solid #dce5da;background:#fff;border-radius:999px;width:36px;height:36px;font-size:18px;cursor:pointer}
.pet-shop-workspace{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px;align-items:stretch;flex:1;min-height:0;overflow:hidden}.pet-shop-preview-card{position:static;align-self:start;border:1px solid #e8dfc8;background:#fff8e7;border-radius:20px;padding:12px;text-align:center}.pet-shop-preview-label{font-size:10px;letter-spacing:.12em;font-weight:900;color:#9a7830}.pet-shop-preview{width:100%;max-width:216px;margin:7px auto 5px}.pet-shop-preview svg{display:block;width:100%;height:auto}.pet-shop-preview-name{font-size:17px;font-weight:900}.pet-shop-preview-hint{font-size:10px;line-height:1.5;color:#746e5e;margin-top:4px}.pet-shop-catalog{min-width:0;min-height:0;display:flex;flex-direction:column;overflow:hidden}.pet-shop-note{flex:0 0 auto;font-size:11px;line-height:1.55;color:#6d756f;background:#f5f3e9;border-radius:12px;padding:9px 11px;margin-bottom:10px}
.pet-shop-tabs{display:flex;flex:0 0 auto;gap:6px;overflow-x:auto;padding:2px 1px 10px;scrollbar-width:thin}.pet-shop-tab{appearance:none;flex:0 0 auto;border:1px solid #ddd8c8;background:#fff;border-radius:999px;padding:8px 11px;font:inherit;font-size:11px;font-weight:900;color:#52645d;cursor:pointer}.pet-shop-tab.active{background:#fff2bd;border-color:#dfbe55;color:#684f13}.pet-shop-panel{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;border:1px solid #ebe7d9;background:#fbfaf4;border-radius:16px;padding:11px}.pet-shop-panel-title{font-size:13px;font-weight:900;margin:0 0 10px;display:flex;align-items:center;gap:7px}.pet-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.pet-shop-item{border:1px solid #e3e7dc;background:#fff;border-radius:14px;padding:10px;display:flex;flex-direction:column;min-height:142px;cursor:pointer;transition:.15s transform,.15s border-color,.15s box-shadow}.pet-shop-item:hover{transform:translateY(-1px)}.pet-shop-item.selected{border-color:#d7ad31;box-shadow:0 0 0 2px #f7e8a8}.pet-shop-icon{font-size:27px}.pet-shop-name{font-size:13px;font-weight:900;margin-top:4px;line-height:1.3}.pet-shop-price{font-size:10px;color:#866817;margin:3px 0 8px}.pet-shop-action{margin-top:auto;appearance:none;border:0;border-radius:10px;padding:8px 9px;background:#236d58;color:white;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.pet-shop-action:hover{filter:brightness(.96)}.pet-shop-action:disabled{opacity:.5;cursor:default}.pet-shop-action.owned{background:#e6f2ea;color:#1f684f;border:1px solid #cde4d5}.pet-shop-action.equipped{background:#f0ead8;color:#755b19;border:1px solid #e1d4ab}.pet-shop-empty{appearance:none;border:1px dashed #cdd5ce;background:#fff;border-radius:12px;padding:10px 12px;font:inherit;font-size:11px;font-weight:900;color:#617069;cursor:pointer;margin-bottom:10px}
.pet-name-product label{display:block;font-size:11px;margin:10px 0 5px}.pet-name-product input{width:100%;box-sizing:border-box;margin-bottom:9px}.pet-name-help{font-size:10px;color:#746e5e;line-height:1.5}.pet-custom-section+.pet-custom-section{margin-top:14px;padding-top:14px;border-top:1px solid #e8e3d4}.pet-custom-heading{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:900;margin-bottom:8px}.pet-custom-price{margin-left:auto;font-size:10px;color:#8a6a19}.pet-custom-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.pet-custom-option{appearance:none;border:1px solid #e0e4dc;background:#fff;border-radius:12px;padding:9px;min-height:72px;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:5px}.pet-custom-option.selected{border-color:#d7ad31;box-shadow:0 0 0 2px #f7e8a8}.pet-custom-option.current{background:#f1f7f2}.pet-custom-option-name{font-size:11px;font-weight:900}.pet-custom-option-sub{font-size:9px;color:#85745a}.pet-color-dot{width:24px;height:24px;border-radius:50%;border:1px solid #aeb9b2;box-shadow:inset 0 0 0 2px #fff}.pet-custom-buy{margin-top:auto;appearance:none;border:0;border-radius:8px;padding:6px 7px;background:#236d58;color:#fff;font:inherit;font-size:9px;font-weight:900;cursor:pointer}.pet-custom-buy:disabled{background:#e8eee9;color:#607068}.pet-shop-rename{margin-top:15px;border-top:1px solid #e8e3d4;padding-top:14px}.pet-shop-rename-row{display:flex;gap:8px}.pet-name-product input,.pet-shop-rename input{flex:1;min-width:0;border:1px solid #d7ddcf;border-radius:9px;padding:9px;background:#fff;font:inherit;font-size:12px}
.pet-shop-confirm-dialog{width:min(420px,calc(100vw - 28px));border:0;border-radius:20px;padding:0;background:#fffdf7;color:#193d38;box-shadow:0 22px 80px #10251f66}.pet-shop-confirm-dialog::backdrop{background:#17342fa6;backdrop-filter:blur(3px)}.pet-shop-confirm-card{padding:24px 22px 20px;text-align:center}.pet-shop-confirm-icon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;background:#fff3c5;border:1px solid #ecd690;font-size:26px}.pet-shop-confirm-title{font-size:20px;font-weight:900;margin:0 0 9px}.pet-shop-confirm-message{font-size:13px;line-height:1.75;color:#5f6f68;margin:0;white-space:pre-line}.pet-shop-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:20px}.pet-shop-confirm-cancel,.pet-shop-confirm-ok{appearance:none;border-radius:11px;padding:10px 12px;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.pet-shop-confirm-cancel{border:1px solid #d7dfd8;background:#fff;color:#52645d}.pet-shop-confirm-ok{border:1px solid #236d58;background:#236d58;color:#fff}
@media(max-width:760px){.pet-shop-dialog{width:calc(100vw - 10px);height:94vh;max-height:94vh}.pet-shop-shell{padding:12px}.pet-shop-workspace{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:9px}.pet-shop-preview-card{position:static;display:grid;grid-template-columns:118px 1fr;align-items:center;text-align:left;padding:8px}.pet-shop-preview{width:112px;margin:0}.pet-shop-preview-label{display:none}.pet-shop-preview-name{font-size:15px}.pet-shop-preview-hint{font-size:9px}.pet-shop-catalog{min-height:0}.pet-shop-note{padding:7px 9px;margin-bottom:7px}.pet-shop-tabs{padding-bottom:7px}.pet-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pet-custom-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pet-shop-head{padding-bottom:7px}.pet-shop-title{font-size:20px}}
`;

let auth=null,db=null,currentUser=null,currentData={},unsubDoc=null,busy=false;
let wallet=null,coinText=null,shopBtn=null,toast=null,dialog=null,balance=null,tabBar=null,panel=null,previewEl=null,previewName=null,nameInput=null;
let confirmDialog=null,confirmMessage=null,confirmTitle=null,confirmOk=null,confirmResolve=null;
let birthToastShown=false,activeTab='head',selectedItemId=null,selectedAppearance=null;

const coinsOf=data=>Math.max(0,Math.floor(Number(data?.coins)||0));
const shopOf=data=>({ownedItems:Array.isArray(data?.petShop?.ownedItems)?data.petShop.ownedItems.filter(x=>typeof x==='string'):[],equipped:data?.petShop?.equipped&&typeof data.petShop.equipped==='object'?data.petShop.equipped:{}});
const refFor=user=>doc(db,'users',user.uid,'apps','english-playroom');
const equippedIdFor=(shop,slot)=>{const direct=shop?.equipped?.[slot];if(typeof direct==='string')return direct;const legacy=shop?.equipped?.accessories;return typeof legacy==='string'&&ACCESSORY_ITEM_SLOTS[legacy]===slot?legacy:null;};
const itemById=id=>ITEMS.find(item=>item.id===id)||null;

function setToast(message='',kind=''){if(!toast)return;toast.textContent=message;toast.dataset.kind=kind;}
function injectUI(){
  if(document.getElementById('petShopOpen'))return;
  const style=document.createElement('style');style.id='petShopStyles';style.textContent=STYLE;document.head.appendChild(style);
  const info=document.querySelector('.pet-info');if(!info)return;
  wallet=document.createElement('div');wallet.className='pet-wallet';wallet.innerHTML=`<span id="petCoinText" class="pet-coins">🪙 —</span><button id="petShopOpen" class="pet-shop-open" type="button" disabled>SHOP</button><span id="petShopToast" class="pet-shop-toast" aria-live="polite"></span>`;
  installCareUI(wallet);const bar=info.querySelector('.pet-bar');info.insertBefore(wallet,bar||null);coinText=wallet.querySelector('#petCoinText');shopBtn=wallet.querySelector('#petShopOpen');toast=wallet.querySelector('#petShopToast');
  dialog=document.createElement('dialog');dialog.className='pet-shop-dialog';dialog.id='petShopDialog';dialog.innerHTML=`<div class="pet-shop-shell"><div class="pet-shop-head"><div><div class="pet-shop-kicker">PET SHOP</div><div class="pet-shop-title">ペットショップ</div><div id="petShopBalance" class="pet-shop-balance">🪙 —</div></div><button id="petShopClose" class="pet-shop-close" type="button" aria-label="閉じる">×</button></div><div class="pet-shop-workspace"><aside class="pet-shop-preview-card"><div><div class="pet-shop-preview-label">LIVE PREVIEW</div><div id="petShopPreview" class="pet-shop-preview"></div></div><div><div id="petShopPreviewName" class="pet-shop-preview-name"></div><div class="pet-shop-preview-hint">商品や見た目をタップすると、購入前に自分のペットで試せます。</div></div></aside><main class="pet-shop-catalog"><div class="pet-shop-note">タブで商品を選び、気になるものをタップして試着できます。別の装着スロットなら同時に装備できます。</div><div id="petShopTabs" class="pet-shop-tabs"></div><div id="petShopPanel" class="pet-shop-panel"></div></main></div></div>`;document.body.appendChild(dialog);
  confirmDialog=document.createElement('dialog');confirmDialog.className='pet-shop-confirm-dialog';confirmDialog.id='petShopConfirmDialog';confirmDialog.innerHTML=`<div class="pet-shop-confirm-card"><div class="pet-shop-confirm-icon">🪙</div><h2 id="petShopConfirmTitle" class="pet-shop-confirm-title">購入の確認</h2><p id="petShopConfirmMessage" class="pet-shop-confirm-message"></p><div class="pet-shop-confirm-actions"><button id="petShopConfirmCancel" class="pet-shop-confirm-cancel" type="button">キャンセル</button><button id="petShopConfirmOk" class="pet-shop-confirm-ok" type="button">購入する</button></div></div>`;document.body.appendChild(confirmDialog);
  balance=dialog.querySelector('#petShopBalance');tabBar=dialog.querySelector('#petShopTabs');panel=dialog.querySelector('#petShopPanel');previewEl=dialog.querySelector('#petShopPreview');previewName=dialog.querySelector('#petShopPreviewName');confirmTitle=confirmDialog.querySelector('#petShopConfirmTitle');confirmMessage=confirmDialog.querySelector('#petShopConfirmMessage');confirmOk=confirmDialog.querySelector('#petShopConfirmOk');
  confirmDialog.querySelector('#petShopConfirmCancel').addEventListener('click',()=>finishCoinConfirm(false));confirmOk.addEventListener('click',()=>finishCoinConfirm(true));confirmDialog.addEventListener('cancel',e=>{e.preventDefault();finishCoinConfirm(false);});confirmDialog.addEventListener('click',e=>{if(e.target===confirmDialog)finishCoinConfirm(false);});
  dialog.querySelector('#petShopClose').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{selectedItemId=null;selectedAppearance=null;});
  shopBtn.addEventListener('click',()=>{if(currentUser&&hasPet(currentData)){activeTab='head';selectedItemId=null;selectedAppearance=null;renderShop();dialog.showModal();}});
}
function finishCoinConfirm(ok){const resolve=confirmResolve;confirmResolve=null;if(confirmDialog?.open)confirmDialog.close();if(resolve)resolve(!!ok);}
function requestCoinConfirm({title='購入の確認',message='',confirmLabel='購入する'}={}){if(!confirmDialog||confirmResolve)return Promise.resolve(false);confirmTitle.textContent=title;confirmMessage.textContent=message;confirmOk.textContent=confirmLabel;confirmDialog.showModal();return new Promise(resolve=>{confirmResolve=resolve;});}
function renderPetFromData(data){if(!hasPet(data))return;const visual=document.getElementById('petVisual');if(visual){renderPetVisual(visual,data);visual.setAttribute('aria-label',appearanceLabel(data.petAppearance));}const title=document.getElementById('petTitle');if(title&&validPetName(data.petName))title.textContent=normalizePetName(data.petName);}
function renderWallet(){if(!wallet)return;renderCare();const logged=!!currentUser,hatched=hasPet(currentData),coins=coinsOf(currentData);coinText.textContent=logged?`🪙 ${coins}`:'🪙 —';shopBtn.disabled=!logged||!hatched||busy;shopBtn.title=!logged?'Googleログインすると使えます':!hatched?'ペットが誕生すると使えます':'';if(balance)balance.textContent=`🪙 ${coins} コイン`;renderPetFromData(currentData);renderWaste();if(dialog?.open)renderShop();}
function previewShop(){const base=shopOf(currentData),item=itemById(selectedItemId);if(!item)return base;const next={ownedItems:[...base.ownedItems],equipped:{...base.equipped}};if(!next.ownedItems.includes(item.id))next.ownedItems.push(item.id);next.equipped[item.slot]=item.id;const legacy=next.equipped.accessories;if(typeof legacy==='string'&&ACCESSORY_ITEM_SLOTS[legacy]===item.slot)next.equipped.accessories=null;return next;}
function previewAppearanceValue(){const base=normalizeAppearance(currentData.petAppearance);return selectedAppearance?{...base,[selectedAppearance.key]:selectedAppearance.id}:base;}
function renderPreview(){if(!previewEl)return;previewEl.innerHTML=renderPetSVG(previewAppearanceValue(),previewShop());previewName.textContent=validPetName(currentData.petName)?normalizePetName(currentData.petName):'MY PET';}
function renderMedicine(){
 const sick=!!currentData.petHealth?.sick;
 panel.innerHTML='<h3 class="pet-shop-panel-title">💉 おくすり</h3><div class="pet-shop-item"><div class="pet-shop-icon">💉</div><div class="pet-shop-name">おくすり注射</div><div class="pet-shop-price">5コイン · 購入するとすぐに回復</div><p style="font-size:12px">'+(sick?'🌡️ 病気です。注射で治療してあげよう。':'いまは元気です。病気になったときに使えます。')+'</p><button id="petInjectionBuy" class="pet-shop-action" '+(!sick||busy||coinsOf(currentData)<5?'disabled':'')+'>5コインで治療する</button></div>';
 panel.querySelector('#petInjectionBuy').onclick=async()=>{
  const user=currentUser;if(!user||busy)return;
  const ok=await requestCoinConfirm({title:'注射で治療',message:'5コインを消費して、病気を治します。',confirmLabel:'治療する'});if(!ok||currentUser?.uid!==user.uid)return;
  await withBusy(async()=>{try{const patch=await runTransaction(db,async tx=>{const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};const patch=injectionPatch(data,happyDay());tx.set(ref,{...patch,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});return patch;});if(currentUser?.uid!==user.uid)return;currentData={...currentData,...patch};setToast('💉 元気になりました！','ok');}catch(e){setToast(e.message,'error');}});
 };
}
function renderTabs(){tabBar.innerHTML='';for(const tab of TABS){const btn=document.createElement('button');btn.type='button';btn.className='pet-shop-tab'+(activeTab===tab.id?' active':'');btn.textContent=`${tab.icon} ${tab.label}`;btn.addEventListener('click',()=>{activeTab=tab.id;selectedItemId=null;selectedAppearance=null;renderShop();});tabBar.appendChild(btn);}}
function renderShop(){if(!panel)return;const scroll=panel.scrollTop;balance.textContent=`🪙 ${coinsOf(currentData)} コイン`;renderPreview();renderTabs();if(activeTab==='health')renderMedicine();else if(activeTab==='names')renderNameProducts();else if(activeTab==='custom')renderCustomPanel();else renderItemPanel(activeTab);requestAnimationFrame(()=>{panel.scrollTop=scroll;});}
function renderItemPanel(slot){const tab=TABS.find(x=>x.id===slot),coins=coinsOf(currentData),shop=shopOf(currentData),items=ITEMS.filter(item=>item.slot===slot);panel.innerHTML='';const title=document.createElement('div');title.className='pet-shop-panel-title';title.textContent=`${tab?.icon||'🛍️'} ${tab?.label||''}`;panel.appendChild(title);const equipped=equippedIdFor(shop,slot);if(equipped){const none=document.createElement('button');none.className='pet-shop-empty';none.type='button';none.textContent='装備をはずす';none.addEventListener('click',()=>handleUnequip(slot,equipped));panel.appendChild(none);}const grid=document.createElement('div');grid.className='pet-shop-grid';for(const item of items){const owned=shop.ownedItems.includes(item.id),isEquipped=equipped===item.id;const card=document.createElement('div');card.className='pet-shop-item'+(selectedItemId===item.id?' selected':'');card.dataset.itemId=item.id;card.dataset.itemSlot=item.slot;const action=isEquipped?'はずす':owned?'装備':`${item.price}コインで購入`;card.innerHTML=`<div class="pet-shop-icon">${item.icon}</div><div class="pet-shop-name">${item.name}</div><div class="pet-shop-price">${owned?'購入済み':`🪙 ${item.price}`}</div><button class="pet-shop-action ${owned?'owned':''} ${isEquipped?'equipped':''}" type="button">${action}</button>`;card.addEventListener('click',()=>{selectedItemId=item.id;selectedAppearance=null;renderShop();});const btn=card.querySelector('button');btn.disabled=busy||(!owned&&coins<item.price);btn.addEventListener('click',e=>{e.stopPropagation();selectedItemId=item.id;renderPreview();handleItem(item);});grid.appendChild(card);}panel.appendChild(grid);}
function renderCustomPanel(){const current=normalizeAppearance(currentData.petAppearance),coins=coinsOf(currentData);panel.innerHTML='<div class="pet-shop-panel-title">🎨 見た目変更</div>';for(const group of APPEARANCE_GROUPS){const section=document.createElement('section');section.className='pet-custom-section';const heading=document.createElement('div');heading.className='pet-custom-heading';heading.innerHTML=`<span>${group.icon}</span><span>${group.label}</span><span class="pet-custom-price">変更 🪙${group.price}</span>`;section.appendChild(heading);const grid=document.createElement('div');grid.className='pet-custom-grid';for(const option of OPTIONS[group.key]){const isCurrent=current[group.key]===option.id,isSelected=selectedAppearance?.key===group.key&&selectedAppearance?.id===option.id;const card=document.createElement('button');card.type='button';card.className=`pet-custom-option${isCurrent?' current':''}${isSelected?' selected':''}`;const swatch=option.color?`<span class="pet-color-dot" style="background:${option.color}"></span>`:`<span style="font-size:20px">${group.icon}</span>`;card.innerHTML=`${swatch}<span class="pet-custom-option-name">${option.label}</span><span class="pet-custom-option-sub">${isCurrent?'現在の設定':`🪙 ${group.price}`}</span><span class="pet-custom-buy">${isCurrent?'現在':`${group.price}コインで変更`}</span>`;const buy=card.querySelector('.pet-custom-buy');if(isCurrent){buy.style.pointerEvents='none';}card.addEventListener('click',()=>{selectedItemId=null;selectedAppearance={key:group.key,id:option.id};renderShop();});buy.addEventListener('click',e=>{e.stopPropagation();if(!isCurrent){selectedItemId=null;selectedAppearance={key:group.key,id:option.id};renderPreview();changeAppearance(group.key,option.id,group.price,option.label);}});if(!isCurrent&&coins<group.price){buy.style.opacity='.5';buy.style.pointerEvents='none';}grid.appendChild(card);}section.appendChild(grid);panel.appendChild(section);}}
async function withBusy(fn){if(busy)return;busy=true;renderWallet();try{await fn();}finally{busy=false;renderWallet();}}
async function handleUnequip(slot,id){const item=itemById(id);if(!item)return;selectedItemId=null;await withBusy(async()=>{try{await runTransaction(db,async tx=>{const ref=refFor(currentUser),snap=await tx.get(ref),data=snap.exists()?snap.data():{};if(!hasPet(data))throw Error('ペットが誕生してから使えます。');const shop=shopOf(data),next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}};if(next.equipped[slot]===id)next.equipped[slot]=null;if(next.equipped.accessories===id)next.equipped.accessories=null;tx.set(ref,{petShop:next,petUpdatedAt:serverTimestamp()},{merge:true});});setToast(`${item.name}をはずしました。`,'ok');}catch(e){setToast(e?.message||'装備を変更できませんでした。','error');}});}
async function handleItem(item){const user=currentUser;if(!user)return;const preview=shopOf(currentData);if(!preview.ownedItems.includes(item.id)){const ok=await requestCoinConfirm({title:'購入の確認',message:`${item.price}コインを消費して「${item.name}」を購入します。\n購入後すぐに装備します。`,confirmLabel:'購入する'});if(!ok)return;}await withBusy(async()=>{try{let result='';await runTransaction(db,async tx=>{const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};if(!hasPet(data))throw Error('ペットが誕生してから使えます。');const coins=coinsOf(data),shop=shopOf(data),owned=shop.ownedItems.includes(item.id),equipped=equippedIdFor(shop,item.slot)===item.id,next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}};let nextCoins=coins;if(equipped){if(next.equipped[item.slot]===item.id)next.equipped[item.slot]=null;if(next.equipped.accessories===item.id)next.equipped.accessories=null;result=`${item.name}をはずしました。`;}else if(owned){next.equipped[item.slot]=item.id;result=`${item.name}を装備しました！`;}else{if(coins<item.price)throw Error('コインが足りません。');nextCoins=coins-item.price;next.ownedItems.push(item.id);next.equipped[item.slot]=item.id;result=`${item.name}をゲット！`;}const legacy=next.equipped.accessories;if(typeof legacy==='string'&&ACCESSORY_ITEM_SLOTS[legacy]===item.slot)next.equipped.accessories=null;tx.set(ref,{coins:nextCoins,petShop:next,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});});selectedItemId=null;setToast(result,'ok');}catch(e){setToast(e?.message||'ショップの処理に失敗しました。','error');}});}
async function changeAppearance(key,id,price,label){const user=currentUser;if(!user)return;const choices=OPTIONS[key];if(!choices?.some(x=>x.id===id))return;const current=normalizeAppearance(currentData.petAppearance);if(current[key]===id)return;const ok=await requestCoinConfirm({title:'見た目変更の確認',message:`${price}コインを消費して「${label}」に変更します。\nいつでもまた変更できます。`,confirmLabel:'変更する'});if(!ok)return;await withBusy(async()=>{try{await runTransaction(db,async tx=>{const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};if(!hasPet(data))throw Error('ペットが誕生してから使えます。');const appearance=normalizeAppearance(data.petAppearance);if(appearance[key]===id)throw Error('今と同じ設定です。');const coins=coinsOf(data);if(coins<price)throw Error('コインが足りません。');tx.set(ref,{coins:coins-price,petAppearance:{...appearance,[key]:id},coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});});selectedAppearance=null;setToast(`${label}に変更しました！`,'ok');}catch(e){setToast(e?.message||'見た目を変更できませんでした。','error');}});}
const renameDrafts={pet:null,user:null};
function renderNameProducts(){
  panel.innerHTML='<div class="pet-shop-panel-title">✏️ 名前変更</div><div class="pet-shop-note">名前を変更するたびに30コインを使います。</div>';
  const grid=document.createElement('div');grid.className='pet-shop-grid';panel.append(grid);
  for(const [kind,label,icon,limit,field] of [['pet','ペットの名前変更','🐾',12,'petName'],['user','ユーザーの名前変更','👤',20,'nickname']]){
    const card=document.createElement('section');card.className='pet-shop-item pet-name-product';card.dataset.nameKind=kind;
    card.innerHTML=`<div class="pet-shop-icon">${icon}</div><div class="pet-shop-name">${label}</div><div class="pet-shop-price">🪙 30</div><label for="shopName-${kind}">新しい名前（1〜${limit}文字）</label><input id="shopName-${kind}" autocomplete="off" maxlength="${limit*2}" placeholder="新しい名前"><button class="pet-shop-action" type="button">30コインで変更</button><p class="pet-name-help"></p>`;
    const input=card.querySelector('input');input.value=renameDrafts[kind]??currentData[field]??'';input.disabled=busy;
    input.addEventListener('input',()=>{renameDrafts[kind]=input.value;});
    card.querySelector('.pet-name-help').textContent=kind==='user'?'ほかのユーザーと同じ名前は使えません。':'ペットに表示される名前を変更します。';
    const button=card.querySelector('button');button.disabled=busy||coinsOf(currentData)<30;button.addEventListener('click',()=>changeShopName(kind,input.value));grid.append(card);
  }
}
async function changeShopName(kind,value){
  const user=currentUser;if(!user||busy)return;
  const name=kind==='user'?value.normalize('NFKC').trim().replace(/\s+/g,' '):value.trim(),limit=kind==='pet'?12:20,field=kind==='pet'?'petName':'nickname';
  if(!name||[...name].length>limit||/[\u0000-\u001f\u007f]/.test(value)){setToast(`名前は1〜${limit}文字で入力してください。`,'error');return;}
  if(name===currentData[field]){setToast('今と同じ名前です。','error');return;}
  const ok=await requestCoinConfirm({title:kind==='pet'?'ペットの名前変更':'ユーザーの名前変更',message:`30コインを消費して「${name}」に変更します。`,confirmLabel:'30コインで変更'});if(!ok||currentUser?.uid!==user.uid)return;
  await withBusy(async()=>{try{
    const token=await user.getIdToken();const response=await fetch('https://task-quest.onrender.com/api/shop/rename',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({kind,name})});
    const result=await response.json();if(!response.ok)throw Error(result.error||'名前を変更できませんでした。');if(currentUser?.uid!==user.uid)return;
    currentData={...currentData,[field]:result.name,coins:result.coins};renameDrafts[kind]=null;renderWallet();
    if(kind==='user')window.dispatchEvent(new CustomEvent('english-playroom-nickname-changed',{detail:{uid:user.uid,nickname:result.name}}));
    setToast(`名前を「${result.name}」に変更しました！`,'ok');
  }catch(e){if(currentUser?.uid===user.uid)setToast(e?.message||'名前を変更できませんでした。','error');}});
}
async function grantBirthBonusIfNeeded(user,data){if(!hasPet(data)||data.petBirthBonusGranted===true)return;try{let granted=false;await runTransaction(db,async tx=>{const ref=refFor(user),snap=await tx.get(ref),fresh=snap.exists()?snap.data():{};if(!hasPet(fresh)||fresh.petBirthBonusGranted===true)return;const coins=coinsOf(fresh);tx.set(ref,{coins:coins+10,petBirthBonusGranted:true,petBirthBonusGrantedAt:serverTimestamp(),coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});granted=true;});if(granted&&!birthToastShown){birthToastShown=true;setToast('🎉 誕生記念に10コインプレゼント！','ok');}}catch(e){console.error('Birth coin bonus failed',e);}}
function watchUser(user){if(unsubDoc){unsubDoc();unsubDoc=null;}currentUser=user;currentData={};renameDrafts.pet=null;renameDrafts.user=null;birthToastShown=false;setToast('');renderWallet();if(!user)return;unsubDoc=onSnapshot(refFor(user),snap=>{currentData=snap.exists()?(snap.data()||{}):{};renderWallet();grantBirthBonusIfNeeded(user,currentData);updateWaste();},err=>{console.error('Pet shop sync failed',err);setToast('ショップの同期に失敗しました。','error');});}
function boot(){injectUI();if(!getApps().length){setTimeout(boot,0);return;}const app=getApp();auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,watchUser);}boot();


function installCareUI(wallet) {
  const shop=wallet.querySelector('#petShopOpen');
  shop.insertAdjacentHTML('afterend','<button id="petFeed" class="pet-shop-open" type="button" disabled>FEED</button><button id="petClean" class="pet-shop-open" type="button" disabled>CLEAN</button><div id="petHappy" class="pet-happy" hidden><div class="pet-happy-heading"><span>おなかの満腹度</span><span id="petHappyValue" aria-live="polite"></span></div><div id="petHungerMessage" class="pet-hunger-message" aria-live="polite"></div><div id="petHappyGauge" class="pet-happy-track" role="progressbar" aria-label="おなかの満腹度" aria-valuemin="0" aria-valuemax="10"><span id="petHappyFill"></span></div><div class="pet-happy-scale"><span>😟 HUNGRY</span><span>FULL 😋</span></div><small>エサをあげると満腹度が上がります。毎日0時におなかがすいた状態に戻ります。</small></div>');
  const dialog=document.createElement('dialog');dialog.id='petFeedDialog';dialog.className='pet-shop-confirm-dialog';
  dialog.innerHTML=`<div class="pet-shop-confirm-card pet-feed-card"><button class="pet-shop-close" type="button" aria-label="閉じる">×</button><h2 id="petFeedTitle">“I’m hungry…”</h2><p id="petFeedPrompt" class="pet-feed-message">おなかすいた…ごはんをあげてね！</p><p id="petFeedBalance"></p>${FOODS.map(f=>`<button type="button" class="pet-food-choice" data-food="${f.id}"><span class="pet-food-picture">${foodArt(f.id)}</span><span class="pet-food-copy"><strong>${f.name}</strong><small>満腹度 +${f.price}</small></span><span class="pet-food-price">🪙 ${f.price}<small>コイン</small></span></button>`).join('')}<p id="petFeedStatus" role="status"></p></div>`;
  document.body.append(dialog);
  dialog.querySelector('.pet-shop-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();const id=event.target.closest('[data-food]')?.dataset.food;if(id)performCare(id);});
  wallet.querySelector('#petFeed').onclick=()=>{renderCare();dialog.showModal();};
  wallet.querySelector('#petClean').onclick=()=>updateWaste(true);
  const visual=document.getElementById('petVisual');
  if(visual)new MutationObserver(()=>renderWaste()).observe(visual,{childList:true});
  let displayedDay=happyDay();
  function refreshHappyDay(){const today=happyDay();if(today!==displayedDay){displayedDay=today;renderCare();}}
  setInterval(refreshHappyDay,1000);
  window.addEventListener('focus',refreshHappyDay);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHappyDay();});
  setInterval(()=>updateWaste(),60000);
  window.addEventListener('focus',()=>updateWaste());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateWaste();});
  visual?.addEventListener('click',event=>{if(!currentUser||!hasPet(currentData))return;event.preventDefault();event.stopImmediatePropagation();tapPet();},true);
  visual?.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&currentUser&&hasPet(currentData)){event.preventDefault();tapPet();}});
  const style=document.createElement('style');style.textContent='#petVisual{position:relative} .pet-care-particles{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;font-size:26px;z-index:10;white-space:nowrap} #petVisual[role=button]{cursor:pointer}';document.head.append(style);
}
function renderCare() {
  const enabled=!!currentUser&&hasPet(currentData)&&!busy;
  const state=careState(currentData);
  const mood=state.happy<=2
    ?{key:'hungry',english:'I’m hungry…',japanese:'おなかすいた…',label:'おなかぺこぺこ'}
    :state.happy<=5
      ?{key:'still-hungry',english:'I’m still hungry…',japanese:'まだおなかすいた…',label:'まだ空腹'}
      :state.happy<=8
        ?{key:'filling',english:'I’m feeling better!',japanese:'おなかが満たされてきた！',label:'少し満たされた'}
        :{key:'full',english:'I’m full!',japanese:'おなかいっぱい！',label:'満腹'};
  const label=document.getElementById('petHappy');
  for(const id of ['petFeed']){const button=document.getElementById(id);if(button){button.disabled=!enabled||state.happy>=10;button.classList.toggle('pet-feed-needed',enabled&&state.happy<=5);}}
  if(label){
    label.hidden=!(currentUser&&hasPet(currentData));
    label.dataset.hungerState=mood.key;
    document.getElementById('petHappyValue').textContent=`${state.happy}/10 · ${mood.label}`;
    const speech=document.getElementById('petHungerMessage');speech.textContent=`“${mood.english}”\n${mood.japanese}`;
    const gauge=document.getElementById('petHappyGauge');gauge.setAttribute('aria-valuenow',String(state.happy));gauge.setAttribute('aria-valuetext',`${state.happy}/10 ${mood.english} ${mood.japanese}`);
    document.getElementById('petHappyFill').style.width=`${state.happy*10}%`;
  }
  const visual=document.getElementById('petVisual');if(visual){visual.dataset.petCareEnabled=currentUser&&hasPet(currentData)?'1':'0';visual.setAttribute('role',enabled?'button':'img');visual.tabIndex=enabled?0:-1;}
  const balance=document.getElementById('petFeedBalance');if(balance)balance.textContent=`🪙 ${coinsOf(currentData)} コイン`;
  const title=document.getElementById('petFeedTitle');if(title)title.textContent=state.happy>=10?'“I’m full!”':'“I’m hungry…”';
  const prompt=document.getElementById('petFeedPrompt');if(prompt)prompt.textContent=state.happy>=10?'おなかいっぱい！今日はもう十分だよ。':state.happy<=5?'おなかすいた…ごはんをあげてね！':'もう少しでおなかいっぱい！';
  document.querySelectorAll('[data-food]').forEach(button=>{button.disabled=!enabled||state.happy>=10||coinsOf(currentData)<FOODS.find(f=>f.id===button.dataset.food).price;});
  if(!currentUser)document.getElementById('petFeedDialog')?.close();
}
async function performCare(foodId) {
  const user=currentUser;if(!user||busy||!hasPet(currentData))return;
  await withBusy(async()=>{
    try {
      const result=await runTransaction(db,async tx=>{
        const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
        if(!hasPet(data))throw Error('ペットが誕生してから使えます。');
        const today=happyDay(),before=careState(data,today).happy;
        const reward=feedReward(data,foodId,today);
        const patch={petCare:reward.petCare,petUpdatedAt:serverTimestamp()};
        if(data.petHealth)patch.petHealth={...data.petHealth,zeroDays:0};
        if(foodId){patch.coins=reward.coins;patch.coinUpdatedAt=serverTimestamp();}
        tx.set(ref,patch,{merge:true});
        return {reward,reachedMax:before<10&&reward.petCare.happy===10,data:{...data,...patch}};
      });
      if(currentUser?.uid!==user.uid)return;
      currentData=result.data;
      const message=(result.reachedMax?'おなかいっぱい！':'おなかが満たされたよ！')+' 満腹度 +'+FOODS.find(f=>f.id===foodId).price;
      setToast(message,'ok');document.getElementById('petFeedStatus').textContent=message;
      if(foodId)document.getElementById('petFeedDialog').close();
      // Render before animating: wallet refresh replaces the SVG.
      renderWallet();
      requestAnimationFrame(()=>careAnimation(result.reachedMax?'max':FOODS.find(f=>f.id===foodId).reaction,FOODS.find(f=>f.id===foodId)));
    } catch(error) {setToast(error.message||'保存できませんでした。もう一度お試しください。','error');document.getElementById('petFeedStatus').textContent=error.message;}
  });
}
function tapPet(){
  if(!currentUser||!hasPet(currentData))return;
  careAnimation('music');
  setToast('');
}
function careAnimation(kind,food) {
  const visual=document.getElementById('petVisual');if(visual)playCareReaction(visual,kind,food);
}

function renderWaste(){
 const visual=document.getElementById('petVisual'),button=document.getElementById('petClean');
 const active=!!currentUser&&hasPet(currentData);
 const count=active?wasteState(currentData).count:0;
 if(button){button.disabled=!active||busy||wasteSaving||count===0;button.title=count?`うんこ ${count}個を掃除する（無料）`:'きれいです';}
 if(!visual)return;
 let layer=visual.querySelector('.pet-waste-layer');
 if(!count){layer?.remove();return;}
 if(!layer){
  layer=document.createElement('span');layer.className='pet-waste-layer';layer.setAttribute('aria-hidden','true');
  layer.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:8';
  visual.append(layer);
 }
 layer.style.visibility=cleaningWaste?'hidden':'';
 if(layer.dataset.count===String(count))return;
 layer.dataset.count=String(count);
 layer.innerHTML=Array.from({length:count},(_,i)=>`<span style="position:absolute;left:${[8,76,25,61][i]}%;bottom:${[8,10,2,3][i]}%;font-size:clamp(18px,6vw,26px);line-height:1;filter:drop-shadow(0 2px 1px #0002)">💩</span>`).join('');
}
async function updateWaste(clean=false){
 const user=currentUser;
 if(!user||!hasPet(currentData)||wasteSaving||busy)return;
 const next=wasteState(currentData),saved=currentData.petWaste;
 if(!clean&&saved?.day===next.day&&saved?.count===next.count)return;
 const cleaning=clean?prepareCleaning(document.getElementById('petVisual')):null;
 wasteSaving=true;cleaningWaste=clean;renderWaste();
 try{
  const result=await runTransaction(db,async tx=>{
   const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
   if(!hasPet(data))return null;
   const petWaste=clean?cleanWaste(data):wasteState(data);
   tx.set(ref,{petWaste,...(clean&&data.petHealth?{petHealth:{...data.petHealth,wasteSeen:0}}:{}),petUpdatedAt:serverTimestamp()},{merge:true});
   return petWaste;
  });
  if(currentUser?.uid!==user.uid||!result)return;
  currentData={...currentData,petWaste:result};
  if(clean){await cleaning.play();if(currentUser?.uid===user.uid)setToast('✨ きれいになりました！','ok');}
 }catch(error){
  if(currentUser?.uid===user.uid)setToast('掃除の状態を保存できませんでした。もう一度お試しください。','error');
 }finally{cleaning?.stop();wasteSaving=false;cleaningWaste=false;renderWaste();}
}
