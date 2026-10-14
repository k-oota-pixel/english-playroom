import {OPTIONS,normalizeAppearance,equippedLayers} from './pet-model.js';
const outline='#40564e';
const bodies={
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
  const cheeks='<g fill="#e69c9c" opacity=".5" stroke="none"><ellipse cx="80" cy="128" rx="9" ry="5"/><ellipse cx="160" cy="128" rx="9" ry="5"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false"><rect width="240" height="240" rx="32" fill="${bg}"/>${layers.backgrounds}<ellipse cx="120" cy="207" rx="66" ry="9" fill="${outline}" opacity=".09"/><g stroke="${outline}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">${feature}${path('M78 180 Q65 205 87 204 L103 186 M137 186 L153 204 Q175 205 162 180',color)}${path(bodies[a.species],color)}<g fill="${outline}" stroke="${outline}" opacity=".22">${pattern}${layers.patterns}</g>${wings}<g fill="${outline}">${eyes}</g>${cheeks}${face}</g>${layers.accessories}</svg>`;
}
export function appearanceLabel(value) {const a=normalizeAppearance(value);return Object.entries(OPTIONS).map(([key,items])=>items.find(x=>x.id===a[key]).label).join('・');}
