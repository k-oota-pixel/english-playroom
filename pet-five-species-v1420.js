const OUTLINE='#40564e';
const CREAM='#fff0d2';
const WHITE='#fff8ea';
const INNER='#f3a8ad';
const BEAK='#efad4f';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);

const CAT_BABY='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';
const DOG_BABY='M78 76 Q47 64 47 103 Q55 122 72 101 L89 81 M162 76 Q193 64 193 103 Q185 122 168 101 L151 81';
const DOG_ADULT='M78 61 Q45 49 44 94 Q53 116 70 95 L86 74 M162 61 Q195 49 196 94 Q187 116 170 95 L154 74';
const BIRD_BABY='M108 71 Q105 50 116 56 L122 65 Q131 47 134 62 L132 72';
const BIRD_ADULT='M108 59 Q99 29 115 39 L123 51 Q133 25 137 46 L133 61';
const PENGUIN_BABY='M108 72 L115 57 L121 65 L132 56 L134 73';
const PENGUIN_ADULT='M106 62 L112 43 L121 53 L133 42 L136 63';

function legacySpecies(character){
  const paths=[...character.querySelectorAll('path[d]')].map(el=>el.getAttribute('d'));
  if(paths.includes(CAT_BABY)||paths.includes(CAT_ADULT))return 'cat';
  if(paths.includes(DOG_BABY)||paths.includes(DOG_ADULT))return 'dog';
  if(paths.includes(BIRD_BABY)||paths.includes(BIRD_ADULT))return 'bird';
  if(paths.includes(PENGUIN_BABY)||paths.includes(PENGUIN_ADULT))return 'penguin';
  const ellipses=[...character.querySelectorAll('ellipse')];
  const hamsterLeft=ellipses.some(el=>Number(el.getAttribute('cx'))===72&&Number(el.getAttribute('rx'))>=13);
  const hamsterRight=ellipses.some(el=>Number(el.getAttribute('cx'))===168&&Number(el.getAttribute('rx'))>=13);
  if(hamsterLeft&&hamsterRight)return 'hamster';
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
  const m=d.match(/M\s*\d+(?:\.\d+)?\s+([\d.]+)\s+Q\s*\d+(?:\.\d+)?\s+([\d.]+)\s+\d+(?:\.\d+)?\s+([\d.]+)/);
  if(m){const start=Number(m[1]),control=Number(m[2]),end=Number(m[3]);if(control<Math.min(start,end))return 'smile';if(control>Math.max(start,end))return 'sleepy';}
  return 'round';
}

function star(cx,cy,r){
  const inner=r*.43;let d='';
  for(let i=0;i<8;i++){
    const rr=i%2===0?r:inner,ang=-Math.PI/2+i*Math.PI/4;
    const x=cx+Math.cos(ang)*rr,y=cy+Math.sin(ang)*rr;
    d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)+' ';
  }
  return d+'Z';
}

function eyes(style,lx,rx,y,s=1){
  const ew=9.6*s,eh=12.6*s,sw=4.7*s;
  if(style==='smile')return `<g fill="none" stroke="${OUTLINE}" stroke-width="${sw}" stroke-linecap="round"><path d="M${lx-11*s} ${y+2*s} Q${lx} ${y-8*s} ${lx+11*s} ${y+2*s}"/><path d="M${rx-11*s} ${y+2*s} Q${rx} ${y-8*s} ${rx+11*s} ${y+2*s}"/></g>`;
  if(style==='sleepy')return `<g fill="none" stroke="${OUTLINE}" stroke-width="${sw}" stroke-linecap="round"><path d="M${lx-11*s} ${y-1*s} Q${lx} ${y+6*s} ${lx+11*s} ${y-1*s}"/><path d="M${rx-11*s} ${y-1*s} Q${rx} ${y+6*s} ${rx+11*s} ${y-1*s}"/></g>`;
  if(style==='sparkle')return `<g fill="${OUTLINE}"><path d="${star(lx,y,12*s)}"/><path d="${star(rx,y,12*s)}"/><g fill="#fff"><circle cx="${lx-2*s}" cy="${y-3*s}" r="${2.1*s}"/><circle cx="${rx-2*s}" cy="${y-3*s}" r="${2.1*s}"/></g></g>`;
  const gentle=style==='gentle',watery=style==='watery';
  const rxv=watery?ew*1.08:ew,ryv=watery?eh*1.14:eh;
  const one=(cx,rot)=>`<g transform="${rot?`rotate(${rot} ${cx} ${y})`:''}"><ellipse cx="${cx}" cy="${y}" rx="${rxv}" ry="${ryv}" fill="${OUTLINE}"/><circle cx="${cx-2.8*s}" cy="${y-4.3*s}" r="${3*s}" fill="#fff"/>${watery?`<circle cx="${cx+3.4*s}" cy="${y+4.5*s}" r="${1.8*s}" fill="#fff" opacity=".72"/>`:''}</g>`;
  return one(lx,gentle?12:0)+one(rx,gentle?-12:0);
}

function noseMouth(x,y,nose='#6b4b43',scale=1){
  return `<g stroke="${OUTLINE}" stroke-width="${3.2*scale}" stroke-linecap="round" stroke-linejoin="round"><path d="M${x-4*scale} ${y} Q${x} ${y+4*scale} ${x+4*scale} ${y} Q${x} ${y-3*scale} ${x-4*scale} ${y}Z" fill="${nose}" stroke="none"/><path d="M${x} ${y+3*scale} v${5*scale} M${x} ${y+8*scale} q-${7*scale} ${7*scale} -${13*scale} 0 M${x} ${y+8*scale} q${7*scale} ${7*scale} ${13*scale} 0" fill="none"/></g>`;
}

function cat(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M166 146 Q208 132 205 166 Q203 193 173 181 Q190 169 177 158" fill="${color}"/>
    <ellipse cx="120" cy="164" rx="45" ry="39" fill="${color}"/>
    <ellipse cx="88" cy="188" rx="23" ry="13" fill="${color}"/><ellipse cx="152" cy="188" rx="23" ry="13" fill="${color}"/>
    <path d="M69 106 Q67 81 80 69 L75 45 L101 63 Q120 55 139 63 L165 45 L160 69 Q174 82 171 108 Q168 143 120 148 Q72 143 69 106Z" fill="${color}"/>
    <path d="M82 65 L80 52 L96 63Z M158 65 L160 52 L144 63Z" fill="${INNER}" stroke="none"/>
    <ellipse cx="120" cy="126" rx="29" ry="20" fill="${CREAM}" stroke="none"/>
    ${eyes(eye,96,144,103,1)}${noseMouth(120,121,'#8b5b54',.9)}
    <path d="M89 126 L69 123 M88 133 L67 135 M151 126 L171 123 M152 133 L173 135" fill="none" stroke-width="3"/>
    <ellipse cx="120" cy="169" rx="24" ry="20" fill="${CREAM}" stroke="none" opacity=".88"/>
  </g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M165 130 Q213 116 211 163 Q209 203 169 191 Q190 176 179 151" fill="${color}"/>
    <path d="M82 134 Q77 169 86 194 Q100 208 120 207 Q140 208 154 194 Q163 169 158 134Z" fill="${color}"/>
    <ellipse cx="91" cy="194" rx="22" ry="14" fill="${color}"/><ellipse cx="149" cy="194" rx="22" ry="14" fill="${color}"/>
    <path d="M70 95 Q68 68 81 55 L72 27 L104 52 Q120 45 136 52 L168 27 L159 55 Q172 68 170 97 Q168 132 120 139 Q72 132 70 95Z" fill="${color}"/>
    <path d="M80 52 L76 35 L98 52Z M160 52 L164 35 L142 52Z" fill="${INNER}" stroke="none"/>
    <ellipse cx="120" cy="116" rx="31" ry="21" fill="${CREAM}" stroke="none"/>
    ${eyes(eye,95,145,91,1.04)}${noseMouth(120,111,'#8b5b54',.92)}
    <path d="M88 116 L65 112 M88 124 L64 126 M152 116 L175 112 M152 124 L176 126" fill="none" stroke-width="3"/>
    <path d="M100 137 Q106 146 100 154 Q109 152 113 159 Q118 153 120 162 Q124 153 129 159 Q133 152 141 154 Q135 145 141 137 Q120 128 100 137Z" fill="${CREAM}" stroke="none"/>
    <path d="M99 157 Q111 167 120 181 Q129 167 141 157 Q138 186 120 198 Q102 186 99 157Z" fill="${CREAM}" stroke="none" opacity=".92"/>
  </g>`;
}

function dog(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M66 82 Q37 72 41 111 Q46 134 69 111 L83 88Z" fill="${color}"/><path d="M174 82 Q203 72 199 111 Q194 134 171 111 L157 88Z" fill="${color}"/>
    <path d="M166 158 Q193 147 197 167 Q200 185 181 188" fill="none" stroke-width="9"/>
    <ellipse cx="120" cy="164" rx="48" ry="39" fill="${color}"/>
    <ellipse cx="91" cy="189" rx="22" ry="13" fill="${color}"/><ellipse cx="149" cy="189" rx="22" ry="13" fill="${color}"/>
    <path d="M65 108 Q65 75 120 69 Q175 75 175 108 Q175 146 120 149 Q65 146 65 108Z" fill="${color}"/>
    <ellipse cx="120" cy="126" rx="31" ry="21" fill="${CREAM}" stroke="none"/>
    ${eyes(eye,95,145,104,1)}${noseMouth(120,120,'#5d4a43',1)}
    <ellipse cx="120" cy="169" rx="24" ry="20" fill="${CREAM}" stroke="none" opacity=".9"/>
  </g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M72 66 Q36 55 39 103 Q44 132 70 105 L87 75Z" fill="${color}"/><path d="M168 66 Q204 55 201 103 Q196 132 170 105 L153 75Z" fill="${color}"/>
    <path d="M162 145 Q198 127 204 157 Q209 183 181 194" fill="none" stroke-width="10"/>
    <path d="M79 126 Q74 166 84 196 Q99 208 120 208 Q141 208 156 196 Q166 166 161 126Z" fill="${color}"/>
    <ellipse cx="94" cy="195" rx="22" ry="14" fill="${color}"/><ellipse cx="146" cy="195" rx="22" ry="14" fill="${color}"/>
    <path d="M67 94 Q67 58 120 52 Q173 58 173 94 Q173 135 120 139 Q67 135 67 94Z" fill="${color}"/>
    <ellipse cx="120" cy="113" rx="33" ry="22" fill="${CREAM}" stroke="none"/>
    ${eyes(eye,95,145,88,1.05)}${noseMouth(120,107,'#5d4a43',1)}
    <path d="M101 137 Q108 147 104 155 Q113 152 120 163 Q127 152 136 155 Q132 146 139 137 Q120 130 101 137Z" fill="${CREAM}" stroke="none"/>
    <ellipse cx="120" cy="174" rx="25" ry="27" fill="${CREAM}" stroke="none" opacity=".9"/>
  </g>`;
}

function bird(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M108 76 Q105 56 116 62 L122 71 Q131 53 135 67 L133 78" fill="${color}"/>
    <ellipse cx="120" cy="139" rx="50" ry="58" fill="${color}"/>
    <path d="M81 132 Q59 142 70 166 Q83 159 91 145" fill="${color}"/><path d="M159 132 Q181 142 170 166 Q157 159 149 145" fill="${color}"/>
    <ellipse cx="120" cy="156" rx="30" ry="34" fill="${CREAM}" stroke="none" opacity=".9"/>
    ${eyes(eye,99,141,111,.86)}
    <path d="M111 128 L120 135 L129 128 L120 123Z" fill="${BEAK}" stroke="none"/>
    <path d="M93 191 q-15 11 -1 11 M147 191 q15 11 1 11" fill="none" stroke="#d7903d" stroke-width="4"/>
  </g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M106 66 Q99 38 114 47 L123 59 Q134 35 138 54 L133 68" fill="${color}"/>
    <path d="M120 64 Q169 67 169 122 Q175 178 120 204 Q65 178 71 122 Q71 67 120 64Z" fill="${color}"/>
    <path d="M78 121 Q49 137 67 169 Q86 159 93 134" fill="${color}"/><path d="M162 121 Q191 137 173 169 Q154 159 147 134" fill="${color}"/>
    <path d="M104 190 L120 214 L136 190" fill="${color}"/>
    <ellipse cx="120" cy="151" rx="31" ry="42" fill="${CREAM}" stroke="none" opacity=".9"/>
    ${eyes(eye,99,141,102,.9)}
    <path d="M110 120 L120 128 L130 120 L120 114Z" fill="${BEAK}" stroke="none"/>
    <path d="M94 198 q-17 12 -2 12 M146 198 q17 12 2 12" fill="none" stroke="#d7903d" stroke-width="4"/>
  </g>`;
}

function hamster(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="76" cy="78" r="22" fill="${color}"/><circle cx="164" cy="78" r="22" fill="${color}"/>
    <circle cx="76" cy="78" r="12" fill="${INNER}" stroke="none"/><circle cx="164" cy="78" r="12" fill="${INNER}" stroke="none"/>
    <ellipse cx="120" cy="139" rx="63" ry="61" fill="${color}"/>
    <ellipse cx="120" cy="159" rx="34" ry="30" fill="${CREAM}" stroke="none" opacity=".9"/>
    ${eyes(eye,96,144,116,.92)}
    <ellipse cx="120" cy="137" rx="28" ry="19" fill="${CREAM}" stroke="none"/>
    ${noseMouth(120,133,'#9a635a',.82)}
    <circle cx="78" cy="139" r="10" fill="#ef9fa7" stroke="none" opacity=".72"/><circle cx="162" cy="139" r="10" fill="#ef9fa7" stroke="none" opacity=".72"/>
    <ellipse cx="89" cy="188" rx="20" ry="12" fill="${color}"/><ellipse cx="151" cy="188" rx="20" ry="12" fill="${color}"/>
  </g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="74" cy="67" r="25" fill="${color}"/><circle cx="166" cy="67" r="25" fill="${color}"/>
    <circle cx="74" cy="67" r="14" fill="${INNER}" stroke="none"/><circle cx="166" cy="67" r="14" fill="${INNER}" stroke="none"/>
    <path d="M120 66 Q181 66 181 135 Q180 196 120 205 Q60 196 59 135 Q59 66 120 66Z" fill="${color}"/>
    <ellipse cx="120" cy="163" rx="35" ry="37" fill="${CREAM}" stroke="none" opacity=".9"/>
    ${eyes(eye,96,144,108,.96)}
    <ellipse cx="120" cy="130" rx="29" ry="19" fill="${CREAM}" stroke="none"/>
    ${noseMouth(120,126,'#9a635a',.84)}
    <circle cx="79" cy="134" r="11" fill="#ef9fa7" stroke="none" opacity=".72"/><circle cx="161" cy="134" r="11" fill="#ef9fa7" stroke="none" opacity=".72"/>
    <ellipse cx="88" cy="195" rx="22" ry="13" fill="${color}"/><ellipse cx="152" cy="195" rx="22" ry="13" fill="${color}"/>
  </g>`;
}

function penguin(stage,color,eye){
  if(stage==='baby')return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M108 78 L115 62 L121 70 L132 61 L134 79" fill="${color}"/>
    <ellipse cx="120" cy="140" rx="52" ry="62" fill="${color}"/>
    <path d="M83 125 Q55 142 70 170 Q86 157 94 139" fill="${color}"/><path d="M157 125 Q185 142 170 170 Q154 157 146 139" fill="${color}"/>
    <path d="M84 96 Q95 79 120 81 Q145 79 156 96 Q151 122 120 124 Q89 122 84 96Z" fill="${WHITE}" stroke="none"/>
    <ellipse cx="120" cy="154" rx="31" ry="40" fill="${WHITE}" stroke="none"/>
    ${eyes(eye,98,142,101,.82)}
    <path d="M111 120 L120 128 L129 120 L120 114Z" fill="${BEAK}" stroke="none"/>
    <path d="M91 194 q-16 12 -2 12 M149 194 q16 12 2 12" fill="none" stroke="#d89039" stroke-width="5"/>
  </g>`;
  return `<g stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M107 67 L113 48 L121 58 L134 47 L136 68" fill="${color}"/>
    <path d="M120 60 Q169 62 168 119 Q178 180 120 207 Q62 180 72 119 Q71 62 120 60Z" fill="${color}"/>
    <path d="M82 116 Q48 137 66 176 Q86 160 95 134" fill="${color}"/><path d="M158 116 Q192 137 174 176 Q154 160 145 134" fill="${color}"/>
    <path d="M83 86 Q95 68 120 69 Q145 68 157 86 Q153 116 120 119 Q87 116 83 86Z" fill="${WHITE}" stroke="none"/>
    <ellipse cx="120" cy="151" rx="32" ry="48" fill="${WHITE}" stroke="none"/>
    ${eyes(eye,98,142,92,.86)}
    <path d="M110 112 L120 121 L130 112 L120 105Z" fill="${BEAK}" stroke="none"/>
    <path d="M91 199 q-18 13 -2 13 M149 199 q18 13 2 13" fill="none" stroke="#d89039" stroke-width="5"/>
  </g>`;
}

function art(species,stage,color,eye){
  if(species==='cat')return cat(stage,color,eye);
  if(species==='dog')return dog(stage,color,eye);
  if(species==='bird')return bird(stage,color,eye);
  if(species==='hamster')return hamster(stage,color,eye);
  if(species==='penguin')return penguin(stage,color,eye);
  return '';
}

function redraw(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.fiveSpeciesV1420==='1')return;
  const character=svg.querySelector('.pet-character');if(!character)return;
  const species=legacySpecies(character);if(!species)return;
  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const color=bodyColor(character),eye=eyeStyle(character);
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');
  character.innerHTML=`<g data-pet-redesign="${species}-${stage}">${art(species,stage,color,eye)}</g>${accessories}`;
  svg.dataset.fiveSpeciesV1420='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redraw(root);
  root.querySelectorAll?.('svg').forEach(redraw);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){for(const node of record.addedNodes){if(node instanceof Element)scan(node);}}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
