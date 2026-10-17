const OUTLINE='#40564e';
const CREAM='#fff0d2';
const INNER_EAR='#f2a8a8';
const NOSE='#e38f9c';
const CHEEK='#e995a5';
const CAT_BABY_EARS='M67 91 L70 52 L101 72 M139 72 L170 52 L173 91';
const CAT_ADULT_EARS='M68 81 L64 23 L102 58 M138 58 L176 23 L172 81';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);

function isLegacyCat(character){
  for(const el of character.querySelectorAll('path[d]')){
    const d=el.getAttribute('d');
    if(d===CAT_BABY_EARS||d===CAT_ADULT_EARS)return true;
  }
  return false;
}

function findBodyColor(character){
  for(const el of character.querySelectorAll('[fill]')){
    const fill=(el.getAttribute('fill')||'').toLowerCase();
    if(BODY_COLORS.has(fill))return fill;
  }
  return '#f3b5c4';
}

function babyCat(body,eyeMarkup){
  return `<g data-cat-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- curled tail behind the body -->
    <path d="M78 173 Q45 183 39 154 Q33 127 52 113 Q65 104 78 116" fill="none" stroke="${OUTLINE}" stroke-width="18"/>
    <path d="M78 173 Q45 183 39 154 Q33 127 52 113 Q65 104 78 116" fill="none" stroke="${body}" stroke-width="11"/>
    <path d="M49 127 Q57 113 72 116" fill="none" stroke="${CREAM}" stroke-width="7"/>

    <!-- soft kitten body -->
    <path d="M77 151 Q84 137 101 134 Q120 131 139 134 Q156 137 163 151 Q171 171 166 190 Q158 204 143 205 L97 205 Q82 204 74 190 Q69 171 77 151Z" fill="${body}"/>
    <ellipse cx="79" cy="183" rx="22" ry="19" fill="${body}"/>
    <ellipse cx="161" cy="183" rx="22" ry="19" fill="${body}"/>

    <!-- chest and belly -->
    <path d="M104 148 Q111 142 120 148 Q129 142 136 148 Q133 158 140 165 Q136 181 128 194 Q120 201 112 194 Q104 181 100 165 Q107 158 104 148Z" fill="${CREAM}" stroke="none"/>

    <!-- front legs -->
    <path d="M91 161 Q88 181 91 197 Q97 204 106 202 Q111 196 108 181 L107 164" fill="${body}"/>
    <path d="M149 161 Q152 181 149 197 Q143 204 134 202 Q129 196 132 181 L133 164" fill="${body}"/>
    <path d="M92 191 Q98 196 106 193 L106 201 Q98 207 91 201Z" fill="${CREAM}" stroke="none"/>
    <path d="M148 191 Q142 196 134 193 L134 201 Q142 207 149 201Z" fill="${CREAM}" stroke="none"/>
    <path d="M95 198 q4 4 8 0 M137 198 q4 4 8 0" fill="none" stroke-width="2.2" opacity=".65"/>

    <!-- ears -->
    <path d="M74 83 L72 45 Q72 38 78 42 L101 66Z" fill="${body}"/>
    <path d="M166 83 L168 45 Q168 38 162 42 L139 66Z" fill="${body}"/>
    <path d="M79 69 L78 51 L94 66Z" fill="${INNER_EAR}" stroke="none"/>
    <path d="M161 69 L162 51 L146 66Z" fill="${INNER_EAR}" stroke="none"/>

    <!-- big round kitten head -->
    <path d="M67 91 Q70 67 91 57 Q120 45 149 57 Q170 67 173 91 Q180 115 168 135 Q154 153 120 155 Q86 153 72 135 Q60 115 67 91Z" fill="${body}"/>

    <!-- little forehead tuft -->
    <path d="M106 57 Q111 47 119 54 Q124 43 129 55 Q137 48 139 59" fill="${body}"/>

    <!-- eye layer stays swappable -->
    ${eyeMarkup}

    <!-- cheeks, muzzle, nose, mouth -->
    <g fill="${CHEEK}" opacity=".48" stroke="none"><ellipse cx="79" cy="136" rx="11" ry="7"/><ellipse cx="161" cy="136" rx="11" ry="7"/></g>
    <ellipse cx="120" cy="137" rx="28" ry="19" fill="${CREAM}" stroke="none"/>
    <path d="M115 132 Q120 127 125 132 L120 138Z" fill="${NOSE}"/>
    <path d="M120 138 Q114 147 106 142 M120 138 Q126 147 134 142" fill="none" stroke-width="3.2"/>
    <path d="M91 139 L72 135 M91 145 L70 145 M149 139 L168 135 M149 145 L170 145" fill="none" stroke-width="2.2" opacity=".82"/>
  </g>`;
}

function adultCat(body,eyeMarkup){
  return `<g data-cat-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- longer elegant tail -->
    <path d="M77 176 Q39 185 35 149 Q31 114 58 94 Q71 84 84 94" fill="none" stroke="${OUTLINE}" stroke-width="18"/>
    <path d="M77 176 Q39 185 35 149 Q31 114 58 94 Q71 84 84 94" fill="none" stroke="${body}" stroke-width="11"/>
    <path d="M45 121 Q52 101 69 94" fill="none" stroke="${CREAM}" stroke-width="7"/>

    <!-- slimmer adult body -->
    <path d="M82 137 Q91 124 104 122 Q120 119 136 122 Q149 124 158 137 Q168 157 165 184 Q159 204 143 207 L97 207 Q81 204 75 184 Q72 157 82 137Z" fill="${body}"/>
    <ellipse cx="82" cy="188" rx="21" ry="17" fill="${body}"/>
    <ellipse cx="158" cy="188" rx="21" ry="17" fill="${body}"/>

    <!-- fluffy cream chest -->
    <path d="M103 140 Q110 132 120 140 Q130 132 137 140 Q132 149 140 156 Q137 171 131 187 Q126 200 120 204 Q114 200 109 187 Q103 171 100 156 Q108 149 103 140Z" fill="${CREAM}" stroke="none"/>

    <!-- straight adult front legs -->
    <path d="M95 153 Q91 179 94 199 Q100 207 108 203 Q112 193 109 171 L108 155" fill="${body}"/>
    <path d="M145 153 Q149 179 146 199 Q140 207 132 203 Q128 193 131 171 L132 155" fill="${body}"/>
    <path d="M94 193 Q101 198 108 194 L108 203 Q100 209 94 202Z" fill="${CREAM}" stroke="none"/>
    <path d="M146 193 Q139 198 132 194 L132 203 Q140 209 146 202Z" fill="${CREAM}" stroke="none"/>
    <path d="M98 201 q4 4 8 0 M134 201 q4 4 8 0" fill="none" stroke-width="2.1" opacity=".65"/>

    <!-- sharper adult ears -->
    <path d="M76 73 L65 24 Q64 17 71 22 L99 53Z" fill="${body}"/>
    <path d="M164 73 L175 24 Q176 17 169 22 L141 53Z" fill="${body}"/>
    <path d="M78 60 L70 32 L93 54Z" fill="${INNER_EAR}" stroke="none"/>
    <path d="M162 60 L170 32 L147 54Z" fill="${INNER_EAR}" stroke="none"/>

    <!-- slightly smaller, mature head -->
    <path d="M69 77 Q74 56 94 47 Q120 36 146 47 Q166 56 171 77 Q178 102 168 122 Q155 140 120 142 Q85 140 72 122 Q62 102 69 77Z" fill="${body}"/>

    <!-- neat forehead tuft -->
    <path d="M106 48 Q112 38 119 46 Q124 34 130 47 Q137 41 140 51" fill="${body}"/>

    <!-- eye layer stays swappable -->
    ${eyeMarkup}

    <!-- adult cat face -->
    <g fill="${CHEEK}" opacity=".42" stroke="none"><ellipse cx="80" cy="130" rx="10" ry="6"/><ellipse cx="160" cy="130" rx="10" ry="6"/></g>
    <ellipse cx="120" cy="131" rx="27" ry="18" fill="${CREAM}" stroke="none"/>
    <path d="M115 126 Q120 121 125 126 L120 132Z" fill="${NOSE}"/>
    <path d="M120 132 Q114 141 106 136 M120 132 Q126 141 134 136" fill="none" stroke-width="3.1"/>
    <path d="M91 132 L69 127 M91 139 L67 139 M149 132 L171 127 M149 139 L173 139" fill="none" stroke-width="2.1" opacity=".82"/>
  </g>`;
}

function redrawCat(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDedicatedV1413==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character||!isLegacyCat(character))return;

  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const body=findBodyColor(character);
  const generic=character.firstElementChild;
  const eyeGroup=generic?.querySelector(`g[fill="${OUTLINE}"]`);
  const eyeMarkup=eyeGroup?.outerHTML||'';
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');

  character.innerHTML=(stage==='baby'?babyCat(body,eyeMarkup):adultCat(body,eyeMarkup))+accessories;
  svg.dataset.catDedicatedV1413='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redrawCat(root);
  root.querySelectorAll?.('svg').forEach(redrawCat);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element)scan(node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
