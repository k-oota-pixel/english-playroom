import {onAuthStateChanged} from 'https://k-oota-pixel.github.io/english-playroom/auth-session.js?v=2.3.1';
import {auth} from './coin-reward.js?v=2.1.25';
import {hasPet} from './pet-model.js?v=2.1.25';
let petData={};
function install(){
 let b=document.getElementById('petPlayOpen');
 if(!b){const a=document.getElementById('petClean')||document.getElementById('petFeed')||document.getElementById('petShopOpen');if(!a)return;b=document.createElement('button');b.id='petPlayOpen';b.className='pet-shop-open';b.type='button';b.textContent='PLAY';b.onclick=openMenu;a.after(b);}
 b.disabled=!auth.currentUser||!hasPet(petData);
}
document.addEventListener('pet-state-updated',e=>{petData=e.detail||{};install();});
new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
install();
onAuthStateChanged(auth,install);

let menu;
function openMenu(){
 if(!auth.currentUser||!hasPet(petData))return;
 if(!menu){
  menu=document.createElement('dialog');menu.id='petGameMenu';
  menu.innerHTML=`<style>
#petGameMenu{width:min(620px,calc(100vw - 24px));padding:22px;border:1px solid #d8e3db;border-radius:24px;background:#fffdf8;color:#193d38;box-shadow:0 20px 70px #10251f44}#petGameMenu::backdrop{background:#17342f99;backdrop-filter:blur(3px)}#petGameMenu h2{margin:5px 0 8px}#petGameMenu p{font-size:13px;color:#65786d}#petGameMenu .games{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}#petGameMenu a{display:block;text-decoration:none;color:inherit;border:1px solid #d8e3db;border-radius:16px;padding:18px;background:white}#petGameMenu a:focus-visible{outline:3px solid #d8af4e}#petGameMenu a strong{display:block;margin:12px 0 7px;font-size:19px}#petGameMenu a span{font-size:12px;line-height:1.7;color:#637b6c}#petGameMenu .close{float:right;border:1px solid #d8e3db;border-radius:50%;width:34px;height:34px;background:white;cursor:pointer}@media(max-width:480px){#petGameMenu .games{grid-template-columns:1fr}}
</style><button class="close" type="button" aria-label="閉じる">×</button><small>PET PLAY</small><h2>どのゲームで遊ぶ？</h2><p>ペットといっしょに、英語で遊ぼう。</p><div class="games"><a href="./pet-adventure/">🏰<strong>エイゴダンジョンズ</strong><span>魔王の塔・魔物の巣窟で英語バトル</span></a><a href="./pet-catch/">🐾<strong>PET CATCH</strong><span>ペットを左右に動かして正しい答えをキャッチ</span></a></div>`;
  menu.querySelector('.close').onclick=()=>menu.close();
  menu.addEventListener('click',e=>{if(e.target===menu)menu.close();});document.body.append(menu);
 }
 menu.showModal();
}
