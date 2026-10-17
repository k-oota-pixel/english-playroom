import './nickname-profile.js';
import {OPTIONS,normalizeAppearance,equippedLayers} from './pet-model.js';

const outline='#40564e';
const SPECIES=['cat','dog','bird','hamster','panda','penguin','rabbit','fox','dragon','mystery'];
const SPECIES_LABELS={cat:'ねこ',dog:'いぬ',bird:'ことり',hamster:'ハムスター',panda:'パンダ',penguin:'ペンギン',rabbit:'うさぎ',fox:'きつね',dragon:'ドラゴン',mystery:'ミステリー'};
const BODIES={
  baby:{
    cat:'M58 119 Q58 66 120 66 Q182 66 182 119 L181 153 Q178 190 120 193 Q62 190 59 153Z',
    dog:'M55 121 Q55 70 120 70 Q185 70 185 121 L184 154 Q180 191 120 193 Q60 191 56 154Z',
    bird:'M57 119 Q57 69 120 67 Q183 69 183 119 Q196 190 120 195 Q44 190 57 119Z',
    hamster:'M45 126 Q45 69 120 69 Q195 69 195 126 L194 150 Q190 195 120 197 Q50 195 46 150Z',
    panda:'M51 122 Q51 66 120 66 Q189 66 189 122 L188 153 Q183 195 120 196 Q57 195 52 153Z',
    penguin:'M62 115 Q62 67 120 65 Q178 67 178 115 L188 158 Q185 196 120 197 Q55 196 52 158Z',
    rabbit:'M57 121 Q57 70 120 68 Q183 70 183 121 L181 153 Q177 193 120 195 Q63 193 59 153Z',
    fox:'M57 116 Q65 72 120 65 Q175 72 183 116 L177 153 Q168 190 120 194 Q72 190 63 153Z',
    dragon:'M57 117 Q58 69 120 66 Q182 69 183 117 L181 154 Q178 193 120 195 Q62 193 59 154Z',
    mystery:'M56 117 Q55 65 120 64 Q185 65 184 117 L188 162 Q186 190 164 189 Q149 201 134 191 Q120 202 106 191 Q91 201 76 189 Q54 190 52 162Z'
  },
  adult:{
    cat:'M62 103 C62 62 83 45 120 45 C157 45 178 62 178 103 L181 151 Q181 194 120 199 Q59 194 59 151Z',
    dog:'M59 105 C59 66 84 49 120 49 C156 49 181 66 181 105 L184 153 Q181 196 120 199 Q59 196 56 153Z',
    bird:'M68 98 C68 60 89 46 120 46 C151 46 172 60 172 98 Q194 191 120 200 Q46 191 68 98Z',
    hamster:'M52 108 Q51 55 120 53 Q189 55 188 108 L193 151 Q191 198 120 201 Q49 198 47 151Z',
    panda:'M59 101 Q58 49 120 48 Q182 49 181 101 L186 153 Q184 199 120 201 Q56 199 54 153Z',
    penguin:'M72 94 Q72 47 120 45 Q168 47 168 94 L183 160 Q182 200 120 201 Q58 200 57 160Z',
    rabbit:'M66 102 Q66 60 120 54 Q174 60 174 102 L181 150 Q179 198 120 200 Q61 198 59 150Z',
    fox:'M62 101 L80 61 Q120 43 160 61 L178 101 L174 151 Q164 194 120 199 Q76 194 66 151Z',
    dragon:'M66 100 Q66 49 120 48 Q174 49 174 100 L181 153 Q181 197 120 200 Q59 197 59 153Z',
    mystery:'M64 100 Q61 45 120 44 Q179 45 176 100 L183 166 Q181 194 160 192 Q146 207 131 194 Q119 208 104 194 Q80 204 72 185 Q53 183 58 163Z'
  }
};

const path=(d,fill='none',extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const star=(x,y,s=1)=>`<path d="M${x} ${y-13*s} l${4*s} ${8*s} ${9*s} ${2*s} -${6*s} ${6*s} ${1*s} ${9*s} -${8*s} -${4*s} -${8*s} ${4*s} ${1*s} -${9*s} -${6*s} -${6*s} ${9*s} -${2*s}Z"/>`;
function resolvedAppearance(value={}){
  const a=normalizeAppearance(value);
  if(SPECIES.includes(value?.species))a.species=value.species;
  return a;
}
function resolvedStage(stage){
  const candidate=stage||document?.documentElement?.dataset?.petStage;
  return candidate==='baby'?'baby':'adult';
}
function featureFor(a,color,stage){
  const baby=stage==='baby';
  if(a.feature==='horns')return baby?path('M87 73 Q84 49 96 43 L106 67 M134 67 L144 43 Q156 49 153 73',color):path('M78 64 Q75 29 90 24 L103 56 M137 56 L150 24 Q165 29 162 64',color);
  if(a.species==='cat')return path(baby?'M67 88 L70 48 L101 69 M139 69 L170 48 L173 88':a.feature==='long'?'M65 80 L61 19 Q85 26 99 56 M141 56 Q155 26 179 19 L175 80':'M65 80 L67 35 L101 57 M139 57 L173 35 L175 80',color);
  if(a.species==='dog')return path(baby?'M79 72 Q48 61 48 101 Q55 119 72 99 L88 78 M161 72 Q192 61 192 101 Q185 119 168 99 L152 78':a.feature==='long'?'M78 58 Q35 45 36 116 Q45 142 65 117 L85 72 M162 58 Q205 45 204 116 Q195 142 175 117 L155 72':'M78 58 Q44 45 43 92 Q53 114 70 93 L85 72 M162 58 Q196 45 197 92 Q187 114 170 93 L155 72',color);
  if(a.species==='bird')return path(baby?'M108 68 Q105 47 116 54 L122 63 Q131 45 134 60 L132 69':a.feature==='long'?'M100 56 Q90 6 112 29 L120 48 Q132 3 139 30 L136 58':'M108 56 Q98 25 115 36 L123 49 Q133 21 137 44 L133 58',color);
  if(a.species==='rabbit')return path(baby?'M84 78 Q65 31 82 34 Q99 39 104 70 M136 70 Q141 39 158 34 Q175 31 156 78':a.feature==='long'?'M79 76 Q45 4 77 8 Q97 12 101 66 M139 66 Q143 12 163 8 Q195 4 161 76':'M79 76 Q53 13 78 18 Q97 23 101 66 M139 66 Q143 23 162 18 Q187 13 161 76',color);
  if(a.species==='fox')return path(baby?'M67 90 L68 45 L107 70 M133 70 L172 45 L173 90':a.feature==='long'?'M63 91 L53 12 L107 64 M133 64 L187 12 L177 91':'M63 91 L60 30 L107 64 M133 64 L180 30 L177 91',color);
  if(a.species==='hamster'||a.species==='panda'){
    const earColor=a.species==='panda'?outline:color,cy=baby?75:63,rx=baby?20:24,ry=baby?20:(a.feature==='long'?36:24);
    return `<ellipse cx="72" cy="${cy}" rx="${rx}" ry="${ry}" fill="${earColor}"/><ellipse cx="168" cy="${cy}" rx="${rx}" ry="${ry}" fill="${earColor}"/>`;
  }
  if(a.species==='penguin')return path(baby?'M108 70 L115 55 L121 63 L132 54 L134 71':a.feature==='long'?'M103 59 Q94 14 115 27 L121 47 Q140 12 141 40 L133 60':'M106 60 L112 41 L121 51 L133 40 L136 61',color);
  if(a.species==='dragon')return path(baby?'M84 76 L83 48 L106 69 M134 69 L157 48 L156 76':a.feature==='long'?'M77 71 L67 16 L104 59 M136 59 L173 16 L163 71':'M77 71 L77 30 L104 59 M136 59 L163 30 L163 71',color);
  return path(baby?'M84 75 Q73 55 85 54 L104 69 M136 69 L155 54 Q167 55 156 75':a.feature==='long'?'M78 61 Q49 10 71 13 Q97 21 98 57 M142 57 Q143 21 169 13 Q191 10 162 61':'M79 63 Q61 35 79 34 L101 57 M139 57 L161 34 Q179 35 161 63',color);
}
function eyesFor(a,stage){
  const baby=stage==='baby',y=baby?113:105,left=94,right=146,rx=baby?8:7,ry=baby?11:10;
  if(a.eyes==='round')return `<ellipse cx="${left}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse cx="${right}" cy="${y}" rx="${rx}" ry="${ry}"/><g fill="white" stroke="none"><circle cx="${left-2}" cy="${y-4}" r="${baby?3:2.5}"/><circle cx="${right-2}" cy="${y-4}" r="${baby?3:2.5}"/></g>`;
  if(a.eyes==='sleepy')return path(`M84 ${y+2} Q94 ${y-9} 104 ${y+2} M136 ${y+2} Q146 ${y-9} 156 ${y+2}`);
  if(a.eyes==='cool')return path(`M83 ${y-7} L105 ${y-4} M135 ${y-4} L157 ${y-7}`)+`<ellipse cx="95" cy="${y+1}" rx="5" ry="6"/><ellipse cx="145" cy="${y+1}" rx="5" ry="6"/>`;
  return star(left,y,baby?1.05:.9)+star(right,y,baby?1.05:.9);
}
function patternFor(a,stage){
  const baby=stage==='baby';
  if(a.pattern==='spots')return `<circle cx="77" cy="${baby?151:149}" r="${baby?8:9}"/><circle cx="158" cy="${baby?162:166}" r="${baby?10:12}"/><circle cx="113" cy="${baby?178:181}" r="7"/>`;
  if(a.pattern==='stripes')return path(baby?'M61 150 L86 155 M62 166 L82 171 M179 150 L154 155 M178 166 L158 171':'M61 146 L90 153 M61 163 L86 170 M179 146 L150 153 M179 163 L154 170');
  if(a.pattern==='star')return star(82,baby?164:169,.72)+star(158,baby?164:169,.72);
  return '';
}
function speciesDetails(a,color,stage){
  const baby=stage==='baby',mouthY=baby?134:128,cheekY=baby?133:126;
  let rear='',markings='',face='',wings='';
  const nose=path(`M116 ${mouthY} Q120 ${mouthY-5} 124 ${mouthY} L120 ${mouthY+5}Z`,outline);
  const smile=path(`M120 ${mouthY+5} Q114 ${mouthY+14} 108 ${mouthY+9} M120 ${mouthY+5} Q126 ${mouthY+14} 132 ${mouthY+9}`);
  face=nose+smile;
  if(a.species==='bird'||a.species==='penguin')face=path(`M111 ${mouthY-1} L120 ${mouthY+11} L129 ${mouthY-1} Z`,'#edaa48');
  if(a.species==='cat')face+=path(`M70 ${mouthY-3} L52 ${mouthY-7} M70 ${mouthY+5} L51 ${mouthY+8} M170 ${mouthY-3} L188 ${mouthY-7} M170 ${mouthY+5} L189 ${mouthY+8}`);
  if(a.species==='dog')face=`<ellipse cx="120" cy="${mouthY+4}" rx="${baby?22:25}" ry="${baby?17:19}" fill="#fff" opacity=".38" stroke="none"/>`+face;
  if(a.species==='mystery')face=path(`M109 ${mouthY+2} Q120 ${mouthY+19} 131 ${mouthY+2}`);
  if(a.species==='hamster')face=`<g fill="#fff3df" stroke="none" opacity=".86"><ellipse cx="78" cy="${cheekY+9}" rx="${baby?21:22}" ry="${baby?16:17}"/><ellipse cx="162" cy="${cheekY+9}" rx="${baby?21:22}" ry="${baby?16:17}"/></g>`+face+`<path d="M114 ${mouthY+13} v${baby?9:11} h12 v-${baby?9:11}" fill="white"/>`;
  if(a.species==='rabbit')face+=`<path d="M115 ${mouthY+13} v${baby?8:10} h10 v-${baby?8:10}" fill="white"/>`;
  if(a.species==='bird')wings=path(baby?'M62 146 Q76 134 81 158 M178 146 Q164 134 159 158':'M66 139 Q82 121 85 158 M174 139 Q158 121 155 158');
  if(a.species==='fox'){
    rear=path(baby?'M158 181 Q211 181 205 120 Q180 130 176 158 L153 171Z':'M160 188 Q228 188 214 104 Q181 121 179 158 L153 174Z',color)+path(baby?'M205 120 Q211 145 201 158 L188 148 Q193 132 205 120Z':'M214 104 Q222 135 211 151 L193 139 Q199 118 214 104Z','#fff3df');
    markings=path(baby?'M64 120 Q92 124 120 146 Q148 124 176 120 L169 153 Q147 177 120 180 Q93 177 71 153Z':'M65 110 Q92 116 120 143 Q148 116 175 110 L167 152 Q145 180 120 183 Q95 180 73 152Z','#fff3df');
  }
  if(a.species==='panda')markings=`<g fill="${outline}" stroke="none" opacity=".3"><ellipse cx="94" cy="${baby?114:106}" rx="${baby?17:18}" ry="${baby?21:23}" transform="rotate(25 94 ${baby?114:106})"/><ellipse cx="146" cy="${baby?114:106}" rx="${baby?17:18}" ry="${baby?21:23}" transform="rotate(-25 146 ${baby?114:106})"/></g>`;
  if(a.species==='penguin'){
    rear=path(baby?'M65 126 Q42 135 43 165 Q56 162 70 150 M175 126 Q198 135 197 165 Q184 162 170 150':'M70 110 Q37 124 39 168 Q55 164 73 144 M170 110 Q203 124 201 168 Q185 164 167 144',color);
    markings=path(baby?'M82 112 Q84 82 104 93 Q120 106 136 93 Q156 82 158 112 L161 159 Q158 184 120 187 Q82 184 79 159Z':'M80 100 Q80 70 104 84 Q120 100 136 84 Q160 70 160 100 L164 161 Q163 187 120 191 Q77 187 76 161Z','#fff3df');
  }
  if(a.species==='dragon'){
    rear=path(baby?'M72 128 L42 98 L43 148 L57 141 L66 158 L79 151 M168 128 L198 98 L197 148 L183 141 L174 158 L161 151':'M73 116 L28 75 L27 148 L45 139 L55 163 L78 153 M167 116 L212 75 L213 148 L195 139 L185 163 L162 153',color)+path(baby?'M154 181 Q188 198 198 174 L206 182 Q193 211 158 196Z':'M153 184 Q198 206 209 171 L219 181 Q205 225 156 201Z',color);
    markings=path(baby?'M107 151 Q120 145 133 151 L140 181 Q120 193 100 181Z':'M105 145 Q120 138 135 145 L144 184 Q120 200 96 184Z','#fff3df')+path(baby?'M109 163 L131 163 M107 174 L133 174':'M108 158 L132 158 M105 171 L135 171');
  }
  const cheeks=`<g fill="#e69c9c" opacity=".5" stroke="none"><ellipse cx="80" cy="${cheekY}" rx="${baby?11:9}" ry="${baby?7:5}"/><ellipse cx="160" cy="${cheekY}" rx="${baby?11:9}" ry="${baby?7:5}"/></g>`;
  return {rear,markings,face,wings,cheeks};
}
function adultBelly(species,stage){
  if(stage!=='adult'||['bird','penguin','fox','dragon','mystery'].includes(species))return '';
  return '<ellipse cx="120" cy="165" rx="36" ry="30" fill="#fff3df" opacity=".48" stroke="none"/>';
}
function paws(color,stage){return stage==='baby'?path('M80 181 Q72 199 91 199 L104 187 M136 187 L149 199 Q168 199 160 181',color):path('M78 181 Q64 207 89 207 L105 187 M135 187 L151 207 Q176 207 162 181',color);}
function armLines(stage){return stage==='adult'?'<path d="M91 153 Q99 174 112 178 M149 153 Q141 174 128 178" fill="none"/>':'';}

export function renderPetSVG(value,shop={},stage=''){
  const a=resolvedAppearance(value),layers=equippedLayers(shop),resolved=resolvedStage(stage),color=OPTIONS.bodyColor.find(x=>x.id===a.bodyColor)?.color||'#f5d99b',bg=OPTIONS.baseBackground.find(x=>x.id===a.baseBackground)?.color||'#fff3d9';
  const feature=featureFor(a,color,resolved),eyes=eyesFor(a,resolved),pattern=patternFor(a,resolved),details=speciesDetails(a,color,resolved),belly=adultBelly(a.species,resolved);
  const body=BODIES[resolved][a.species]||BODIES[resolved].mystery;
  const patternOpacity=resolved==='baby'?'.18':'.22';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-pet-stage="${resolved}" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="32" fill="${bg}"/>${layers.backgrounds}<ellipse class="pet-shadow" cx="120" cy="209" rx="${resolved==='baby'?57:67}" ry="${resolved==='baby'?8:9}" fill="${outline}" opacity=".09"/><g class="pet-character"><g stroke="${outline}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${details.rear}${feature}${paws(color,resolved)}${path(body,color)}${belly}${details.markings}<g fill="${outline}" stroke="${outline}" opacity="${patternOpacity}">${pattern}${layers.patterns}</g>${details.wings}<g fill="${outline}">${eyes}</g>${details.cheeks}${details.face}${armLines(resolved)}</g>${layers.accessories}</g>${layers.effects||''}</svg>`;
}

export function appearanceLabel(value){
  const a=resolvedAppearance(value);
  const labels=[];
  labels.push(SPECIES_LABELS[a.species]||a.species);
  for(const [key,items] of Object.entries(OPTIONS)){
    if(key==='species')continue;
    const found=items.find(x=>x.id===a[key]);if(found)labels.push(found.label);
  }
  return labels.join('・');
}

if(typeof window!=='undefined'){
  queueMicrotask(()=>import('./pet-shop.js').then(()=>import('./pet-enhancements.js')).catch(error=>console.error('Pet shop failed to load',error)));
}
