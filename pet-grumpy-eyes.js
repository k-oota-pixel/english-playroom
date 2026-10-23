export const GRUMPY_VARIANTS=['tsuri','jiro','urumusu'];
const line=(d,ink)=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
export function renderMugyuEyes(left,right,y,ink='#513829'){
 return line(`M${left-7} ${y-5} L${left+3} ${y} L${left-7} ${y+5}`,ink)+line(`M${right+7} ${y-5} L${right-3} ${y} L${right+7} ${y+5}`,ink);
}
export function renderGrumpyEyes(left,right,y,variant='tsuri',ink='#513829'){
 return [left,right].map((x,i)=>{
  if(variant==='jiro')return line(`M${x-8} ${y-8} H${x+8}`,ink)+`<ellipse cx="${x+4}" cy="${y+2}" rx="3.5" ry="5.4" fill="${ink}" stroke="none"/>`;
  const brow=line(i===0?`M${x-9} ${y-12} L${x+6} ${y-7}`:`M${x-6} ${y-7} L${x+9} ${y-12}`,ink);
  if(variant==='urumusu')return brow+`<ellipse cx="${x}" cy="${y+3}" rx="6.5" ry="8.5" fill="${ink}" stroke="none"/><circle cx="${x-2}" cy="${y}" r="2.5" fill="#fffdf7" stroke="none"/><ellipse cx="${x+2}" cy="${y+8}" rx="2.5" ry="1.8" fill="#d3c5eb" stroke="none"/>`;
  return brow+`<ellipse cx="${x}" cy="${y+2}" rx="4.3" ry="5.8" fill="${ink}" stroke="none"/>`;
 }).join('');
}
