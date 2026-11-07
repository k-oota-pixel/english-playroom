// Isometric pixel-room artwork. Each furniture item is an independent PNG sprite,
// never a cutout of a completed room illustration.
export const CATALOG = Object.freeze({
  bed:{label:'木のベッド',icon:'🛏️',w:2,h:3},
  sofa:{label:'花柄ソファ',icon:'🛋️',w:2,h:2},
  table:{label:'丸いちゃぶ台',icon:'🫖',w:2,h:2},
  cabinet:{label:'木のキャビネット',icon:'🗄️',w:2,h:1},
  bookshelf:{label:'絵本の本棚',icon:'📚',w:2,h:1},
  plant:{label:'観葉植物',icon:'🌿',w:1,h:1},
  rug:{label:'花柄のラグ',icon:'🌸',w:2,h:2},
  tv:{label:'テレビとテレビ台',icon:'📺',w:2,h:1},
  desk:{label:'勉強机',icon:'✏️',w:2,h:2},
  kotatsu:{label:'こたつ',icon:'🍊',w:2,h:2},
  mirror:{label:'姿見の鏡',icon:'🪞',w:1,h:1},
  petbed:{label:'ペットの寝床',icon:'🐾',w:2,h:2},
  lamp:{label:'ランプ',icon:'💡',w:1,h:1},
  bowl:{label:'ごはんのお皿',icon:'🥣',w:1,h:1}
});
const sheets={
  bed:'bed-isometric-4way-v3.png',
  sofa:'sofa-isometric-4way-v3.png',
  table:'table-4way-v1.png',
  cabinet:'cabinet-4way-v1.png',
  bookshelf:'shelf-4way-v1.png',
  plant:'plant-4way-v1.png',
  rug:'rug-4way-v1.png'
};
const images={},sprites=new Map(),rooms=new Map();
const palette={
  'wall-pink':['#f6d9cb','#f8e3d5','#c98f73'],
  'wall-mint':['#d9e6d0','#eff3dc','#80a38a'],
  'wall-blue':['#d8e8e7','#e8f2ed','#7a9fa8'],
  'wall-lilac':['#e7d9e8','#f2e7ed','#ad8aa7']
};
const floors={
  'floor-cream':['#d9a777','#e7bd8e','#ad754c'],
  'floor-pink':['#d2a19c','#e6c2b9','#a47470'],
  'floor-mint':['#a9bea5','#c5d4b2','#788f76']
};
const C=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const P=(g,points,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.closePath();g.fill()};
const R=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const h=(a,b,c=0)=>{let n=(a*92837111+b*689287499+c*283923481)>>>0;n^=n>>>13;n=Math.imul(n,1274126177);return(n^(n>>>16))>>>0};
const dot=(g,x,y,color)=>R(g,x,y,1,1,color);
function tex(g,x,y,w,hh,light,dark,salt=0){
  for(let yy=y;yy<y+hh;yy+=2)for(let xx=x;xx<x+w;xx+=2){
    const n=h(xx,yy,salt)%37;
    if(n===1||n===3)dot(g,xx,yy,light);
    if(n===7)dot(g,xx,yy,dark);
  }
}
function pixelRoom(wall='wall-pink',floor='floor-cream'){
  const p=palette[wall]||palette['wall-pink'],f=floors[floor]||floors['floor-cream'];
  const cv=C(300,225),g=cv.getContext('2d');g.imageSmoothingEnabled=false;
  R(g,0,0,300,225,'#f7f2e8');
  for(let y=0;y<225;y+=6)for(let x=0;x<300;x+=6)
    if(h(x,y)%9===0)R(g,x,y,2,2,'#f2e8de');
  // Center all world geometry inside the 300-pixel canvas; the SVG tile grid shares this origin.
  g.save();g.translate(25,0);g.translate(125,112);g.scale(1.2,1.1);g.translate(-125,-112);
  // Two inner walls and deep timber joints: these are scenery, not movable furniture.
  P(g,[[25,67],[125,18],[125,75],[25,124]],p[0]);
  P(g,[[125,18],[225,67],[225,124],[125,75]],p[1]);
  P(g,[[25,65],[125,15],[225,65],[225,69],[125,20],[25,70]],'#7e4e36');
  P(g,[[21,67],[27,64],[27,125],[21,128]],'#9a6342');
  P(g,[[122,16],[128,16],[128,78],[122,76]],'#a16845');
  P(g,[[223,65],[229,68],[229,125],[223,123]],'#a16845');
  for(let t=0;t<7;t++){
    const y=35+t*11;
    for(let x=26;x<121;x+=5)if(h(x,y)%5===0)dot(g,x,y,p[2]);
    for(let x=131;x<224;x+=5)if(h(x,y,3)%5===0)dot(g,x,y,p[2]);
  }
  // Window on the left wall with wooden mullions, curtain and outdoor blossoms.
  P(g,[[40,72],[88,48],[88,86],[40,109]],'#6d432e');
  P(g,[[43,75],[85,54],[85,83],[43,104]],'#94ccd2');
  P(g,[[43,91],[85,70],[85,83],[43,104]],'#9ac4a7');
  P(g,[[43,75],[85,54],[85,58],[43,79]],'#d7eef0');
  P(g,[[62,65],[65,64],[65,95],[62,96]],'#80553a');
  P(g,[[43,88],[85,67],[85,70],[43,91]],'#80553a');
  for(let j=0;j<12;j++){
    const x=47+h(j,1)%34,y=64+h(j,2)%28;
    R(g,x,y,3,2,j%2?'#f5a4ab':'#ffd2d2');
  }
  P(g,[[40,73],[47,70],[48,99],[42,104]],'#fff2dc');
  P(g,[[81,52],[89,48],[89,89],[83,93]],'#fff2dc');
  R(g,43,80,5,2,'#ce8393');R(g,83,72,5,2,'#ce8393');
  // Small landscape on right wall.
  P(g,[[160,49],[200,70],[200,98],[160,78]],'#84543a');
  P(g,[[163,53],[197,71],[197,94],[163,76]],'#a0c7cc');
  P(g,[[167,73],[178,61],[185,69],[191,66],[196,80],[196,93],[164,75]],'#77a4a3');
  P(g,[[174,66],[178,61],[182,66]],'#fff1e6');
  P(g,[[159,48],[201,69],[201,73],[159,52]],'#b67d51');
  // Timbers at wall/floor seam.
  P(g,[[25,122],[125,72],[225,122],[225,127],[125,78],[25,128]],'#825137');
  // Individual diamond floor tiles. 1 canvas pixel becomes 4 screen pixels.
  const center=(x,y)=>[125+(x-y)*10,77+(x+y)*5];
  for(let y=0;y<10;y++)for(let x=0;x<10;x++){
    const [px,py]=center(x,y),n=h(x,y)%4;
    P(g,[[px,py-5],[px+10,py],[px,py+5],[px-10,py]],n===0?f[0]:f[1]);
    P(g,[[px,py-5],[px+10,py],[px,py+5],[px-10,py]],n===2?f[0]:f[1]);
    R(g,px-3,py-1,2,1,(n%2)?'#f4d4ae':'#c78f5e');
    R(g,px+2,py+1,3,1,f[2]);
    if(h(x,y,20)%3===0)R(g,px-5,py+1,2,1,'#f3d1ad');
  }
  // Edge thickness and visible corner joints.
  P(g,[[25,122],[125,172],[125,183],[25,133]],'#b1774a');
  P(g,[[125,172],[225,122],[225,133],[125,183]],'#885736');
  P(g,[[25,132],[125,181],[225,132],[225,136],[125,187],[25,137]],'#6b422e');
  for(let i=0;i<9;i++){
    const x=29+i*11,y=128+i*5.5;
    R(g,x,y,2,2,'#754b32');
  }
  // Inset wall shelves with deliberately irregular wooden grain.
  P(g,[[134,43],[149,50],[149,54],[134,47]],'#8a5b3c');
  for(let i=0;i<3;i++)R(g,137+i*4,38+i,3,8,['#c88763','#b3a886','#9b84a8'][i]);
  // Tiny hanging vines.
  for(let i=0;i<8;i++){const x=143+i%3*2,y=55+i*3;R(g,x,y,3,3,i%2?'#5d9169':'#80ae69')}
  // Cozy rugs are independent furniture; do not bake one into the floor.
  g.restore();return cv.toDataURL('image/png');
}
export function roomWebP(wall='wall-pink',floor='floor-cream'){
 const k=wall+'|'+floor;if(!rooms.has(k))rooms.set(k,pixelRoom(wall,floor));return rooms.get(k);
}
function drawIsoBox(g,x,y,w,d,hh,top,left,right){
 P(g,[[x-w/2,y-hh],[x,y+d/2-hh],[x,y+d/2],[x-w/2,y]],left);
 P(g,[[x+w/2,y-hh],[x,y+d/2-hh],[x,y+d/2],[x+w/2,y]],right);
 P(g,[[x,y-d/2-hh],[x+w/2,y-hh],[x,y+d/2-hh],[x-w/2,y-hh]],top);
}
function manual(type,dir=0){
 const cv=C(112,112),g=cv.getContext('2d');g.imageSmoothingEnabled=false;
 // East/west viewpoints face opposite directions; objects with backs have separate reverse details.
 if(dir%2){g.translate(112,0);g.scale(-1,1);}
 // Crisp contact shadow, independent from the tile background.
 P(g,[[22,81],[53,96],[94,78],[61,66]],'rgba(65,47,33,.18)');
 const wood=['#a96d45','#805138','#d49a62'],cream='#f8e4bf',pink='#d78b92';
 if(type==='tv'){
   drawIsoBox(g,55,77,72,22,15,'#bd8b5b','#95603e','#704a35');
   R(g,27,35,57,34,'#3f3c3e');
   if(dir>=2){R(g,31,39,49,25,'#66594d');R(g,36,44,39,3,'#a3896b');R(g,36,51,39,2,'#86715a');R(g,61,58,12,4,'#b7a28b');}
   else{R(g,31,39,49,25,'#91b7c3');R(g,35,42,42,13,'#b8d7df');P(g,[[33,58],[48,48],[55,55],[63,51],[77,59],[77,62],[33,62]],'#87a98b');}
   R(g,37,62,8,2,'#e6bfce');R(g,51,65,11,2,'#4b3d3f');
   for(let i=0;i<8;i++)R(g,30+i*6,77+i%2,3,2,wood[2]);
   R(g,40,86,9,3,'#e6bdb0');R(g,67,86,9,3,cream);
 } else if(type==='desk'){
   drawIsoBox(g,54,71,76,37,5,'#d4a073','#a96e49','#7b4d36');
   R(g,25,73,6,20,'#986241');R(g,76,73,6,20,'#885739');
   R(g,28,44,19,7,'#f5e4b8');R(g,30,43,15,2,'#fbf1d7');
   R(g,64,38,3,17,'#7c5a3c');R(g,57,35,17,6,'#efcd7b');
   R(g,61,43,9,3,'#fff3c9');R(g,36,44,4,2,'#9777ad');
   for(let i=0;i<8;i++)R(g,32+i*6,65+i%2,4,1,wood[1]);
 } else if(type==='kotatsu'){
   P(g,[[55,40],[98,64],[55,94],[11,65]],'#c77075');
   P(g,[[55,49],[88,66],[55,86],[22,66]],'#e29b9d');
   P(g,[[55,43],[88,61],[55,80],[22,61]],'#e8a2a1');
   for(let i=0;i<17;i++){let x=22+h(i,4)%63,y=57+h(i,5)%20;R(g,x,y,2,2,i%3?'#fbd6ba':'#ffe9d5')}
   drawIsoBox(g,55,54,65,32,4,'#bd8855','#97613f','#764b31');
   R(g,48,40,12,5,'#e0a957');R(g,51,37,4,4,'#f5bd54');R(g,57,36,4,4,'#ef9f36');
 } else if(type==='mirror'){
   R(g,42,16,31,67,'#92603d');R(g,45,19,25,58,dir>=2?'#8f603f':'#cbeced');
   if(dir>=2){for(let i=0;i<4;i++)R(g,48,26+i*11,19,2,'#b68350');}
   else{R(g,48,22,5,50,'#eaf9f2');R(g,60,26,3,43,'#b2d4d6');}
   R(g,48,81,24,3,'#7b4a32');R(g,52,83,16,7,'#a16e42');
   R(g,39,18,3,50,'#b88253');R(g,71,20,3,50,'#875535');
 } else if(type==='petbed'){
   P(g,[[52,50],[88,68],[52,87],[16,67]],'#b07849');
   P(g,[[52,55],[83,68],[52,82],[21,67]],'#f4d5bb');
   P(g,[[52,58],[75,67],[52,77],[29,67]],'#f7e8cf');
   R(g,51,64,4,4,pink);R(g,46,69,5,3,pink);R(g,57,69,5,3,pink);
 } else if(type==='lamp'){
   R(g,53,34,7,43,'#8e624a');R(g,46,30,22,18,'#f8da87');
   R(g,49,33,16,12,'#fff2bf');R(g,50,27,14,5,'#d9aa67');
   drawIsoBox(g,56,80,24,12,4,'#e2b483','#98714f','#80583b');
 } else if(type==='bowl'){
   P(g,[[56,53],[82,65],[56,78],[30,65]],'#d9a084');
   P(g,[[56,55],[76,65],[56,75],[36,65]],'#fff2dc');
   for(let i=0;i<11;i++)R(g,43+h(i,1)%27,61+h(i,3)%9,3,2,'#c9904c');
   R(g,54,69,4,3,'#d78380');
 } else {
   // A small textile cushion, useful as a fallback while image sprites load.
   P(g,[[56,46],[87,64],[56,81],[25,64]],'#a87566');
   P(g,[[56,48],[81,64],[56,77],[31,64]],'#e6a6ad');
   for(let i=0;i<12;i++)R(g,35+h(i,3)%43,57+h(i,4)%15,2,2,'#fce5c9');
 }
 // A few individual light/shadow pixels keep the surface handmade rather than flat.
 const img=g.getImageData(0,0,112,112),a=img.data;
 for(let y=1;y<111;y++)for(let x=1;x<111;x++){
   const i=(y*112+x)*4;if(a[i+3]<200)continue;
   const n=h(x,y,type.length+dir)%29;if(n===0){a[i]=Math.min(255,a[i]+18);a[i+1]=Math.min(255,a[i+1]+12);}
   else if(n===1){a[i]=Math.max(0,a[i]-15);a[i+1]=Math.max(0,a[i+1]-11);}
 }
 g.putImageData(img,0,0);return cv.toDataURL('image/png');
}
function prepareSheet(type){
 if(images[type])return;
 const img=new Image();images[type]={img,ok:false,failed:false};
 img.onload=()=>{images[type].ok=true;for(const k of sprites.keys())if(k.startsWith(type+':'))sprites.delete(k);window.dispatchEvent(new Event('pixel-room-art-ready'))};
 img.onerror=()=>{images[type].failed=true;window.dispatchEvent(new Event('pixel-room-art-ready'))};
 img.src='./assets/furniture-directional/'+sheets[type];
}
function sheetSprite(type,dir){
 const info=images[type];if(!info?.ok)return null;
 const cv=C(112,112),g=cv.getContext('2d'),im=info.img;
 const sw=im.naturalWidth/2,sh=im.naturalHeight/2,dx=(dir%2)*sw,dy=(Math.floor(dir/2)%2)*sh;
 const tmp=C(84,84),t=tmp.getContext('2d');
 t.clearRect(0,0,84,84);t.imageSmoothingEnabled=true;
 t.drawImage(im,dx,dy,sw,sh,0,0,84,84);
 g.imageSmoothingEnabled=false;
 g.drawImage(tmp,3,3,106,106);
 return cv.toDataURL('image/png');
}
export function furnitureWebP(type,dir=0){
 const d=((Number(dir)||0)%4+4)%4,k=type+':'+d;
 if(sprites.has(k))return sprites.get(k);
 let result=null;
 if(sheets[type]){prepareSheet(type);result=sheetSprite(type,d);}
 result=result||manual(type,d);if(result&&(!sheets[type]||images[type]?.ok||images[type]?.failed))sprites.set(k,result);
 return result;
}
