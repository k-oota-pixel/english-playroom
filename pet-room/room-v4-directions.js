/**
 * Farm-style 2.5D furniture, 4 genuinely distinct view directions.
 * 0=front (toward the viewer), 1=faces screen right,
 * 2=back (away from viewer), 3=faces screen left.
 * All views use the same bottom-centre anchor, independent of the footprint.
 */
import {furnitureSVG as frontArt} from './room-v4-art.js?v=1';
const outline='#795238';
const shadow='<ellipse cx="120" cy="218" rx="82" ry="12" fill="#533a29" opacity=".19"/>';
const bg=(markup,d)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" data-facing="'+d+'" aria-hidden="true" focusable="false">'+markup+'</svg>';
const faceToLeft=markup=>'<g transform="translate(240 0) scale(-1 1)">'+markup+'</g>';
const back={
 sofa:shadow+
 '<path d="M53 179v28h18v-25m98-3v28h18v-25" fill="#8c603f" stroke="#644a35" stroke-width="5"/>'+
 '<path d="M44 87q7-23 27-24h104q26 1 27 24v100q-79 18-159 0Z" fill="#397461" stroke="#3f644f" stroke-width="7"/>'+
 '<path d="M55 83q10-13 22-13h93q18 0 22 16v90q-67 15-136 0Z" fill="#6cae91" stroke="#46846c" stroke-width="5"/>'+
 '<path d="M63 87q52-12 120 0M62 119q60 7 123 0" fill="none" stroke="#9cd1ab" stroke-width="6" opacity=".75"/>'+
 '<path d="M55 170q66 11 138 0v16q-69 17-138 0Z" fill="#347562" stroke="#3b614c" stroke-width="4"/>'+
 '<path d="M48 91h14v87H48Zm130 0h15v87h-15Z" fill="#508f76" opacity=".72"/>',
 bed:shadow+
 '<rect x="45" y="53" width="151" height="155" rx="15" fill="#b98451" stroke="#795139" stroke-width="6"/>'+
 '<rect x="53" y="60" width="135" height="135" rx="9" fill="#eee1bd" stroke="#a37956" stroke-width="4"/>'+
 '<path d="M56 78h129v84H56Z" fill="#ecafc1" stroke="#c47f97" stroke-width="4"/>'+
 '<path d="M58 99h124M58 124h124M79 81v79M107 81v79M139 81v79M168 81v79" stroke="#ffe0e7" stroke-width="6" opacity=".7"/>'+
 '<rect x="60" y="149" width="123" height="46" rx="16" fill="#fff4db" stroke="#d0b998" stroke-width="4"/>'+
 '<path d="M43 55h156v26q-79 18-156 0Z" fill="#946442" stroke="#78513b" stroke-width="5"/>'+
 '<path d="M41 59v145m158-145v145" stroke="#8a5d3c" stroke-width="11" stroke-linecap="round"/>'+
 '<g fill="#c18b57" stroke="#795238" stroke-width="5"><circle cx="41" cy="58" r="13"/><circle cx="199" cy="58" r="13"/><circle cx="41" cy="207" r="12"/><circle cx="199" cy="207" r="12"/></g>',
 shelf:shadow+
 '<path d="M38 52l24-13h139l-22 18Z" fill="#dcb07b" stroke="'+outline+'" stroke-width="5"/>'+
 '<path d="M178 58l23-18v167l-23 11Z" fill="#8d603e" stroke="'+outline+'" stroke-width="6"/>'+
 '<path d="M36 56h144v159H36Z" fill="#aa774c" stroke="'+outline+'" stroke-width="7"/>'+
 '<rect x="48" y="68" width="119" height="130" fill="#bc8b5f" stroke="#8c603e" stroke-width="5"/>'+
 '<path d="M59 78v108m27-108v108m28-108v108m27-108v108M50 116h114M50 162h114" stroke="#d4a876" stroke-width="3" opacity=".8"/>'+
 '<path d="M50 191h117" stroke="#8b6040" stroke-width="9"/>',
 cabinet:shadow+
 '<path d="M44 104l20-24h134l15 24Z" fill="#e9b985" stroke="'+outline+'" stroke-width="6"/>'+
 '<path d="M190 104l23-13v109l-23 14Z" fill="#8d5b3f" stroke="'+outline+'" stroke-width="6"/>'+
 '<rect x="42" y="103" width="151" height="110" rx="9" fill="#b58455" stroke="'+outline+'" stroke-width="6"/>'+
 '<rect x="54" y="114" width="126" height="84" rx="6" fill="#c89662" stroke="#986540" stroke-width="4"/>'+
 '<path d="M65 118v74m22-74v74m22-74v74m22-74v74m22-74v74" stroke="#b27f51" stroke-width="3" opacity=".7"/>'+
 '<path d="M58 142h118m-118 28h118" stroke="#e2b77e" stroke-width="3" opacity=".55"/>'+
 '<path d="M51 208h18v10H51Zm115 0h18v10h-18Z" fill="#76533b"/>'
};
const side={
 sofa:shadow+
 '<path d="M62 68v132l14 8V68M162 69v133l17 3V68" fill="#996b46" stroke="#76523b" stroke-width="5"/>'+
 '<path d="M63 45Q65 35 83 35H164Q182 36 190 55V190Q187 205 168 206H84Q65 205 63 187Z" fill="#3c765f" stroke="#3a624f" stroke-width="6"/>'+
 '<path d="M65 53Q66 42 80 43H102Q110 49 109 65V182Q105 194 91 196H75Q62 188 64 177Z" fill="#73b298" stroke="#416f5b" stroke-width="5"/>'+
 '<path d="M90 68Q124 56 173 68L177 173Q123 184 90 169Z" fill="#8dc6a8" stroke="#4c886d" stroke-width="5"/>'+
 '<path d="M98 76Q121 70 165 77L167 117Q137 124 99 117Z" fill="#a5d9b8" stroke="#679f84" stroke-width="3"/>'+
 '<path d="M99 124Q132 118 167 126L168 165Q132 173 100 165Z" fill="#8ac3a7" stroke="#659a7f" stroke-width="3"/>'+
 '<path d="M75 58Q85 53 95 57L99 180Q87 192 75 182Z" fill="#5fa78b" stroke="#3e775f" stroke-width="4"/>'+
 '<path d="M170 65Q189 66 194 83V172Q191 189 170 192Z" fill="#447f68" stroke="#386c56" stroke-width="5"/>'+
 '<path d="M83 45H173Q193 47 194 60L191 81Q146 76 91 81L64 69Q62 55 83 45Z" fill="#65a98f" stroke="#39735c" stroke-width="5"/>'+
 '<path d="M84 173Q138 179 191 173V192Q141 209 85 193Z" fill="#4c9277" stroke="#3a6d59" stroke-width="5"/>'+
 '<path d="M112 81Q128 75 147 83L146 107Q130 116 114 105Z" fill="#e8aa97" stroke="#bd7769" stroke-width="3"/>'+
 '<path d="M114 134Q132 130 150 135L150 155Q131 163 114 156Z" fill="#fff0d7" stroke="#cfb794" stroke-width="3"/>',
 bed:shadow+
 '<path d="M34 97H212V203H34Z" fill="#af7949" stroke="'+outline+'" stroke-width="6"/>'+
 '<path d="M43 106h161v84H43Z" fill="#f7e9c7" stroke="#bd986f" stroke-width="4"/>'+
 '<path d="M52 115h112v69H52Z" fill="#ecafc1" stroke="#c47f97" stroke-width="4"/>'+
 '<path d="M72 118v63m28-64v63m28-63v64M54 134h107m-108 24h108" stroke="#f9d5df" stroke-width="8" opacity=".7"/>'+
 '<path d="M156 112h36v73h-36Z" fill="#fff6dc" stroke="#d5bb90" stroke-width="4"/>'+
 '<path d="M196 88v120" stroke="#966743" stroke-width="17" stroke-linecap="round"/>'+
 '<path d="M38 94v112" stroke="#996f49" stroke-width="10" stroke-linecap="round"/>'+
 '<path d="M41 188q75 19 165 0v20q-91 19-165-1Z" fill="#9e6b43" stroke="'+outline+'" stroke-width="5"/>'+
 '<g fill="#b98350" stroke="'+outline+'" stroke-width="4"><circle cx="37" cy="95" r="11"/><circle cx="201" cy="90" r="14"/><circle cx="37" cy="205" r="11"/><circle cx="201" cy="207" r="12"/></g>',
 shelf:shadow+
 '<path d="M70 48l25-15h87l-18 20Z" fill="#d3a875" stroke="'+outline+'" stroke-width="5"/>'+
 '<path d="M166 50l19-17v170l-19 14Z" fill="#87603d" stroke="'+outline+'" stroke-width="6"/>'+
 '<rect x="66" y="51" width="102" height="161" rx="8" fill="#b27c4c" stroke="'+outline+'" stroke-width="7"/>'+
 '<path d="M77 62h81v140H77Z" fill="#c69562" stroke="#8d613f" stroke-width="4"/>'+
 '<path d="M84 74v113m17-113v113m18-113v113m18-113v113" stroke="#dcac70" stroke-width="3" opacity=".67"/>'+
 '<path d="M70 115h98m-98 42h98" stroke="#916640" stroke-width="7" opacity=".75"/>',
 cabinet:shadow+
 '<path d="M73 104l33-24h75l22 24Z" fill="#e0b17e" stroke="'+outline+'" stroke-width="6"/>'+
 '<path d="M181 102l22-20v128l-22 11Z" fill="#7f563c" stroke="'+outline+'" stroke-width="6"/>'+
 '<rect x="69" y="104" width="116" height="112" rx="10" fill="#ac754a" stroke="'+outline+'" stroke-width="7"/>'+
 '<rect x="82" y="117" width="90" height="84" rx="5" fill="#c28e5d" stroke="#916239" stroke-width="4"/>'+
 '<path d="M92 123v73m62-73v73" stroke="#dbaa79" stroke-width="4" opacity=".7"/>'+
 '<path d="M84 155h86" stroke="#986e48" stroke-width="4"/>'
};
// Decorations are drawn above the cabinet in every direction. Mirroring the
// whole right-side view gives a matching left-side view without losing either.
const cabinetTopDecorations=
 '<ellipse cx="161" cy="82" rx="28" ry="9" fill="#ffde9a" opacity=".30"/>'+
 '<rect x="84" y="39" width="43" height="49" rx="5" fill="#9b6a43" stroke="#704b35" stroke-width="4"/>'+
 '<rect x="90" y="45" width="31" height="36" rx="2" fill="#c9e2dc"/>'+
 '<path d="M91 78L102 65L110 71L120 61V81H91Z" fill="#87b77b"/>'+
 '<path d="M94 48H116" stroke="#ffffff" stroke-width="2" opacity=".65"/>'+
 '<path d="M146 55Q144 67 145 83Q161 97 182 83V57Z" fill="#e5aa58" stroke="#9b7142" stroke-width="4"/>'+
 '<path d="M151 50Q145 61 150 77Q164 91 178 76Q182 60 175 50Z" fill="#ffde88" stroke="#b78343" stroke-width="4"/>'+
 '<ellipse cx="163" cy="65" rx="8" ry="12" fill="#fff6bb" opacity=".88"/>'+
 '<path d="M148 49Q146 41 155 37H171Q179 40 178 49Z" fill="#795d46" stroke="#6e513d" stroke-width="3"/>'+
 '<path d="M146 87H181" stroke="#795b41" stroke-width="6" stroke-linecap="round"/>';

const tableBase=shadow+
'<path d="M58 151v53l18 9 11-53m75-4 7 55 17-7v-51" fill="#9a653d" stroke="'+outline+'" stroke-width="5"/>'+
'<ellipse cx="120" cy="154" rx="86" ry="48" fill="#905e39" stroke="'+outline+'" stroke-width="6"/>'+
'<ellipse cx="120" cy="139" rx="86" ry="48" fill="#c38d58" stroke="#7f5638" stroke-width="6"/>'+
'<ellipse cx="120" cy="139" rx="66" ry="31" fill="#e8c596" opacity=".47"/>';
const tableDetails='<g><path d="M69 116q-8-7 2-14q10-10 18-3q11-8 18 0q10 0 9 11q9 7-2 15q-24 13-45-4Z" fill="#fff1cf" stroke="#d6b98c" stroke-width="2"/>'+
'<path d="M79 101h24v27q-11 10-24 0Z" fill="#c37862" stroke="#935140" stroke-width="3"/>'+
'<ellipse cx="91" cy="103" rx="12" ry="5" fill="#784b3c"/><path d="M103 105q17-4 11 17h-10" fill="none" stroke="#9c5a43" stroke-width="4"/>'+
'<path d="M135 121l27-8 13 27-28 9Z" fill="#538763" stroke="#426445" stroke-width="4"/>'+
'<path d="M138 127l23-8 10 19-24 8Z" fill="#dbe3b3"/></g>';
const rugBase='<ellipse cx="120" cy="181" rx="97" ry="44" fill="#533b29" opacity=".17"/>'+
'<ellipse cx="120" cy="157" rx="104" ry="60" fill="#f6e6c4" stroke="#b78e62" stroke-width="5"/>'+
'<ellipse cx="120" cy="157" rx="87" ry="49" fill="#9ec07e"/>'+
'<ellipse cx="120" cy="157" rx="69" ry="38" fill="#fff1d2"/>';
const rugDetails='<g fill="#9fbd7a"><ellipse cx="120" cy="169" rx="27" ry="15"/><circle cx="87" cy="145" r="10"/><circle cx="109" cy="135" r="10"/><circle cx="138" cy="135" r="10"/><circle cx="158" cy="145" r="10"/></g>'+
'<path d="M81 161l7-3" stroke="#c6dba4" stroke-width="4" stroke-linecap="round"/>';
const plantBase=shadow+
'<path d="M84 155h75l-12 57q-25 20-52 0Z" fill="#f0d5ab" stroke="#99744e" stroke-width="6"/>'+
'<ellipse cx="122" cy="155" rx="39" ry="16" fill="#be9567" stroke="#906c4a" stroke-width="5"/>'+
'<ellipse cx="122" cy="157" rx="29" ry="10" fill="#75563e"/>'+
'<path d="M120 151q-18-33-13-67m19 67q13-39 23-69" fill="none" stroke="#5e8249" stroke-width="8"/>';
const plantDetails='<g fill="#88ba68" stroke="#57864c" stroke-width="5">'+
'<path d="M121 112Q69 114 63 68Q99 43 128 91Z"/>'+
'<path d="M125 117Q139 59 173 59Q197 97 150 118Z"/>'+
'<path d="M110 135Q70 145 55 116Q75 82 113 101Z"/>'+
'<path d="M130 135Q169 122 185 143Q176 179 137 158Z"/>'+
'<path d="M117 105Q107 64 126 35Q161 49 142 95Z"/></g>'+
'<path d="M89 72l31 35m31-29-17 32m-13-44 11 32" stroke="#b8d68c" stroke-width="5" fill="none" stroke-linecap="round"/>';
export const ROOM_FURNITURE_DIRECTIONS=Object.freeze({FRONT:0,RIGHT:1,BACK:2,LEFT:3});
export const ROOM_FOOTPRINTS=Object.freeze({
 sofa:{w:2,h:1},bed:{w:2,h:2},rug:{w:2,h:2},
 table:{w:1,h:1},shelf:{w:1,h:1},plant:{w:1,h:1},cabinet:{w:1,h:1}
});
export function facingFurnitureSVG(id,rotation=0){
 const d=((rotation%4)+4)%4;
 if(id==='rug')return bg(rugBase+'<g transform="rotate('+(d*90)+' 120 157)">'+rugDetails+'</g>',d);
 if(id==='table')return bg(tableBase+'<g transform="rotate('+(d*90)+' 120 139)">'+tableDetails+'</g>',d);
 if(id==='plant')return bg(plantBase+'<g transform="rotate('+(d*90)+' 123 116)">'+plantDetails+'</g>',d);
 if(d===0)return frontArt(id,0).replace('<svg ','<svg data-facing="0" ');
 const decorations=id==='cabinet'?cabinetTopDecorations:'';
 if(d===2)return bg((back[id]||frontArt(id,0))+decorations,d);
 if(d===1)return bg((side[id]||frontArt(id,0))+decorations,d);
 return bg(faceToLeft((side[id]||frontArt(id,0))+decorations),d);
}
