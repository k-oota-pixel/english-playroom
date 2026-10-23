import {renderCompanionEyes} from './pet-companion-eyes.js?v=1.8.26';

// Dragon body only. Existing body-color choices and shared companion eyes are reused as-is.
const ALLOWED_COLORS=new Set(['#f5d99b','#f3b5c4','#a4cce9','#a9d9bc','#c6b8e3','#efb478']);
const ALLOWED_EYES=new Set(['round','gentle','watery','smile','sleepy','sparkle','oyoyo','mugyu']);

function mix(hex,target='#000000',amount=.16){
  const clean=String(hex).replace('#','');
  const to=String(target).replace('#','');
  if(clean.length!==6||to.length!==6)return hex;
  const src=[0,2,4].map(i=>parseInt(clean.slice(i,i+2),16));
  const dst=[0,2,4].map(i=>parseInt(to.slice(i,i+2),16));
  const out=src.map((v,i)=>Math.round(v+(dst[i]-v)*amount).toString(16).padStart(2,'0'));
  return '#'+out.join('');
}

export function renderDragonArt(color,eyeStyle){
  color=ALLOWED_COLORS.has(color)?color:'#a9d9bc';
  eyeStyle=ALLOWED_EYES.has(eyeStyle)?eyeStyle:'round';
  const ink='#40564e';
  const cream='#fff3cf';
  const accent=mix(color,'#1f6f55',.42);
  const wing=mix(color,'#155f50',.52);
  const soft=mix(color,'#ffffff',.28);
  const eyes=renderCompanionEyes(eyeStyle);

  return `<g data-pet-dragon-art="editable" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <!-- rear tail -->
    <path d="M155 176 Q185 178 196 159 Q207 139 216 145 Q225 151 217 169 Q207 194 167 200Z" fill="${color}"/>
    <path d="M178 191 Q200 182 209 164 Q214 154 217 151 Q220 160 214 171 Q203 193 175 199Z" fill="${cream}" stroke="none" opacity=".92"/>
    <path d="M179 176 l8 -9 l6 11 l9 -8 l3 12" fill="${accent}" stroke="none"/>

    <!-- wings -->
    <path d="M82 139 Q55 126 43 145 Q36 157 47 169 L60 158 L67 176 L79 158 L91 166 L95 143Z" fill="${wing}"/>
    <path d="M158 139 Q185 126 197 145 Q204 157 193 169 L180 158 L173 176 L161 158 L149 166 L145 143Z" fill="${wing}"/>
    <path d="M49 149 Q61 143 82 150 M191 149 Q179 143 158 150" fill="none" stroke="${cream}" stroke-width="3" opacity=".85"/>

    <!-- body -->
    <path d="M91 139 Q72 153 73 181 Q74 205 120 209 Q166 205 167 181 Q168 153 149 139Z" fill="${color}"/>
    <path d="M105 145 Q96 160 98 184 Q100 201 120 204 Q140 201 142 184 Q144 160 135 145Z" fill="${cream}" stroke="none"/>
    <path d="M102 165 H138 M100 181 H140 M104 196 H136" fill="none" stroke="${mix(cream,'#d8bd82',.28)}" stroke-width="2.3" opacity=".8"/>

    <!-- feet -->
    <ellipse cx="91" cy="197" rx="20" ry="14" fill="${color}"/>
    <ellipse cx="149" cy="197" rx="20" ry="14" fill="${color}"/>
    <g fill="${cream}" stroke="none"><ellipse cx="82" cy="202" rx="4" ry="5"/><ellipse cx="91" cy="204" rx="4" ry="5"/><ellipse cx="100" cy="202" rx="4" ry="5"/><ellipse cx="140" cy="202" rx="4" ry="5"/><ellipse cx="149" cy="204" rx="4" ry="5"/><ellipse cx="158" cy="202" rx="4" ry="5"/></g>

    <!-- horns and side frills, behind head -->
    <path d="M79 63 Q72 42 81 30 Q88 37 91 59Z" fill="${cream}"/>
    <path d="M161 63 Q168 42 159 30 Q152 37 149 59Z" fill="${cream}"/>
    <path d="M63 83 Q43 78 46 99 Q48 110 59 108 Q48 121 66 124" fill="${soft}"/>
    <path d="M177 83 Q197 78 194 99 Q192 110 181 108 Q192 121 174 124" fill="${soft}"/>

    <!-- head -->
    <path d="M64 78 Q70 49 120 45 Q170 49 176 78 Q185 94 180 119 Q174 153 120 156 Q66 153 60 119 Q55 94 64 78Z" fill="${color}"/>

    <!-- crest -->
    <path d="M104 51 Q104 34 113 39 Q118 23 123 39 Q133 31 133 51" fill="${accent}"/>
    <path d="M111 54 Q118 44 120 32 Q126 44 130 55" fill="${accent}" stroke="none"/>

    <!-- shared existing eyes -->
    <g data-pet-eyes="1" data-dragon-eye-style="${eyeStyle}" fill="${ink}" stroke="none">${eyes}</g>

    <!-- cheeks -->
    <g fill="#f3b5c4" opacity=".78" stroke="none"><ellipse cx="79" cy="128" rx="10" ry="6"/><ellipse cx="161" cy="128" rx="10" ry="6"/></g>

    <!-- snout and face -->
    <ellipse cx="120" cy="126" rx="25" ry="18" fill="${soft}" stroke="none" opacity=".58"/>
    <g fill="${ink}" stroke="none"><ellipse cx="113" cy="123" rx="2.4" ry="3.1"/><ellipse cx="127" cy="123" rx="2.4" ry="3.1"/></g>
    <path d="M107 132 Q120 145 133 132" fill="none" stroke-width="3.4"/>

    <!-- arms -->
    <path d="M96 151 Q84 159 88 177 Q92 185 104 178 L107 159 M144 151 Q156 159 152 177 Q148 185 136 178 L133 159" fill="${color}"/>
    <path d="M95 176 l3 5 M101 174 l3 5 M145 176 l-3 5 M139 174 l-3 5" fill="none" stroke-width="2.2"/>
  </g>`;
}
