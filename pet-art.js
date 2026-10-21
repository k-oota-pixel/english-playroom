import {renderCatArt} from './pet-cat-art.js?v=1.5.27';
import {renderSparkleEyes} from './pet-eye-art.js?v=1.5.27';
import {renderDogArt} from './pet-dog-art.js?v=1.5.27';
import {renderDragonArt} from './pet-dragon-art.js?v=1.5.29';
if(typeof window!=='undefined')import('./nickname-profile.js?v=1.5.27');
import {OPTIONS,normalizeAppearance,equippedLayers} from './pet-model.js';

const outline='#40564e';
const OFFICIAL_SPECIES=['cat','dog','bird','hamster','panda','penguin','dragon'];
const LEGACY_SPECIES={rabbit:'hamster',fox:'dog',mystery:'cat'};
// `panda` remains the persisted stable ID for backward compatibility, but is now the lion species.
const SPECIES_LABELS={cat:'ねこ',dog:'いぬ',bird:'ことり',hamster:'ハムスター',panda:'ライオン',penguin:'ペンギン',dragon:'ドラゴン'};
const EYE_STYLES=['round','gentle','watery','smile','sleepy','sparkle'];
const EYE_LABELS={round:'まんまる',gentle:'たれ目',watery:'うるうる',smile:'にっこり',sleepy:'ねむねむ',sparkle:'きらきら'};
const BACKGROUND_LABELS={ivory:'おうち',sky:'青空',leaf:'お庭',rose:'花畑'};

const BODIES={
  baby:{
    cat:'M54 124 Q54 77 120 72 Q186 77 186 124 L185 153 Q181 192 120 196 Q59 192 55 153Z',
    dog:'M51 126 Q51 79 120 74 Q189 79 189 126 L188 154 Q184 193 120 197 Q56 193 52 154Z',
    bird:'M54 122 Q54 76 120 72 Q186 76 186 122 Q199 188 120 196 Q41 188 54 122Z',
    hamster:'M42 128 Q42 76 120 72 Q198 76 198 128 L196 151 Q191 195 120 198 Q49 195 44 151Z',
    panda:'M48 126 Q48 78 120 72 Q192 78 192 126 L190 153 Q185 194 120 198 Q55 194 50 153Z',
    penguin:'M59 119 Q59 72 120 69 Q181 72 181 119 L190 158 Q187 196 120 199 Q53 196 50 158Z'
  },
  adult:{
    cat:'M67 102 Q67 59 120 51 Q173 59 173 102 L179 157 Q177 197 120 202 Q63 197 61 157Z',
    dog:'M58 106 Q58 61 120 52 Q182 61 182 106 L188 160 Q185 200 120 204 Q55 200 52 160Z',
    bird:'M67 99 Q67 55 120 48 Q173 55 173 99 Q195 191 120 203 Q45 191 67 99Z',
    hamster:'M56 106 Q55 54 120 48 Q185 54 184 106 L190 159 Q187 201 120 205 Q53 201 50 159Z',
    panda:'M62 105 Q62 58 120 50 Q178 58 178 105 L184 159 Q181 200 120 204 Q59 200 56 159Z',
    penguin:'M70 96 Q70 50 120 45 Q170 50 170 96 L184 161 Q183 202 120 205 Q57 202 56 161Z'
  }
};

const path=(d,fill='none',extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const star=(x,y,s=1)=>`<path d="M${x} ${y-13*s} l${4*s} ${8*s} ${9*s} ${2*s} -${6*s} ${6*s} ${1*s} ${9*s} -${8*s} -${4*s} -${8*s} ${4*s} ${1*s} -${9*s} -${6*s} -${6*s} ${9*s} -${2*s}Z"/>`;

function resolvedAppearance(value={}){
  const species=LEGACY_SPECIES[value?.species]||value?.species;
  const a=normalizeAppearance({...value,species});
  a.species=OFFICIAL_SPECIES.includes(species)?species:'cat';
  const legacy=a.eyes==='sleepy'?'sleepy':a.eyes==='sparkle'?'sparkle':a.eyes==='cool'?'gentle':'round';
  a.eyeStyle=EYE_STYLES.includes(value?.eyeStyle)?value.eyeStyle:legacy;
  return a;
}
function resolvedStage(stage){const candidate=stage||(typeof document!=='undefined'?document.documentElement.dataset.petStage:'');return 'baby';}
function bodyColor(a){return OPTIONS.bodyColor.find(x=>x.id===a.bodyColor)?.color||'#f5d99b';}
function backgroundColor(a){return OPTIONS.baseBackground.find(x=>x.id===a.baseBackground)?.color||'#fff3d9';}

function flower(x,y,color='#f6a7bd',scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><g fill="${color}" stroke="none"><circle cx="0" cy="-7" r="5"/><circle cx="7" cy="0" r="5"/><circle cx="0" cy="7" r="5"/><circle cx="-7" cy="0" r="5"/></g><circle cx="0" cy="0" r="4" fill="#f5c94f" stroke="none"/><path d="M0 10 V29" stroke="#639567" stroke-width="3"/><path d="M0 20 q-9-7-12 1 q8 5 12 2 M0 23 q9-7 12 1 q-8 5-12 2" fill="#79ae76" stroke="none"/></g>`;}
function backgroundTheme(id){
  if(id==='sky')return `<g aria-hidden="true"><circle cx="194" cy="42" r="20" fill="#ffd86f" opacity=".9"/><g fill="#fff" opacity=".82"><path d="M18 60 Q25 43 41 52 Q49 36 64 51 Q78 49 83 62 H18Z"/><path d="M151 78 Q158 62 171 69 Q181 52 194 69 Q210 66 218 80 H151Z"/></g><path d="M0 173 Q42 143 84 170 T166 168 T240 165 V240 H0Z" fill="#b8d99b" opacity=".72"/><path d="M0 190 Q46 167 91 190 T177 187 T240 185 V240 H0Z" fill="#9fc983" opacity=".82"/></g>`;
  if(id==='leaf')return `<g aria-hidden="true"><path d="M0 176 H240 V240 H0Z" fill="#cbe2ac" opacity=".72"/><g stroke="#d2b27c" stroke-width="5" opacity=".72"><path d="M12 143 V199 M38 143 V199 M64 143 V199 M176 143 V199 M202 143 V199 M228 143 V199"/><path d="M4 156 H72 M168 156 H236"/></g><g fill="#86b978" opacity=".9"><circle cx="20" cy="134" r="18"/><circle cx="47" cy="126" r="22"/><circle cx="194" cy="129" r="21"/><circle cx="224" cy="136" r="18"/></g><g fill="#f6c65e"><path d="M31 80 q8-10 16 0 q-8 3-16 0Z"/><path d="M31 80 q8 10 16 0 q-8-3-16 0Z"/></g><path d="M39 80 q12 12 18 3" fill="none" stroke="#7c8c79" stroke-width="2"/></g>`;
  if(id==='rose')return `<g aria-hidden="true"><path d="M0 166 Q44 150 88 167 T174 164 T240 166 V240 H0Z" fill="#b8d99d" opacity=".66"/><g opacity=".94">${flower(24,170,'#f39ab5',.72)}${flower(53,183,'#b9a3df',.58)}${flower(82,174,'#ffd47a',.52)}${flower(159,176,'#f39ab5',.55)}${flower(188,183,'#b9a3df',.62)}${flower(217,169,'#ffd47a',.7)}</g><g fill="#fff" opacity=".55"><circle cx="42" cy="61" r="4"/><circle cx="195" cy="73" r="5"/><circle cx="214" cy="50" r="3"/></g></g>`;
  return `<g aria-hidden="true"><rect x="18" y="28" width="57" height="48" rx="8" fill="#d9edf7" stroke="#c6b494" stroke-width="3"/><path d="M46.5 28 V76 M18 52 H75" stroke="#fff" stroke-width="3"/><path d="M12 25 Q25 45 17 82" fill="#f0c4b7" opacity=".8"/><path d="M81 25 Q68 45 76 82" fill="#f0c4b7" opacity=".8"/><ellipse cx="120" cy="206" rx="86" ry="24" fill="#edcfaa" opacity=".45"/><g transform="translate(202 135)"><rect x="-13" y="24" width="26" height="28" rx="5" fill="#d79a72"/><g fill="#78ab78"><circle cx="-9" cy="19" r="12"/><circle cx="7" cy="15" r="14"/><circle cx="1" cy="3" r="11"/></g></g></g>`;
}

function anatomyFor(a,color,stage){
  const baby=stage==='baby';
  if(a.species==='cat')return path(baby?'M67 91 L70 52 L101 72 M139 72 L170 52 L173 91':'M68 81 L64 23 L102 58 M138 58 L176 23 L172 81',color);
  if(a.species==='dog')return path(baby?'M78 76 Q47 64 47 103 Q55 122 72 101 L89 81 M162 76 Q193 64 193 103 Q185 122 168 101 L151 81':'M78 61 Q45 49 44 94 Q53 116 70 95 L86 74 M162 61 Q195 49 196 94 Q187 116 170 95 L154 74',color);
  if(a.species==='bird')return path(baby?'M108 71 Q105 50 116 56 L122 65 Q131 47 134 62 L132 72':'M108 59 Q99 29 115 39 L123 51 Q133 25 137 46 L133 61',color);
  if(a.species==='hamster'){
    const cy=baby?78:67,rx=baby?21:25,ry=baby?21:25,inner='#f8d8d9';
    return `<g><ellipse cx="72" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}"/><ellipse cx="168" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}"/><ellipse cx="72" cy="${cy}" rx="${rx-8}" ry="${ry-8}" fill="${inner}" stroke="none" opacity=".88"/><ellipse cx="168" cy="${cy}" rx="${rx-8}" ry="${ry-8}" fill="${inner}" stroke="none" opacity=".88"/></g>`;
  }
  if(a.species==='panda'){
    const maneColor=baby?'#d89b5c':'#b97845',cy=baby?108:103,rx=baby?63:70,ry=baby?56:69,earY=baby?76:64,earR=baby?19:22;
    return `<g><ellipse cx="120" cy="${cy}" rx="${rx}" ry="${ry}" fill="${maneColor}"/><circle cx="72" cy="${earY}" r="${earR}" fill="${color}"/><circle cx="168" cy="${earY}" r="${earR}" fill="${color}"/><circle cx="72" cy="${earY}" r="${Math.max(9,earR-8)}" fill="#eab58b" stroke="none" opacity=".85"/><circle cx="168" cy="${earY}" r="${Math.max(9,earR-8)}" fill="#eab58b" stroke="none" opacity=".85"/></g>`;
  }
  if(a.species==='penguin')return path(baby?'M108 72 L115 57 L121 65 L132 56 L134 73':'M106 62 L112 43 L121 53 L133 42 L136 63',color);
  return '';
}

function eyeHighlights(left,right,y,big=false){return `<g fill="white" stroke="none"><circle cx="${left-2.7}" cy="${y-4.5}" r="${big?3.8:3}"/><circle cx="${right-2.7}" cy="${y-4.5}" r="${big?3.8:3}"/><circle cx="${left+3.2}" cy="${y+4.5}" r="${big?1.9:1.4}" opacity=".55"/><circle cx="${right+3.2}" cy="${y+4.5}" r="${big?1.9:1.4}" opacity=".55"/></g>`;}
function eyesFor(a,stage){
  const baby=stage==='baby',y=baby?114:108,left=94,right=146,style=a.eyeStyle;
  if(style==='gentle')return `<ellipse cx="${left}" cy="${y+1}" rx="9" ry="11.5" transform="rotate(8 ${left} ${y+1})"/><ellipse cx="${right}" cy="${y+1}" rx="9" ry="11.5" transform="rotate(-8 ${right} ${y+1})"/>${eyeHighlights(left,right,y+1)}`;
  if(style==='watery')return `<ellipse cx="${left}" cy="${y}" rx="10.5" ry="14"/><ellipse cx="${right}" cy="${y}" rx="10.5" ry="14"/>${eyeHighlights(left,right,y,true)}<g fill="white" stroke="none" opacity=".82"><circle cx="${left-4}" cy="${y+5}" r="2.2"/><circle cx="${right-4}" cy="${y+5}" r="2.2"/></g>`;
  if(style==='smile')return path(`M83 ${y+1} Q94 ${y-10} 105 ${y+1} M135 ${y+1} Q146 ${y-10} 157 ${y+1}`,'none','stroke-width="5"');
  if(style==='sleepy')return path(`M83 ${y-1} Q94 ${y+5} 105 ${y-1} M135 ${y-1} Q146 ${y+5} 157 ${y-1}`,'none','stroke-width="5"');
  if(style==='sparkle')return renderSparkleEyes(left,right,y);
  const rx=baby?8.5:9,ry=baby?11.5:12;return `<ellipse cx="${left}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse cx="${right}" cy="${y}" rx="${rx}" ry="${ry}"/>${eyeHighlights(left,right,y)}`;
}

function feetFor(color,stage,species){const baby=stage==='baby';if(species==='bird'||species==='penguin'){const foot='#edaa48';return baby?path('M84 188 Q72 204 98 202 M142 202 Q168 204 156 188',foot):path('M82 190 Q67 210 101 206 M139 206 Q173 210 158 190',foot);}return baby?path('M72 183 Q62 204 91 202 L103 188 M137 188 L149 202 Q178 204 168 183',color):path('M72 184 Q59 210 94 207 L106 189 M134 189 L146 207 Q181 210 168 184',color);}
function bellyFor(species,stage){
  if(species==='penguin')return '';
  if(species==='bird')return stage==='adult'?'<ellipse cx="120" cy="169" rx="35" ry="34" fill="#fff3df" opacity=".58" stroke="none"/>':'';
  if(species==='panda')return stage==='adult'?'<ellipse cx="120" cy="182" rx="29" ry="21" fill="#fff3df" opacity=".64" stroke="none"/>':'<ellipse cx="120" cy="181" rx="27" ry="20" fill="#fff3df" opacity=".64" stroke="none"/>';
  if(stage!=='adult')return '';
  return '<ellipse cx="120" cy="171" rx="38" ry="33" fill="#fff3df" opacity=".64" stroke="none"/>';
}
function armLines(species,stage){if(stage!=='adult'||species==='bird'||species==='penguin')return '';return '<path d="M82 151 Q84 174 104 181 Q113 181 116 170 M158 151 Q156 174 136 181 Q127 181 124 170" fill="none"/>';}
function tailFor(species,color,stage){
  if(species==='hamster')return stage==='baby'?`<circle cx="55" cy="169" r="11" fill="${color}"/>`:`<circle cx="57" cy="172" r="13" fill="${color}"/>`;
  if(species==='dog')return path(stage==='baby'?'M178 161 Q205 145 202 174 Q190 181 176 171':'M176 159 Q211 137 207 176 Q193 188 174 174',color);
  if(species==='cat')return stage==='baby'?path('M177 166 Q206 158 202 187 Q189 191 176 179',color):path('M174 174 Q205 167 207 141 Q208 116 224 107 Q231 103 231 112 Q230 120 221 123 Q216 148 215 160 Q211 184 181 187Z',color);
  if(species==='panda'){
    const d=stage==='baby'?'M176 172 Q207 164 205 139':'M174 171 Q213 160 209 120';
    const tx=stage==='baby'?205:209,ty=stage==='baby'?137:118,tr=stage==='baby'?9:11,maneColor=stage==='baby'?'#d89b5c':'#b97845';
    return `<g><path d="${d}" fill="none" stroke="${outline}" stroke-width="11"/><path d="${d}" fill="none" stroke="${color}" stroke-width="6"/><circle cx="${tx}" cy="${ty}" r="${tr}" fill="${maneColor}"/></g>`;
  }
  return '';
}

function speciesDetails(a,color,stage){
  const baby=stage==='baby',baseMouthY=baby?135:132,mouthY=a.species==='cat'&&!baby?128:baseMouthY,cheekY=baby?139:136;let rear=tailFor(a.species,color,stage),markings='',face='',wings='';
  const nose=path(`M115 ${mouthY} Q120 ${mouthY-5} 125 ${mouthY} L120 ${mouthY+5}Z`,outline),smile=path(`M120 ${mouthY+5} Q114 ${mouthY+14} 108 ${mouthY+9} M120 ${mouthY+5} Q126 ${mouthY+14} 132 ${mouthY+9}`);face=nose+smile;
  if(a.species==='bird'||a.species==='penguin')face=path(`M110 ${mouthY-2} L120 ${mouthY+10} L130 ${mouthY-2} Z`,'#edaa48');
  if(a.species==='cat')face+=baby?path(`M70 ${mouthY-4} L51 ${mouthY-8} M70 ${mouthY+4} L50 ${mouthY+8} M170 ${mouthY-4} L189 ${mouthY-8} M170 ${mouthY+4} L190 ${mouthY+8}`):path(`M72 ${mouthY-5} L48 ${mouthY-10} M72 ${mouthY+1} L46 ${mouthY+1} M72 ${mouthY+7} L49 ${mouthY+12} M168 ${mouthY-5} L192 ${mouthY-10} M168 ${mouthY+1} L194 ${mouthY+1} M168 ${mouthY+7} L191 ${mouthY+12}`);
  if(a.species==='dog')face=`<ellipse cx="120" cy="${mouthY+4}" rx="${baby?22:25}" ry="${baby?17:19}" fill="#fff" opacity=".38" stroke="none"/>`+face;
  if(a.species==='hamster')face=`<g fill="#fff3df" stroke="none" opacity=".95"><ellipse cx="78" cy="${cheekY}" rx="${baby?22:23}" ry="${baby?17:18}"/><ellipse cx="162" cy="${cheekY}" rx="${baby?22:23}" ry="${baby?17:18}"/></g>`+face+`<path d="M114 ${mouthY+13} v${baby?9:11} h12 v-${baby?9:11}" fill="white"/>`;
  if(a.species==='panda')face=`<ellipse cx="120" cy="${mouthY+2}" rx="${baby?20:21}" ry="${baby?13:14}" fill="#fff0d2" opacity=".82" stroke="none"/>`+face;
  if(a.species==='bird')wings=path(baby?'M60 146 Q76 132 82 160 M180 146 Q164 132 158 160':'M64 141 Q82 119 88 164 M176 141 Q158 119 152 164');
  if(a.species==='penguin'){rear+=path(baby?'M65 128 Q42 137 43 166 Q56 164 71 151 M175 128 Q198 137 197 166 Q184 164 169 151':'M70 112 Q38 125 40 170 Q56 166 74 146 M170 112 Q202 125 200 170 Q184 166 166 146',color);markings=path(baby?'M82 113 Q84 84 104 95 Q120 108 136 95 Q156 84 158 113 L161 160 Q158 185 120 188 Q82 185 79 160Z':'M80 103 Q80 72 104 87 Q120 103 136 87 Q160 72 160 103 L164 163 Q163 190 120 194 Q77 190 76 163Z','#fff3df');}
  const cheeks=a.species==='hamster'?'':`<g fill="#e69c9c" opacity=".48" stroke="none"><ellipse cx="80" cy="${cheekY}" rx="${baby?11:10}" ry="${baby?7:6}"/><ellipse cx="160" cy="${cheekY}" rx="${baby?11:10}" ry="${baby?7:6}"/></g>`;return {rear,markings,face,wings,cheeks};
}

export function renderPetSVG(value,shop={},stage=''){
  if(!value)return renderMysterySVG(shop);
  const a=resolvedAppearance(value),layers=equippedLayers(shop),resolved=resolvedStage(stage),color=bodyColor(a),bg=backgroundColor(a),details=speciesDetails(a,color,resolved),anatomy=anatomyFor(a,color,resolved),eyes=eyesFor(a,resolved),body=BODIES[resolved][a.species]||BODIES[resolved].cat;
  // Cat and dog parts are rendered at the source; legacy shape observers cannot replace them.
  const character=a.species==='cat'
    ? renderCatArt(color,a.eyeStyle)
    : a.species==='dog'
    ? renderDogArt(color,a.eyeStyle)
    : a.species==='dragon'
    ? renderDragonArt(color,a.eyeStyle)
    : `<g stroke="${outline}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${details.rear}${anatomy}${feetFor(color,resolved,a.species)}${path(body,color)}${bellyFor(a.species,resolved)}${details.markings}${details.wings}<g data-pet-eyes="1" fill="${outline}">${eyes}</g>${details.cheeks}${details.face}${armLines(a.species,resolved)}</g>`;
  const theme=layers.backgrounds?'':backgroundTheme(a.baseBackground);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-pet-stage="${resolved}" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="32" fill="${bg}"/>${theme}${layers.backgrounds}<ellipse class="pet-shadow" cx="120" cy="210" rx="${resolved==='baby'?58:68}" ry="${resolved==='baby'?8:9}" fill="${outline}" opacity=".09"/><g class="pet-jump-layer"><g class="pet-character">${character}${layers.accessories}</g></g>${layers.effects||''}</svg>`;
}

export function appearanceLabel(value){const a=resolvedAppearance(value);const color=OPTIONS.bodyColor.find(x=>x.id===a.bodyColor)?.label||a.bodyColor;return [SPECIES_LABELS[a.species]||a.species,color,EYE_LABELS[a.eyeStyle]||'まんまる',BACKGROUND_LABELS[a.baseBackground]||'おうち'].join('・');}

if(typeof window!=='undefined')queueMicrotask(()=>import('./pet-shop.js?v=1.8.0').then(()=>import('./pet-enhancements.js?v=1.5.7')).catch(error=>console.error('Pet shop failed to load',error)));
function renderMysterySVG(shop){const l=equippedLayers(shop);return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-pet-stage="mystery" aria-label="ふわふわの謎の生き物"><rect width="240" height="240" rx="32" fill="#e3f0fc"/>'+l.backgrounds+'<ellipse cx="120" cy="207" rx="58" ry="8" fill="#40564e" opacity=".1"/><g class="pet-jump-layer"><g class="pet-character"><g><path d="M62 169 Q36 153 52 132 Q33 108 58 94 Q52 66 82 65 Q94 39 116 57 Q139 36 155 61 Q184 54 188 83 Q215 95 196 120 Q215 146 193 161 Q192 191 163 190 Q146 215 122 199 Q96 215 80 193 Q55 196 62 169Z" fill="#fff8ed" stroke="#667b79" stroke-width="4"/><g data-shared-legacy-eyes data-pet-eyes="1" fill="#40564e"><ellipse cx="96" cy="122" rx="8" ry="11"/><ellipse cx="145" cy="122" rx="8" ry="11"/><g fill="white"><circle cx="94" cy="118" r="3"/><circle cx="143" cy="118" r="3"/></g></g><g fill="#f3b5c4" opacity=".7"><ellipse cx="79" cy="140" rx="12" ry="7"/><ellipse cx="162" cy="140" rx="12" ry="7"/></g><path d="M110 144 Q120 155 131 144" fill="none" stroke="#667b79" stroke-width="3" stroke-linecap="round"/></g>'+l.accessories+'</g></g>'+l.effects+'</svg>';}

// Keep the render key on the SVG so cloned markup and module copies share it.
// Wallet/lifecycle updates must retain the current SVG and its animation phase.
export function renderPetVisual(visual,data){
  if(!visual)return false;
  const stage=data.petAdult===false?'mystery':'baby';
  const signature=JSON.stringify([stage,data.petAppearance||null,data.petShop||{}]);
  const current=visual.querySelector(':scope > svg');
  if(current&&current.dataset.petVisualSignature===signature)return false;
  const phases=[...visual.querySelectorAll('.pet-character,.pet-shadow')].flatMap(el=>
    el.getAnimations().filter(a=>/^pet(Waddle|Shadow)/.test(a.animationName||'')).map(a=>({
      selector:el.classList.contains('pet-character')?'.pet-character':'.pet-shadow',
      name:a.animationName,time:a.currentTime
    })));
  visual.innerHTML=renderPetSVG(data.petAdult===false?null:data.petAppearance,data.petShop,stage);
  for(const phase of phases){
    const walk=visual.querySelector(phase.selector)?.getAnimations().find(a=>a.animationName===phase.name);
    if(walk&&phase.time!=null)walk.currentTime=phase.time;
  }
  const svg=visual.querySelector(':scope > svg');
  if(svg)svg.dataset.petVisualSignature=signature;
  return true;
}
