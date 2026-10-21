// Fixed, staggered particles keep SVG previews stable across wallet redraws.
const shapes = {
  star:'<path d="M0-12 3-4 12-3 5 3 7 12 0 7-7 12-5 3-12-3-3-4Z" fill="#f4c84f" stroke="#fff4bd" stroke-width="1.5"/>',
  sparkle:'<path d="M0-13 Q2-2 10 0 Q2 2 0 13 Q-2 2-10 0 Q-2-2 0-13Z" fill="#fff2b3" stroke="#eac859" stroke-width="1.5"/>',
  heart:'<path d="M0 10 C-20-2-9-16 0-7 C9-16 20-2 0 10Z" fill="#ed91ae" stroke="#fff0f4" stroke-width="1.5"/>',
  music:'<path d="M0 5 V-12 L12-15 V1 M0-8 12-11" fill="none" stroke="#9c82cc" stroke-width="3" stroke-linejoin="round"/><ellipse cx="-4" cy="6" rx="5" ry="3.5" fill="#9c82cc"/><ellipse cx="8" cy="2" rx="5" ry="3.5" fill="#9c82cc"/>'
};
const positions=[[36,111,-17,-42],[199,139,16,-43],[65,56,-15,-25],[180,64,21,-31],[44,183,-12,-44]];
const durations={star:2.5,sparkle:3.1,heart:3.8,music:3.3};
export function renderEffect(kind){
  if(kind==='confetti')return '<g class="pet-confetti-effect" aria-hidden="true" pointer-events="none">'+Array.from({length:14},(_,i)=>`<g transform="translate(${24+(i*47)%192} ${30+(i*31)%120})"><g class="pet-confetti-particle" style="--duration:${3.2+i%4*.3}s;--delay:${-i*.43}s;--drift:${i%2?12:-12}px;--turn:${i%2?180:-180}deg"><rect x="-3" y="-5" width="6" height="10" rx="1" fill="${['#e66f7c','#5fa3cf','#e7bd42','#8bbb89'][i%4]}"/></g></g>`).join('')+'</g>';
  if(!shapes[kind])return '';
  return `<g class="pet-motif-effect" aria-hidden="true" pointer-events="none">${positions.map(([x,y,dx,dy],i)=>`<g transform="translate(${x} ${y})"><g class="pet-motif pet-motif-${kind}" style="--dx:${dx}px;--dy:${dy}px;--turn:${i%2?-24:28}deg;--duration:${durations[kind]+i*.13}s;--delay:${-i*.71}s">${shapes[kind]}</g></g>`).join('')}</g>`;
}

export function emitCareEffects(visual,kind){
  visual.querySelectorAll('.pet-care-particles').forEach(el=>el.remove());
  const layer=document.createElement('span');
  layer.className='pet-care-particles';layer.setAttribute('aria-hidden','true');
  const kinds=kind==='max'?['sparkle','heart','star','music','sparkle','star','heart','star','sparkle','music','heart','star']:kind==='celebrate'?['sparkle','heart','star','sparkle','heart','star']:kind==='music'?['music','heart','music','music']:['heart','star','heart','star'];
  const glyph={star:'★',sparkle:'✦',heart:'♥',music:'♪'};
  kinds.forEach((motif,i)=>{
    const p=document.createElement('span');p.className=`pet-motif pet-motif-${motif}`;p.textContent=glyph[motif];
    const angle=(i/kinds.length)*Math.PI*2;
    p.style.cssText=`left:${kind==='max'?8+i*7:24+i*9}%;top:${48+(i%2)*14}%;font-size:${18+Math.random()*7}px;--dx:${Math.cos(angle)*(24+Math.random()*16)}px;--dy:${-40-Math.random()*24}px;--turn:${i%2?-25:30}deg;--duration:${1.15+Math.random()*.45}s;--delay:${i*.055}s;animation-iteration-count:1`;
    layer.append(p);
  });
  visual.append(layer);
  setTimeout(()=>layer.remove(),kind==='max'?2800:2100);
}
