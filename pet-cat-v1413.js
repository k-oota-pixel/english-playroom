const OUTLINE='#40564e';
const CREAM='#fff0d2';
const INNER_EAR='#f3b08c';
const NOSE='#e88798';
const CHEEK='#ed95a6';
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

function scaledEyes(eyeMarkup,stage){
  if(!eyeMarkup)return '';
  if(stage==='baby')return `<g transform="translate(120 108) scale(1.30) translate(-120 -114)">${eyeMarkup}</g>`;
  return `<g transform="translate(120 99) scale(1.28) translate(-120 -108)">${eyeMarkup}</g>`;
}

function babyCat(body,eyeMarkup){
  const eyes=scaledEyes(eyeMarkup,'baby');
  return `<g data-cat-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- curled tail -->
    <path d="M78 177 Q45 187 36 162 Q27 136 45 116 Q59 101 77 113" fill="none" stroke="${OUTLINE}" stroke-width="20"/>
    <path d="M78 177 Q45 187 36 162 Q27 136 45 116 Q59 101 77 113" fill="none" stroke="${body}" stroke-width="12"/>
    <path d="M43 126 Q54 108 70 112" fill="none" stroke="${CREAM}" stroke-width="8"/>

    <!-- compact kitten body -->
    <path d="M78 143 Q87 132 102 130 Q120 127 138 130 Q153 132 162 143 Q174 160 171 184 Q167 201 151 206 Q138 210 120 207 Q102 210 89 206 Q73 201 69 184 Q66 160 78 143Z" fill="${body}"/>
    <ellipse cx="77" cy="186" rx="22" ry="18" fill="${body}"/>
    <ellipse cx="163" cy="186" rx="22" ry="18" fill="${body}"/>

    <!-- ears behind head -->
    <path d="M76 83 L72 47 Q71 39 79 44 L101 66Z" fill="${body}"/>
    <path d="M164 83 L168 47 Q169 39 161 44 L139 66Z" fill="${body}"/>
    <path d="M79 67 L78 52 L94 66Z" fill="${INNER_EAR}" stroke="none"/>
    <path d="M161 67 L162 52 L146 66Z" fill="${INNER_EAR}" stroke="none"/>

    <!-- large rounded kitten head -->
    <path d="M62 91 Q64 71 82 59 Q99 48 113 54 Q120 48 127 54 Q142 48 158 59 Q176 71 178 91 Q184 111 175 127 Q168 139 155 146 Q142 154 120 155 Q98 154 85 146 Q72 139 65 127 Q56 111 62 91Z" fill="${body}"/>

    <!-- forehead tuft -->
    <path d="M105 58 Q110 48 118 55 Q122 43 128 55 Q135 49 139 60" fill="${body}"/>

    <!-- cream lower face -->
    <path d="M72 122 Q82 110 99 111 Q120 104 141 111 Q158 110 168 122 Q165 142 149 149 Q136 155 120 155 Q104 155 91 149 Q75 142 72 122Z" fill="${CREAM}" stroke="none"/>

    <!-- swappable eye layer -->
    ${eyes}

    <!-- cheeks -->
    <g fill="${CHEEK}" opacity=".52" stroke="none"><ellipse cx="80" cy="132" rx="10" ry="7"/><ellipse cx="160" cy="132" rx="10" ry="7"/></g>

    <!-- nose, mouth, whiskers -->
    <path d="M115 130 Q120 125 125 130 L120 136Z" fill="${NOSE}"/>
    <path d="M120 136 Q114 145 106 139 M120 136 Q126 145 134 139" fill="none" stroke-width="3.2"/>
    <path d="M88 135 L69 131 M89 142 L67 142 M152 135 L171 131 M151 142 L173 142" fill="none" stroke-width="2.2" opacity=".82"/>

    <!-- chest ruff -->
    <path d="M101 149 Q109 142 116 148 L120 154 L124 148 Q131 142 139 149 Q136 157 141 163 Q135 174 129 187 Q124 197 120 201 Q116 197 111 187 Q105 174 99 163 Q104 157 101 149Z" fill="${CREAM}" stroke="none"/>

    <!-- rounded front legs -->
    <path d="M91 162 Q88 181 91 198 Q96 205 105 203 Q111 197 108 180 L107 165" fill="${body}"/>
    <path d="M149 162 Q152 181 149 198 Q144 205 135 203 Q129 197 132 180 L133 165" fill="${body}"/>
    <path d="M90 192 Q98 198 107 194 L107 202 Q98 208 90 202Z" fill="${CREAM}" stroke="none"/>
    <path d="M150 192 Q142 198 133 194 L133 202 Q142 208 150 202Z" fill="${CREAM}" stroke="none"/>
    <path d="M94 199 q4 4 8 0 M138 199 q4 4 8 0" fill="none" stroke-width="2.1" opacity=".6"/>
  </g>`;
}

function adultCat(body,eyeMarkup){
  const eyes=scaledEyes(eyeMarkup,'adult');
  return `<g data-cat-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- long elegant tail -->
    <path d="M161 181 Q194 183 202 150 Q210 118 190 98 Q177 84 162 94" fill="none" stroke="${OUTLINE}" stroke-width="20"/>
    <path d="M161 181 Q194 183 202 150 Q210 118 190 98 Q177 84 162 94" fill="none" stroke="${body}" stroke-width="12"/>
    <path d="M193 120 Q185 100 169 96" fill="none" stroke="${CREAM}" stroke-width="8"/>

    <!-- taller mature body -->
    <path d="M80 129 Q90 117 104 115 Q120 112 136 115 Q150 117 160 129 Q170 149 168 181 Q165 202 149 208 Q136 212 120 209 Q104 212 91 208 Q75 202 72 181 Q70 149 80 129Z" fill="${body}"/>
    <ellipse cx="78" cy="187" rx="23" ry="18" fill="${body}"/>
    <ellipse cx="162" cy="187" rx="23" ry="18" fill="${body}"/>

    <!-- tall pointed ears -->
    <path d="M75 71 L65 25 Q63 17 71 22 L101 53Z" fill="${body}"/>
    <path d="M165 71 L175 25 Q177 17 169 22 L139 53Z" fill="${body}"/>
    <path d="M78 58 L70 33 L94 54Z" fill="${INNER_EAR}" stroke="none"/>
    <path d="M162 58 L170 33 L146 54Z" fill="${INNER_EAR}" stroke="none"/>

    <!-- mature cat head -->
    <path d="M67 76 Q71 56 91 46 Q106 38 114 45 Q120 39 126 45 Q134 38 149 46 Q169 56 173 76 Q179 97 171 114 Q165 126 153 134 Q141 141 120 142 Q99 141 87 134 Q75 126 69 114 Q61 97 67 76Z" fill="${body}"/>

    <!-- neat forehead tuft -->
    <path d="M105 48 Q111 38 118 46 Q123 34 129 47 Q136 41 140 51" fill="${body}"/>

    <!-- cream lower face -->
    <path d="M73 111 Q84 101 100 103 Q120 96 140 103 Q156 101 167 111 Q164 131 149 137 Q136 142 120 142 Q104 142 91 137 Q76 131 73 111Z" fill="${CREAM}" stroke="none"/>

    <!-- swappable eye layer -->
    ${eyes}

    <g fill="${CHEEK}" opacity=".46" stroke="none"><ellipse cx="81" cy="123" rx="10" ry="6"/><ellipse cx="159" cy="123" rx="10" ry="6"/></g>

    <!-- adult face -->
    <path d="M115 120 Q120 115 125 120 L120 126Z" fill="${NOSE}"/>
    <path d="M120 126 Q114 135 106 130 M120 126 Q126 135 134 130" fill="none" stroke-width="3.1"/>
    <path d="M90 126 L68 121 M91 133 L66 133 M150 126 L172 121 M149 133 L174 133" fill="none" stroke-width="2.1" opacity=".82"/>

    <!-- adult chest ruff -->
    <path d="M101 137 Q109 129 116 136 L120 143 L124 136 Q131 129 139 137 Q135 146 141 153 Q137 166 131 182 Q126 196 120 202 Q114 196 109 182 Q103 166 99 153 Q105 146 101 137Z" fill="${CREAM}" stroke="none"/>

    <!-- long front legs -->
    <path d="M94 149 Q90 177 93 200 Q99 208 108 204 Q113 194 109 168 L108 152" fill="${body}"/>
    <path d="M146 149 Q150 177 147 200 Q141 208 132 204 Q127 194 131 168 L132 152" fill="${body}"/>
    <path d="M93 193 Q101 199 109 195 L109 204 Q100 210 93 203Z" fill="${CREAM}" stroke="none"/>
    <path d="M147 193 Q139 199 131 195 L131 204 Q140 210 147 203Z" fill="${CREAM}" stroke="none"/>
    <path d="M97 201 q4 4 8 0 M135 201 q4 4 8 0" fill="none" stroke-width="2.1" opacity=".6"/>
  </g>`;
}

function redrawCat(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.catDedicatedV1414==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character||!isLegacyCat(character))return;

  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const body=findBodyColor(character);
  const generic=character.firstElementChild;
  const eyeGroup=generic?.querySelector(`g[fill="${OUTLINE}"]`);
  const eyeMarkup=eyeGroup?.outerHTML||'';
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');

  character.innerHTML=(stage==='baby'?babyCat(body,eyeMarkup):adultCat(body,eyeMarkup))+accessories;
  svg.dataset.catDedicatedV1414='1';
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
