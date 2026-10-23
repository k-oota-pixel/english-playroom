import {renderCompanionEyes} from './pet-companion-eyes.js?v=1.8.30';
// Editable vector reconstruction of dog_pet_final.png. No raster filters or DOM redraws.
// Colors and eye styles come from normalized appearance; shop and sleep own their layers.
export function renderDogArt(color,eyeStyle){
 const ink='#513829',cream='#fff7e9';
 const eyes=renderCompanionEyes(eyeStyle);
 return `<g data-pet-dog-art="editable" transform="translate(16.8 30.38) scale(.86)" stroke="${ink}" stroke-width="4.3" stroke-linecap="round" stroke-linejoin="round">
 <path d="M158 177 Q192 166 192 141 Q198 130 205 143 Q219 168 201 187 Q193 200 164 197Z" fill="${color}"/>
 <path d="M192 141 Q198 130 205 143 Q211 153 207 162 Q199 169 193 165 Q202 157 199 151 Q195 156 187 154Z" fill="${cream}" stroke="none"/>
 <path d="M158 177 Q192 166 192 141 Q198 130 205 143 Q219 168 201 187 Q193 200 164 197Z" fill="none"/>
 <path d="M96 145 Q72 159 76 190 Q79 207 120 208 Q161 207 164 190 Q168 159 144 145Z" fill="${color}"/>
 <path d="M106 147 Q97 161 104 179 L120 204 L136 179 Q143 161 134 147Z" fill="${cream}" stroke="none"/>
 <ellipse cx="84" cy="192" rx="20" ry="18" fill="${color}"/><ellipse cx="156" cy="192" rx="20" ry="18" fill="${color}"/>
 <path d="M96 174 Q96 153 104 161 Q115 174 116 202 L94 202Z M144 174 Q144 153 136 161 Q125 174 124 202 L146 202Z" fill="${color}"/>
 <ellipse cx="86" cy="204" rx="12" ry="10" fill="${cream}"/><ellipse cx="154" cy="204" rx="12" ry="10" fill="${cream}"/>
 <ellipse cx="106" cy="205" rx="15" ry="12" fill="${cream}"/><ellipse cx="134" cy="205" rx="15" ry="12" fill="${cream}"/>
 <path d="M102 204 v6 M110 204 v6 M130 204 v6 M138 204 v6" stroke-width="2.2"/>
 <path d="M72 73 Q83 49 120 49 Q157 49 168 73 L167 114 Q164 151 120 151 Q76 151 73 114Z" fill="${color}"/>
 <ellipse cx="120" cy="127" rx="36" ry="23" fill="${cream}" stroke="none"/>
 <path d="M81 74 Q58 63 39 94 Q26 115 42 135 Q62 156 76 132Z M159 74 Q182 63 201 94 Q214 115 198 135 Q178 156 164 132Z" fill="${color}"/>
 <path d="M70 86 Q52 88 43 109 Q37 126 52 134 Q68 143 70 86Z M170 86 Q188 88 197 109 Q203 126 188 134 Q172 143 170 86Z" fill="${ink}" opacity=".09" stroke="none"/>
 <g data-pet-eyes="1" data-dog-eye-style="${eyeStyle}" fill="${ink}" stroke="none">${eyes}</g>
 <g fill="#ff91a4" opacity=".85" stroke="none"><ellipse cx="81" cy="128" rx="8.5" ry="6.4"/><ellipse cx="159" cy="128" rx="8.5" ry="6.4"/></g>
 <path d="M114 118 Q120 115 126 118 Q128 121 120 126 Q112 121 114 118Z" fill="${ink}" stroke="none"/>
 <path d="M120 125 v5 Q114 137 107 131 M120 130 Q126 137 133 131" fill="none" stroke-width="3.2"/>
 </g>`;
}
