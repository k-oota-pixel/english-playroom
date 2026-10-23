import {equipmentTransform} from './pet-equipment-fit.js?v=1.8.15';
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import {getFirestore,doc,onSnapshot,runTransaction,serverTimestamp} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";
import {hasPet} from './pet-model.js';

const EXTRA_ITEMS=Object.freeze([
  {id:'chef-hat',name:'コック帽',price:12,slot:'head',icon:'👨‍🍳'},
  {id:'cowboy-hat',name:'カウボーイハット',price:15,slot:'head',icon:'🤠'},
  {id:'party-hat',name:'パーティーハット',price:10,slot:'head',icon:'🥳'},
  {id:'detective-hat',name:'探偵帽',price:14,slot:'head',icon:'🕵️'},
  {id:'bunny-headband',name:'うさみみカチューシャ',price:12,slot:'head',icon:'🐰'},
  {id:'top-hat',name:'シルクハット',price:18,slot:'head',icon:'🎩'},

  {id:'heart-glasses',name:'ハートメガネ',price:12,slot:'face',icon:'💗'},
  {id:'monocle',name:'モノクル',price:10,slot:'face',icon:'🧐'},
  {id:'pixel-glasses',name:'ピクセルメガネ',price:15,slot:'face',icon:'🕶️'},
  {id:'flower-glasses',name:'お花メガネ',price:14,slot:'face',icon:'<svg class="pet-flower-glasses-icon" viewBox="0 0 76 34" aria-hidden="true"><g fill="none" stroke="#a84e6c" stroke-width="2.2" stroke-linecap="round"><path d="M28 17 Q38 12 48 17"/><path d="M9 16 Q5 15 3 12 M67 16 Q71 15 73 12"/></g><g fill="#f49ab9" stroke="#a84e6c" stroke-width="1.4"><g transform="translate(22 17)"><circle cy="-8" r="5.2"/><circle cx="7.6" cy="-2.5" r="5.2"/><circle cx="4.7" cy="6.5" r="5.2"/><circle cx="-4.7" cy="6.5" r="5.2"/><circle cx="-7.6" cy="-2.5" r="5.2"/></g><g transform="translate(54 17)"><circle cy="-8" r="5.2"/><circle cx="7.6" cy="-2.5" r="5.2"/><circle cx="4.7" cy="6.5" r="5.2"/><circle cx="-4.7" cy="6.5" r="5.2"/><circle cx="-7.6" cy="-2.5" r="5.2"/></g></g><g fill="#ffd0df" fill-opacity=".78" stroke="#a84e6c" stroke-width="1.7"><circle cx="22" cy="17" r="6.2"/><circle cx="54" cy="17" r="6.2"/></g></svg>'},
  {id:'hero-mask',name:'ヒーローマスク',price:16,slot:'face',icon:'🦸'},
  {id:'rosy-cheeks',name:'ほっぺシール',price:8,slot:'face',icon:'😊'},

  {id:'green-scarf',name:'緑のマフラー',price:12,slot:'neck',icon:'🧣'},
  {id:'gold-medal',name:'金メダル',price:18,slot:'neck',icon:'🥇'},
  {id:'star-pendant',name:'星のペンダント',price:15,slot:'neck',icon:'⭐'},
  {id:'striped-bowtie',name:'しましま蝶ネクタイ',price:10,slot:'neck',icon:'🎀'},
  {id:'flower-necklace',name:'お花のネックレス',price:16,slot:'neck',icon:'🌺'},
  {id:'bandana',name:'バンダナ',price:12,slot:'neck',icon:'🔻'},

  {id:'bubble-effect',name:'シャボン玉エフェクト',price:20,slot:'effects',icon:'🫧'},
  {id:'snowflake-effect',name:'雪の結晶エフェクト',price:22,slot:'effects',icon:'❄️'},
  {id:'leaf-effect',name:'木の葉エフェクト',price:20,slot:'effects',icon:'🍃'},
  {id:'lightning-effect',name:'いなずまエフェクト',price:25,slot:'effects',icon:'⚡'},
  {id:'flower-effect',name:'お花エフェクト',price:22,slot:'effects',icon:'🌸'},
  {id:'candy-effect',name:'キャンディエフェクト',price:24,slot:'effects',icon:'🍬'},

  {id:'beach-bg',name:'ビーチの背景',price:25,slot:'backgrounds',icon:'🏖️'},
  {id:'library-bg',name:'図書館の背景',price:25,slot:'backgrounds',icon:'📚'},
  {id:'night-city-bg',name:'夜の街の背景',price:30,slot:'backgrounds',icon:'🌃'},
  {id:'park-bg',name:'公園の背景',price:20,slot:'backgrounds',icon:'🌳'},
  {id:'festival-bg',name:'お祭りの背景',price:30,slot:'backgrounds',icon:'🎆'},
  {id:'candy-bg',name:'お菓子の国の背景',price:30,slot:'backgrounds',icon:'🍭'}
]);

const ITEM_MAP=Object.freeze(Object.fromEntries(EXTRA_ITEMS.map(item=>[item.id,item])));
const SVG_NS='http://www.w3.org/2000/svg';
const ACCESSORY_LAYERS=Object.freeze({
  'chef-hat':'<g><path d="M78 72 Q72 48 94 43 Q101 26 120 38 Q140 25 148 45 Q171 47 162 73Z" fill="#fffdf6" stroke="#556961" stroke-width="4"/><rect x="82" y="68" width="78" height="18" rx="8" fill="#fff8e9" stroke="#556961" stroke-width="4"/></g>',
  'cowboy-hat':'<g><path d="M74 67 Q83 38 120 38 Q157 38 166 67 L153 78 H87Z" fill="#b98249" stroke="#5b4938" stroke-width="4"/><path d="M55 75 Q120 91 185 75 Q174 92 120 94 Q66 92 55 75Z" fill="#c99457" stroke="#5b4938" stroke-width="4"/><path d="M88 65 H152" stroke="#754c2f" stroke-width="5"/></g>',
  'party-hat':'<g><path d="M120 29 L153 87 H87Z" fill="#7eb7e6" stroke="#475f68" stroke-width="4"/><path d="M102 58 L140 70 M111 43 L132 50" stroke="#fff0a6" stroke-width="6" stroke-linecap="round"/><circle cx="120" cy="27" r="8" fill="#f19ab5"/></g>',
  'detective-hat':'<g><path d="M75 68 Q82 42 116 43 Q146 42 161 60 L153 76 H87Z" fill="#8f8b78" stroke="#48564e" stroke-width="4"/><path d="M58 76 Q116 91 181 76 Q166 91 121 92 Q76 91 58 76Z" fill="#aaa38c" stroke="#48564e" stroke-width="4"/><path d="M107 43 V75 M143 49 L137 76" stroke="#6f6a5b" stroke-width="4"/></g>',
  'bunny-headband':'<g><path d="M86 77 Q88 40 100 20 Q112 38 108 76Z" fill="#fff6f7" stroke="#596a63" stroke-width="4"/><path d="M132 76 Q128 38 140 20 Q153 42 151 78Z" fill="#fff6f7" stroke="#596a63" stroke-width="4"/><path d="M95 62 Q120 51 146 63" fill="none" stroke="#e28ca7" stroke-width="7" stroke-linecap="round"/></g>',
  'top-hat':'<g><rect x="84" y="37" width="72" height="48" rx="6" fill="#3d4650" stroke="#263039" stroke-width="4"/><path d="M61 84 H179 Q170 98 120 98 Q70 98 61 84Z" fill="#49545f" stroke="#263039" stroke-width="4"/><path d="M87 72 H153" stroke="#a45c79" stroke-width="8"/></g>',
  'heart-glasses':'<g stroke="#c85578" stroke-width="4" fill="#f5a2bb" opacity=".95"><path d="M75 104 C75 91 92 87 99 99 C106 87 123 91 123 104 C123 119 99 130 99 130 C99 130 75 119 75 104Z"/><path d="M117 104 C117 91 134 87 141 99 C148 87 165 91 165 104 C165 119 141 130 141 130 C141 130 117 119 117 104Z"/></g><path d="M121 103 H119" stroke="#c85578" stroke-width="5"/>',
  'monocle':'<g fill="none" stroke="#6c5840" stroke-width="4"><circle cx="146" cy="112" r="18"/><path d="M160 125 Q169 146 160 167"/></g><circle cx="146" cy="112" r="12" fill="#d9eef7" opacity=".22"/>',
  'pixel-glasses':'<g fill="#263642" stroke="#263642" stroke-width="2"><path d="M75 101 H108 V123 H82 V116 H75Z"/><path d="M132 101 H165 V116 H158 V123 H132Z"/><rect x="108" y="106" width="24" height="6"/></g><g fill="#7bc9e8" opacity=".4"><rect x="82" y="105" width="20" height="11"/><rect x="138" y="105" width="20" height="11"/></g>',
  'flower-glasses':'<g><g fill="none" stroke="#a84e6c" stroke-width="3.5" stroke-linecap="round"><path d="M105 111 Q120 104 135 111"/><path d="M78 109 Q69 107 64 101 M162 109 Q171 107 176 101"/></g><g fill="#f49ab9" stroke="#a84e6c" stroke-width="2.5"><circle cx="94" cy="96" r="9"/><circle cx="108" cy="106" r="9"/><circle cx="103" cy="123" r="9"/><circle cx="85" cy="123" r="9"/><circle cx="80" cy="106" r="9"/><circle cx="146" cy="96" r="9"/><circle cx="160" cy="106" r="9"/><circle cx="155" cy="123" r="9"/><circle cx="137" cy="123" r="9"/><circle cx="132" cy="106" r="9"/></g><g fill="#ffd0df" fill-opacity=".62" stroke="#a84e6c" stroke-width="3"><circle cx="94" cy="111" r="11"/><circle cx="146" cy="111" r="11"/></g><g fill="#fff" opacity=".42"><circle cx="90" cy="107" r="3"/><circle cx="142" cy="107" r="3"/></g></g>',
  'hero-mask':'<g><path d="M73 98 Q94 88 120 98 Q146 88 167 98 L158 125 Q140 132 120 120 Q100 132 82 125Z" fill="#6c78c8" stroke="#3f496f" stroke-width="4"/><ellipse cx="95" cy="111" rx="10" ry="7" fill="#fff"/><ellipse cx="145" cy="111" rx="10" ry="7" fill="#fff"/></g>',
  'rosy-cheeks':'<g fill="#f29ab1" opacity=".7"><ellipse cx="76" cy="139" rx="15" ry="8"/><ellipse cx="164" cy="139" rx="15" ry="8"/></g>',
  'green-scarf':'<g><path d="M72 168 Q120 184 168 168 L158 190 Q120 203 82 190Z" fill="#68a77a" stroke="#456956" stroke-width="4"/><path d="M143 184 Q163 190 166 214 L147 217 Q147 199 137 192Z" fill="#76b789" stroke="#456956" stroke-width="4"/></g>',
  'gold-medal':'<g><path d="M103 163 L117 188 L137 163" fill="none" stroke="#4f79a7" stroke-width="8"/><circle cx="120" cy="191" r="16" fill="#f2c94c" stroke="#9a7620" stroke-width="4"/><path d="M120 181 l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="#fff0a0" stroke="none"/></g>',
  'star-pendant':'<g><path d="M92 164 Q120 181 148 164" fill="none" stroke="#b98942" stroke-width="4"/><path d="M120 176 l5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2Z" fill="#f4c84f" stroke="#9c7627" stroke-width="3"/></g>',
  'striped-bowtie':'<g stroke="#6e4e5c" stroke-width="3" stroke-linejoin="round"><path d="M112 177 Q90 163 82 180 Q88 198 112 187Z" fill="#f08aa5"/><path d="M128 177 Q150 163 158 180 Q152 198 128 187Z" fill="#fff2a8"/><circle cx="120" cy="182" r="9" fill="#dd6f8b"/></g><path d="M92 174 L104 190 M139 172 L149 190" stroke="#fff" stroke-width="4"/>',
  'flower-necklace':'<g><path d="M82 174 Q120 200 158 174" fill="none" stroke="#729b70" stroke-width="3"/><circle cx="88" cy="181" r="8" fill="#ef9bb4" stroke="#fff" stroke-width="2"/><circle cx="104" cy="187" r="8" fill="#f5c75a" stroke="#fff" stroke-width="2"/><circle cx="120" cy="190" r="8" fill="#ef9bb4" stroke="#fff" stroke-width="2"/><circle cx="136" cy="187" r="8" fill="#f5c75a" stroke="#fff" stroke-width="2"/><circle cx="152" cy="181" r="8" fill="#ef9bb4" stroke="#fff" stroke-width="2"/></g>',
  'bandana':'<g><path d="M76 167 Q120 185 164 167 L153 188 Q120 198 87 188Z" fill="#d96b5f" stroke="#7f453e" stroke-width="4"/><path d="M144 184 L169 207 L146 211Z" fill="#d96b5f" stroke="#7f453e" stroke-width="4"/><circle cx="96" cy="178" r="3" fill="#fff2d2"/><circle cx="119" cy="184" r="3" fill="#fff2d2"/><circle cx="142" cy="178" r="3" fill="#fff2d2"/></g>'
});

const EFFECT_LAYERS=Object.freeze({
  'bubble-effect':'<g class="pet-extra-effect" fill="none" stroke="#b8ecf6" stroke-width="3" opacity=".9"><circle cx="34" cy="76" r="12"/><circle cx="196" cy="92" r="17"/><circle cx="49" cy="156" r="9"/><circle cx="189" cy="169" r="11"/><circle cx="211" cy="48" r="7"/></g>',
  'snowflake-effect':'<g class="pet-extra-effect" fill="#fff" stroke="#b7dcea" stroke-width="2"><text x="28" y="72" font-size="27">❄</text><text x="188" y="80" font-size="24">❄</text><text x="35" y="176" font-size="22">❄</text><text x="184" y="175" font-size="28">❄</text></g>',
  'leaf-effect':'<g class="pet-extra-effect" fill="#78ad6f"><ellipse cx="35" cy="81" rx="8" ry="14" transform="rotate(-35 35 81)"/><ellipse cx="198" cy="74" rx="8" ry="14" transform="rotate(35 198 74)"/><ellipse cx="49" cy="168" rx="7" ry="12" transform="rotate(20 49 168)"/><ellipse cx="187" cy="169" rx="7" ry="12" transform="rotate(-20 187 169)"/></g>',
  'lightning-effect':'<g class="pet-extra-effect" fill="#ffd85e" stroke="#d6a51c" stroke-width="2"><path d="M35 55 L57 55 L46 78 L63 78 L35 113 L43 86 L27 86Z"/><path d="M191 115 L210 115 L201 134 L216 134 L190 165 L197 142 L183 142Z"/></g>',
  'flower-effect':'<g class="pet-extra-effect"><g fill="#f2a0b7"><circle cx="37" cy="66" r="8"/><circle cx="201" cy="80" r="8"/><circle cx="43" cy="172" r="7"/><circle cx="190" cy="169" r="7"/></g><g fill="#f7d45d"><circle cx="37" cy="66" r="3"/><circle cx="201" cy="80" r="3"/><circle cx="43" cy="172" r="3"/><circle cx="190" cy="169" r="3"/></g></g>',
  'candy-effect':'<g class="pet-extra-effect" stroke="#fff" stroke-width="2"><g transform="translate(36 70) rotate(-20)"><rect x="-10" y="-6" width="20" height="12" rx="5" fill="#f18aa5"/><path d="M-10 0 l-9-7 v14Z M10 0 l9-7 v14Z" fill="#8ec6e8"/></g><g transform="translate(198 90) rotate(25)"><rect x="-10" y="-6" width="20" height="12" rx="5" fill="#f5c85f"/><path d="M-10 0 l-9-7 v14Z M10 0 l9-7 v14Z" fill="#b99bdd"/></g><g transform="translate(46 170) rotate(20)"><rect x="-9" y="-5" width="18" height="10" rx="5" fill="#8fd2b1"/><path d="M-9 0 l-8-6 v12Z M9 0 l8-6 v12Z" fill="#f2a0b7"/></g></g>'
});

const BACKGROUND_LAYERS=Object.freeze({
  'beach-bg':'<g><rect width="240" height="240" rx="32" fill="#dff4ff"/><circle cx="191" cy="49" r="25" fill="#ffd66f"/><path d="M0 126 Q35 113 70 126 T140 126 T210 126 T240 126 V240 H0Z" fill="#77c8e6"/><path d="M0 161 Q52 150 104 162 T206 160 T240 160 V240 H0Z" fill="#f1d29b"/><path d="M24 112 Q36 82 51 67" stroke="#8a6a45" stroke-width="8"/><path d="M50 66 q-27 0-34 14 q22 3 34-8 q18-10 31 1 q-8-17-31-7Z" fill="#65a76e"/></g>',
  'library-bg':'<g><rect width="240" height="240" rx="32" fill="#efe6d8"/><g fill="#9a6f4b"><rect x="8" y="25" width="56" height="160" rx="5"/><rect x="176" y="25" width="56" height="160" rx="5"/></g><g fill="#d46f68"><rect x="15" y="39" width="10" height="35"/><rect x="184" y="39" width="10" height="35"/></g><g fill="#6f91bf"><rect x="28" y="39" width="11" height="35"/><rect x="198" y="39" width="11" height="35"/></g><g fill="#7aaa72"><rect x="42" y="39" width="12" height="35"/><rect x="213" y="39" width="10" height="35"/></g><path d="M0 197 H240 V240 H0Z" fill="#d7b891"/></g>',
  'night-city-bg':'<g><rect width="240" height="240" rx="32" fill="#232c52"/><circle cx="187" cy="48" r="22" fill="#ffe89a"/><g fill="#35406f"><rect x="0" y="92" width="48" height="148"/><rect x="44" y="70" width="48" height="170"/><rect x="170" y="82" width="70" height="158"/></g><g fill="#ffd56a"><rect x="13" y="108" width="8" height="12"/><rect x="30" y="130" width="8" height="12"/><rect x="58" y="89" width="8" height="12"/><rect x="77" y="118" width="8" height="12"/><rect x="186" y="101" width="9" height="12"/><rect x="210" y="130" width="9" height="12"/></g><path d="M0 199 H240 V240 H0Z" fill="#22283f"/></g>',
  'park-bg':'<g><rect width="240" height="240" rx="32" fill="#e5f3df"/><circle cx="193" cy="43" r="21" fill="#ffd86f"/><path d="M0 166 Q45 145 88 164 T174 163 T240 161 V240 H0Z" fill="#9fca7d"/><g fill="#6ea76a"><circle cx="30" cy="105" r="34"/><circle cx="210" cy="112" r="32"/></g><g fill="#8b6849"><rect x="24" y="120" width="11" height="55" rx="5"/><rect x="205" y="126" width="11" height="51" rx="5"/></g><path d="M88 182 H152" stroke="#c79a66" stroke-width="12" stroke-linecap="round"/></g>',
  'festival-bg':'<g><rect width="240" height="240" rx="32" fill="#28335c"/><g fill="none" stroke-linecap="round"><path d="M42 52 l-17-14 M42 52 l17-14 M42 52 v-23 M42 52 l-20 5 M42 52 l20 5" stroke="#ffcf63" stroke-width="5"/><path d="M190 61 l-15-13 M190 61 l15-13 M190 61 v-20 M190 61 l-18 6 M190 61 l18 6" stroke="#f39ab5" stroke-width="5"/></g><path d="M0 174 H240 V240 H0Z" fill="#e0b07d"/><path d="M0 174 H240" stroke="#f3d49d" stroke-width="4"/><g fill="#e96d68"><circle cx="28" cy="128" r="8"/><circle cx="212" cy="126" r="8"/></g></g>',
  'candy-bg':'<g><rect width="240" height="240" rx="32" fill="#fdeaf2"/><path d="M0 176 Q52 153 103 177 T198 174 T240 175 V240 H0Z" fill="#cfe9b8"/><g stroke="#fff" stroke-width="4"><circle cx="37" cy="77" r="20" fill="#f294b0"/><path d="M37 57 V97 M17 77 H57"/><circle cx="202" cy="82" r="18" fill="#8dc9ea"/><path d="M202 64 V100 M184 82 H220"/></g><g fill="#b9865c"><rect x="34" y="96" width="6" height="44"/><rect x="199" y="100" width="6" height="40"/></g><g fill="#f7c75f"><circle cx="63" cy="139" r="8"/><circle cx="178" cy="143" r="9"/></g></g>'
});

const STYLE=`
.pet-shop-item[data-extra-item="1"]{background:linear-gradient(180deg,#fff,#fffdf6)}
.pet-shop-item[data-extra-item="1"] .pet-shop-name::after{content:" NEW";font-size:8px;letter-spacing:.08em;color:#a97918}
.pet-shop-item[data-item-id="flower-glasses"] .pet-shop-icon{height:30px;display:flex;align-items:center}
.pet-shop-item[data-item-id="flower-glasses"] .pet-flower-glasses-icon{display:block;width:60px;height:30px;overflow:visible}
.pet-extra-particle{transform-box:fill-box;transform-origin:center;animation:petExtraFall var(--duration) linear var(--delay) infinite both}
@keyframes petExtraFall{0%{opacity:0;transform:translate(0,-65px) rotate(-8deg)}12%{opacity:.9}75%{opacity:.9}100%{opacity:0;transform:translate(var(--drift),100px) rotate(20deg)}}
@media(prefers-reduced-motion:reduce){.pet-extra-particle{animation:none;opacity:.9}}
`;

let auth=null,db=null,currentUser=null,currentData={},unsubscribe=null,previewSelection=null,augmentQueued=false;
const coinsOf=data=>Math.max(0,Math.floor(Number(data?.coins)||0));
const shopOf=data=>({ownedItems:Array.isArray(data?.petShop?.ownedItems)?data.petShop.ownedItems.filter(x=>typeof x==='string'):[],equipped:data?.petShop?.equipped&&typeof data.petShop.equipped==='object'?data.petShop.equipped:{}});
const refFor=user=>doc(db,'users',user.uid,'apps','english-playroom');
const isOwned=(shop,id)=>shop.ownedItems.includes(id);
const equippedFor=(shop,slot)=>typeof shop.equipped?.[slot]==='string'?shop.equipped[slot]:null;
const isExtra=id=>!!ITEM_MAP[id];

function parseLayer(markup){const wrapper=document.createElementNS(SVG_NS,'svg');wrapper.innerHTML=markup;return wrapper.firstElementChild;}
const appliedLayers=new WeakMap();
function applyExpansionLayers(root,data,preview=false){
  const svg=root?.querySelector?.('svg');if(!svg)return;
  const signature=JSON.stringify([shopOf(data),preview?previewSelection:null]);
  if(appliedLayers.get(svg)===signature)return;
  appliedLayers.set(svg,signature);
  svg.querySelectorAll('[data-pet-extra-layer]').forEach(el=>el.remove());
  const shop=shopOf(data),equipped={...shop.equipped};if(preview&&previewSelection)equipped[previewSelection.slot]=previewSelection.id;
  const active=id=>typeof id==='string'&&((preview&&previewSelection?.id===id)||isOwned(shop,id));
  for(const slot of ['head','face','neck','effects','backgrounds']){
    const id=equipped[slot];
    if(active(id)&&ITEM_MAP[id])svg.querySelectorAll(`[data-pet-shop-slot="${slot}"]`).forEach(el=>el.remove());
  }
  const bgId=equipped.backgrounds;
  if(active(bgId)&&BACKGROUND_LAYERS[bgId]){const node=parseLayer(BACKGROUND_LAYERS[bgId]);node.setAttribute('data-pet-extra-layer','backgrounds');node.setAttribute('data-pet-extra-item',bgId);const anchor=svg.querySelector('.pet-shadow,.pet-jump-layer');if(anchor)svg.insertBefore(node,anchor);else svg.append(node);}
  const character=svg.querySelector('.pet-character');
  if(character){for(const slot of ['head','face','neck']){const id=equipped[slot];if(active(id)&&ACCESSORY_LAYERS[id]){const node=parseLayer('<g transform="'+equipmentTransform(slot,svg.dataset.petSpecies)+'">'+ACCESSORY_LAYERS[id]+'</g>');node.setAttribute('data-pet-extra-layer',slot);node.setAttribute('data-pet-extra-item',id);character.append(node);}}}
  const effectId=equipped.effects;if(active(effectId)&&EFFECT_LAYERS[effectId]){
    // Base and expansion previews share the same equipment slot.
    svg.querySelectorAll('.pet-motif-effect,.pet-confetti-effect,.pet-rainbow-effect').forEach(el=>el.remove());
    const node=parseLayer(EFFECT_LAYERS[effectId]);
    // Keep each shape's original SVG transform and animate a separate wrapper.
    const particles=effectId==='flower-effect'?[0,1,2,3].map(i=>{
      const group=document.createElementNS(SVG_NS,'g');
      for(const source of node.children){const shape=source.children[i].cloneNode(true);shape.setAttribute('fill',source.getAttribute('fill'));group.append(shape);}return group;
    }):[...node.children];
    particles.forEach((shape,i)=>{
      const motion=document.createElementNS(SVG_NS,'g');motion.classList.add('pet-extra-particle');
      motion.style.cssText=`--duration:${3.5+i*.37}s;--delay:${-i*.91}s;--drift:${i%2?10:-10}px`;
      motion.append(shape);if(i===0)node.replaceChildren();node.append(motion);
    });
    node.setAttribute('data-pet-extra-layer','effects');node.setAttribute('data-pet-extra-item',effectId);svg.append(node);
  }
}
function renderAllLayers(){applyExpansionLayers(document.getElementById('petVisual'),currentData,false);applyExpansionLayers(document.getElementById('petShopPreview'),currentData,true);}
function activeSlot(){const active=document.querySelector('#petShopDialog .pet-shop-tab.active');const text=active?.textContent||'';if(text.includes('あたま'))return 'head';if(text.includes('かお'))return 'face';if(text.includes('くび'))return 'neck';if(text.includes('エフェクト'))return 'effects';if(text.includes('背景'))return 'backgrounds';return null;}
function queueAugment(){if(augmentQueued)return;augmentQueued=true;queueMicrotask(()=>{augmentQueued=false;augmentShop();renderAllLayers();});}
function makeCard(item,shop){
  const equipped=equippedFor(shop,item.slot)===item.id,owned=isOwned(shop,item.id),coins=coinsOf(currentData);const card=document.createElement('div');card.className='pet-shop-item';card.dataset.extraItem='1';card.dataset.itemId=item.id;
  const action=equipped?'はずす':owned?'装備':`${item.price}コインで購入`;card.innerHTML=`<div class="pet-shop-icon">${item.icon}</div><div class="pet-shop-name">${item.name}</div><div class="pet-shop-price">${owned?'購入済み':`🪙 ${item.price}`}</div><button class="pet-shop-action ${owned?'owned':''} ${equipped?'equipped':''}" type="button">${action}</button>`;
  card.addEventListener('click',()=>{previewSelection={slot:item.slot,id:item.id};renderAllLayers();document.querySelectorAll('.pet-shop-item.selected').forEach(el=>el.classList.remove('selected'));card.classList.add('selected');});
  const button=card.querySelector('button');button.disabled=!owned&&coins<item.price;button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();handleItem(item);});return card;
}
function augmentShop(){
  const panel=document.getElementById('petShopPanel');if(!panel)return;const slot=activeSlot();if(!slot)return;const grid=panel.querySelector('.pet-shop-grid');if(!grid)return;const shop=shopOf(currentData);
  for(const item of EXTRA_ITEMS.filter(item=>item.slot===slot))if(!grid.querySelector(`[data-item-id="${item.id}"]`))grid.append(makeCard(item,shop));
  const equipped=equippedFor(shop,slot);if(isExtra(equipped)){const old=panel.querySelector('.pet-shop-empty');if(old&&!old.dataset.extraUnequip){const button=old.cloneNode(true);button.dataset.extraUnequip='1';old.replaceWith(button);button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();unequipExtra(slot,equipped);},true);}}
}
async function handleItem(item){
  if(!currentUser||!hasPet(currentData))return;const snapshot=shopOf(currentData),owned=isOwned(snapshot,item.id);if(!owned&&!window.confirm(`${item.price}コインを使って「${item.name}」を購入しますか？\n購入後すぐに装備します。`))return;
  try{await runTransaction(db,async tx=>{const ref=refFor(currentUser),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{};if(!hasPet(data))throw Error('ペットが誕生してから使えます。');const shop=shopOf(data),next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}},coins=coinsOf(data),has=next.ownedItems.includes(item.id),isEquipped=next.equipped[item.slot]===item.id;let nextCoins=coins;if(isEquipped)next.equipped[item.slot]=null;else if(has)next.equipped[item.slot]=item.id;else{if(coins<item.price)throw Error('コインが足りません。');nextCoins=coins-item.price;next.ownedItems.push(item.id);next.equipped[item.slot]=item.id;}tx.set(ref,{coins:nextCoins,petShop:next,coinUpdatedAt:serverTimestamp(),petUpdatedAt:serverTimestamp()},{merge:true});});previewSelection=null;}catch(error){window.alert(error?.message||'ショップの処理に失敗しました。');}
}
async function unequipExtra(slot,id){
  if(!currentUser)return;try{await runTransaction(db,async tx=>{const ref=refFor(currentUser),snap=await tx.get(ref),data=snap.exists()?(snap.data()||{}):{},shop=shopOf(data),next={ownedItems:[...shop.ownedItems],equipped:{...shop.equipped}};if(next.equipped[slot]===id)next.equipped[slot]=null;tx.set(ref,{petShop:next,petUpdatedAt:serverTimestamp()},{merge:true});});previewSelection=null;}catch(error){window.alert(error?.message||'装備をはずせませんでした。');}
}
function watchUser(user){if(unsubscribe){unsubscribe();unsubscribe=null;}currentUser=user;currentData={};previewSelection=null;if(!user){queueAugment();return;}unsubscribe=onSnapshot(refFor(user),snap=>{currentData=snap.exists()?(snap.data()||{}):{};queueAugment();},error=>console.error('Shop expansion sync failed',error));}
function mutationNeedsRefresh(mutations){return mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(node=>{if(node.nodeType!==1)return false;const el=node;return !el.matches?.('[data-pet-extra-layer],[data-extra-item="1"]');}));}
function boot(){
  if(!document.getElementById('petShopExpansionStyles')){const style=document.createElement('style');style.id='petShopExpansionStyles';style.textContent=STYLE;document.head.append(style);}
  if(!getApps().length){setTimeout(boot,80);return;}const app=getApp();auth=getAuth(app);db=getFirestore(app);onAuthStateChanged(auth,watchUser);
  const observer=new MutationObserver(mutations=>{if(mutationNeedsRefresh(mutations))queueAugment();});observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',event=>{const card=event.target.closest?.('.pet-shop-item');if(card&&!card.dataset.extraItem){previewSelection=card.dataset.itemSlot?{slot:card.dataset.itemSlot,id:card.dataset.itemId}:null;setTimeout(queueAugment,0);}if(event.target.closest?.('.pet-shop-tab')){previewSelection=null;setTimeout(queueAugment,0);}if(event.target.closest?.('.pet-shop-empty')){previewSelection=null;setTimeout(queueAugment,0);}if(event.target.closest?.('#petShopOpen')){previewSelection=null;setTimeout(queueAugment,50);}},true);
  document.addEventListener('pet-state-updated',queueAugment);window.addEventListener('pagehide',()=>{observer.disconnect();unsubscribe?.();},{once:true});queueAugment();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
