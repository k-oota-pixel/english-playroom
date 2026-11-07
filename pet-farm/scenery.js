import {MAP} from './model.js?v=9';
const W=MAP.w*MAP.tile,H=MAP.h*MAP.tile,T=MAP.tile;
function rng(seed){return ()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;}
function flower(x,y,t=1,color='#fff6e0'){
return `<g transform="translate(${x} ${y}) scale(${t})"><path d="M0 5V18" stroke="#47743d" stroke-width="3"/><path d="M0 10Q-11 0-9 9Q-4 14 0 12M0 13Q10 0 12 7Q9 13 0 15" fill="#619946"/>
<g fill="${color}" stroke="#d0ac90" stroke-width=".5"><circle cy="-5" r="5"/><circle cx="6" cy="-1" r="5"/><circle cx="4" cy="6" r="5"/><circle cx="-4" cy="6" r="5"/><circle cx="-7" cy="-1" r="5"/></g><circle r="4.1" fill="#edbd50"/></g>`;
}
function foliage(x,y,s=1,fruit=false){
 return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="11" cy="45" rx="52" ry="17" fill="#244e2d" opacity=".3"/>
 <path d="M0 13L0 52M-9 24L-28 8M6 22L23 6" stroke="#755032" stroke-width="17" stroke-linecap="round"/><path d="M0 13L0 52M-9 24L-28 8M6 22L23 6" stroke="#b98453" stroke-width="7" stroke-linecap="round"/>
 <g stroke="#235437" stroke-width="3"><circle cx="-37" cy="-25" r="32" fill="#437b42"/><circle cx="-7" cy="-48" r="37" fill="#4d984b"/><circle cx="30" cy="-31" r="35" fill="#397b42"/><circle cx="6" cy="-10" r="40" fill="#5a9c4d"/></g>
 <g fill="#81b65d" opacity=".88"><ellipse cx="-23" cy="-44" rx="18" ry="8" transform="rotate(-35 -23 -44)"/><ellipse cx="19" cy="-49" rx="17" ry="8" transform="rotate(35 19 -49)"/><ellipse cx="-4" cy="-22" rx="22" ry="10"/></g>
 ${fruit?'<g fill="#e46f47" stroke="#8f4c36" stroke-width="1.2"><circle cx="-21" cy="-10" r="8"/><circle cx="22" cy="-20" r="8"/><circle cx="4" cy="12" r="8"/></g>':''}</g>`;
}
function home(){
 return `<g transform="translate(70 83)"><ellipse cx="168" cy="257" rx="150" ry="25" fill="#22472b" opacity=".25"/>
 <rect x="44" y="122" width="246" height="126" rx="7" fill="#e8c99e" stroke="#835c42" stroke-width="9"/>
 <g stroke="#d8ac7c" stroke-width="3"><path d="M47 146H286M47 175H286M47 203H286"/></g>
 <path d="M13 119L163 13L318 118L291 134L163 50L35 134Z" fill="#a4533c" stroke="#743a2e" stroke-width="8"/>
 <path d="M34 118L165 35L293 119" fill="none" stroke="#e67e4d" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>
 <g stroke="#9c553d" stroke-width="3"><path d="M72 94L268 94M98 75L240 75M133 52L204 52"/></g>
 <path d="M150 145Q167 117 184 145V248H150Z" fill="#925d42" stroke="#7b4937" stroke-width="7"/>
 <circle cx="175" cy="206" r="4" fill="#f6c46c"/>
 ${[62,212].map(x=>`<g><rect x="${x}" y="154" width="59" height="56" fill="#9c674b" stroke="#724a37" stroke-width="5"/><rect x="${x+7}" y="161" width="45" height="42" fill="#96cbcd"/><path d="M${x+29} 161V202M${x+7} 182H${x+52}" stroke="#f9e1bc" stroke-width="5"/></g>`).join('')}
 <g fill="#5e8a51" stroke="#487343" stroke-width="2"><ellipse cx="49" cy="240" rx="29" ry="16"/><ellipse cx="286" cy="240" rx="28" ry="16"/></g>
 <rect x="79" y="247" width="170" height="32" rx="6" fill="#805034" stroke="#c89d5f" stroke-width="4"/>
 <text x="164" y="269" text-anchor="middle" fill="#fff4d2" font-size="19" font-weight="900">🐾 ペットのおうち</text></g>`;
}
function store(){
 let stripes='';for(let i=0;i<10;i++)stripes+=`<path d="M${32+i*26} 130L${58+i*26} 130L${54+i*26} 176L${30+i*26} 176Z" fill="${i%2?'#fff1cd':'#b95f4c'}"/>`;
 return `<g transform="translate(1340 76) scale(.88)"><ellipse cx="170" cy="268" rx="157" ry="24" fill="#264b2b" opacity=".25"/>
 <rect x="43" y="82" width="265" height="170" rx="5" fill="#b98250" stroke="#7d4b35" stroke-width="8"/>
 <path d="M32 111L63 32H277L312 112Z" fill="#aa5943" stroke="#6e4033" stroke-width="7"/>
 <rect x="110" y="27" width="132" height="55" rx="9" fill="#76503a" stroke="#c59b61" stroke-width="8"/>
 <text x="176" y="62" text-anchor="middle" fill="#fff0be" font-size="27" font-weight="900">SHOP</text>
 <rect x="28" y="130" width="284" height="52" fill="#fff0ca" stroke="#935d45" stroke-width="5"/>${stripes}
 <rect x="47" y="188" width="244" height="48" fill="#75462f" stroke="#563a29" stroke-width="5"/>
 <path d="M61 188H278" stroke="#d19864" stroke-width="10"/>
 <g><path d="M72 193H104V234H72Z" fill="#b0dbdd"/><path d="M121 196H153V234H121Z" fill="#a4c7e9"/><path d="M174 195H208V234H174Z" fill="#e8be66"/><path d="M228 193H260V234H228Z" fill="#94c89e"/></g>
 <g fill="#fff8dd" opacity=".7"><path d="M78 202V219M128 201V220M180 201V220M234 201V220" stroke="#fff9dc" stroke-width="5"/></g>
 <rect x="83" y="251" width="190" height="31" rx="8" fill="#805034" stroke="#d2a064" stroke-width="4"/>
 <text x="178" y="273" text-anchor="middle" fill="#fff6d6" font-size="22" font-weight="900">🛒 ショップ</text></g>`;
}
function scenery(){
 // A calm blank canvas: gardens and paths are user-placed, never painted here.
 const rand=rng(724180),width=W,height=H;
 let leaves='',wildflowers='',edge='';
 for(let i=0;i<1850;i++){
  const x=rand()*width,y=rand()*height;
  const shade=rand()>.5?'#3e803b':'#b3d47a';
  leaves+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="3" height="3" fill="'+shade+'" opacity=".28"/>';
 }
 for(let i=0;i<65;i++){
  const x=rand()*width,y=rand()*height;
  if(y<340&&(x<410||x>1310))continue;
  wildflowers+=flower(x.toFixed(1),y.toFixed(1),.6,['#f5d6e4','#fff4cf','#d6e2fd'][i%3]);
 }
 for(const [x,y,z] of [[7,17,.65],[1718,12,.6],[12,842,.7],[1710,842,.74]]){
  edge+=foliage(x,y,z);
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" id="scenerySvg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="ペットのおうちとショップのある自由にアレンジできる農園">
 <defs>
  <pattern id="grassTile" width="38" height="38" patternUnits="userSpaceOnUse">
   <rect width="38" height="38" fill="#82b763"/>
   <path d="M0 12L5 8L10 12M21 24L25 20L30 24" fill="none" stroke="#bed98d" stroke-width="2" opacity=".36"/>
   <rect x="9" y="29" width="4" height="3" fill="#488b47" opacity=".32"/>
  </pattern>
 </defs>
 <rect width="${width}" height="${height}" fill="url(#grassTile)"/>
 <g>${leaves}</g><g opacity=".75">${wildflowers}</g>${edge}
 ${home()}${store()}
 </svg>`;
}
export function installScenery(target){target.innerHTML=scenery();}
export const FARM_SCENE_SIZE=Object.freeze({width:W,height:H});