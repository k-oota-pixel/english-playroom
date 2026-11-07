/* Original MonStudy "Cozy" edition artwork: a warm 2.5D pet room.
   All shapes share the existing 6×6 board geometry; no game-engine changes. */
import {facingFurnitureSVG} from './room-v4-directions.js?v=2';
import {extraFurnitureSVG,EXTRA_FURNITURE} from './room-v4-extras.js?v=1';

const wrap=(s)=>'<svg viewBox="0 0 960 960" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="木目の床と二つの窓がある、立体的で明るいぺっとのおへや">'+s+'</svg>';
const woodLines=()=>{
 let s='';
 for(let r=0;r<6;r++){
  const y=202+r*116;
  s+='<rect x="132" y="'+y+'" width="696" height="116" fill="'+(r%2?'#f3c38c':'#f6ca95')+'"/>';
  s+='<path d="M132 '+y+'h696" fill="none" stroke="#cc9259" stroke-width="5"/>';
  s+='<path d="M132 '+(y+4)+'h696" fill="none" stroke="#ffe3b4" stroke-width="4" opacity=".86"/>';
  for(let c=0;c<5;c++){
   const x=132+c*144+(r%2?54:0);
   s+='<path d="M'+x+' '+(y+6)+'v103" stroke="#ce9b68" stroke-width="2.3" opacity=".65"/>';
   s+='<path d="M'+(x+15)+' '+(y+24)+'v54" stroke="#dfab7a" stroke-width="1.8" opacity=".55"/>';
  }
 }
 return s;
};
function windowArt(cx){
 const x=cx-92;
 return '<g>'+
 '<rect x="'+x+'" y="99" width="184" height="111" rx="13" fill="#9c6848" stroke="#754c31" stroke-width="8"/>'+
 '<rect x="'+(x+10)+'" y="109" width="164" height="92" rx="5" fill="#acdce5" stroke="#f8e7c1" stroke-width="5"/>'+
 '<g fill="#fffdf1"><path d="M'+(x+22)+' 145q22-18 48-2q18-12 35 2Z"/><path d="M'+(x+112)+' 131q21-17 42 0Z"/></g>'+
 '<path d="M'+(x+10)+' 185q40-39 81-12q42-42 82-12v39h-163Z" fill="#a8cb87"/>'+
 '<path d="M'+(x+10)+' 194q35-24 69-8q50-24 94-6v20H'+(x+10)+'Z" fill="#75b580"/>'+
 '<path d="M'+cx+' 108v96M'+(x+10)+' 156h164" stroke="#8f6749" stroke-width="10"/>'+
 '<path d="M'+(x+11)+' 102q-19 20-15 57q-2 26-15 44q27 14 47-2l5-99Z" fill="#fff0ce" stroke="#b88158" stroke-width="5"/>'+
 '<path d="M'+(x+171)+' 102q20 18 18 59q1 26 17 42q-29 13-48-4l-4-97Z" fill="#fff0ce" stroke="#b88158" stroke-width="5"/>'+
 '<path d="M'+(x-9)+' 170h34m138 0h34" stroke="#86ab6b" stroke-width="9"/>'+
 '<path d="M'+(x-13)+' 101h210" stroke="#946441" stroke-width="8" stroke-linecap="round"/>'+
 '</g>';
}
export function roomBackgroundCozy(){
 return wrap(
 '<defs><linearGradient id="cozy-grass" x2="0" y2="1"><stop stop-color="#aed17c"/><stop offset="1" stop-color="#84b565"/></linearGradient>'+
 '<linearGradient id="cozy-wall" x2="0" y2="1"><stop stop-color="#fff6e6"/><stop offset="1" stop-color="#f0d9ab"/></linearGradient></defs>'+
 '<rect width="960" height="960" rx="29" fill="url(#cozy-grass)"/>'+
 '<g fill="#c5e49d" opacity=".62"><circle cx="63" cy="178" r="26"/><circle cx="906" cy="250" r="32"/><circle cx="75" cy="724" r="24"/><circle cx="907" cy="797" r="21"/></g>'+
 '<rect x="96" y="82" width="772" height="829" rx="30" fill="#5d3f2a" opacity=".24"/>'+
 '<rect x="91" y="75" width="777" height="832" rx="29" fill="#8e603d" stroke="#72492d" stroke-width="11"/>'+
 '<rect x="112" y="95" width="733" height="799" rx="14" fill="#d59a65" stroke="#b27b4f" stroke-width="6"/>'+
 '<rect x="132" y="202" width="696" height="696" fill="#f5c491"/>'+woodLines()+
 '<path d="M132 884h696" stroke="#cb9362" stroke-width="5"/>'+
 '<rect x="121" y="97" width="718" height="110" fill="url(#cozy-wall)"/>'+
 '<g opacity=".36" stroke="#d4b78c" stroke-width="2"><path d="M160 104v92m117-92v92m138-92v92m117-92v92m115-92v92m132-92v92"/></g>'+
 windowArt(313)+windowArt(647)+
 '<rect x="120" y="198" width="720" height="17" fill="#8b5a3c"/>'+
 '<path d="M131 199h698" stroke="#f5c18b" stroke-width="5"/>'+
 '<path d="M121 99v796M839 99v796" stroke="#805233" stroke-width="24" stroke-linecap="round"/>'+
 '<path d="M132 215v667M828 215v667" stroke="#e9b07b" stroke-width="4" opacity=".9"/>'+
 '<path d="M121 900h718" stroke="#74492d" stroke-width="24"/>'+
 '<path d="M132 885h696" stroke="#ffdeae" stroke-width="5" opacity=".65"/>'+
 '<path d="M373 894q108-12 211 0" stroke="#c08653" stroke-width="15" stroke-linecap="round"/>'
 );
}
const add=(base,extra)=>base.replace('</svg>',extra+'</svg>');
const pawPillow='<g transform="translate(131 104)">'+
 '<ellipse rx="25" ry="18" fill="#fff0d8" stroke="#b98567" stroke-width="4"/>'+
 '<ellipse cx="0" cy="6" rx="11" ry="8" fill="#eba3ae"/>'+
 '<g fill="#eba3ae"><ellipse cx="-13" cy="-5" rx="4" ry="6"/><ellipse cx="-4" cy="-11" rx="4" ry="5"/><ellipse cx="6" cy="-11" rx="4" ry="5"/><ellipse cx="15" cy="-6" rx="4" ry="6"/></g></g>';
function bedArt(base,d){
 const id='cozy-bed-g'+d;
 const check='<defs><pattern id="'+id+'" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#f6bcca"/><rect width="12" height="12" fill="#eb8faa"/><rect x="12" y="12" width="12" height="12" fill="#eb8faa"/><path d="M0 0h24M0 12h24M12 0v24" stroke="#ffdfdf" stroke-width="2" opacity=".62"/></pattern></defs>';
 const horizontal=d===1||d===3;
 const quilt=horizontal?'<rect x="48" y="116" width="114" height="64" rx="8" fill="url(#'+id+')" stroke="#ce8a99" stroke-width="3"/>'
 :d===2?'<rect x="57" y="77" width="124" height="76" rx="7" fill="url(#'+id+')" stroke="#ce8a99" stroke-width="3"/>'
 :'<rect x="57" y="121" width="125" height="64" rx="8" fill="url(#'+id+')" stroke="#ce8a99" stroke-width="3"/>';
 return add(base,check+quilt+(d===0?pawPillow:''));
}
function shelfArt(base,d){
 const shadowed='<g stroke="#8b5b3b" stroke-width="3"><rect x="55" y="166" width="42" height="27" rx="4" fill="#f8dfba"/><rect x="108" y="166" width="42" height="27" rx="4" fill="#f8dfba"/>'+
 '<path d="M76 174h10M128 174h10" stroke="#c58f5c" stroke-width="4" stroke-linecap="round"/></g>';
 const ivy='<g fill="#7cac64" stroke="#537b44" stroke-width="4"><path d="M147 41Q176 21 191 44Q184 73 164 64Z"/><path d="M184 57Q207 45 214 65Q213 84 191 82Z"/></g>'+
 '<path d="M190 45Q198 88 195 143" stroke="#6c964e" stroke-width="5" fill="none"/>';
 return d===0?add(base,shadowed+ivy):add(base,ivy);
}
function plantArt(base,d){
 const bow='<g transform="translate(121 195)"><path d="M0 0Q-25-23-30-6Q-27 7-8 7L0 0Q25-24 30-5Q28 9 7 6Z" fill="#f1a0ad" stroke="#aa6573" stroke-width="4"/><circle r="7" fill="#fff0d8" stroke="#aa6573" stroke-width="3"/></g>';
 return add(base,d%2?'<g transform="rotate(12 121 195)">'+bow+'</g>':bow);
}
function televisionArt(base,d){
 if(d!==0)return base;
 const scene='<g><rect x="48" y="57" width="144" height="77" rx="5" fill="#a9dcdf"/>'+
 '<g fill="#fffdf5"><path d="M57 86q12-19 29-3q14-8 21 5Z"/><path d="M135 73q12-16 23-2q13-9 22 5Z"/></g>'+
 '<path d="M48 126q36-41 70-16q34-38 74 4v20H48Z" fill="#93c584"/>'+
 '<path d="M48 132q55-28 98-1q26-17 46-4v7H48Z" fill="#6eac78"/></g>';
 return add(base,scene);
}
function deskArt(base,d){
 if(d===2)return base;
 const cup='<g transform="translate(172 121)"><ellipse cy="9" rx="15" ry="6" fill="#96664d" opacity=".26"/><path d="M-12-18h24l-3 25q-9 10-18 0Z" fill="#eb95ab" stroke="#a65f74" stroke-width="3"/>'+
 '<path d="M-7-18l-3-17M2-17v-23M9-17l7-18" fill="none" stroke="#5a9577" stroke-width="4" stroke-linecap="round"/></g>';
 return add(base,d===0?cup:d===1?'<g transform="translate(-34 5)">'+cup+'</g>':'<g transform="translate(18 5)">'+cup+'</g>');
}
function squareArt(base,d){
 const flower='<g transform="translate(115 109)"><ellipse cx="0" cy="17" rx="16" ry="5" fill="#73583e" opacity=".2"/>'+
 '<path d="M-13-4h26l-6 20q-9 7-15 0Z" fill="#f3f4df" stroke="#977554" stroke-width="3"/>'+
 '<path d="M0 0v-25" stroke="#6a9d63" stroke-width="4"/>'+
 '<g fill="#fffbee" stroke="#d3b079" stroke-width="2"><circle cx="0" cy="-32" r="9"/><circle cx="-9" cy="-24" r="8"/><circle cx="9" cy="-24" r="8"/><circle cx="0" cy="-17" r="8"/></g>'+
 '<circle cy="-24" r="5" fill="#efc963"/></g>';
 return d===1||d===3?base:add(base,flower);
}
function kotatsuArt(base,d){
 const id='cozy-kotatsu-p'+d;
 const pattern='<defs><pattern id="'+id+'" width="23" height="23" patternUnits="userSpaceOnUse"><rect width="23" height="23" fill="#edb1ae"/><rect width="11.5" height="11.5" fill="#d98683"/><rect x="11.5" y="11.5" width="11.5" height="11.5" fill="#d98683"/><path d="M0 0h23M0 11.5h23M11.5 0v23" stroke="#fbe2d6" stroke-width="2" opacity=".7"/></pattern></defs>';
 const quilt='<path d="M45 121L73 100H167L197 121L211 173Q116 210 29 174Z" fill="url(#'+id+')" stroke="#bd777f" stroke-width="5"/>'+
 '<path d="M29 174Q117 206 210 173" fill="none" stroke="#fff5e5" stroke-width="11"/>';
 const top='<path d="M68 88L87 74H167L188 89L188 122Q121 144 55 122Z" fill="#af8157" stroke="#765039" stroke-width="6"/>'+
 '<path d="M74 87L94 79H164L180 90L170 118Q122 131 68 115Z" fill="#e4b986" stroke="#9c7148" stroke-width="4"/>';
 const orange='<g transform="translate(128 99)">'+
 '<ellipse rx="28" ry="11" cy="7" fill="#fff5da" stroke="#ab855f" stroke-width="3"/>'+
 '<g fill="#f4a83f" stroke="#b8782c" stroke-width="3"><circle cx="-12" cy="1" r="9"/><circle cy="-6" r="10"/><circle cx="12" cy="1" r="9"/></g>'+
 '<g fill="#6a984d"><path d="M-1-17q-6-9-11-5q4 8 11 9Z"/><path d="M2-17q6-11 12-5q-5 8-12 9Z"/></g></g>';
 const dynamic='<g transform="rotate('+(d*90)+' 128 100)">'+orange+'</g>';
 return add(base,pattern+quilt+top+dynamic);
}
function clockArt(base,d){
 return add(base,'<circle cx="120" cy="117" r="73" fill="none" stroke="#fff6db" stroke-width="3" opacity=".68"/>');
}
export function furnitureArtCozy(id,d=0){
 const base=EXTRA_FURNITURE[id]?extraFurnitureSVG(id,d):facingFurnitureSVG(id,d);
 switch(id){
 case 'bed':return bedArt(base,d);
 case 'shelf':return shelfArt(base,d);
 case 'plant':return plantArt(base,d);
 case 'tvStand':return televisionArt(base,d);
 case 'studyDesk':return deskArt(base,d);
 case 'squareTable':return squareArt(base,d);
 case 'kotatsu':return kotatsuArt(base,d);
 case 'wallClock':return clockArt(base,d);
 default:return base;
 }
}
