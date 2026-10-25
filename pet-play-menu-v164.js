import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {auth} from './coin-reward.js';
import {hasPet} from './pet-model.js';
let petData={};
function install(){
 let b=document.getElementById('petPlayOpen');
 if(!b){const a=document.getElementById('petClean')||document.getElementById('petFeed')||document.getElementById('petShopOpen');if(!a)return;b=document.createElement('button');b.id='petPlayOpen';b.className='pet-shop-open';b.type='button';b.textContent='PLAY';b.onclick=()=>{location.href='./pet-adventure/';};a.after(b);}
 b.disabled=!auth.currentUser||!hasPet(petData);
}
document.addEventListener('pet-state-updated',e=>{petData=e.detail||{};install();});
new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
install();
onAuthStateChanged(auth,install);
