const OUTLINE='#40564e';
const BABY_MANE='#d89452';
const ADULT_MANE='#b87543';
const CREAM='#fff0d2';
const BODY_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);

function babyMane(){
  return 'M120 47 C134 42 147 49 153 60 C169 54 181 62 181 77 C197 81 202 95 194 108 C204 120 197 137 180 141 C177 156 161 164 146 157 C136 171 105 171 94 157 C79 164 63 155 60 141 C43 138 36 122 46 109 C36 96 43 81 60 77 C58 63 73 54 88 61 C95 49 106 44 120 47Z';
}
function adultMane(){
  return 'M120 29 C138 23 153 32 160 46 C179 37 195 47 196 65 C216 71 222 90 211 106 C222 123 214 145 194 150 C191 169 170 181 151 171 C139 188 101 188 88 171 C69 181 48 169 45 150 C25 145 17 123 29 106 C18 89 25 70 45 65 C46 47 62 37 81 46 C88 32 102 24 120 29Z';
}

function babyLion(body,eyeMarkup){
  return `<g data-lion-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M165 166 Q194 168 201 143" fill="none" stroke="${OUTLINE}" stroke-width="12"/>
    <path d="M165 166 Q194 168 201 143" fill="none" stroke="${body}" stroke-width="6"/>
    <path d="M194 136 Q201 126 210 132 Q220 138 215 148 Q211 156 202 153 Q194 159 188 151 Q182 143 188 138 Q191 136 194 136Z" fill="${BABY_MANE}"/>
    <path d="M79 151 Q73 169 80 187 Q91 203 120 203 Q149 203 160 187 Q167 169 161 151 Q144 140 120 140 Q96 140 79 151Z" fill="${body}"/>
    <ellipse cx="120" cy="181" rx="22" ry="18" fill="${CREAM}" stroke="none" opacity=".9"/>
    <path d="${babyMane()}" fill="${BABY_MANE}"/>
    <circle cx="77" cy="78" r="19" fill="${body}"/>
    <circle cx="163" cy="78" r="19" fill="${body}"/>
    <circle cx="77" cy="78" r="10" fill="#f3b7b7" stroke="none"/>
    <circle cx="163" cy="78" r="10" fill="#f3b7b7" stroke="none"/>
    <ellipse cx="120" cy="113" rx="49" ry="44" fill="${body}"/>
    <path d="M91 82 Q98 62 109 68 Q120 52 130 68 Q143 60 151 82 Q141 93 120 90 Q100 93 91 82Z" fill="${BABY_MANE}"/>
    <ellipse cx="91" cy="190" rx="18" ry="11" fill="${body}"/>
    <ellipse cx="149" cy="190" rx="18" ry="11" fill="${body}"/>
    <path d="M84 190 q7 5 14 0 M142 190 q7 5 14 0" fill="none" stroke-width="2.5" opacity=".75"/>
    ${eyeMarkup}
    <g fill="#e69c9c" opacity=".58" stroke="none"><ellipse cx="82" cy="135" rx="12" ry="8"/><ellipse cx="158" cy="135" rx="12" ry="8"/></g>
    <ellipse cx="120" cy="138" rx="27" ry="19" fill="${CREAM}" stroke="none"/>
    <path d="M115 133 Q120 128 125 133 L120 138Z" fill="${OUTLINE}"/>
    <path d="M120 138 Q114 148 107 142 M120 138 Q126 148 133 142" fill="none"/>
  </g>`;
}

function adultLion(body,eyeMarkup){
  return `<g data-lion-dedicated="1" stroke="${OUTLINE}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M168 169 Q207 165 211 121" fill="none" stroke="${OUTLINE}" stroke-width="12"/>
    <path d="M168 169 Q207 165 211 121" fill="none" stroke="${body}" stroke-width="6"/>
    <path d="M202 111 Q211 99 222 106 Q232 114 225 126 Q220 136 210 132 Q201 140 193 132 Q185 124 191 116 Q195 112 202 111Z" fill="${ADULT_MANE}"/>
    <path d="M70 140 Q60 165 68 190 Q80 205 95 205 L145 205 Q160 205 172 190 Q180 165 170 140 Q149 126 120 126 Q91 126 70 140Z" fill="${body}"/>
    <ellipse cx="120" cy="181" rx="27" ry="20" fill="${CREAM}" stroke="none" opacity=".9"/>
    <path d="${adultMane()}" fill="${ADULT_MANE}"/>
    <circle cx="71" cy="66" r="22" fill="${body}"/>
    <circle cx="169" cy="66" r="22" fill="${body}"/>
    <circle cx="71" cy="66" r="12" fill="#f3b7b7" stroke="none"/>
    <circle cx="169" cy="66" r="12" fill="#f3b7b7" stroke="none"/>
    <ellipse cx="120" cy="105" rx="49" ry="44" fill="${body}"/>
    <path d="M86 72 Q95 49 109 57 Q120 39 132 58 Q148 48 157 72 Q146 86 120 83 Q95 86 86 72Z" fill="${ADULT_MANE}"/>
    <ellipse cx="91" cy="195" rx="19" ry="11" fill="${body}"/>
    <ellipse cx="149" cy="195" rx="19" ry="11" fill="${body}"/>
    <path d="M82 195 q9 5 18 0 M140 195 q9 5 18 0" fill="none" stroke-width="2.5" opacity=".75"/>
    ${eyeMarkup}
    <g fill="#e69c9c" opacity=".56" stroke="none"><ellipse cx="80" cy="132" rx="11" ry="7"/><ellipse cx="160" cy="132" rx="11" ry="7"/></g>
    <ellipse cx="120" cy="133" rx="28" ry="19" fill="${CREAM}" stroke="none"/>
    <path d="M115 128 Q120 123 125 128 L120 133Z" fill="${OUTLINE}"/>
    <path d="M120 133 Q114 144 106 138 M120 133 Q126 144 134 138" fill="none"/>
    <path d="M74 149 Q83 163 95 168 M166 149 Q157 163 145 168" fill="none" opacity=".72"/>
  </g>`;
}

function findBodyColor(character){
  for(const el of character.querySelectorAll('[fill]')){
    const fill=(el.getAttribute('fill')||'').toLowerCase();
    if(BODY_COLORS.has(fill))return fill;
  }
  return '#f5d99b';
}

function redrawLion(svg){
  if(!(svg instanceof SVGElement)||svg.dataset.lionDedicatedV149==='1')return;
  const character=svg.querySelector('.pet-character');
  if(!character)return;
  const legacyMane=character.querySelector('ellipse[fill="#d89b5c"],ellipse[fill="#b97845"],path[fill="#d89b5c"],path[fill="#b97845"]');
  if(!legacyMane)return;
  const stage=svg.dataset.petStage==='baby'?'baby':'adult';
  const body=findBodyColor(character);
  const generic=character.firstElementChild;
  const eyeGroup=generic?.querySelector(`g[fill="${OUTLINE}"]`);
  const eyeMarkup=eyeGroup?.outerHTML||'';
  const accessories=[...character.children].slice(1).map(el=>el.outerHTML).join('');
  character.innerHTML=(stage==='baby'?babyLion(body,eyeMarkup):adultLion(body,eyeMarkup))+accessories;
  svg.dataset.lionDedicatedV149='1';
}

function scan(root=document){
  if(root instanceof SVGElement)redrawLion(root);
  root.querySelectorAll?.('svg').forEach(redrawLion);
}

function start(){
  scan();
  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(node instanceof Element||node.nodeType===Node.TEXT_NODE)scan(node);
      }
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
