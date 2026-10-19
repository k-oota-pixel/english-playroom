import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {getFirestore,doc,onSnapshot} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet} from './pet-model.js';
import {renderPetSVG} from './pet-art.js?v=1.5.27';

const EXTRA_SLOTS=Object.freeze({
  'chef-hat':'head','cowboy-hat':'head','party-hat':'head','detective-hat':'head','bunny-headband':'head','top-hat':'head',
  'heart-glasses':'face','monocle':'face','pixel-glasses':'face','flower-glasses':'face','hero-mask':'face','rosy-cheeks':'face',
  'green-scarf':'neck','gold-medal':'neck','star-pendant':'neck','striped-bowtie':'neck','flower-necklace':'neck','bandana':'neck',
  'bubble-effect':'effects','snowflake-effect':'effects','leaf-effect':'effects','lightning-effect':'effects','flower-effect':'effects','candy-effect':'effects',
  'beach-bg':'backgrounds','library-bg':'backgrounds','night-city-bg':'backgrounds','park-bg':'backgrounds','festival-bg':'backgrounds','candy-bg':'backgrounds'
});

let currentData={},unsubscribe=null;
const shopOf=data=>({
  ownedItems:Array.isArray(data?.petShop?.ownedItems)?data.petShop.ownedItems.filter(x=>typeof x==='string'):[],
  equipped:data?.petShop?.equipped&&typeof data.petShop.equipped==='object'?data.petShop.equipped:{}
});

function rebuildPreviewForExtra(id){
  const slot=EXTRA_SLOTS[id],preview=document.getElementById('petShopPreview');
  if(!slot||!preview||!hasPet(currentData))return;
  const shop=shopOf(currentData),ownedItems=[...shop.ownedItems];
  if(!ownedItems.includes(id))ownedItems.push(id);
  const previewShop={ownedItems,equipped:{...shop.equipped,[slot]:id}};
  // Rebuild from the saved pet state first. The base renderer sees the extra ID as
  // the sole item in this slot, so any previous built-in preview in that slot vanishes.
  // pet-shop-expansion then adds the matching extra SVG layer on top.
  preview.innerHTML=renderPetSVG(currentData.petAppearance,previewShop);
}

function install(){
  if(!getApps().length){setTimeout(install,80);return;}
  const app=getApp(),auth=getAuth(app),db=getFirestore(app);
  onAuthStateChanged(auth,user=>{
    unsubscribe?.();unsubscribe=null;currentData={};
    if(!user)return;
    const ref=doc(db,'users',user.uid,'apps','english-playroom');
    unsubscribe=onSnapshot(ref,snap=>{currentData=snap.exists()?(snap.data()||{}):{};},error=>console.error('Preview fix sync failed',error));
  });
  document.addEventListener('click',event=>{
    const card=event.target.closest?.('.pet-shop-item[data-extra-item="1"]');
    if(!card)return;
    const id=card.dataset.itemId;
    if(EXTRA_SLOTS[id])rebuildPreviewForExtra(id);
  },true);
  window.addEventListener('pagehide',()=>unsubscribe?.(),{once:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
