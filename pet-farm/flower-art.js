// Original borderless 1x1 farm flower artwork. Each tile has four rooted blooms.
const KINDS=['rose','sunflower','lavender','hydrangea','marigold','tulip'];
const SPOTS=[[12,15,-8],[38,14,6],[19,38,-5],[41,39,8]];
function bloom(type,x,y,rotation){
 const parts=[];
 const ellipse=(cx,cy,rx,ry,color,angle=0)=>'<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+color+'" transform="rotate('+angle+')"/>';
 const ring=(count,cy,rx,ry,color)=>{
  for(let i=0;i<count;i++)parts.push(ellipse(0,cy,rx,ry,color,i*360/count));
 };
 if(type==='rose'){
  ring(6,-3.4,3.2,5.0,'#a72749');
  parts.push('<circle cy="-1" r="5.4" fill="#e34c65"/>');
  parts.push('<path d="M-3 -3 Q3 -6 3 -1 Q2 3 -2 2 Q-4 0 -1 -1 Q2 -2 1 1" fill="none" stroke="#8e243e" stroke-width="1.8" stroke-linecap="round"/>');
  parts.push('<path d="M-5 1 Q-7 -3 -4 -6" fill="none" stroke="#ff9c9f" stroke-width="1.1"/>');
 }else if(type==='sunflower'){
  ring(10,-5.2,2.7,5.0,'#f7c745');
  parts.push('<circle cy="0" r="5.3" fill="#754425" stroke="#fce47a" stroke-width="1.1"/>');
  for(let i=0;i<7;i++){const bx=(i*7%9)-4,by=(i*11%9)-4;parts.push('<circle cx="'+bx+'" cy="'+by+'" r=".8" fill="#d59c56"/>');}
 }else if(type==='lavender'){
  parts.push('<path d="M0 5 L0 -10" stroke="#4b7c56" stroke-width="1.6"/>');
  for(let i=0;i<5;i++){
   const by=2-i*3.2,offset=i%2?.7:-.7;
   parts.push(ellipse(-2.6+offset,by,2.6,3.4,i%2?'#8461b3':'#ae83d8',-20));
   parts.push(ellipse(2.6+offset,by-1,2.6,3.4,i%2?'#b18de0':'#7452ad',20));
  }
  parts.push(ellipse(.1,-12.6,2.3,3.2,'#bea1ef'));
 }else if(type==='hydrangea'){
  parts.push('<circle cy="0" r="8.3" fill="#6c97cf"/>');
  for(const [px,py,color] of [[-3,-4,'#9bc3f0'],[3,-4,'#76b7e9'],[-5,2,'#c7dbfb'],[1,3,'#8da6eb'],[5,2,'#a6d4ee'],[0,-1,'#d2e5ff']]){
   parts.push(ellipse(px-1.8,py,2.1,1.6,color,-15)+ellipse(px+1.8,py,2.1,1.6,color,15)+ellipse(px,py-1.8,1.6,2.1,color)+ellipse(px,py+1.8,1.6,2.1,color));
   parts.push('<circle cx="'+px+'" cy="'+py+'" r=".85" fill="#f6e7ac"/>');
  }
 }else if(type==='marigold'){
  ring(12,-4,3.5,5,'#ed8a27');
  ring(9,-2.8,2.8,4,'#ffb342');
  parts.push('<circle cy="-1" r="3.7" fill="#d75c1d"/>');
  parts.push('<circle cy="-2" r="2.2" fill="#ffc35e"/>');
 }else if(type==='tulip'){
  parts.push('<path d="M-7 2 L-7 -7 L-3 -4 L0 -10 L4 -4 L8 -7 L7 2 Q3 8 0 8 Q-5 8 -7 2Z" fill="#e885a4" stroke="#b84975" stroke-width="1.2" stroke-linejoin="round"/>');
  parts.push('<path d="M-2 -4 L0 -9 L2 -4 L3 5 Q0 8 -2 5Z" fill="#ffb1bf"/>');
  parts.push('<path d="M-6 0 Q-4 4 -2 5" fill="none" stroke="#ffccd4" stroke-width="1.1"/>');
 }
 return '<g data-bloom="'+type+'" transform="translate('+x+' '+y+') rotate('+rotation+')">'+parts.join('')+'</g>';
}
export function flowerTileSVG(type){
 if(!KINDS.includes(type))return '';
 const plants=[];
 for(const [x,y,rotation] of SPOTS){
  // Grass itself is transparent; neighbouring tiles have no joins or frames.
  plants.push('<path d="M'+(x-1)+' '+(y+2)+' Q'+(x+2)+' '+(y+10)+' '+x+' '+Math.min(53,y+12)+'" fill="none" stroke="#417c3e" stroke-width="2.2" stroke-linecap="round"/>');
  plants.push('<path d="M'+x+' '+(y+8)+' Q'+(x-7)+' '+(y+3)+' '+(x-7)+' '+(y+10)+' Q'+(x-3)+' '+(y+14)+' '+x+' '+(y+9)+'Z" fill="#498443"/>');
  plants.push('<path d="M'+x+' '+(y+9)+' Q'+(x+8)+' '+(y+3)+' '+(x+8)+' '+(y+10)+' Q'+(x+4)+' '+(y+14)+' '+x+' '+(y+10)+'Z" fill="#6ba24a"/>');
  plants.push(bloom(type,x,y,rotation));
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 54 54" width="54" height="54" aria-hidden="true" focusable="false">'+plants.join('')+'</svg>';
}
