/**
 * New top-down 2.5D room furniture. All 4 directions are composed as proper
 * directional sprites, not rotated screenshots.
 * 0 front, 1 right, 2 rear, 3 left.
 */
export const EXTRA_FURNITURE=Object.freeze({
 roomLight:{w:1,h:1},tvStand:{w:2,h:1},studyDesk:{w:2,h:1},
 fullMirror:{w:1,h:1},wallClock:{w:1,h:1,wallOnly:true},
 squareTable:{w:2,h:1},kotatsu:{w:2,h:2}
});
const outline="#73533b";
const shadow=(rx=78,cy=220)=>'<ellipse cx="120" cy="'+cy+'" rx="'+rx+'" ry="10" fill="#513824" opacity=".19"/>';
const flip=s=>'<g transform="translate(240 0) scale(-1 1)">'+s+'</g>';
const svg=(s,d)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-facing="'+d+'" aria-hidden="true" focusable="false">'+s+'</svg>';
const stroke=' stroke="'+outline+'" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
function lamp(d){
 const side=d%2!==0,back=d===2,left=d===3;
 const body=shadow(42)+
 '<ellipse cx="120" cy="205" rx="32" ry="10" fill="#af865b" stroke="#76533d" stroke-width="4"/>'+
 '<path d="M104 194L115 93H126L138 194Z" fill="#d5ac77" stroke="#916a46" stroke-width="5"/>'+
 '<ellipse cx="121" cy="195" rx="24" ry="8" fill="#dfbd87" stroke="#96714d" stroke-width="3"/>'+
 '<path d="M108 117Q122 124 132 116" fill="none" stroke="#f4dcab" stroke-width="3"/>'+
 '<path d="M85 78Q87 44 105 38H136Q154 43 158 78L178 127Q120 151 62 127Z" fill="#fae2a0" stroke="#a57e4f" stroke-width="5"/>'+
 '<path d="M95 78Q109 57 145 78" fill="none" stroke="#fff8da" stroke-width="6"/>'+
 '<path d="M65 124Q121 143 175 124" fill="none" stroke="#c99d67" stroke-width="6"/>'+
 '<ellipse cx="120" cy="122" rx="29" ry="7" fill="#fff2bc" opacity=".9"/>'+
 '<path d="M84 82Q99 71 108 81" fill="none" stroke="#fff8d7" stroke-width="4" opacity=".75"/>';
 const switchX=side?d===1?174:67:back?99:148;
 const cord='<path d="M'+switchX+' 125v36" stroke="#8f724d" stroke-width="3"/><circle cx="'+switchX+'" cy="166" r="5" fill="#a78456" stroke="#76533d" stroke-width="2"/>';
 const detail=back?'<path d="M109 40h22" stroke="#91734e" stroke-width="5"/><path d="M120 58v48" stroke="#d0a96d" stroke-width="4" opacity=".8"/>'
 :side?'<path d="M87 80Q122 62 158 85" fill="none" stroke="#fff4d0" stroke-width="5"/>'
 :'<path d="M108 94h25" stroke="#fff0c0" stroke-width="4" opacity=".8"/>';
 return svg((left?flip(body+detail+cord):body+detail+cord),d);
}
const tvConsoleFront=shadow(92)+
'<path d="M28 145L46 129H198L218 146Z" fill="#d1a072" stroke="#77543e" stroke-width="5"/>'+
'<rect x="26" y="145" width="189" height="60" rx="8" fill="#b07c50" stroke="#77543e" stroke-width="6"/>'+
'<path d="M120 146v57" stroke="#80563b" stroke-width="5"/>'+
'<rect x="39" y="158" width="72" height="33" rx="4" fill="#c99968" stroke="#8e6142" stroke-width="3"/>'+
'<rect x="129" y="158" width="72" height="33" rx="4" fill="#c99968" stroke="#8e6142" stroke-width="3"/>'+
'<circle cx="102" cy="175" r="4" fill="#f3d29d"/><circle cx="137" cy="175" r="4" fill="#f3d29d"/>'+
'<path d="M44 202v15h17v-15m118 0v15h17v-15" fill="#805638" stroke="#6e5039" stroke-width="4"/>';
const tvConsoleBack=shadow(90)+
'<path d="M28 145l19-17h148l21 17Z" fill="#cfa274" stroke="#77543e" stroke-width="5"/>'+
'<rect x="26" y="145" width="189" height="60" rx="8" fill="#a97952" stroke="#77543e" stroke-width="6"/>'+
'<path d="M37 169h165m-165 20h165" stroke="#c79a70" stroke-width="4"/>'+
'<path d="M44 203v14h15v-14m123 0v14h15v-14" fill="#805638" stroke="#6e5039" stroke-width="4"/>';
const tvFront=tvConsoleFront+
'<path d="M110 141v-15h21v15" fill="#775642" stroke="#604537" stroke-width="4"/>'+
'<rect x="33" y="45" width="174" height="106" rx="12" fill="#604d40" stroke="#72523a" stroke-width="7"/>'+
'<rect x="45" y="55" width="150" height="82" rx="6" fill="#3d5554" stroke="#283d41" stroke-width="4"/>'+
'<path d="M51 125L112 65H187L126 126Z" fill="#85abb1" opacity=".55"/>'+
'<path d="M53 127Q116 98 187 129" fill="none" stroke="#5e8f8f" stroke-width="3"/>'+
'<circle cx="184" cy="144" r="3" fill="#d5c285"/>';
const tvBack=tvConsoleBack+
'<path d="M110 140v-16h23v16" fill="#634e3f" stroke="#503f34" stroke-width="4"/>'+
'<rect x="32" y="42" width="176" height="105" rx="10" fill="#625447" stroke="#56463a" stroke-width="7"/>'+
'<rect x="46" y="56" width="148" height="72" rx="5" fill="#76685b" stroke="#8d7c6c" stroke-width="3"/>'+
'<path d="M68 78h105M68 86h105M68 94h105M68 102h105" stroke="#494943" stroke-width="3"/>'+
'<rect x="107" y="116" width="31" height="12" rx="3" fill="#403e3a"/><circle cx="155" cy="117" r="5" fill="#d6bb84"/>';
const tvSide=shadow(45)+
'<path d="M77 158L91 145H151L169 160Z" fill="#d4a779" stroke="#79583d" stroke-width="5"/>'+
'<rect x="77" y="159" width="91" height="52" rx="8" fill="#b68558" stroke="#77543e" stroke-width="6"/>'+
'<rect x="90" y="169" width="65" height="29" rx="5" fill="#cb9a6c" stroke="#976e49" stroke-width="4"/>'+
'<path d="M92 209v11h13v-11m47 0v11h12v-11" fill="#805638" stroke="#6e5039" stroke-width="4"/>'+
'<path d="M113 157v-21h15v21" fill="#765d4a"/>'+
'<path d="M97 51L119 40L143 49V147L119 157L97 149Z" fill="#534a42" stroke="#665043" stroke-width="6"/>'+
'<path d="M102 58L117 51V146L102 142Z" fill="#a1c0c1" stroke="#354b4c" stroke-width="3"/>'+
'<path d="M122 52l15-5v93l-15 6Z" fill="#66584c"/>'+
'<path d="M104 79l12-18v49l-12 16Z" fill="#bed4c8" opacity=".6"/>';
function tv(d){return svg([tvFront,tvSide,tvBack,flip(tvSide)][d],d)}
const deskFront=shadow(90)+
'<path d="M41 129v77l18 10 9-73m107 0 9 73 18-9v-77" fill="#90623f" stroke="#77513a" stroke-width="5"/>'+
'<path d="M25 116L49 93H188L213 116L191 144H46Z" fill="#dba772" stroke="#79553a" stroke-width="6"/>'+
'<path d="M46 138H194V158H46Z" fill="#a57349" stroke="#79543c" stroke-width="5"/>'+
'<rect x="149" y="150" width="44" height="48" rx="4" fill="#bb8759" stroke="#8a5f3f" stroke-width="5"/>'+
'<path d="M151 172h41M151 185h41" stroke="#91623e" stroke-width="3"/>'+
'<circle cx="181" cy="163" r="3" fill="#f5d491"/><circle cx="181" cy="187" r="3" fill="#f5d491"/>';
const deskTop='<path d="M78 106l19-25 13 5-13 26Z" fill="#f4e8c4" stroke="#be9e6f" stroke-width="3"/>'+
'<path d="M81 112L98 89" stroke="#7f9e88" stroke-width="3"/>'+
'<rect x="110" y="100" width="43" height="27" rx="4" fill="#f5ead3" stroke="#c7b28d" stroke-width="3"/>'+
'<path d="M117 106h27m-27 7h22m-22 7h19" stroke="#d2ad78" stroke-width="2"/>'+
'<path d="M171 114L163 71" stroke="#806e59" stroke-width="6" stroke-linecap="round"/>'+
'<path d="M165 72l-14-9q5-16 24-8l13 15Z" fill="#9ec0a1" stroke="#58836b" stroke-width="4"/>'+
'<ellipse cx="173" cy="116" rx="12" ry="5" fill="#8b755b"/>';
const deskBack=shadow(91)+
'<path d="M41 132v78l18 8 8-81m107 0 10 80 19-9v-79" fill="#936541" stroke="#745039" stroke-width="5"/>'+
'<path d="M26 115l26-25h136l26 25-20 30H46Z" fill="#d8a26e" stroke="#79553b" stroke-width="6"/>'+
'<path d="M42 138h158v17H42Z" fill="#a87751" stroke="#80563d" stroke-width="5"/>'+
'<path d="M67 159h125" stroke="#8d6544" stroke-width="6"/>';
const deskSide=shadow(60)+
'<path d="M73 130v75l14 8 8-70m71-9 9 78 14-7v-74" fill="#92623c" stroke="#76503b" stroke-width="5"/>'+
'<path d="M65 121L92 90H152L184 119L159 145H83Z" fill="#d5a06a" stroke="#80583b" stroke-width="6"/>'+
'<path d="M85 140h72v15H85Z" fill="#af7f55" stroke="#80583b" stroke-width="5"/>'+
'<rect x="149" y="142" width="30" height="53" rx="4" fill="#b07f56" stroke="#87613e" stroke-width="4"/>'+
'<path d="M152 166h24m-24 14h24" stroke="#926742" stroke-width="3"/>'+
'<path d="M109 99l-9-22" stroke="#75614b" stroke-width="5"/>'+
'<path d="M99 77l-17-8 5-12 21 12Z" fill="#9dbea2" stroke="#59846c" stroke-width="3"/>'+
'<rect x="112" y="106" width="25" height="17" rx="2" fill="#f7ebce" stroke="#d3b285" stroke-width="3"/>';
function desk(d){const p=[deskFront+deskTop,deskSide,deskBack+flip(deskTop),flip(deskSide)][d];return svg(p,d)}
const mirrorFace=shadow(46)+
'<path d="M103 195v13h32v-13" fill="#a77e53" stroke="#76533e" stroke-width="5"/>'+
'<path d="M66 200h109l14 16H54Z" fill="#ad8154" stroke="#76533e" stroke-width="5"/>'+
'<rect x="79" y="29" width="84" height="172" rx="27" fill="#b98b61" stroke="#80583d" stroke-width="7"/>'+
'<rect x="87" y="36" width="68" height="153" rx="23" fill="#c4e0da" stroke="#8b765f" stroke-width="3"/>'+
'<path d="M95 72l35-27 17 13-51 48Z" fill="#f0fbef" opacity=".62"/>'+
'<path d="M93 146q20-18 55-6" fill="none" stroke="#eef8e9" stroke-width="5" opacity=".8"/>'+
'<path d="M114 189h20" stroke="#f3e6c9" stroke-width="3"/>';
const mirrorBack=shadow(46)+
'<path d="M103 195v13h32v-13" fill="#a77e53" stroke="#76533e" stroke-width="5"/>'+
'<path d="M66 200h109l14 16H54Z" fill="#ad8154" stroke="#76533e" stroke-width="5"/>'+
'<rect x="79" y="29" width="84" height="172" rx="27" fill="#ac7d50" stroke="#80583d" stroke-width="7"/>'+
'<rect x="89" y="39" width="64" height="151" rx="20" fill="#c89d6b" stroke="#9b754d" stroke-width="4"/>'+
'<path d="M121 43v145M94 111l54 30M147 111l-53 30" stroke="#a67c56" stroke-width="5"/>';
const mirrorSide=shadow(45)+
'<path d="M111 193v15h31v-15" fill="#a77e53" stroke="#76533e" stroke-width="5"/>'+
'<path d="M85 205h73l19 13H70Z" fill="#ad8154" stroke="#76533e" stroke-width="5"/>'+
'<path d="M113 27L140 34L147 194L118 202Z" fill="#b5885f" stroke="#76543a" stroke-width="6"/>'+
'<path d="M116 34l13 2 7 152-14 7Z" fill="#c4e3de" stroke="#7a8375" stroke-width="3"/>'+
'<path d="M120 59l9-12 5 57-11 18Z" fill="#eefaf5" opacity=".6"/>';
function mirror(d){return svg([mirrorFace,mirrorSide,mirrorBack,flip(mirrorSide)][d],d)}
function clock(d){
 // The clock always faces the room because it is mounted on the rear wall.
 // Four orientations rotate its hands and decorative frame, not the wall itself.
 const angles=[0,90,180,270];
 const base='<ellipse cx="120" cy="213" rx="38" ry="6" fill="#77583b" opacity=".12"/>'+
 '<path d="M93 205h54" stroke="#805839" stroke-width="6" stroke-linecap="round"/>'+
 '<circle cx="120" cy="119" r="82" fill="#9c734c" stroke="#755139" stroke-width="7"/>'+
 '<circle cx="120" cy="117" r="70" fill="#f8eccb" stroke="#cfb083" stroke-width="6"/>'+
 '<circle cx="120" cy="117" r="62" fill="#fff8dd"/>'+
 '<g stroke="#8f6d4b" stroke-width="4" stroke-linecap="round">'+
 '<path d="M120 60v12M120 161v12M64 117h12M165 117h12"/>'+
 '<path d="M81 76l6 7M154 152l7 7M81 159l7-7M154 82l7-7"/></g>'+
 '<circle cx="120" cy="117" r="8" fill="#996b4d"/>';
 const arms='<g transform="rotate('+angles[d]+' 120 117)"><path d="M120 117L118 78M120 117L147 128" stroke="#785b44" stroke-width="7" stroke-linecap="round"/>'+
 '<path d="M120 117L103 146" stroke="#b85f52" stroke-width="3" stroke-linecap="round"/></g>';
 const flower='<g transform="rotate('+angles[d]+' 120 117)"><path d="M105 41q-22-8-25-29q26-2 36 23" fill="#8bb56f" stroke="#63854f" stroke-width="4"/>'+
 '<path d="M117 35q12-24 36-21q-4 25-28 30" fill="#b5cd84" stroke="#709356" stroke-width="4"/></g>';
 return svg(base+arms+flower,d);
}
const rectShadow=shadow(94);
const tableSurfaceFront=rectShadow+
'<path d="M42 152v56l18 8 10-54m108-1 11 54 18-9v-56" fill="#9e7045" stroke="#74533b" stroke-width="5"/>'+
'<path d="M27 114L55 95H185L213 114L203 160H39Z" fill="#d4a071" stroke="#7c563e" stroke-width="6"/>'+
'<path d="M38 150Q120 168 204 150v17Q121 181 39 168Z" fill="#a7764d" stroke="#7c563e" stroke-width="5"/>'+
'<path d="M61 108H178" stroke="#f4d6a5" stroke-width="5" stroke-linecap="round"/>';
const tableSurfaceSide=rectShadow+
'<path d="M79 147v59l17 8 8-54m45-5 7 57 17-8v-58" fill="#9e7045" stroke="#74533b" stroke-width="5"/>'+
'<path d="M80 70L153 83L171 165L98 157Z" fill="#d4a071" stroke="#7c563e" stroke-width="6"/>'+
'<path d="M98 153l74 9-1 16-71-10Z" fill="#a7764d" stroke="#7c563e" stroke-width="5"/>'+
'<path d="M96 93L147 102" stroke="#f4d6a5" stroke-width="5"/>';
const rectTopDecor='<rect x="93" y="115" width="41" height="29" rx="3" fill="#f7eacb" stroke="#c6a881" stroke-width="3"/>'+
'<path d="M99 122h30m-30 7h22" stroke="#c6a881" stroke-width="2"/>'+
'<ellipse cx="157" cy="131" rx="13" ry="8" fill="#fff6dd" stroke="#bb9469" stroke-width="3"/>'+
'<ellipse cx="157" cy="130" rx="6" ry="4" fill="#986443"/>';
const rectSideDecor='<path d="M115 113l22 4 6 26-24-5Z" fill="#f7eacb" stroke="#c6a881" stroke-width="3"/>'+
'<path d="M119 119l14 3" stroke="#c6a881" stroke-width="2"/>'+
'<ellipse cx="139" cy="87" rx="11" ry="6" fill="#fff6dd" stroke="#bb9469" stroke-width="3"/>'+
'<ellipse cx="139" cy="87" rx="5" ry="3" fill="#986443"/>';
function squareTable(d){
 let art;
 if(d===0)art=tableSurfaceFront+rectTopDecor;
 if(d===1)art=tableSurfaceSide+rectSideDecor;
 if(d===2)art=tableSurfaceFront+'<g transform="rotate(180 120 135)">'+rectTopDecor+'</g>';
 if(d===3)art=flip(tableSurfaceSide+rectSideDecor);
 return svg(art,d);
}
const quilt='<path d="M46 123L64 103H177L195 123L207 170Q184 194 120 197Q60 196 34 170Z" fill="#e8a7ad" stroke="#bc797e" stroke-width="5"/>'+
'<path d="M44 138Q120 159 199 138M43 167Q121 187 201 167M80 115v72M121 107v87M161 112v76" fill="none" stroke="#f9cad0" stroke-width="7" opacity=".8"/>';
const kotatsuBase=shadow(98)+
'<path d="M56 187v25h22v-17m87-2v18h22v-26" fill="#8b593d" stroke="#6b4c35" stroke-width="5"/>'+
'<path d="M45 120L73 97H167L197 120L213 177Q119 214 28 174Z" fill="#e5a1aa" stroke="#bd777f" stroke-width="6"/>'+
'<path d="M42 143Q121 176 199 143" fill="none" stroke="#ffced0" stroke-width="8"/>'+
'<path d="M49 167Q121 200 199 167" fill="none" stroke="#f7c4c9" stroke-width="8"/>'+
'<path d="M66 118q-2 37 12 71M172 118q3 35-12 73" fill="none" stroke="#f8c5c6" stroke-width="7" opacity=".8"/>'+
'<path d="M68 87L88 74H166L186 88L188 124Q121 146 55 121Z" fill="#aa754d" stroke="#765039" stroke-width="6"/>'+
'<path d="M72 87L91 75H164L181 88L171 117Q123 134 67 115Z" fill="#d6a874" stroke="#8d623f" stroke-width="4"/>';
const kotatsuTop='<ellipse cx="124" cy="104" rx="19" ry="9" fill="#fcf1d0" stroke="#b48d63" stroke-width="4"/>'+
'<ellipse cx="124" cy="101" rx="10" ry="5" fill="#aa6446"/>'+
'<path d="M106 89h36" stroke="#f5d5a8" stroke-width="4"/>'+
'<path d="M78 107l21-9 7 16-21 9Z" fill="#b8c69b" stroke="#7c986d" stroke-width="3"/>';
function kotatsu(d){
 const rim=['<path d="M70 116Q120 136 175 116" fill="none" stroke="#f4cf9d" stroke-width="5"/>',
 '<path d="M74 80l-15 41" fill="none" stroke="#fff0bd" stroke-width="5"/>',
 '<path d="M77 83Q122 68 169 85" fill="none" stroke="#fff0bd" stroke-width="5"/>',
 '<path d="M171 83l16 41" fill="none" stroke="#fff0bd" stroke-width="5"/>'][d];
 const orient='<g transform="rotate('+(d*90)+' 124 101)">'+kotatsuTop+'</g>';
 return svg(kotatsuBase+orient+rim,d);
}
export function extraFurnitureSVG(id,direction=0){
 const d=((direction%4)+4)%4;
 switch(id){
  case 'roomLight':return lamp(d);
  case 'tvStand':return tv(d);
  case 'studyDesk':return desk(d);
  case 'fullMirror':return mirror(d);
  case 'wallClock':return clock(d);
  case 'squareTable':return squareTable(d);
  case 'kotatsu':return kotatsu(d);
  default:throw new Error('Unknown furniture: '+id);
 }
}
