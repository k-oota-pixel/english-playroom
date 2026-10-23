export const GRUMPY_VARIANTS=['neboke','shobo','punsuka'];
const line=(d,ink)=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
export function renderMugyuEyes(left,right,y,ink='#513829'){
 return line(`M${left-7} ${y-5} L${left+3} ${y} L${left-7} ${y+5}`,ink)+line(`M${right+7} ${y-5} L${right-3} ${y} L${right+7} ${y+5}`,ink);
}
export function renderKiriEyes(left,right,y,ink='#513829'){
 return [left,right].map((x,i)=>line(i===0?`M${x-9} ${y-12} L${x+6} ${y-7}`:`M${x-6} ${y-7} L${x+9} ${y-12}`,ink)+`<ellipse cx="${x}" cy="${y+3}" rx="6.5" ry="8.5" fill="${ink}" stroke="none"/><circle cx="${x-2}" cy="${y}" r="2.5" fill="#fffdf7" stroke="none"/><ellipse cx="${x+2}" cy="${y+8}" rx="2.5" ry="1.8" fill="#d3c5eb" stroke="none"/>`).join('');
}
export function renderGrumpyEyes(left,right,y,variant='neboke',ink='#513829'){
 if(variant==='neboke')return line(`M${left-8} ${y} Q${left} ${y+6} ${left+8} ${y}`,ink)+`<ellipse cx="${right}" cy="${y+1}" rx="5" ry="7" fill="${ink}" stroke="none"/><circle cx="${right-1.5}" cy="${y-1.5}" r="1.8" fill="white" stroke="none"/>`;
 if(variant==='shobo')return [left,right].map(x=>line(`M${x-8} ${y} Q${x-4} ${y-3} ${x} ${y+1} Q${x+4} ${y+5} ${x+8} ${y+1}`,ink)+line(`M${x-5} ${y+7} Q${x} ${y+9} ${x+5} ${y+7}`,ink)).join('');
 return [left,right].map((x,i)=>`<ellipse cx="${x}" cy="${y+2}" rx="6" ry="4" transform="rotate(${i===0?20:-20} ${x} ${y+2})" fill="${ink}" stroke="none"/>`+line(i===0?`M${x-8} ${y-11} L${x+5} ${y-5}`:`M${x-5} ${y-5} L${x+8} ${y-11}`,ink)).join('');
}
