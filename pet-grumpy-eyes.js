export const GRUMPY_VARIANTS=['punsuka','shobo'];
const line=(d,ink)=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
export function renderMugyuEyes(left,right,y,ink='#513829'){
 return line(`M${left-7} ${y-5} L${left+3} ${y} L${left-7} ${y+5}`,ink)+line(`M${right+7} ${y-5} L${right-3} ${y} L${right+7} ${y+5}`,ink);
}
export function renderKiriEyes(left,right,y,ink='#513829'){
 return [left,right].map((x,i)=>line(i===0?`M${x-9} ${y-12} L${x+6} ${y-7}`:`M${x-6} ${y-7} L${x+9} ${y-12}`,ink)+`<ellipse cx="${x}" cy="${y+3}" rx="6.5" ry="8.5" fill="${ink}" stroke="none"/><circle cx="${x-2}" cy="${y}" r="2.5" fill="#fffdf7" stroke="none"/><ellipse cx="${x+2}" cy="${y+8}" rx="2.5" ry="1.8" fill="#d3c5eb" stroke="none"/>`).join('');
}
export function renderGrumpyEyes(left,right,y,variant='punsuka',ink='#513829'){
 if(variant==='shobo'){
  const leftEye=line(`M${left-8} ${y} Q${left-4} ${y-3} ${left} ${y+1} Q${left+4} ${y+5} ${left+8} ${y+1}`,ink)+line(`M${left-5} ${y+7} Q${left} ${y+9} ${left+5} ${y+7}`,ink);
  return leftEye+`<g data-mirrored-eye="right" transform="translate(${left+right} 0) scale(-1 1)">${leftEye}</g>`;
 }
 return line(`M${left-8} ${y-11} L${left+5} ${y-5}`,ink)+line(`M${right-5} ${y-5} L${right+8} ${y-11}`,ink);
}
