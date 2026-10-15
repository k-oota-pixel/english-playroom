import { getApps, getApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import { OPTIONS, hasPet, normalizeAppearance, normalizePetName, validPetName } from './pet-model.js';
import { renderPetSVG, appearanceLabel } from './pet-art.js';

const ITEMS = Object.freeze([
  { id:'red-ribbon', name:'赤いリボン', price:5, slot:'accessories', icon:'🎀' },
  { id:'blue-ribbon', name:'青いリボン', price:5, slot:'accessories', icon:'🎗️' },
  { id:'sunglasses', name:'サングラス', price:8, slot:'accessories', icon:'😎' },
  { id:'crown', name:'王冠', price:15, slot:'accessories', icon:'👑' },
  { id:'wizard-hat', name:'魔法使いの帽子', price:15, slot:'accessories', icon:'🧙' },
  { id:'pirate-hat', name:'海賊帽', price:15, slot:'accessories', icon:'🏴‍☠️' },
  { id:'flower-crown', name:'花かんむり', price:20, slot:'accessories', icon:'🌼' },
  { id:'star-effect', name:'星のエフェクト', price:20, slot:'effects', icon:'⭐' },
  { id:'sparkle-effect', name:'キラキラエフェクト', price:25, slot:'effects', icon:'✨' },
  { id:'forest-bg', name:'森の背景', price:20, slot:'backgrounds', icon:'🌲' },
  { id:'ocean-bg', name:'海の背景', price:25, slot:'backgrounds', icon:'🌊' },
  { id:'space-bg', name:'宇宙の背景', price:30, slot:'backgrounds', icon:'🌌' },
  { id:'castle-bg', name:'お城の背景', price:30, slot:'backgrounds', icon:'🏰' }
]);

const STYLE = `
.pet-wallet{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}
.pet-coins{display:inline-flex;align-items:center;gap:5px;background:#fff8df;border:1px solid #ecd690;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900;color:#805f13;white-space:nowrap}
.pet-shop-open{appearance:none;border:1px solid #d8c27d;background:#fff;color:#765710;border-radius:999px;padding:6px 11px;font:inherit;font-size:11px;font-weight:900;cursor:pointer}
.pet-shop-open:hover{background:#fff9e7}.pet-shop-open:disabled{opacity:.48;cursor:default}
.pet-shop-toast{font-size:10px;color:#846719;min-height:1.3em}
.pet-shop-dialog{width:min(760px,calc(100vw - 24px));max-height:min(82vh,780px);border:0;border-radius:20px;padding:0;background:#fffdf7;color:#193d38;box-shadow:0 18px 70px #10251f44}
.pet-shop-dialog::backdrop{background:#17342f88;backdrop-filter:blur(2px)}
.pet-shop-shell{padding:18px}.pet-shop-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;position:sticky;top:0;background:#fffdf7;padding-bottom:12px;z-index:2}
.pet-shop-kicker{font-size:9px;font-weight:900;letter-spacing:.14em;color:#9a7830}.pet-shop-title{font-size:24px;font-weight:900;margin-top:2px}.pet-shop-balance{font-size:13px;font-weight:900;color:#805f13;margin-top:3px}
.pet-shop-close{appearance:none;border:1px solid #dce5da;background:#fff;border-radius:999px;width:34px;height:34px;font-size:18px;cursor:pointer}
.pet-shop-note{font-size:11px;line-height:1.55;color:#6d756f;background:#f5f3e9;border-radius:12px;padding:9px 11px;margin-bottom:12px}
.pet-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.pet-shop-item{border:1px solid #e3e7dc;background:#fff;border-radius:14px;padding:11px;display:flex;flex-direction:column;min-height:138px}
.pet-shop-icon{font-size:25px}.pet-shop-name{font-size:13px;font-weight:900;margin-top:4px;line-height:1.3}.pet-shop-price{font-size:10px;color:#866817;margin-top:3px}.pet-shop-action{margin-top:auto;appearance:none;border:0;border-radius:10px;padding:8px 9px;background:#236d58;color:white;font:inherit;font-size:11px;font-weight:900;cursor:pointer}.pet-shop-action:hover{filter:brightness(.96)}.pet-shop-action:disabled{opacity:.5;cursor:default}.pet-shop-action.owned{background:#e6f2ea;color:#1f684f;border:1px solid #cde4d5}.pet-shop-action.equipped{background:#f0ead8;color:#755b19;border:1px solid #e1d4ab}
.pet-shop-specials{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;padding-top:14px;border-top:1px solid #ebe7d9}.pet-shop-special{border:1px solid #e6dfca;background:#fffaf0;border-radius:14px;padding:12px}.pet-shop-special strong{display:block;font-size:14px}.pet-shop-special p{font-size:10.5px;color:#746d5c;line-height:1.45;margin:4px 0 9px}.pet-shop-special input,.pet-shop-special select{width:100%;border:1px solid #d7ddcf;border-radius:9px;padding:8px;background:white;font:inherit;font-size:12px;margin-bottom:7px}
.pet-shop-confirm-dialog{width:min(420px,calc(100vw - 28px));border:0;border-radius:20px;padding:0;background:#fffdf7;color:#193d38;box-shadow:0 22px 80px #10251f66}.pet-shop-confirm-dialog::backdrop{background:#17342fa6;backdrop-filter:blur(3px)}.pet-shop-confirm-card{padding:24px 22px 20px;text-align:center}.pet-shop-confirm-icon{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;margin:0 auto 12px;background:#fff3c5;border:1px solid #ecd690;font-size:26px}.pet-shop-confirm-title{font-size:20px;font-weight:900;margin:0 0 9px}.pet-shop-confirm-message{font-size:13px;line-height:1.75;color:#5f6f68;margin:0;white-space:pre-line}.pet-shop-confirm-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:20px}.pet-shop-confirm-cancel,.pet-shop-confirm-ok{appearance:none;border-radius:11px;padding:10px 12px;font:inherit;font-size:12px;font-weight:900;cursor:pointer}.pet-shop-confirm-cancel{border:1px solid #d7dfd8;background:#fff;color:#52645d}.pet-shop-confirm-ok{border:1px solid #236d58;background:#236d58;color:#fff}.pet-shop-confirm-ok:hover{filter:brightness(.96)}.pet-shop-confirm-cancel:hover{background:#f5f8f5}
@media(max-width:620px){.pet-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pet-shop-specials{grid-template-columns:1fr}.pet-shop-shell{padding:14px}.pet-shop-title{font-size:20px}}
`;

let auth=null,db=null,currentUser=null,currentData={},unsubDoc=null,busy=false;
let wallet=null,coinText=null,shopBtn=null,toast=null,dialog=null,grid=null,balance=null,nameInput=null,speciesSelect=null;
let confirmDialog=null,confirmMessage=null,confirmTitle=null,confirmOk=null,confirmResolve=null;
let birthToastShown=false;

const todayKey=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const coinsOf=data=>Math.max(0,Math.floor(Number(data?.coins)||0));
const shopOf=data=>({
  ownedItems:Array.isArray(data?.petShop?.ownedItems)?data.petShop.ownedItems.filter(x=>typeof x==='string'):[],
  equipped:data?.petShop?.equipped&&typeof data.petShop.equipped==='object'?data.petShop.equipped:{}
});
const refFor=user=>doc(db,'users',user.uid,'apps','english-playroom');

function setToast(message='',kind=''){
  if(!toast)return;
  toast.textContent=message;
  toast.dataset.kind=kind;
}
function injectUI(){
  if(document.getElementById('petShopOpen'))return;
  const style=document.createElement('style');style.id='petShopStyles';style.textContent=STYLE;document.head.appendChild(style);
  const info=document.querySelector('.pet-info');
  if(!info)return;
  wallet=document.createElement('div');wallet.className='pet-wallet';wallet.innerHTML=`<span id="petCoinText" class="pet-coins">🪙 —</span><button id="petShopOpen" class="pet-shop-open" type="button" disabled>SHOP</button><span id="petShopToast" class="pet-shop-toast" aria-live="polite"></span>`;
  const bar=info.querySelector('.pet-bar');info.insertBefore(wallet,bar||null);
  coinText=wallet.querySelector('#petCoinText');shopBtn=wallet.querySelector('#petShopOpen');toast=wallet.querySelector('#petShopToast');

  dialog=document.createElement('dialog');dialog.className='pet-shop-dialog';dialog.id='petShopDialog';
  dialog.innerHTML=`<div class="pet-shop-shell"><div class="pet-shop-head"><div><div class="pet-shop-kicker">PET SHOP</div><div class="pet-shop-title">ペットショップ</div><div id="petShopBalance" class="pet-shop-balance">🪙 —</div></div><button id="petShopClose" class="pet-shop-close" type="button" aria-label="閉じる">×</button></div><div class="pet-shop-note">買ったアイテムは何度でも着け替えできます。同じ種類のアイテムは1つだけ装備できます。</div><div id="petShopGrid" class="pet-shop-grid"></div><div class="pet-shop-specials"><div class="pet-shop-special"><strong>✏️ 名前変更　🪙50</strong><p>変更するたびに50コイン使います。1〜12文字で入力してください。</p><input id="petRenameInput" maxlength="12" autocomplete="off" placeholder="新しい名前"><button id="petRenameButton" class="pet-shop-action" type="button">50コインで変更</button></div><div class="pet-shop-special"><strong>🔄 ペットの種類変更　🪙100</strong><p>色・目・模様などはそのままで、種類だけ変更します。</p><select id="petSpeciesSelect"></select><button id="petSpeciesButton" class="pet-shop-action" type="button">100コインで変更</button></div></div></div>`;
  document.body.appendChild(dialog);

  confirmDialog=document.createElement('dialog');confirmDialog.className='pet-shop-confirm-dialog';confirmDialog.id='petShopConfirmDialog';
  confirmDialog.innerHTML=`<div class="pet-shop-confirm-card"><div class="pet-shop-confirm-icon">🪙</div><h2 id="petShopConfirmTitle" class="pet-shop-confirm-title">購入の確認</h2><p id="petShopConfirmMessage" class="pet-shop-confirm-message"></p><div class="pet-shop-confirm-actions"><button id="petShopConfirmCancel" class="pet-shop-confirm-cancel" type="button">キャンセル</button><button id="petShopConfirmOk" class="pet-shop-confirm-ok" type="button">購入する</button></div></div>`;
  document.body.appendChild(confirmDialog);
  confirmTitle=confirmDialog.querySelector('#petShopConfirmTitle');confirmMessage=confirmDialog.querySelector('#petShopConfirmMessage');confirmOk=confirmDialog.querySelector('#petShopConfirmOk');
  confirmDialog.querySelector('#petShopConfirmCancel').addEventListener('click',()=>finishCoinConfirm(false));
  confirmOk.addEventListener('click',()=>finishCoinConfirm(true));
  confirmDialog.addEventListener('cancel',e=>{e.preventDefault();finishCoinConfirm(false);});
  confirmDialog.addEventListener('click',e=>{if(e.target===confirmDialog)finishCoinConfirm(false);});

  grid=dialog.querySelector('#petShopGrid');balance=dialog.querySelector('#petShopBalance');nameInput=dialog.querySelector('#petRenameInput');speciesSelect=dialog.querySelector('#petSpeciesSelect');
  speciesSelect.innerHTML=OPTIONS.species.map(x=>`<option value="${x.id}">${x.label}</option>`).join('');
  dialog.querySelector('#petShopClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  shopBtn.addEventListener('click',()=>{if(currentUser&&hasPet(currentData)){renderShop();dialog.showModal();}});
  dialog.querySelector('#petRenameButton').addEventListener('click',renamePet);
  dialog.querySelector('#petSpeciesButton').addEventListener('click',changeSpecies);
}

function finishCoinConfirm(ok){
  const resolve=confirmResolve;confirmResolve=null;
  if(confirmDialog?.open)confirmDialog.close();
  if(resolve)resolve(!!ok);
}
function requestCoinConfirm({title='購入の確認',message='',confirmLabel='購入する'}={}){
  if(!confirmDialog||confirmResolve)return Promise.resolve(false);
  confirmTitle.textContent=title;confirmMessage.textContent=message;confirmOk.textContent=confirmLabel;
  confirmDialog.showModal();
  return new Promise(resolve=>{confirmResolve=resolve;});
}

function renderPetFromData(data){
  if(!hasPet(data))return;
  const visual=document.getElementById('petVisual');
  if(visual){visual.innerHTML=renderPetSVG(data.petAppearance,data.petShop);visual.setAttribute('aria-label',appearanceLabel(data.petAppearance));}
  const title=document.getElementById('petTitle');if(title&&validPetName(data.petName))title.textContent=normalizePetName(data.petName);
}
function renderWallet(){
  if(!wallet)return;
  const logged=!!currentUser,hatched=hasPet(currentData),coins=coinsOf(currentData);
  coinText.textContent=logged?`🪙 ${coins}`:'🪙 —';
  shopBtn.disabled=!logged||!hatched||busy;
  shopBtn.title=!logged?'Googleログインすると使えます':!hatched?'ペットが誕生すると使えます':'';
  if(balance)balance.textContent=`🪙 ${coins} コイン`;
  renderPetFromData(currentData);
  if(dialog?.open)renderShop();
}
function renderShop(){
  if(!grid)return;
  const coins=coinsOf(currentData),shop=shopOf(currentData);
  balance.textContent=`🪙 ${coins} コイン`;
  const currentSpecies=normalizeAppearance(currentData.petAppearance).species;
  speciesSelect.value=currentSpecies;
  if(document.activeElement!==nameInput)nameInput.value=validPetName(currentData.petName)?normalizePetName(currentData.petName):'';
  grid.innerHTML='';
  for(const item of ITEMS){
    const owned=shop.ownedItems.includes(item.id),equipped=shop.equipped?.[item.slot]===item.id;
    const card=document.createElement('div');card.className='pet-shop-item';
    const action=equipped?'はずす':owned?'装備':`${item.price}コインで購入`;
    card.innerHTML=`<div class="pet-shop-icon">${item.icon}</div><div class="pet-shop-name">${item.name}</div><div class="pet-shop-price">${owned?'購入済み':`🪙 ${item.price}`}</div><button class="pet-shop-action ${owned?'owned':''} ${equipped?'equipped':''}" type="button">${action}</button>`;
    const btn=card.querySelector('button');btn.disabled=busy||(!owned&&coins<item.price);btn.addEventListener('click',()=>handleItem(item));grid.appendChild(card);
  }
  const rename=dialog.querySelector('#petRenameButton'),species=dialog.querySelector('#petSpeciesButton');
  rename.disabled=busy||coins<50;species.disabled=busy||coins<100;
}

async function withBusy(fn){
  if(busy)return;
  busy=true;renderWallet();
  try{await fn();}finally{busy=false;renderWallet();}
}
async function handleItem(item){
  const user=currentUser;if(!user)return;
  const previewShop=shopOf(currentData);
  if(!previewShop.ownedItems.includes(item.id)){
    const ok=await requestCoinConfirm({title:'購入の確認',message:`${item.price}コインを消費して「${item.name}」を購入します。\nよろしいですか？`,confirmLabel:'購入する'});
    if(!ok)return;
  }
  await withBusy(async()=>{
    try{
      let result='';
      await runTransaction(db,async tx=>{
        const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
        if(!hasPet(data))throw Error('ペットが誕生してから使えます。');
        const coins=coinsOf(data),shop=shopOf(data),owned=shop.ownedItems.includes(item.id),equipped=shop.equipped?.[item.slot]===item.id;
        const next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}};
        let nextCoins=coins;
        if(equipped){next.equipped[item.slot]=null;result=`${item.name}をはずしました。`;}
        else if(owned){next.equipped[item.slot]=item.id;result=`${item.name}を装備しました！`;}
        else{
          if(coins<item.price)throw Error('コインが足りません。');
          nextCoins=coins-item.price;next.ownedItems.push(item.id);next.equipped[item.slot]=item.id;result=`${item.name}をゲット！`;
        }
        tx.set(ref,{coins:nextCoins,petShop:next,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
      setToast(result,'ok');
    }catch(e){setToast(e?.message||'ショップの処理に失敗しました。','error');}
  });
}
async function renamePet(){
  const user=currentUser,newName=normalizePetName(nameInput.value);if(!user)return;
  if(!validPetName(newName)){setToast('名前は1〜12文字で入力してください。','error');return;}
  if(normalizePetName(currentData.petName)===newName){setToast('今と同じ名前です。','error');return;}
  const renameOk=await requestCoinConfirm({title:'名前変更の確認',message:`50コインを消費して「${newName}」に名前を変更します。\nよろしいですか？`,confirmLabel:'変更する'});
  if(!renameOk)return;
  await withBusy(async()=>{
    try{
      await runTransaction(db,async tx=>{
        const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
        if(!hasPet(data))throw Error('ペットが誕生してから使えます。');
        if(normalizePetName(data.petName)===newName)throw Error('今と同じ名前です。');
        const coins=coinsOf(data);if(coins<50)throw Error('コインが足りません。');
        tx.set(ref,{coins:coins-50,petName:newName,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
      setToast(`名前を「${newName}」に変更しました！`,'ok');
    }catch(e){setToast(e?.message||'名前を変更できませんでした。','error');}
  });
}
async function changeSpecies(){
  const user=currentUser,nextSpecies=speciesSelect.value;if(!user)return;
  if(!OPTIONS.species.some(x=>x.id===nextSpecies)){setToast('種類を選び直してください。','error');return;}
  const currentSpecies=normalizeAppearance(currentData.petAppearance).species;
  if(currentSpecies===nextSpecies){setToast('今と同じ種類です。','error');return;}
  const label=OPTIONS.species.find(x=>x.id===nextSpecies)?.label||nextSpecies;
  const speciesOk=await requestCoinConfirm({title:'種類変更の確認',message:`100コインを消費して「${label}」に変更します。\nよろしいですか？`,confirmLabel:'変更する'});
  if(!speciesOk)return;
  await withBusy(async()=>{
    try{
      await runTransaction(db,async tx=>{
        const ref=refFor(user),snap=await tx.get(ref),data=snap.exists()?snap.data():{};
        if(!hasPet(data))throw Error('ペットが誕生してから使えます。');
        const appearance=normalizeAppearance(data.petAppearance);
        if(appearance.species===nextSpecies)throw Error('今と同じ種類です。');
        const coins=coinsOf(data);if(coins<100)throw Error('コインが足りません。');
        tx.set(ref,{coins:coins-100,petAppearance:{...appearance,species:nextSpecies},coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});
      });
      setToast(`${label}にチェンジしました！`,'ok');
    }catch(e){setToast(e?.message||'種類を変更できませんでした。','error');}
  });
}

async function grantBirthBonusIfNeeded(user,data){
  if(!hasPet(data)||data.petBirthBonusGranted===true)return;
  try{
    let granted=false;
    await runTransaction(db,async tx=>{
      const ref=refFor(user),snap=await tx.get(ref),fresh=snap.exists()?snap.data():{};
      if(!hasPet(fresh)||fresh.petBirthBonusGranted===true)return;
      const coins=coinsOf(fresh);
      tx.set(ref,{coins:coins+10,petBirthBonusGranted:true,petBirthBonusGrantedAt:serverTimestamp(),coinUpdatedAt:serverTimestamp(),coinSchemaVersion:1},{merge:true});
      granted=true;
    });
    if(granted&&!birthToastShown){birthToastShown=true;setToast('🎉 誕生記念に10コインプレゼント！','ok');}
  }catch(e){console.error('Birth coin bonus failed',e);}
}

function watchUser(user){
  if(unsubDoc){unsubDoc();unsubDoc=null;}
  currentUser=user;currentData={};birthToastShown=false;setToast('');renderWallet();
  if(!user)return;
  unsubDoc=onSnapshot(refFor(user),snap=>{
    currentData=snap.exists()?(snap.data()||{}):{};
    renderWallet();
    grantBirthBonusIfNeeded(user,currentData);
  },err=>{console.error('Pet shop sync failed',err);setToast('ショップの同期に失敗しました。','error');});
}

function boot(){
  injectUI();
  if(!getApps().length){setTimeout(boot,0);return;}
  const app=getApp();auth=getAuth(app);db=getFirestore(app);
  onAuthStateChanged(auth,watchUser);
}

boot();
