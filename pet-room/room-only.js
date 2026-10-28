const GRID=10;
const FLOOR={
  top:{x:768,y:300},
  right:{x:1452,y:612},
  bottom:{x:768,y:1008},
  left:{x:84,y:612}
};
const room=document.getElementById('room');
const roomArt=document.getElementById('roomArt');
const grid=document.getElementById('gridLayer');
const toggle=document.getElementById('gridToggle');
const loadError=document.getElementById('loadError');

function point(u,v){
  const a=FLOOR.top,b=FLOOR.right,c=FLOOR.bottom,d=FLOOR.left;
  const iu=1-u,iv=1-v;
  return {
    x:a.x*iu*iv+b.x*u*iv+c.x*u*v+d.x*iu*v,
    y:a.y*iu*iv+b.y*u*iv+c.y*u*v+d.y*iu*v
  };
}
function corners(x,y){
  const u0=x/GRID,v0=y/GRID,u1=(x+1)/GRID,v1=(y+1)/GRID;
  return [point(u0,v0),point(u1,v0),point(u1,v1),point(u0,v1)];
}
function renderGrid(){
  grid.textContent='';
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    p.classList.add('grid-cell');
    p.dataset.x=x;p.dataset.y=y;
    p.setAttribute('points',corners(x,y).map(v=>`${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' '));
    grid.appendChild(p);
  }
}

toggle.addEventListener('click',()=>{
  const on=!room.classList.contains('show-grid');
  room.classList.toggle('show-grid',on);
  toggle.setAttribute('aria-pressed',String(on));
  toggle.textContent=on?'グリッドを隠す':'10×10グリッドを確認';
});

roomArt.addEventListener('load',()=>{loadError.hidden=true;room.classList.add('image-ready');});
roomArt.addEventListener('error',()=>{loadError.hidden=false;room.classList.remove('image-ready');});
if(roomArt.complete){
  if(roomArt.naturalWidth)room.classList.add('image-ready');
  else loadError.hidden=false;
}

renderGrid();
