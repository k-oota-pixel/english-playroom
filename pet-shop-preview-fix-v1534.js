import {normalizeEquipmentSlots} from './pet-equipment-fit.js?v=2.1.21';
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.1.2";
import {getFirestore,doc,onSnapshot} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet} from './pet-model.js?v=2.1.21';
import {renderPetSVG} from './pet-art.js?v=2.1.21';

const EXTRA_SLOTS=Object.freeze({
  'chef-hat':'head','cowboy-hat':'head','party-hat':'head','detective-hat':'head','bunny-headband':'head','top-hat':'head',
  'heart-glasses':'face','monocle':'face','pixel-glasses':'face','flower-glasses':'face','hero-mask':'face','rosy-cheeks':'face',
  'green-scarf':'neck','gold-medal':'neck','star-pendant':'neck','striped-bowtie':'neck','flower-necklace':'neck','bandana':'head',
  'bubble-effect':'effects','snowflake-effect':'effects','leaf-effect':'effects','lightning-effect':'effects','flower-effect':'effects','candy-effect':'effects',
  'beach-bg':'backgrounds','library-bg':'backgrounds','night-city-bg':'backgrounds','park-bg':'backgrounds','festival-bg':'backgrounds','candy-bg':'backgrounds'
});

const BASE_ITEMS=Object.freeze({
  '赤いリボン':{id:'red-ribbon',slot:'head'},'青いリボン':{id:'blue-ribbon',slot:'head'},'王冠':{id:'crown',slot:'head'},'魔法使いの帽子':{id:'wizard-hat',slot:'head'},'海賊帽':{id:'pirate-hat',slot:'head'},'花かんむり':{id:'flower-crown',slot:'head'},'ニット帽':{id:'knit-hat',slot:'head'},'ベレー帽':{id:'beret',slot:'head'},'キャップ':{id:'baseball-cap',slot:'head'},'天使の輪':{id:'halo',slot:'head'},
  'サングラス':{id:'sunglasses',slot:'face'},'丸メガネ':{id:'round-glasses',slot:'face'},'星メガネ':{id:'star-glasses',slot:'face'},'アイパッチ':{id:'eyepatch',slot:'face'},
  '赤い蝶ネクタイ':{id:'red-bowtie',slot:'neck'},'青いマフラー':{id:'blue-scarf',slot:'neck'},'鈴つき首輪':{id:'bell-collar',slot:'neck'},'パールネックレス':{id:'pearl-necklace',slot:'neck'},
  '星のエフェクト':{id:'star-effect',slot:'effects'},'キラキラエフェクト':{id:'sparkle-effect',slot:'effects'},'ハートエフェクト':{id:'heart-effect',slot:'effects'},'音符エフェクト':{id:'music-effect',slot:'effects'},'紙吹雪':{id:'confetti-effect',slot:'effects'},'虹エフェクト':{id:'rainbow-effect',slot:'effects'},
  '森の背景':{id:'forest-bg',slot:'backgrounds'},'海の背景':{id:'ocean-bg',slot:'backgrounds'},'宇宙の背景':{id:'space-bg',slot:'backgrounds'},'お城の背景':{id:'castle-bg',slot:'backgrounds'},'夕焼けの背景':{id:'sunset-bg',slot:'backgrounds'},'教室の背景':{id:'classroom-bg',slot:'backgrounds'},'カフェの背景':{id:'cafe-bg',slot:'backgrounds'},'ハロウィンの背景':{id:'halloween-bg',slot:'backgrounds'},'雪の背景':{id:'snow-bg',slot:'backgrounds'}
});

let currentData={},unsubscribe=null,selectedBase=null,selectedExtra=null,renderQueued=false;
const shopOf=data=>({
  ownedItems:Array.isArray(data?.petShop?.ownedItems)?data.petShop.ownedItems.filter(x=>typeof x==='string'):[],
  equipped:normalizeEquipmentSlots(data?.petShop?.equipped&&typeof data.petShop.equipped==='object'?data.petShop.equipped:{})
});
const isJuvenile=()=>hasPet(currentData)&&(currentData.petAdult===false||!currentData.petAppearance);

function withPreviewSelection(){
  const shop=shopOf(currentData),selected=selectedExtra?{id:selectedExtra,slot:EXTRA_SLOTS[selectedExtra]}:selectedBase;
  if(!selected?.id||!selected?.slot)return shop;
  const ownedItems=[...shop.ownedItems];if(!ownedItems.includes(selected.id))ownedItems.push(selected.id);
  return {ownedItems,equipped:{...shop.equipped,[selected.slot]:selected.id}};
}

function syncJuvenileTabs(){
  const dialog=document.getElementById('petShopDialog');if(!dialog)return;
  const juvenile=isJuvenile(),tabs=[...dialog.querySelectorAll('.pet-shop-tab')];
  const custom=tabs.find(tab=>tab.textContent.includes('見た目変更'));
  if(custom){custom.hidden=juvenile;if(juvenile&&custom.classList.contains('active')){const fallback=tabs.find(tab=>!tab.textContent.includes('見た目変更'));fallback?.click();return false;}}
  return true;
}

function renderJuvenilePreview(){
  renderQueued=false;
  const dialog=document.getElementById('petShopDialog');if(!dialog||!dialog.open||!hasPet(currentData))return;
  if(!syncJuvenileTabs())return queuePreview();
  if(!isJuvenile())return;
  const preview=document.getElementById('petShopPreview');if(!preview)return;
  preview.innerHTML=renderPetSVG(null,withPreviewSelection());
  const name=document.getElementById('petShopPreviewName');if(name)name.textContent='なぞのいきもの';
}

function queuePreview(){
  if(renderQueued)return;renderQueued=true;
  requestAnimationFrame(()=>requestAnimationFrame(renderJuvenilePreview));
}

function selectFromCard(card){
  if(!card)return;
  if(card.dataset.extraItem==='1'){
    const id=card.dataset.itemId;if(EXTRA_SLOTS[id]){selectedExtra=id;selectedBase=null;}
    return;
  }
  const name=card.querySelector('.pet-shop-name')?.textContent?.trim(),item=BASE_ITEMS[name];
  if(item){selectedBase=item;selectedExtra=null;}
}

function rebuildPreviewForExtra(id){
  if(!EXTRA_SLOTS[id]||!hasPet(currentData))return;
  selectedExtra=id;selectedBase=null;queuePreview();
}

function install(){
  if(!getApps().length){setTimeout(install,80);return;}
  const app=getApp(),auth=getAuth(app),db=getFirestore(app);
  onAuthStateChanged(auth,user=>{
    unsubscribe?.();unsubscribe=null;currentData={};selectedBase=null;selectedExtra=null;
    if(!user)return;
    const ref=doc(db,'users',user.uid,'apps','english-playroom');
    unsubscribe=onSnapshot(ref,snap=>{currentData=snap.exists()?(snap.data()||{}):{};queuePreview();},error=>console.error('Preview fix sync failed',error));
  });
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#petShopOpen')){selectedBase=null;selectedExtra=null;queuePreview();return;}
    if(event.target.closest?.('.pet-shop-tab')){selectedBase=null;selectedExtra=null;queuePreview();return;}
    if(event.target.closest?.('.pet-shop-empty')){selectedBase=null;selectedExtra=null;queuePreview();return;}
    const card=event.target.closest?.('.pet-shop-item');if(!card)return;
    selectFromCard(card);
    if(card.dataset.extraItem==='1')rebuildPreviewForExtra(card.dataset.itemId);else queuePreview();
  },true);
  document.addEventListener('close',event=>{if(event.target?.id==='petShopDialog'){selectedBase=null;selectedExtra=null;}},true);
  window.addEventListener('pet:data',event=>{if(event?.detail){currentData=event.detail;queuePreview();}});
  window.addEventListener('pagehide',()=>unsubscribe?.(),{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
