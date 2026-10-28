export const CATALOG=Object.freeze({
 cushion:{label:'まるクッション',icon:'🟡',w:1,h:1,art:'cushion'},
 bowl:{label:'ペットボウル',icon:'🥣',w:1,h:1,art:'bowl'},
 lamp:{label:'ミニランプ',icon:'💡',w:1,h:1,art:'lamp'},
 plant:{label:'ミニグリーン',icon:'🌿',w:1,h:1,art:'plant'},
 basket:{label:'おもちゃバスケット',icon:'🧺',w:1,h:1,art:'basket'},
 table:{label:'ローテーブル',icon:'🫖',w:2,h:2,art:'table'},
 sofa:{label:'ふわふわソファ',icon:'🛋️',w:2,h:1,art:'sofa'},
 petbed:{label:'ペットベッド',icon:'🛏️',w:2,h:2,art:'petbed'},
 cabinet:{label:'ミニキャビネット',icon:'🗄️',w:2,h:1,art:'cabinet'},
 bookshelf:{label:'絵本ラック',icon:'📚',w:2,h:1,art:'bookshelf'}
});

export function furnitureArt(type,dir=0){const flip=dir===2||dir===3?' transform="translate(120 0) scale(-1 1)"':'';const side=dir%2;let s='';
if(type==='cushion')s='<ellipse cx="60" cy="87" rx="32" ry="15" fill="#f2c86e"/><ellipse cx="60" cy="82" rx="29" ry="14" fill="#ffe29a"/><path d="M39 82q21 13 42 0" fill="none" stroke="#dfad55" stroke-width="3"/>';
if(type==='bowl')s='<ellipse cx="60" cy="87" rx="27" ry="12" fill="#9cc8b0"/><path d="M35 84q3 24 25 25t25-25" fill="#bfe0cd" stroke="#759b87" stroke-width="4"/><ellipse cx="60" cy="84" rx="24" ry="9" fill="#f9d5a8"/>';
if(type==='lamp')s='<ellipse cx="60" cy="104" rx="17" ry="7" fill="#c1a17c"/><path d="M60 42v63" stroke="#9c7d61" stroke-width="6"/><path d="M38 54L49 25h22l11 29Z" fill="#ffd9d3" stroke="#c18e89" stroke-width="4"/><circle cx="60" cy="39" r="7" fill="#ffe487"/>';
if(type==='plant')s='<ellipse cx="60" cy="93" rx="19" ry="8" fill="#c79b7e"/><path d="M44 91l5 22h22l5-22" fill="#d7aa87" stroke="#9e745a" stroke-width="3"/><g fill="#8ebf8f" stroke="#639468" stroke-width="2"><ellipse cx="50" cy="62" rx="10" ry="25" transform="rotate(-27 50 62)"/><ellipse cx="70" cy="60" rx="10" ry="26" transform="rotate(27 70 60)"/><ellipse cx="60" cy="53" rx="10" ry="28"/></g>';
if(type==='basket')s='<polygon points="60,55 88,69 60,83 32,69" fill="#e6b889" stroke="#a87e5e" stroke-width="3"/><polygon points="32,69 60,83 60,108 32,94" fill="#d9a978" stroke="#a87e5e" stroke-width="3"/><polygon points="88,69 60,83 60,108 88,94" fill="#c79468" stroke="#9b704e" stroke-width="3"/><circle cx="49" cy="64" r="8" fill="#f1aeb6"/><circle cx="66" cy="59" r="8" fill="#9bc7e0"/><circle cx="73" cy="69" r="7" fill="#f2d072"/>';
if(type==='table')s='<polygon points="60,42 103,63 60,85 17,63" fill="#f0c69c" stroke="#a77b5d" stroke-width="4"/><path d="M24 65v34M96 65v34M53 84v29M67 84v29" stroke="#9d7256" stroke-width="6"/><ellipse cx="60" cy="56" rx="13" ry="6" fill="#fff6e9"/><circle cx="60" cy="52" r="6" fill="#f0b1b3"/>';
if(type==='sofa')s=side?'<polygon points="60,43 106,66 60,91 14,68" fill="#f2b6be" stroke="#a97b7e" stroke-width="4"/><polygon points="60,24 106,47 106,66 60,43" fill="#d9939d" stroke="#a97b7e" stroke-width="4"/><polygon points="60,24 14,47 14,68 60,43" fill="#f4c6cb" stroke="#a97b7e" stroke-width="4"/><path d="M23 71v27M97 69v27" stroke="#8e6e61" stroke-width="7"/>':'<polygon points="60,43 103,64 60,86 17,65" fill="#f2b6be" stroke="#a97b7e" stroke-width="4"/><polygon points="60,24 103,45 103,64 60,43" fill="#d9939d" stroke="#a97b7e" stroke-width="4"/><polygon points="60,24 17,45 17,65 60,43" fill="#f4c6cb" stroke="#a97b7e" stroke-width="4"/><path d="M26 68v28M94 66v28" stroke="#8e6e61" stroke-width="7"/>';
if(type==='petbed')s='<ellipse cx="60" cy="84" rx="45" ry="23" fill="#cfa0d6" stroke="#9e78a5" stroke-width="4"/><ellipse cx="60" cy="78" rx="34" ry="16" fill="#f3d8f4"/><ellipse cx="60" cy="79" rx="21" ry="10" fill="#fff4fb" opacity=".8"/>';
if(type==='cabinet')s='<polygon points="60,25 96,43 60,61 24,43" fill="#f2c49f" stroke="#9f765a" stroke-width="4"/><polygon points="24,43 60,61 60,111 24,93" fill="#e6b48e" stroke="#9f765a" stroke-width="4"/><polygon points="96,43 60,61 60,111 96,93" fill="#c99573" stroke="#91694f" stroke-width="4"/><circle cx="51" cy="79" r="3" fill="#fff0bd"/><circle cx="69" cy="79" r="3" fill="#fff0bd"/>';
if(type==='bookshelf')s='<polygon points="60,19 97,37 60,56 23,37" fill="#d7b087" stroke="#957052" stroke-width="4"/><polygon points="23,37 60,56 60,112 23,93" fill="#c9996d" stroke="#957052" stroke-width="4"/><polygon points="97,37 60,56 60,112 97,93" fill="#b7845f" stroke="#896348" stroke-width="4"/><path d="M29 58L58 73L91 57M29 76L58 91L91 75" fill="none" stroke="#f3dfc4" stroke-width="4"/><path d="M36 54v17M44 58v17M72 57v17M82 52v18" stroke="#ef9faa" stroke-width="5"/>';
return `<svg viewBox="0 0 120 120" aria-hidden="true"><g${flip}>${s}</g></svg>`;}
