export const CATALOG=Object.freeze({
 cushion:{label:'まるクッション',icon:'🟡',w:1,h:1},
 bowl:{label:'ペットボウル',icon:'🥣',w:1,h:1},
 lamp:{label:'ミニランプ',icon:'💡',w:1,h:1},
 plant:{label:'ミニグリーン',icon:'🌿',w:1,h:1},
 basket:{label:'おもちゃバスケット',icon:'🧺',w:1,h:1},
 table:{label:'ローテーブル',icon:'🫖',w:2,h:2},
 sofa:{label:'ふわふわソファ',icon:'🛋️',w:2,h:1},
 petbed:{label:'ペットベッド',icon:'🛏️',w:2,h:2},
 cabinet:{label:'ミニキャビネット',icon:'🗄️',w:2,h:1},
 bookshelf:{label:'絵本ラック',icon:'📚',w:2,h:1}
});

const roomCache=new Map(),furnitureCache=new Map();
const P={pink:['#f7e6df','#efdbd4','#d7edcf'],mint:['#e8f4e9','#deede0','#f1ced2'],blue:['#e8f2f6','#dfeaf0','#f3d5b8'],lilac:['#eee7f4','#e5dcef','#d9eccf']};
const F={cream:['#edd3a8','#c9a376'],pink:['#efcfca','#caa19c'],mint:['#d4e4d2','#a7c0a5']};
function c(w,h){const x=document.createElement('canvas');x.width=w;x.height=h;return x;}
function poly(g,p,fill,stroke='',lw=1){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}
function rr(g,x,y,w,h,r,fill,stroke='',lw=1){g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}
function isoBox(g,cx,cy,w,d,h,top,left,right){g.save();g.shadowColor='rgba(92,64,55,.18)';g.shadowBlur=10;g.shadowOffsetY=7;g.fillStyle='rgba(100,70,60,.12)';g.beginPath();g.ellipse(cx,cy+d*.55,w*.55,12,0,0,Math.PI*2);g.fill();g.restore();const o='rgba(127,92,80,.45)';poly(g,[[cx-w/2,cy-h],[cx,cy+d/2-h],[cx,cy+d/2],[cx-w/2,cy]],left,o,2);poly(g,[[cx+w/2,cy-h],[cx,cy+d/2-h],[cx,cy+d/2],[cx+w/2,cy]],right,o,2);poly(g,[[cx,cy-d/2-h],[cx+w/2,cy-h],[cx,cy+d/2-h],[cx-w/2,cy-h]],top,o,2)}
export function roomWebP(wall='wall-pink',floor='floor-cream'){
 const key=wall+'|'+floor;if(roomCache.has(key))return roomCache.get(key);
 const cv=c(1200,900),g=cv.getContext('2d');const wp=P[wall.replace('wall-','')]||P.pink,fp=F[floor.replace('floor-','')]||F.cream;
 const bg=g.createLinearGradient(0,0,0,900);bg.addColorStop(0,'#fff9f6');bg.addColorStop(1,'#fff0ec');g.fillStyle=bg;g.fillRect(0,0,1200,900);
 g.save();g.filter='blur(20px)';g.fillStyle='rgba(125,91,82,.15)';g.beginPath();g.ellipse(600,835,380,40,0,0,Math.PI*2);g.fill();g.restore();
 poly(g,[[140,580],[600,350],[600,105],[140,335]],wp[0],'#ddc1b7',5);poly(g,[[600,105],[1060,335],[1060,580],[600,350]],wp[1],'#d7bbb2',5);
 poly(g,[[140,390],[600,160],[600,225],[140,455]],wp[2]);poly(g,[[600,160],[1060,390],[1060,455],[600,225]],wp[2]);
 poly(g,[[600,350],[1060,580],[600,810],[140,580]],fp[0],'#c69d78',6);
 g.strokeStyle=fp[1]+'66';g.lineWidth=2;for(let i=1;i<10;i++){const t=i/10;g.beginPath();g.moveTo(600+(140-600)*t,350+(580-350)*t);g.lineTo(1060+(600-1060)*t,580+(810-580)*t);g.stroke();g.beginPath();g.moveTo(600+(1060-600)*t,350+(580-350)*t);g.lineTo(140+(600-140)*t,580+(810-580)*t);g.stroke()}
 g.strokeStyle='#fff1de';g.lineWidth=18;g.beginPath();g.moveTo(140,580);g.lineTo(600,350);g.lineTo(1060,580);g.stroke();g.strokeStyle='rgba(185,146,116,.5)';g.lineWidth=3;g.stroke();
 function winL(){poly(g,[[220,350],[385,268],[385,410],[220,492]],'#fbf1e8','#cfaa9d',8);poly(g,[[238,352],[367,288],[367,400],[238,465]],'#cae8f2');g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=7;g.beginPath();g.moveTo(302,320);g.lineTo(302,433);g.stroke();g.fillStyle='#fff1a9';g.beginPath();g.arc(345,315,12,0,Math.PI*2);g.fill()}
 function winR(){poly(g,[[815,268],[980,350],[980,492],[815,410]],'#fbf1e8','#cfaa9d',8);poly(g,[[833,288],[962,352],[962,465],[833,400]],'#cae8f2');g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=7;g.beginPath();g.moveTo(898,320);g.lineTo(898,433);g.stroke()}
 winL();winR();poly(g,[[430,215],[500,180],[500,235],[430,270]],'#fff9f4','#d8bbb0',5);poly(g,[[445,216],[485,196],[485,228],[445,248]],'#efb4bb');g.fillStyle='#fff9f4';g.strokeStyle='#d7bbb0';g.lineWidth=5;g.beginPath();g.ellipse(766,230,32,23,0,0,Math.PI*2);g.fill();g.stroke();g.strokeStyle='#74655f';g.lineWidth=4;g.beginPath();g.moveTo(766,230);g.lineTo(778,218);g.moveTo(766,230);g.lineTo(756,219);g.stroke();
 const url=cv.toDataURL('image/webp',.92);roomCache.set(key,url);return url;
}
function drawFurniture(type,ori){const cv=c(256,256),g=cv.getContext('2d');const rose='#ecb1b1',rose2='#d89598',cream='#fae5cd',wood='#c4916a',wood2='#a16f50',mint='#b1d2b5',green='#669a70',yellow='#f4cf72',blue='#abd0df';
 if(type==='cushion'){g.shadowColor='rgba(90,60,55,.18)';g.shadowBlur=10;g.fillStyle=rose;g.beginPath();g.ellipse(128,139,56,43,0,0,Math.PI*2);g.fill();g.strokeStyle='#cf8f92';g.lineWidth=4;g.stroke();g.fillStyle='rgba(255,230,228,.7)';g.beginPath();g.ellipse(128,136,37,28,0,0,Math.PI*2);g.fill()}
 if(type==='bowl'){g.fillStyle='#cfe6ea';g.beginPath();g.ellipse(128,147,54,34,0,0,Math.PI*2);g.fill();g.strokeStyle='#8cafb5';g.lineWidth=4;g.stroke();g.fillStyle='#96c4cd';g.beginPath();g.ellipse(128,136,40,16,0,0,Math.PI*2);g.fill();g.fillStyle='#edbd75';g.beginPath();g.ellipse(128,136,23,9,0,0,Math.PI*2);g.fill()}
 if(type==='lamp'){g.fillStyle=wood2;g.beginPath();g.ellipse(128,183,36,10,0,0,Math.PI*2);g.fill();rr(g,122,82,12,96,6,'#ad825e');poly(g,[[90,101],[110,61],[146,61],[166,101]],'#ffe5aa','#c89c60',4);g.fillStyle='rgba(255,222,112,.65)';g.beginPath();g.arc(128,90,15,0,Math.PI*2);g.fill()}
 if(type==='plant'){g.fillStyle=wood2;g.beginPath();g.ellipse(128,179,44,13,0,0,Math.PI*2);g.fill();poly(g,[[94,163],[162,163],[153,204],[103,204]],'#d79767','#9b6648',3);for(const [a,dx] of [[-35,-22],[35,22],[0,0],[-15,-9],[18,10]]){g.save();g.translate(128+dx,120);g.rotate(a*Math.PI/180);g.fillStyle=green;g.beginPath();g.ellipse(0,-22,14,39,0,0,Math.PI*2);g.fill();g.restore()}}
 if(type==='basket'){isoBox(g,128,158,120,62,55,'#e8bd86','#c89468','#b17b58');g.strokeStyle='#946a4d';g.lineWidth=8;g.beginPath();g.arc(128,129,48,33,Math.PI,Math.PI*2);g.stroke();g.fillStyle=yellow;g.beginPath();g.arc(111,116,13,0,Math.PI*2);g.fill();g.fillStyle=blue;g.beginPath();g.arc(145,116,14,0,Math.PI*2);g.fill()}
 if(type==='table'){isoBox(g,128,153,ori?112:154,ori?112:82,38,'#e6b681','#c38d63','#a97353');g.fillStyle='#fff8ef';g.beginPath();g.ellipse(112,104,13,7,0,0,Math.PI*2);g.fill();g.fillStyle=mint;g.beginPath();g.arc(149,106,10,0,Math.PI*2);g.fill()}
 if(type==='sofa'){isoBox(g,128,160,ori?112:165,ori?112:75,48,rose,rose2,'#c37f84');if(ori){rr(g,70,64,117,80,22,'#f4c3c3','#d89a9c',4);g.strokeStyle='rgba(210,140,145,.5)';g.lineWidth=3;g.beginPath();g.moveTo(73,104);g.lineTo(184,104);g.stroke()}else{rr(g,52,75,152,60,22,'#f4c3c3','#d89a9c',4);g.strokeStyle='rgba(210,140,145,.5)';g.lineWidth=3;g.beginPath();g.moveTo(128,79);g.lineTo(128,131);g.stroke()}}
 if(type==='petbed'){g.fillStyle='#cce6d2';poly(g,ori?[[128,90],[190,145],[128,207],[66,145]]:[[128,94],[205,145],[128,200],[51,145]],'#cce6d2','#8eb89b',4);poly(g,ori?[[128,108],[174,145],[128,188],[82,145]]:[[128,111],[181,145],[128,184],[75,145]],cream);g.fillStyle='rgba(236,167,151,.6)';g.beginPath();g.ellipse(128,143,24,16,0,0,Math.PI*2);g.fill()}
 if(type==='cabinet'){isoBox(g,128,162,ori?90:148,ori?98:62,92,'#ddb17d','#b9835c','#9e6a4c');g.strokeStyle='rgba(120,78,58,.6)';g.lineWidth=3;g.beginPath();g.moveTo(128,105);g.lineTo(128,187);g.stroke();g.fillStyle='#f3d78f';g.beginPath();g.arc(114,145,4,0,Math.PI*2);g.arc(142,145,4,0,Math.PI*2);g.fill()}
 if(type==='bookshelf'){isoBox(g,128,162,ori?90:150,ori?96:60,90,'#e2b88a','#bd8a63','#a36e50');const cols=[rose,mint,yellow,blue,'#ddb9dd',cream,rose2];for(let i=0;i<7;i++)rr(g,82+i*14,112,10,48,3,cols[i])}
 return cv.toDataURL('image/webp',.92)}
export function furnitureWebP(type,dir=0){const ori=Math.abs(dir)%2,key=type+'|'+ori;if(!furnitureCache.has(key))furnitureCache.set(key,drawFurniture(type,ori));return furnitureCache.get(key)}