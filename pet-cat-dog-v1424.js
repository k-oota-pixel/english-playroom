const OUTLINE='#40564e';
const CREAM='#fff0d2';
const INNER='#f3a8ad';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);

const CAT_BABY='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';
const DOG_BABY='M78 76 Q47 64 47 103 Q55 122 72 101 L89 81 M162 76 Q193 64 193 103 Q185 122 168 101 L151 81';
const DOG_ADULT='M78 61 Q45 49 44 94 Q53 116 70 95 L86 74 M162 61 Q195 49 196 94 Q187 116 170 95 L154 74';

function legacySpecies(character){
  const paths=[...character.querySelectorAll('path[d]')].map(el=>el.getAttribute('d'));
  if(paths.includes(CAT_BABY)||paths.includes(CAT_ADULT))return 'cat';
  if(paths.includes(DOG_BABY)||paths.includes(DOG_ADULT))return 'dog';
  return null;
}

function bodyColor(character){
  for(const el of character.querySelectorAll('[fill]')){
    const fill=(el.getAttribute('fill')||'').toLowerCase();
    if(BODY_COLORS.has(fill))return fill;
  }
  return '#f3b5c4';
}

function legacyEyeGroup(character){
  return [...character.querySelectorAll(`g[fill="${OUTLINE}"]`)].find(group=>{
    if(group.hasAttribute('opacity'))return false;
    return [...group.children].some(el=>['ellipse','path'].includes(el.tagName?.toLowerCase()));
  })||null;
}

function eyeStyle(character){
  const group=legacyEyeGroup(character);if(!group)return 'round';
  const ellipses=[...group.children].filter(el=>el.tagName?.toLowerCase()==='ellipse');
  if(ellipses.length>=2){
    if(ellipses.slice(0,2).some(el=>(el.getAttribute('transform')||'').includes('rotate')))return 'gentle';
    if(group.querySelectorAll('circle').length>4)return 'watery';
    return 'round';
  }
  const paths=[...group.children].filter(el=>el.tagName?.toLowerCase()==='path');
  if(paths.length>=2)return 'sparkle';
  const d=paths[0]?.getAttribute('d')||'';
  const nums=(d.match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
  if(nums.length>=6){
    const startY=nums[1],controlY=nums[3],endY=nums[5];
    if(controlY<Math.min(startY,endY))return 'smile';
    if(controlY>Math.max(startY,endY))return 'sleepy';
  }
  return 'round';
}

function star(cx,cy,r){
  const inner=r*.43;let d='';
  for(let i=0;i<8;i++){
    const rr=i%2===0?r:inner,angle=-Math.PI/2+i*Math.PI/4;
    d+=(i?'L':'M')+(cx+Math.cos(angle)*rr).toFixed(1)+' '+(cy+Math.sin(angle)*rr).toFixed(1)+' ';
  }
  return d+'Z';
}

function oldEyes(style,lx,rx,y,s=1){
  const hi=(cx)=>`<circle cx="${cx-2.7*s}" cy="${y-4.5*s}" r="${3*s}" fill="#fff"/><circle cx="${cx+3.2*s}" cy="${y+4.5*s}" r="${1.4*s}" fill="#fff" opacity=".55"/>`;
  if(style==='gentle')return `<ellipse cx="${lx}" cy="${y+s}" rx="${9*s}" ry="${11.5*s}" transform="rotate(8 ${lx} ${y+s})" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y+s}" rx="${9*s}" ry="${11.5*s}" transform="rotate(-8 ${rx} ${y+s})" fill="${OUTLINE}"/>${hi(lx)}${hi(rx)}`;
  if(style==='watery')return `<ellipse cx="${lx}" cy="${y}" rx="${10.5*s}" ry="${14*s}" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y}" rx="${10.5*s}" ry="${14*s}" fill="${OUTLINE}"/><circle cx="${lx-2.7*s}" cy="${y-4.5*s}" r="${3.8*s}" fill="#fff"/><circle cx="${rx-2.7*s}" cy="${y-4.5*s}" r="${3.8*s}" fill="#fff"/><circle cx="${lx+3.2*s}" cy="${y+4.5*s}" r="${1.9*s}" fill="#fff" opacity=".55"/><circle cx="${rx+3.2*s}" cy="${y+4.5*s}" r="${1.9*s}" fill="#fff" opacity=".55"/><circle cx="${lx-4*s}" cy="${y+5*s}" r="${2.2*s}" fill="#fff" opacity=".82"/><circle cx="${rx-4*s}" cy="${y+5*s}" r="${2.2*s}" fill="#fff" opacity=".82"/>`;
  if(style==='smile')return `<path d="M${lx-11*s} ${y+s} Q${lx} ${y-10*s} ${lx+11*s} ${y+s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/><path d="M${rx-11*s} ${y+s} Q${rx} ${y-10*s} ${rx+11*s} ${y+s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/>`;
  if(style==='sleepy')return `<path d="M${lx-11*s} ${y-s} Q${lx} ${y+5*s} ${lx+11*s} ${y-s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/><path d="M${rx-11*s} ${y-s} Q${rx} ${y+5*s} ${rx+11*s} ${y-s}" fill="none" stroke="${OUTLINE}" stroke-width="${5*s}" stroke-linecap="round"/>`;
  if(style==='sparkle')return `<path d="${star(lx,y,12*s)}" fill="${OUTLINE}"/><path d="${star(rx,y,12*s)}" fill="${OUTLINE}"/><circle cx="${lx}" cy="${y-2*s}" r="${2*s}" fill="#fff"/><circle cx="${rx}" cy="${y-2*s}" r="${2*s}" fill="#fff"/>`;
  return `<ellipse cx="${lx}" cy="${y}" rx="${8.5*s}" ry="${11.5*s}" fill="${OUTLINE}"/><ellipse cx="${rx}" cy="${y}" rx="${8.5*s}" ry="${11.5*s}" fill="${OUTLINE}"/>${hi(lx)}${hi(rx)}`;
}

function noseMouth(x,y,nose='#6b4b43',scale=1){
  return `<g stroke="${OUTLINE}" stroke-width="${3.2*scale}" stroke-linecap="round" stroke-linejoin="round"><path d="M${x-4*scale} ${y} Q${x} ${y+4*scale} ${x+4*scale} ${y} Q${x} ${y-3*scale} ${x-4*scale} ${y}Z" fill="${nose}" stroke="none"/><path d="M${x} ${y+3*scale} v${5*scale} M${x} ${y+8*scale} q-${7*scale} ${7*scale} -${13*scale} 0 M${x} ${y+8*scale} q${7*scale} ${7*scale} ${13*scale} 0" fill="none"/></g>`;
}

function cat(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M166 146 Q208 132 205 166 Q203 193 173 181 Q190 169 177 158" fill="${color}"/><ellipse cx="120" cy="164" rx="45" ry="39" fill="${color}"/><ellipse cx="88" cy="188" rx="23" ry="13" fill="${color}"/><ellipse cx="152" cy="188" rx="23" ry="13" fill="${color}"/><path d="M69 106 Q67 81 80 69 L75 45 L101 63 Q120 55 139 63 L165 45 L160 69 Q174 82 171 108 Q168 143 120 148 Q72 143 69 106Z" fill="${color}"/><path d="M82 65 L80 52 L96 63Z M158 65 L160 52 L144 63Z" fill="${INNER}" stroke="none"/><ellipse cx="120" cy="126" rx="29" ry="20" fill="${CREAM}" stroke="none"/>${oldEyes(eye,96,144,103,1)}${noseMouth(120,121,'#8b5b54',.9)}<path d="M89 126 L69 123 M88 133 L67 135 M151 126 L171 123 M152 133 L173 135" fill="none" stroke-width="3"/><ellipse cx="120" cy="169" rx="24" ry="20" fill="${CREAM}" stroke="none" opacity=".88"/></g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M165 130 Q213 116 211 163 Q209 203 169 191 Q190 176 179 151" fill="${color}"/><path d="M82 134 Q77 169 86 194 Q100 208 120 207 Q140 208 154 194 Q163 169 158 134Z" fill="${color}"/><ellipse cx="91" cy="194" rx="22" ry="14" fill="${color}"/><ellipse cx="149" cy="194" rx="22" ry="14" fill="${color}"/><path d="M70 95 Q68 68 81 55 L72 27 L104 52 Q120 45 136 52 L168 27 L159 55 Q172 68 170 97 Q168 132 120 139 Q72 132 70 95Z" fill="${color}"/><path d="M80 52 L76 35 L98 52Z M160 52 L164 35 L142 52Z" fill="${INNER}" stroke="none"/><ellipse cx="120" cy="116" rx="31" ry="21" fill="${CREAM}" stroke="none"/>${oldEyes(eye,95,145,91,1.04)}${noseMouth(120,111,'#8b5b54',.92)}<path d="M88 116 L65 112 M88 124 L64 126 M152 116 L175 112 M152 124 L176 126" fill="none" stroke-width="3"/><path d="M100 137 Q106 146 100 154 Q109 152 113 159 Q118 153 120 162 Q124 153 129 159 Q133 152 141 154 Q135 145 141 137 Q120 128 100 137Z" fill="${CREAM}" stroke="none"/><path d="M99 157 Q111 167 120 181 Q129 167 141 157 Q138 186 120 198 Q102 186 99 157Z" fill="${CREAM}" stroke="none" opacity=".92"/></g>`;
}

function dog(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M66 82 Q37 72 41 111 Q46 134 69 111 L83 88Z" fill="${color}"/><path d="M174 82 Q203 72 199 111 Q194 134 171 111 L157 88Z" fill="${color}"/><path d="M166 158 Q193 147 197 167 Q200 185 181 188" fill="none" stroke-width="9"/><ellipse cx="120" cy="164" rx="48" ry="39" fill="${color}"/><ellipse cx="91" cy="189" rx="22" ry="13" fill="${color}"/><ellipse cx="149" cy="189" rx="22" ry="13" fill="${color}"/><path d="M65 108 Q65 75 120 69 Q175 75 175 108 Q175 146 120 149 Q65 146 65 108Z" fill="${color}"/><ellipse cx="120" cy="126" rx="31" ry="21" fill="${CREAM}" stroke="none"/>${oldEyes(eye,95,145,104,1)}${noseMouth(120,120,'#5d4a43',1)}<ellipse cx="120" cy="169" rx="24" ry="20" fill="${CREAM}" stroke="none" opacity=".9"/></g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M72 66 Q36 55 39 103 Q44 132 70 105 L87 75Z" fill="${color}"/><path d="M168 66 Q204 55 201 103 Q196 132 170 105 L153 75Z" fill="${color}"/><path d="M162 145 Q198 127 204 157 Q209 183 181 194" fill="none" stroke-width="10"/><path d="M79 126 Q74 166 84 196 Q99 208 120 208 Q141 208 156 196 Q166 166 161 126Z" fill="${color}"/><ellipse cx="94" cy="195" rx="22" ry="14" fill="${color}"/><ellipse cx="146" cy="195" rx="22" ry="14" fill="${color}"/><path d="M67 94 Q67 58 120 52 Q173 58 173 94 Q173 135 120 139 Q67 135 67 94Z" fill="${color}"/><ellipse cx="120" cy="113" rx="33" ry="22" fill="${CREAM}" stroke="none"/>${oldEyes(eye,95,145,88,1.05)}${noseMouth(120,107,'#5d4a43',1)}<path d="M101 137 Q108 147 104 155 Q113 152 120 163 Q127 152 136 155 Q132 146 139 137 Q120 130 101 137Z" fill="${CREAM}" stroke="none"/><ellipse cx="120" cy="174" rx="25" ry="27" fill="${CREAM}" stroke="none" opacity=".9"/></g>`;
}

function redraw(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDogV1424==='1')return;
  const character=svg.querySelector('.pet-character');if(!character)return;
  const species=legacySpecies(character);if(!species)return;
  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const color=bodyColor(character),eye=eyeStyle(character);
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');
  const art=species==='cat'?cat(stage,color,eye):dog(stage,color,eye);
  character.innerHTML=`<g data-pet-redesign="${species}-${stage}">${art}</g>${accessories}`;
  svg.dataset.catDogV1424='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redraw(root);
  root.querySelectorAll?.('svg').forEach(redraw);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node instanceof Element)scan(node);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();