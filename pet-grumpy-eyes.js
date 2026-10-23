export const GRUMPY_VARIANTS=['punsuka','toron','jii'];
const line=(d,ink)=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
export function renderMugyuEyes(left,right,y,ink='#513829'){
 return line(`M${left-7} ${y-5} L${left+3} ${y} L${left-7} ${y+5}`,ink)+line(`M${right+7} ${y-5} L${right-3} ${y} L${right+7} ${y+5}`,ink);
}
export function renderKiriEyes(left,right,y,ink='#513829'){
 return [left,right].map((x,i)=>line(i===0?`M${x-9} ${y-12} L${x+6} ${y-7}`:`M${x-6} ${y-7} L${x+9} ${y-12}`,ink)+`<ellipse cx="${x}" cy="${y+3}" rx="6.5" ry="8.5" fill="${ink}" stroke="none"/><circle cx="${x-2}" cy="${y}" r="2.5" fill="#fffdf7" stroke="none"/><ellipse cx="${x+2}" cy="${y+8}" rx="2.5" ry="1.8" fill="#d3c5eb" stroke="none"/>`).join('');
}
export function renderPunsukaEyes(left,right,y,ink='#513829'){
 return line(`M${left-8} ${y-5} L${left+5} ${y+1}`,ink)+line(`M${right-5} ${y+1} L${right+8} ${y-5}`,ink);
}
export function renderGrumpyEyes(left,right,y,variant='punsuka',ink='#513829'){
 if(variant==='toron')return [left,right].map(x=>`<path d="M${x-7} ${y-1} Q${x} ${y-7} ${x+7} ${y-1} Q${x+5} ${y+8} ${x} ${y+8} Q${x-5} ${y+8} ${x-7} ${y-1}Z" fill="${ink}" stroke="none"/><circle cx="${x-2}" cy="${y}" r="1.8" fill="#fffdf7" stroke="none"/>`).join('');
 if(variant==='jii')return [left,right].map(x=>`<ellipse cx="${x}" cy="${y+1}" rx="6.5" ry="3.2" fill="${ink}" stroke="none"/>`).join('');
 return renderPunsukaEyes(left,right,y,ink);
}
