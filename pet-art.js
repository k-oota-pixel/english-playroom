import {OPTIONS,normalizeAppearance,equippedLayers} from './pet-model.js';
const outline='#40564e';
const bodies={
  rabbit:'M65 105 C65 70 85 58 120 58 C155 58 175 70 175 105 L175 147 Q176 192 120 192 Q64 192 65 147Z',
  hamster:'M48 118 Q45 62 120 62 Q195 62 192 118 L196 145 Q195 195 120 195 Q45 195 44 145Z',
  fox:'M60 103 L78 65 Q120 49 162 65 L180 103 L171 150 Q160 188 120 192 Q80 188 69 150Z',
  panda:'M56 108 Q53 57 120 57 Q187 57 184 108 L184 149 Q183 194 120 194 Q57 194 56 149Z',
  penguin:'M70 101 Q68 54 120 54 Q172 54 170 101 L182 159 Q181 195 120 195 Q59 195 58 159Z',
  dragon:'M64 103 Q65 56 120 56 Q175 56 176 103 L177 149 Q180 192 120 192 Q60 192 63 149Z',
  cat:'M60 106 C60 69 81 50 120 50 C159 50 180 69 180 106 L180 143 C180 175 157 191 120 191 C83 191 60 175 60 143 Z',
  dog:'M57 105 C57 72 85 55 120 55 C155 55 183 72 183 105 L183 145 C183 178 157 190 120 190 C83 190 57 178 57 145 Z',
  bird:'M65 103 C65 68 88 53 120 53 C152 53 175 68 175 103 Q198 188 120 194 Q42 188 65 103Z',
  mystery:'M63 104 Q60 50 120 50 Q180 50 177 104 L182 166 Q180 189 160 188 Q146 204 130 191 Q118 205 104 191 Q80 201 72 182 Q53 180 58 163Z'
};
const path=(d,fill='none')=>`<path d="${d}" fill="${fill}"/>`;
const star=(x,y)=>`<path d="M${x} ${y-13} l4 8 9 2 -6 6 1 9 -8 -4 -8 4 1 -9 -6 -6 9 -2Z"/>`;
export function renderPetSVG(value,shop={}) {
  const a=normalizeAppearance(value), layers=equippedLayers(shop);
  const color=OPTIONS.bodyColor.find(x=>x.id===a.bodyColor).color;
  const bg=OPTIONS.baseBackground.find(x=>x.id===a.baseBackground).color;
  let feature='';
  if(a.feature==='horns') feature=path('M78 64 Q75 29 90 24 L103 56',color)+path('M137 56 L150 24 Q165 29 162 64',color);
  else if(a.species==='cat') feature=path(a.feature==='long'?'M65 80 L61 19 Q85 26 99 56 M141 56 Q155 26 179 19 L175 80':'M65 80 L67 38 L101 57 M139 57 L173 38 L175 80',color);
  else if(a.species==='dog') feature=path(a.feature==='long'?'M78 58 Q35 45 36 116 Q45 142 65 117 L85 72 M162 58 Q205 45 204 116 Q195 142 175 117 L155 72':'M78 58 Q44 45 43 92 Q53 114 70 93 L85 72 M162 58 Q196 45 197 92 Q187 114 170 93 L155 72',color);
  else if(a.species==='bird') feature=path(a.feature==='long'?'M100 56 Q90 6 112 29 L120 48 Q132 3 139 30 L136 58':'M108 56 Q98 25 115 36 L123 49 Q133 21 137 44 L133 58',color);
  else if(a.species==='rabbit') feature=path(a.feature==='long'?'M79 76 Q45 4 77 8 Q97 12 101 66 M139 66 Q143 12 163 8 Q195 4 161 76':'M79 76 Q53 13 78 18 Q97 23 101 66 M139 66 Q143 23 162 18 Q187 13 161 76',color);
  else if(a.species==='fox') feature=path(a.feature==='long'?'M63 91 L53 12 L107 64 M133 64 L187 12 L177 91':'M63 91 L60 30 L107 64 M133 64 L180 30 L177 91',color);
  else if(a.species==='hamster'||a.species==='panda') feature=`<ellipse cx="72" cy="65" rx="23" ry="${a.feature==='long'?36:23}" fill="${a.species==='panda'?outline:color}"/><ellipse cx="168" cy="65" rx="23" ry="${a.feature==='long'?36:23}" fill="${a.species==='panda'?outline:color}"/>`;
  else if(a.species==='penguin') feature=path(a.feature==='long'?'M103 59 Q94 14 115 27 L121 47 Q140 12 141 40 L133 60':'M106 60 L112 41 L121 51 L133 40 L136 61',color);
  else if(a.species==='dragon') feature=path(a.feature==='long'?'M77 71 L67 16 L104 59 M136 59 L173 16 L163 71':'M77 71 L77 30 L104 59 M136 59 L163 30 L163 71',color);
  else feature=path(a.feature==='long'?'M78 61 Q49 10 71 13 Q97 21 98 57 M142 57 Q143 21 169 13 Q191 10 162 61':'M79 63 Q61 35 79 34 L101 57 M139 57 L161 34 Q179 35 161 63',color);
  let eyes='';
  if(a.eyes==='round') eyes='<ellipse cx="94" cy="109" rx="7" ry="10"/><ellipse cx="146" cy="109" rx="7" ry="10"/><g fill="white" stroke="none"><circle cx="92" cy="106" r="2.5"/><circle cx="144" cy="106" r="2.5"/></g>';
  if(a.eyes==='sleepy') eyes=path('M84 111 Q94 100 104 111 M136 111 Q146 100 156 111');
  if(a.eyes==='cool') eyes=path('M83 102 L105 105 M135 105 L157 102')+'<ellipse cx="95" cy="110" rx="5" ry="6"/><ellipse cx="145" cy="110" rx="5" ry="6"/>';
  if(a.eyes==='sparkle') eyes=star(94,109)+star(146,109);
  let pattern='';
  if(a.pattern==='spots') pattern='<circle cx="77" cy="145" r="9"/><circle cx="158" cy="159" r="12"/><circle cx="113" cy="174" r="7"/>';
  if(a.pattern==='stripes') pattern=path('M61 143 L88 149 M61 159 L83 165 M179 143 L152 149 M179 159 L157 165');
  if(a.pattern==='star') pattern=star(120,163);
  let face=path('M116 130 Q120 125 124 130 L120 135Z',outline)+path('M120 135 Q114 144 108 139 M120 135 Q126 144 132 139');
  if(a.species==='bird')face=path('M111 129 L120 140 L129 129 Z','#edaa48');
  if(a.species==='cat')face+=path('M70 127 L52 123 M70 135 L51 138 M170 127 L188 123 M170 135 L189 138');
  if(a.species==='dog')face='<ellipse cx="120" cy="134" rx="24" ry="18" fill="#fff" opacity=".4" stroke="none"/>'+face;
  if(a.species==='mystery')face=path('M109 132 Q120 149 131 132');
  const wings=a.species==='bird'?path('M65 139 Q80 123 83 153 M175 139 Q160 123 157 153'):'';
  if(a.species==='penguin')face=path('M110 129 L120 141 L130 129 Z','#edaa48');
  if(a.species==='hamster')face='<g fill="#fff3df" stroke="none" opacity=".8"><ellipse cx="78" cy="139" rx="20" ry="15"/><ellipse cx="162" cy="139" rx="20" ry="15"/></g>'+face+'<path d="M114 143 v10 h12 v-10" fill="white"/>';
  if(a.species==='rabbit')face+='<path d="M115 143 v9 h10 v-9" fill="white"/>';
  let rear='',markings='';
  if(a.species==='fox') {
    rear=path('M160 184 Q228 184 214 104 Q181 121 179 155 L153 168Z',color)+path('M214 104 Q222 135 211 151 L193 139 Q199 118 214 104Z','#fff3df');
    markings=path('M65 112 Q92 118 120 143 Q148 118 175 112 L167 150 Q145 178 120 180 Q95 178 73 150Z','#fff3df');
  }
  if(a.species==='panda')markings='<g fill="'+outline+'" stroke="none" opacity=".3"><ellipse cx="94" cy="110" rx="18" ry="23" transform="rotate(25 94 110)"/><ellipse cx="146" cy="110" rx="18" ry="23" transform="rotate(-25 146 110)"/></g>';
  if(a.species==='penguin'){
    rear=path('M70 113 Q37 124 39 164 Q55 161 73 144 M170 113 Q203 124 201 164 Q185 161 167 144',color);
    markings=path('M80 105 Q80 75 104 88 Q120 103 136 88 Q160 75 160 105 L163 156 Q163 182 120 184 Q77 182 77 156Z','#fff3df');
  }
  if(a.species==='dragon'){
    rear=path('M73 119 L28 78 L27 145 L45 137 L55 160 L78 151 M167 119 L212 78 L213 145 L195 137 L185 160 L162 151',color)+path('M153 180 Q198 202 209 168 L219 178 Q205 222 156 198Z',color);
    markings=path('M105 147 Q120 140 135 147 L143 180 Q120 196 97 180Z','#fff3df')+path('M108 159 L132 159 M105 171 L135 171');
  }
  const cheeks='<g fill="#e69c9c" opacity=".5" stroke="none"><ellipse cx="80" cy="128" rx="9" ry="5"/><ellipse cx="160" cy="128" rx="9" ry="5"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="32" fill="${bg}"/>${layers.backgrounds}<ellipse cx="120" cy="207" rx="66" ry="9" fill="${outline}" opacity=".09"/><g stroke="${outline}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${rear}${feature}${path('M78 180 Q65 205 87 204 L103 186 M137 186 L153 204 Q175 205 162 180',color)}${path(bodies[a.species],color)}${markings}<g fill="${outline}" stroke="${outline}" opacity=".22">${pattern}${layers.patterns}</g>${wings}<g fill="${outline}">${eyes}</g>${cheeks}${face}</g>${layers.accessories}${layers.effects||''}</svg>`;
}
export function appearanceLabel(value) {const a=normalizeAppearance(value);return Object.entries(OPTIONS).map(([key,items])=>items.find(x=>x.id===a[key]).label).join('・');}

if(typeof window!=='undefined'){
  queueMicrotask(()=>import('./pet-shop.js').catch(error=>console.error('Pet shop failed to load',error)));
}
