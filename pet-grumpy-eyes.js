export const GRUMPY_VARIANTS=['musu','komari','pui'];
export function renderGrumpyEyes(left,right,y,variant='musu',ink='#513829'){
 const path=d=>`<path d="${d}" fill="none" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`;
 if(variant==='komari')return [left,right].map((x,i)=>path(i===0?`M${x-8} ${y-10} Q${x} ${y-8} ${x+7} ${y-14}`:`M${x-7} ${y-14} Q${x} ${y-8} ${x+8} ${y-10}`)+`<ellipse cx="${x}" cy="${y+2}" rx="3.8" ry="5.2" fill="${ink}" stroke="none"/>`).join('');
 if(variant==='pui')return [left,right].map(x=>path(`M${x-8} ${y} Q${x} ${y+5} ${x+8} ${y-3}`)).join('');
 return path(`M${left-7} ${y-5} L${left+3} ${y} L${left-7} ${y+5}`)+path(`M${right+7} ${y-5} L${right-3} ${y} L${right+7} ${y+5}`);
}
