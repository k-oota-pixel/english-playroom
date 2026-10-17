import './nickname-profile.js';
import {OPTIONS,normalizeAppearance,equippedLayers} from './pet-model.js';

const outline='#40564e';
const OFFICIAL_SPECIES=['cat','dog','bird','hamster','panda','penguin'];
const LEGACY_SPECIES={rabbit:'hamster',fox:'dog',dragon:'bird',mystery:'cat'};
const SPECIES_LABELS={cat:'ねこ',dog:'いぬ',bird:'ことり',hamster:'ハムスター',panda:'パンダ',penguin:'ペンギン'};

// Baby = low, round and plush-like. Adult = a little taller with visible paws
// and belly, but still deliberately soft and cute rather than realistic.
const BODIES={
  baby:{
    cat:'M54 124 Q54 77 120 72 Q186 77 186 124 L185 153 Q181 192 120 196 Q59 192 55 153Z',
    dog:'M51 126 Q51 79 120 74 Q189 79 189 126 L188 154 Q184 193 120 197 Q56 193 52 154Z',
    bird:'M54 122 Q54 76 120 72 Q186 76 186 122 Q199 188 120 196 Q41 188 54 122Z',
    hamster:'M42 128 Q42 76 120 72 Q198 76 198 128 L196 151 Q191 195 120 198 Q49 195 44 151Z',
    panda:'M48 125 Q48 74 120 71 Q192 74 192 125 L190 153 Q185 194 120 198 Q55 194 50 153Z',
    penguin:'M59 119 Q59 72 120 69 Q181 72 181 119 L190 158 Q187 196 120 199 Q53 196 50 158Z'
  },
  adult:{
    cat:'M61 104 Q61 58 120 50 Q179 58 179 104 L185 158 Q183 199 120 203 Q57 199 55 158Z',
    dog:'M58 106 Q58 61 120 52 Q182 61 182 106 L188 160 Q185 200 120 204 Q55 200 52 160Z',
    bird:'M67 99 Q67 55 120 48 Q173 55 173 99 Q195 191 120 203 Q45 191 67 99Z',
    hamster:'M56 106 Q55 54 120 48 Q185 54 184 106 L190 159 Q187 201 120 205 Q53 201 50 159Z',
    panda:'M58 103 Q57 52 120 48 Q183 52 182 103 L188 159 Q185 201 120 205 Q55 201 52 159Z',
    penguin:'M70 96 Q70 50 120 45 Q170 50 170 96 L184 161 Q183 202 120 205 Q57 202 56 161Z'
  }
};

const path=(d,fill='none',extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const star=(x,y,s=1)=>`<path d="M${x} ${y-13*s} l${4*s} ${8*s} ${9*s} ${2*s} -${6*s} ${6*s} ${1*s} ${9*s} -${8*s} -${4*s} -${8*s} ${4*s} ${1*s} -${9*s} -${6*s} -${6*s} ${9*s} -${2*s}Z"/>`;

function resolvedAppearance(value={}){
  const species=LEGACY_SPECIES[value?.species]||value?.species;
  const a=normalizeAppearance({...value,species});
  a.species=OFFICIAL_SPECIES.includes(species)?species:'cat';
  return a;
}
function resolvedStage(stage){
  const candidate=stage||(typeof document!=='undefined'?document.documentElement.dataset.petStage:'');
  return candidate==='baby'?'baby':'adult';
}
function bodyColor(a){return OPTIONS.bodyColor.find(x=>x.id===a.bodyColor)?.color||'#f5d99b';}
function backgroundColor(a){return OPTIONS.baseBackground.find(x=>x.id===a.baseBackground)?.color||'#fff3d9';}

function featureFor(a,color,stage){
  const baby=stage==='baby';
  if(a.feature==='horns')return baby?path('M88 78 Q86 56 98 49 L107 70 M133 70 L142 49 Q154 56 152 78',color):path('M82 68 Q79 38 93 31 L105 61 M135 61 L147 31 Q161 38 158 68',color);
  if(a.species==='cat')return path(baby?'M67 91 L70 52 L101 72 M139 72 L170 52 L173 91':a.feature==='long'?'M64 82 L61 23 Q84 29 100 58 M140 58 Q156 29 179 23 L176 82':'M65 82 L68 38 L101 60 M139 60 L172 38 L175 82',color);
  if(a.species==='dog')return path(baby?'M78 76 Q47 64 47 103 Q55 122 72 101 L89 81 M162 76 Q193 64 193 103 Q185 122 168 101 L151 81':a.feature==='long'?'M78 60 Q36 48 37 117 Q46 143 66 118 L86 73 M162 60 Q204 48 203 117 Q194 143 174 118 L154 73':'M78 61 Q45 49 44 94 Q53 116 70 95 L86 74 M162 61 Q195 49 196 94 Q187 116 170 95 L154 74',color);
  if(a.species==='bird')return path(baby?'M108 71 Q105 50 116 56 L122 65 Q131 47 134 62 L132 72':a.feature==='long'?'M101 58 Q91 12 112 31 L120 50 Q132 8 139 32 L136 60':'M108 59 Q99 29 115 39 L123 51 Q133 25 137 46 L133 61',color);
  if(a.species==='hamster'||a.species==='panda'){
    const earColor=a.species==='panda'?outline:color;
    const cy=baby?78:67,rx=baby?21:25,ry=baby?21:(a.feature==='long'?34:25);
    const inner=a.species==='panda'?'#f2ccd3':'#f8d8d9';
    return `<g><ellipse cx="72" cy="${cy}" rx="${rx}" ry="${ry}" fill="${earColor}"/><ellipse cx="168" cy="${cy}" rx="${rx}" ry="${ry}" fill="${earColor}"/><ellipse cx="72" cy="${cy}" rx="${Math.max(10,rx-8)}" ry="${Math.max(10,ry-8)}" fill="${inner}" stroke="none" opacity=".88"/><ellipse cx="168" cy="${cy}" rx="${Math.max(10,rx-8)}" ry="${Math.max(10,ry-8)}" fill="${inner}" stroke="none" opacity=".88"/></g>`;
  }
  if(a.species==='penguin')return path(baby?'M108 72 L115 57 L121 65 L132 56 L134 73':a.feature==='long'?'M103 61 Q94 17 115 30 L121 49 Q140 15 141 42 L133 62':'M106 62 L112 43 L121 53 L133 42 L136 63',color);
  return '';
}

function eyesFor(a,stage){
  const baby=stage==='baby',y=baby?114:108,left=94,right=146,rx=baby?8.5:9,ry=baby?11.5:12;
  if(a.eyes==='round')return `<ellipse cx="${left}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse cx="${right}" cy="${y}" rx="${rx}" ry="${ry}"/><g fill="white" stroke="none"><circle cx="${left-2.5}" cy="${y-4.5}" r="3"/><circle cx="${right-2.5}" cy="${y-4.5}" r="3"/><circle cx="${left+3}" cy="${y+4}" r="1.4" opacity=".5"/><circle cx="${right+3}" cy="${y+4}" r="1.4" opacity=".5"/></g>`;
  if(a.eyes==='sleepy')return path(`M84 ${y+2} Q94 ${y-9} 104 ${y+2} M136 ${y+2} Q146 ${y-9} 156 ${y+2}`);
  if(a.eyes==='cool')return path(`M83 ${y-8} L105 ${y-4} M135 ${y-4} L157 ${y-8}`)+`<ellipse cx="95" cy="${y+2}" rx="5.5" ry="7"/><ellipse cx="145" cy="${y+2}" rx="5.5" ry="7"/>`;
  return star(left,y,baby?1.02:.92)+star(right,y,baby?1.02:.92);
}
function patternFor(a,stage){
  const baby=stage==='baby';
  if(a.pattern==='spots')return `<circle cx="78" cy="${baby?157:166}" r="8"/><circle cx="159" cy="${baby?163:171}" r="10"/><circle cx="114" cy="${baby?180:187}" r="6.5"/>`;
  if(a.pattern==='stripes')return path(baby?'M61 154 L85 160 M62 169 L82 175 M179 154 L155 160 M178 169 L158 175':'M62 153 L91 161 M62 170 L87 177 M178 153 L149 161 M178 170 L153 177');
  if(a.pattern==='star')return star(82,baby?158:151,.76)+star(158,baby?158:151,.76);
  return '';
}

function feetFor(color,stage,species){
  const baby=stage==='baby';
  if(species==='bird'||species==='penguin'){
    const foot='#edaa48';
    return baby?path('M84 188 Q72 204 98 202 M142 202 Q168 204 156 188',foot):path('M82 190 Q67 210 101 206 M139 206 Q173 210 158 190',foot);
  }
  return baby?path('M72 183 Q62 204 91 202 L103 188 M137 188 L149 202 Q178 204 168 183',color):path('M72 184 Q59 210 94 207 L106 189 M134 189 L146 207 Q181 210 168 184',color);
}
function bellyFor(species,stage){
  if(stage!=='adult')return '';
  if(species==='penguin')return '';
  if(species==='bird')return '<ellipse cx="120" cy="169" rx="35" ry="34" fill="#fff3df" opacity=".58" stroke="none"/>';
  return '<ellipse cx="120" cy="171" rx="38" ry="33" fill="#fff3df" opacity=".64" stroke="none"/>';
}
function armLines(species,stage){
  if(stage!=='adult')return '';
  if(species==='bird'||species==='penguin')return '';
  return '<path d="M82 151 Q84 174 104 181 Q113 181 116 170 M158 151 Q156 174 136 181 Q127 181 124 170" fill="none"/>';
}
function tailFor(species,color,stage){
  if(species==='hamster')return stage==='baby'?'<circle cx="55" cy="169" r="11" fill="'+color+'"/>':'<circle cx="57" cy="172" r="13" fill="'+color+'"/>';
  if(species==='dog')return path(stage==='baby'?'M178 161 Q205 145 202 174 Q190 181 176 171':'M176 159 Q211 137 207 176 Q193 188 174 174',color);
  if(species==='cat')return path(stage==='baby'?'M177 166 Q206 158 202 187 Q189 191 176 179':'M176 164 Q211 151 207 190 Q191 197 174 181',color);
  return '';
}

function speciesDetails(a,color,stage){
  const baby=stage==='baby',mouthY=baby?135:132,cheekY=baby?139:136;
  let rear=tailFor(a.species,color,stage),markings='',face='',wings='';
  const nose=path(`M115 ${mouthY} Q120 ${mouthY-5} 125 ${mouthY} L120 ${mouthY+5}Z`,outline);
  const smile=path(`M120 ${mouthY+5} Q114 ${mouthY+14} 108 ${mouthY+9} M120 ${mouthY+5} Q126 ${mouthY+14} 132 ${mouthY+9}`);
  face=nose+smile;
  if(a.species==='bird'||a.species==='penguin')face=path(`M110 ${mouthY-2} L120 ${mouthY+10} L130 ${mouthY-2} Z`,'#edaa48');
  if(a.species==='cat')face+=path(`M70 ${mouthY-4} L51 ${mouthY-8} M70 ${mouthY+4} L50 ${mouthY+8} M170 ${mouthY-4} L189 ${mouthY-8} M170 ${mouthY+4} L190 ${mouthY+8}`);
  if(a.species==='dog')face=`<ellipse cx="120" cy="${mouthY+4}" rx="${baby?22:25}" ry="${baby?17:19}" fill="#fff" opacity=".38" stroke="none"/>`+face;
  if(a.species==='hamster')face=`<g fill="#fff3df" stroke="none" opacity=".95"><ellipse cx="78" cy="${cheekY}" rx="${baby?22:23}" ry="${baby?17:18}"/><ellipse cx="162" cy="${cheekY}" rx="${baby?22:23}" ry="${baby?17:18}"/></g>`+face+`<path d="M114 ${mouthY+13} v${baby?9:11} h12 v-${baby?9:11}" fill="white"/>`;
  if(a.species==='bird')wings=path(baby?'M60 146 Q76 132 82 160 M180 146 Q164 132 158 160':'M64 141 Q82 119 88 164 M176 141 Q158 119 152 164');
  if(a.species==='panda')markings=`<g fill="${outline}" stroke="none" opacity=".32"><ellipse cx="94" cy="${baby?116:110}" rx="${baby?17:19}" ry="${baby?21:24}" transform="rotate(25 94 ${baby?116:110})"/><ellipse cx="146" cy="${baby?116:110}" rx="${baby?17:19}" ry="${baby?21:24}" transform="rotate(-25 146 ${baby?116:110})"/></g>`;
  if(a.species==='penguin'){
    rear+=path(baby?'M65 128 Q42 137 43 166 Q56 164 71 151 M175 128 Q198 137 197 166 Q184 164 169 151':'M70 112 Q38 125 40 170 Q56 166 74 146 M170 112 Q202 125 200 170 Q184 166 166 146',color);
    markings=path(baby?'M82 113 Q84 84 104 95 Q120 108 136 95 Q156 84 158 113 L161 160 Q158 185 120 188 Q82 185 79 160Z':'M80 103 Q80 72 104 87 Q120 103 136 87 Q160 72 160 103 L164 163 Q163 190 120 194 Q77 190 76 163Z','#fff3df');
  }
  const cheeks=a.species==='hamster'?'':`<g fill="#e69c9c" opacity=".48" stroke="none"><ellipse cx="80" cy="${cheekY}" rx="${baby?11:10}" ry="${baby?7:6}"/><ellipse cx="160" cy="${cheekY}" rx="${baby?11:10}" ry="${baby?7:6}"/></g>`;
  return {rear,markings,face,wings,cheeks};
}

export function renderPetSVG(value,shop={},stage=''){
  const a=resolvedAppearance(value),layers=equippedLayers(shop),resolved=resolvedStage(stage),color=bodyColor(a),bg=backgroundColor(a);
  const details=speciesDetails(a,color,resolved),feature=featureFor(a,color,resolved),eyes=eyesFor(a,resolved),pattern=patternFor(a,resolved),body=BODIES[resolved][a.species]||BODIES[resolved].cat;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-pet-stage="${resolved}" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="32" fill="${bg}"/>${layers.backgrounds}<ellipse class="pet-shadow" cx="120" cy="210" rx="${resolved==='baby'?58:68}" ry="${resolved==='baby'?8:9}" fill="${outline}" opacity=".09"/><g class="pet-character"><g stroke="${outline}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${details.rear}${feature}${feetFor(color,resolved,a.species)}${path(body,color)}${bellyFor(a.species,resolved)}${details.markings}<g fill="${outline}" stroke="${outline}" opacity="${resolved==='baby'?'.20':'.24'}">${pattern}${layers.patterns}</g>${details.wings}<g fill="${outline}">${eyes}</g>${details.cheeks}${details.face}${armLines(a.species,resolved)}</g>${layers.accessories}</g>${layers.effects||''}</svg>`;
}

export function appearanceLabel(value){
  const a=resolvedAppearance(value),labels=[SPECIES_LABELS[a.species]||a.species];
  for(const [key,items] of Object.entries(OPTIONS)){if(key==='species')continue;const found=items.find(x=>x.id===a[key]);if(found)labels.push(found.label);}
  return labels.join('・');
}

if(typeof window!=='undefined')queueMicrotask(()=>import('./pet-shop.js').then(()=>import('./pet-enhancements.js')).catch(error=>console.error('Pet shop failed to load',error)));
