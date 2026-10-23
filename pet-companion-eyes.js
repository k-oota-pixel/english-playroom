import {renderSparkleEyes} from './pet-eye-art.js?v=1.5.27';
// Preserve the existing dog eye artwork for both companions.
export function renderCompanionEyes(eyeStyle){
 const ink='#513829';
 const shine=(x,y)=>`<g fill="white" stroke="none"><circle cx="${x-3.5}" cy="${y-5}" r="3.8"/><circle cx="${x+1}" cy="${y+5}" r="1.8"/></g>`;
 const eyes=eyeStyle==='sparkle'?renderSparkleEyes(96,144,106):[96,144].map(x=>{
  if(eyeStyle==='oyoyo')return `<path d="M${x-9} 106 H${x+9}" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  if(eyeStyle==='smile')return `<path d="M${x-9} 111 Q${x} 94 ${x+9} 111" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  if(eyeStyle==='sleepy')return `<path d="M${x-9} 108 Q${x} 117 ${x+9} 108" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  const angle=eyeStyle==='gentle'?(x===96?14:-14):0;
  const eye=`<ellipse cx="${x}" cy="106" rx="11" ry="${eyeStyle==='watery'?16:14.5}" fill="${ink}" stroke="none"/>${shine(x,106)}`;
  const tears=eyeStyle==='watery'?`<ellipse cx="${x+5}" cy="114" rx="3" ry="4.5" fill="#b7e6ff" stroke="none"/>`:'';
  return `<g transform="rotate(${angle} ${x} 106)">${eye}${tears}</g>`;
 }).join('');
 return eyes;
}
