/* ぺっとのおへや v4 — original top-down / upright 2.5D vector artwork. */
const shadows='<ellipse cx="120" cy="219" rx="84" ry="12" fill="#4d3827" opacity=".22"/>';
const furniture={
sofa:shadows+
'<path d="M53 177v30h20v-28m94-2v30h18v-30" fill="#a97845" stroke="#6a482f" stroke-width="5"/>'+
'<rect x="36" y="80" width="169" height="112" rx="24" fill="#4c8c71" stroke="#3e624e" stroke-width="6"/>'+
'<rect x="48" y="72" width="147" height="76" rx="20" fill="#82bca1" stroke="#426d5b" stroke-width="6"/>'+
'<path d="M55 97Q119 77 189 97" fill="none" stroke="#c3e5bc" stroke-width="7" opacity=".8"/>'+
'<rect x="50" y="121" width="138" height="53" rx="17" fill="#74aa90" stroke="#4c806b" stroke-width="5"/>'+
'<path d="M120 124v44" stroke="#598b73" stroke-width="5"/>'+
'<rect x="29" y="122" width="37" height="63" rx="15" fill="#579a7f" stroke="#3d6b56" stroke-width="5"/>'+
'<rect x="175" y="122" width="36" height="63" rx="15" fill="#579a7f" stroke="#3d6b56" stroke-width="5"/>'+
'<path d="M66 164Q120 184 174 164v20Q120 205 66 186Z" fill="#3c7862" stroke="#365e51" stroke-width="5"/>'+
'<path d="M73 112l36-12 18 34-38 14Z" fill="#e7a18d" stroke="#b87465" stroke-width="4"/>'+
'<path d="M132 113l33-12 20 35-40 12Z" fill="#fff4d6" stroke="#cfb992" stroke-width="4"/>',
bed:shadows+
'<rect x="46" y="54" width="147" height="155" rx="17" fill="#b9834d" stroke="#795238" stroke-width="7"/>'+
'<rect x="54" y="68" width="131" height="125" rx="10" fill="#f6e6be" stroke="#a0764e" stroke-width="5"/>'+
'<rect x="57" y="120" width="125" height="66" rx="8" fill="#9ebe80" stroke="#6d956d" stroke-width="4"/>'+
'<path d="M64 139h110M63 160h110M81 122v61M108 121v62M135 121v62M160 122v61" stroke="#d2dfa0" stroke-width="7" opacity=".7"/>'+
'<rect x="61" y="74" width="119" height="54" rx="21" fill="#fff6d9" stroke="#d1b992" stroke-width="4"/>'+
'<path d="M108 96q9-15 19 0q9-7 15 3q2 12-16 18q-18-5-19-14Z" fill="#e0b87d"/>'+
'<path d="M51 184Q119 204 188 185v17Q122 223 51 203Z" fill="#a56e47" stroke="#795238" stroke-width="5"/>'+
'<path d="M42 61v145m157-145v145" stroke="#815739" stroke-width="12" stroke-linecap="round"/>'+
'<g fill="#bb824c" stroke="#795238" stroke-width="5"><circle cx="42" cy="59" r="14"/><circle cx="199" cy="59" r="14"/><circle cx="42" cy="204" r="12"/><circle cx="199" cy="204" r="12"/></g>',
rug:
'<ellipse cx="120" cy="185" rx="98" ry="44" fill="#523c2c" opacity=".18"/>'+
'<ellipse cx="120" cy="160" rx="105" ry="61" fill="#f6e6c1" stroke="#ab865d" stroke-width="5"/>'+
'<ellipse cx="120" cy="157" rx="88" ry="49" fill="#9ec07e"/>'+
'<ellipse cx="120" cy="157" rx="68" ry="38" fill="#f8edcf"/>'+
'<g fill="#9ebc7b"><ellipse cx="120" cy="169" rx="28" ry="16"/><circle cx="87" cy="145" r="10"/><circle cx="109" cy="135" r="10"/><circle cx="137" cy="135" r="10"/><circle cx="158" cy="145" r="10"/></g>',
table:shadows+
'<path d="M59 147v59l20 5 10-55M156 156l11 55 21-9v-53" fill="#9c673e" stroke="#795036" stroke-width="5"/>'+
'<ellipse cx="122" cy="154" rx="89" ry="50" fill="#946039" stroke="#775034" stroke-width="6"/>'+
'<ellipse cx="122" cy="141" rx="89" ry="48" fill="#c28a52" stroke="#805637" stroke-width="6"/>'+
'<ellipse cx="118" cy="139" rx="61" ry="29" fill="#e8c394" opacity=".35"/>'+
'<path d="M79 120q-13-7-3-14q8-11 18-5q9-8 18-1q13 1 10 13q12 9 0 18q-25 13-45-1Z" fill="#fff1d2" stroke="#dbbd8e" stroke-width="2"/>'+
'<path d="M92 108h25v28q-12 11-25 0Z" fill="#bf6c56" stroke="#985044" stroke-width="4"/>'+
'<ellipse cx="104" cy="109" rx="12" ry="6" fill="#734632"/><path d="M117 111q21-3 9 19h-9" stroke="#995242" stroke-width="5" fill="none"/>'+
'<path d="M138 121l31-10 13 30-31 11Z" fill="#518565" stroke="#416348" stroke-width="5"/>'+
'<path d="M139 126l29-10 10 23-29 10Z" fill="#dae1a7"/>',
shelf:shadows+
'<path d="M37 54l29-17 133 8-22 20Z" fill="#d8a66f" stroke="#7a553a" stroke-width="5"/>'+
'<path d="M178 63l24-18v154l-24 14Z" fill="#895e3c" stroke="#745039" stroke-width="6"/>'+
'<rect x="35" y="60" width="145" height="152" rx="11" fill="#ad764a" stroke="#765035" stroke-width="7"/>'+
'<rect x="47" y="72" width="118" height="123" fill="#6d4b34"/>'+
'<path d="M47 111H165M47 153H165M47 189H165" stroke="#ba8753" stroke-width="10"/>'+
'<g stroke="#6b5142" stroke-width="2"><rect x="55" y="76" width="15" height="33" rx="2" fill="#d88772"/><rect x="74" y="72" width="16" height="37" rx="2" fill="#87ab88"/><rect x="94" y="79" width="16" height="30" rx="2" fill="#7fb5bd"/><rect x="114" y="75" width="17" height="34" rx="2" fill="#dfb56d"/><rect x="135" y="77" width="20" height="32" rx="2" fill="#b790a0"/><rect x="55" y="118" width="20" height="32" rx="2" fill="#e9b56f"/><rect x="79" y="115" width="19" height="35" rx="2" fill="#b97874"/><rect x="102" y="118" width="19" height="32" rx="2" fill="#91b47b"/><rect x="124" y="116" width="19" height="34" rx="2" fill="#a5aac5"/><rect x="146" y="117" width="12" height="33" rx="2" fill="#e1bf86"/><rect x="56" y="158" width="17" height="28" fill="#96a872"/><rect x="77" y="160" width="19" height="26" fill="#d5a56e"/><rect x="100" y="160" width="19" height="26" fill="#a98387"/><rect x="122" y="160" width="19" height="26" fill="#7db6b1"/><rect x="145" y="160" width="14" height="26" fill="#abbf89"/></g>'+
'<path d="M57 41Q40 8 63 10Q83 13 90 38Q100 12 119 25Q112 50 82 50Z" fill="#86ad5a" stroke="#56834c" stroke-width="5"/>',
plant:shadows+
'<path d="M85 157h76l-12 56q-27 19-52-1Z" fill="#f2d5a7" stroke="#9f774d" stroke-width="6"/>'+
'<ellipse cx="123" cy="159" rx="40" ry="16" fill="#b58a5a" stroke="#916747" stroke-width="5"/>'+
'<ellipse cx="123" cy="159" rx="29" ry="10" fill="#6c503b"/>'+
'<path d="M123 155q-24-34-25-72m28 72q17-41 26-74" fill="none" stroke="#5c824b" stroke-width="8"/>'+
'<g fill="#87ba67" stroke="#54864e" stroke-width="5"><path d="M122 115Q62 109 60 65Q103 46 127 94Z"/><path d="M126 114Q134 51 180 54Q199 94 153 119Z"/><path d="M112 135Q68 146 53 116Q74 83 113 100Z"/><path d="M132 138Q168 121 185 143Q175 177 138 158Z"/><path d="M114 105Q102 58 124 37Q162 50 141 97Z"/></g>'+
'<path d="M93 75l27 32m31-28-19 34m-14-48 12 32" fill="none" stroke="#bad68e" stroke-width="5" stroke-linecap="round"/>'+
'<path d="M99 182h49" stroke="#8cb66c" stroke-width="8" stroke-linecap="round"/>',
cabinet:shadows+
'<path d="M44 100l18-19h131l19 19Z" fill="#e0b17b" stroke="#795138" stroke-width="6"/>'+
'<path d="M190 104l22-11v107l-22 14Z" fill="#885d3e" stroke="#704d37" stroke-width="5"/>'+
'<rect x="40" y="104" width="151" height="109" rx="11" fill="#a8744c" stroke="#775039" stroke-width="6"/>'+
'<rect x="53" y="119" width="58" height="78" rx="7" fill="#c38e5f" stroke="#95673f" stroke-width="4"/>'+
'<rect x="118" y="119" width="58" height="78" rx="7" fill="#c38e5f" stroke="#95673f" stroke-width="4"/>'+
'<circle cx="101" cy="161" r="5" fill="#f1d18b"/><circle cx="128" cy="161" r="5" fill="#f1d18b"/>'+
'<rect x="68" y="52" width="49" height="42" rx="6" fill="#97704c" stroke="#704e37" stroke-width="5"/>'+
'<rect x="76" y="59" width="33" height="27" fill="#c1ddca"/><path d="M80 84l11-15 14 15" fill="#8cb16d"/>'+
'<path d="M149 42q-8 10-5 23v27q20 9 37-1V64q1-13-7-22Z" fill="#f9d787" stroke="#a77f43" stroke-width="5"/>'+
'<path d="M148 42h28" stroke="#76563d" stroke-width="10" stroke-linecap="round"/>'+
'<ellipse cx="163" cy="66" rx="8" ry="14" fill="#fff3b6" opacity=".8"/>'
};
export function furnitureSVG(id,rotation=0){
 const r=((rotation%4)+4)%4;
 const flip=(r===1||r===2)&&id!=="rug";
 const face=(flip?'<g transform="translate(240 0) scale(-1 1)">':'<g>')+(furniture[id]||furniture.table)+'</g>';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">'+face+'</svg>';
}
export function roomBackground(){
 let wood='',grid='';
 for(let i=0;i<6;i++){
  const y=202+116*i;
  wood+='<rect x="132" y="'+y+'" width="696" height="116" fill="'+(i%2?'#e3ae79':'#e8b886')+'" opacity=".36"/>';
  wood+='<path d="M132 '+(y+4)+'H828" stroke="#fbe0b3" stroke-width="5" opacity=".35"/>';
  for(let k=1;k<4;k++)wood+='<path d="M'+(132+k*174+(i%2?38:0))+' '+(y+7)+'v102" stroke="#ac794d" stroke-width="2" opacity=".22"/>';
 }
 for(let i=1;i<6;i++){const z=132+i*116,y=202+i*116;grid+='<path d="M'+z+' 202V898M132 '+y+'H828" stroke="#885a40" stroke-width="2" opacity=".10"/>'}
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" aria-hidden="true">'+
 '<defs><linearGradient id="room-wall" x2="0" y2="1"><stop stop-color="#fff3d8"/><stop offset="1" stop-color="#e2cba6"/></linearGradient><linearGradient id="room-floor" x2="0" y2="1"><stop stop-color="#eac596"/><stop offset="1" stop-color="#ce9060"/></linearGradient></defs>'+
 '<rect width="960" height="960" fill="#8fb86c"/><g fill="#bad891" opacity=".65"><circle cx="64" cy="150" r="27"/><circle cx="896" cy="400" r="33"/><circle cx="76" cy="760" r="23"/><circle cx="879" cy="848" r="28"/></g>'+
 '<rect x="95" y="87" width="775" height="827" rx="32" fill="#58402c" opacity=".20"/>'+
 '<rect x="93" y="73" width="774" height="833" rx="29" fill="#996841" stroke="#7b5033" stroke-width="10"/>'+
 '<rect x="123" y="96" width="713" height="800" rx="13" fill="url(#room-floor)" stroke="#bd8758" stroke-width="7"/>'+
 '<rect x="132" y="202" width="696" height="696" fill="#dba573"/>'+wood+grid+
 '<rect x="124" y="101" width="712" height="94" fill="url(#room-wall)"/>'+
 '<path d="M152 102v91m85-91v91m492-91v91m75-91v91" stroke="#d1b991" stroke-width="3" opacity=".4"/>'+
 '<rect x="361" y="105" width="235" height="87" rx="11" fill="#92603f" stroke="#7c5438" stroke-width="7"/>'+
 '<rect x="371" y="113" width="214" height="67" rx="4" fill="#b9dbd2"/>'+
 '<path d="M373 174Q436 126 489 163Q547 132 584 165V180H373Z" fill="#86b77a"/>'+
 '<path d="M478 112v71M372 146H586" stroke="#966a48" stroke-width="10"/>'+
 '<path d="M351 109q-11-9-18 6l2 69q19 10 34 0l10-72q-10-6-28-3Z" fill="#fff0c9" stroke="#c6a67b" stroke-width="4"/>'+
 '<path d="M602 108q10-9 19 6l-1 70q-18 10-33 0l-8-72q9-6 23-4Z" fill="#fff0c9" stroke="#c6a67b" stroke-width="4"/>'+
 '<path d="M339 175h35m211 0h34" stroke="#80a36c" stroke-width="9"/>'+
 '<path d="M125 194H834" stroke="#91623f" stroke-width="16"/><path d="M130 185H830" stroke="#f3c992" stroke-width="5"/>'+
 '<path d="M120 97v803m720-803v803" stroke="#785035" stroke-width="24" stroke-linecap="round"/>'+
 '<path d="M131 196v696m697-696v696" stroke="#dfaa78" stroke-width="5" opacity=".7"/>'+
 '<path d="M125 904H831" stroke="#704b32" stroke-width="22"/>'+
 '<rect x="394" y="886" width="171" height="35" rx="9" fill="#b78658" stroke="#785035" stroke-width="6"/>'+
 '<rect x="410" y="893" width="139" height="20" rx="6" fill="#83ac72"/>'+
 '</svg>';
}
