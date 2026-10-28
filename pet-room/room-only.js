const GRID=10;
const VIEW_W=1536,VIEW_H=1024;
const FLOOR={top:{x:768,y:286},right:{x:1485,y:648},left:{x:52,y:648}};
const room=document.getElementById('room');
const grid=document.getElementById('gridLayer');
const pet=document.getElementById('petInRoom');
const toggle=document.getElementById('gridToggle');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');

function point(u,v){
  return {
    x:FLOOR.top.x+(FLOOR.right.x-FLOOR.top.x)*u+(FLOOR.left.x-FLOOR.top.x)*v,
    y:FLOOR.top.y+(FLOOR.right.y-FLOOR.top.y)*u+(FLOOR.left.y-FLOOR.top.y)*v
  };
}
function cellCenter(x,y){return point((x+.5)/GRID,(y+.5)/GRID);}
function corners(x,y){return [point(x/GRID,y/GRID),point((x+1)/GRID,y/GRID),point((x+1)/GRID,(y+1)/GRID),point(x/GRID,(y+1)/GRID)];}
function renderGrid(){
  grid.textContent='';
  for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){
    const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    p.classList.add('grid-cell');
    p.dataset.x=x;p.dataset.y=y;
    p.setAttribute('points',corners(x,y).map(v=>`${v.x},${v.y}`).join(' '));
    grid.appendChild(p);
  }
}

toggle.addEventListener('click',()=>{
  const on=!room.classList.contains('show-grid');
  room.classList.toggle('show-grid',on);
  toggle.setAttribute('aria-pressed',String(on));
  toggle.textContent=on?'グリッドを隠す':'10×10グリッドを確認';
});

function hydratePet(){
  try{
    const source=parent.document.querySelector('#petVisual svg,.pet-visual svg,[data-pet-visual] svg');
    if(!source)return;
    const svg=source.cloneNode(true),shadow=svg.querySelector('.pet-shadow');
    if(shadow){let n=svg.firstChild;while(n&&n!==shadow){const next=n.nextSibling;n.remove();n=next;}}
    pet.textContent='';pet.append(svg);
  }catch{}
}

const motion={cell:{x:2,y:7},route:[],from:null,to:null,start:0,pauseUntil:0,lastX:0};
function neighbors(x,y){return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&b>=0&&a<GRID&&b<GRID);}
function chooseRoute(){
  const goals=[];
  for(let y=1;y<GRID-1;y++)for(let x=1;x<GRID-1;x++)if(Math.abs(x-motion.cell.x)+Math.abs(y-motion.cell.y)>4)goals.push([x,y]);
  const goal=goals[Math.floor(Math.random()*goals.length)]||[5,5];
  let x=motion.cell.x,y=motion.cell.y;const route=[];
  while(x!==goal[0]||y!==goal[1]){
    const opts=neighbors(x,y).filter(([nx,ny])=>Math.abs(goal[0]-nx)+Math.abs(goal[1]-ny)<Math.abs(goal[0]-x)+Math.abs(goal[1]-y));
    const next=opts[Math.floor(Math.random()*opts.length)]||opts[0];
    if(!next)break;[x,y]=next;route.push({x,y});
  }
  motion.route=route;
}
function setPet(X,Y,walking,now){
  const face=X>=motion.lastX?1:-1;motion.lastX=X;
  pet.style.left=(X/VIEW_W*100)+'%';pet.style.top=(Y/VIEW_H*100)+'%';
  pet.style.zIndex=String(60+Math.round(Y));pet.style.setProperty('--pet-face',face);
  const bob=walking?Math.sin(now/105)*1.8:0;
  pet.style.transform=`translate(-50%,-80%) translateY(${bob}px)`;
}
function reset(){const p=cellCenter(motion.cell.x,motion.cell.y);setPet(p.x,p.y,false,0);motion.route=[];motion.from=null;motion.to=null;motion.pauseUntil=performance.now()+700;}
function loop(now){
  if(reduceMotion.matches){const p=cellCenter(4,6);setPet(p.x,p.y,false,now);requestAnimationFrame(loop);return;}
  if(document.hidden){requestAnimationFrame(loop);return;}
  if(motion.pauseUntil){const p=cellCenter(motion.cell.x,motion.cell.y);setPet(p.x,p.y,false,now);if(now>=motion.pauseUntil){motion.pauseUntil=0;chooseRoute();motion.from=null;}requestAnimationFrame(loop);return;}
  if(!motion.route.length){motion.pauseUntil=now+1000+Math.random()*2200;requestAnimationFrame(loop);return;}
  if(!motion.from){motion.from={...motion.cell};motion.to=motion.route[0];motion.start=now;}
  const t=Math.min(1,(now-motion.start)/720),a=cellCenter(motion.from.x,motion.from.y),b=cellCenter(motion.to.x,motion.to.y),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  setPet(a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e,true,now);
  if(t>=1){motion.cell={...motion.to};motion.route.shift();motion.from=null;motion.to=null;if(!motion.route.length)motion.pauseUntil=now+900+Math.random()*1900;}
  requestAnimationFrame(loop);
}

renderGrid();hydratePet();setTimeout(hydratePet,120);reset();requestAnimationFrame(loop);
