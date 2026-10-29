(()=>{
if(window.__monstudySofaV2)return;window.__monstudySofaV2=true;
const room=document.getElementById('room'),sofa=document.getElementById('sofaActor'),img=document.getElementById('sofaImage'),sofaButton=document.getElementById('sofaButton'),panel=document.getElementById('placementPanel'),okOld=document.getElementById('confirmFurniture'),cancelOld=document.getElementById('cancelFurniture'),grid=window.MonStudyRoomGrid?.grid,point=window.MonStudyRoomGrid?.point,GRID=window.MonStudyRoomGrid?.GRID||6,occupied=window.MonStudyRoomOccupied;
if(!room||!sofa||!img||!sofaButton||!panel||!okOld||!cancelOld||!grid||!point||!occupied)return;

const ROT='monstudy-pet-room-sofa-rotation-v3',STORE='monstudy-pet-room-sofa-v1';
let rotation=Number(localStorage.getItem(ROT));
if(!Number.isInteger(rotation)||rotation<0||rotation>3)rotation=0;
let backupRotation=rotation,frontAsset='',backAsset='';

const style=document.createElement('style');
style.textContent=`
#placementPanel{display:none!important}
#sofaActor{width:clamp(88px,20%,170px)!important;pointer-events:auto!important;cursor:pointer!important;transform:translate(-50%,-64%)!important;transform-origin:50% 88%!important;transition:left .18s ease,top .18s ease,transform .18s ease,filter .18s ease!important;filter:drop-shadow(0 4px 4px #5b3d2926)!important}
#sofaActor img{display:block;width:100%!important;height:auto!important;filter:none!important;transition:transform .18s ease!important;transform-origin:50% 50%!important}
#room.placing #sofaActor{transform:translate(-50%,-80%) scale(1.025)!important;filter:drop-shadow(0 11px 9px #5b3d293b)!important}
#roomFurnitureHud{position:absolute;z-index:1400;width:140px;padding:8px;border:1px solid #75696029;border-radius:18px;background:#fffcf8f5;box-shadow:0 10px 28px #4e3a2b2e;backdrop-filter:blur(8px);transform:translateY(-50%);touch-action:manipulation}
#roomFurnitureHud[hidden]{display:none!important}
#roomFurnitureHud .pad{display:grid;grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px 38px;gap:1px;justify-content:center;align-items:center}
#roomFurnitureHud .k{appearance:none;border:1px solid #d9ded9;background:#fff;color:#356b57;border-radius:12px;font-size:22px;font-weight:900;line-height:1;box-shadow:0 2px 6px #3e524814}
#roomFurnitureHud .k:active:not(:disabled){transform:scale(.92);background:#edf7f0}
#roomFurnitureHud .k:disabled{opacity:.27}
#roomFurnitureHud .ul{grid-column:1;grid-row:1}#roomFurnitureHud .ur{grid-column:3;grid-row:1}#roomFurnitureHud .dl{grid-column:1;grid-row:3}#roomFurnitureHud .dr{grid-column:3;grid-row:3}
#roomFurnitureHud .c{grid-column:2;grid-row:2;display:grid;place-items:center;width:30px;height:30px;margin:auto;border-radius:50%;background:#f6eee8}
#roomFurnitureHud .acts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:6px}
#roomFurnitureHud .a{appearance:none;min-height:32px;border-radius:10px;border:1px solid #d8dfda;background:#fff;font-size:11px;font-weight:850;color:#5d5753;padding:0 4px}
#roomFurnitureHud .rot{color:#765786;background:#fbf7ff;border-color:#e4d8eb}#roomFurnitureHud .ok{background:#39745b;border-color:#39745b;color:#fff}#roomFurnitureHud .ok:disabled{opacity:.42}
@media(max-width:700px){#sofaActor{width:clamp(86px,24%,126px)!important}#roomFurnitureHud{width:132px;padding:7px}#roomFurnitureHud .pad{grid-template-columns:35px 35px 35px;grid-template-rows:35px 35px 35px}#roomFurnitureHud .k{font-size:20px}#roomFurnitureHud .a{font-size:10px}}
`;
document.head.append(style);

const oldHud=document.getElementById('roomFurnitureHud');if(oldHud)oldHud.remove();
const hud=document.createElement('div');hud.id='roomFurnitureHud';hud.hidden=true;hud.innerHTML=`<div class="pad"><button class="k ul" data-d="ul">↖</button><button class="k ur" data-d="ur">↗</button><div class="c">🛋️</div><button class="k dl" data-d="dl">↙</button><button class="k dr" data-d="dr">↘</button></div><div class="acts"><button class="a" data-a="cancel">× 戻す</button><button class="a rot" data-a="rotate">↻ 回転</button><button class="a ok" data-a="ok">✓ 決定</button></div>`;room.append(hud);

const moves={ul:panel.querySelector('[data-move="left"]'),ur:panel.querySelector('[data-move="up"]'),dl:panel.querySelector('[data-move="down"]'),dr:panel.querySelector('[data-move="right"]')};
const key=(x,y)=>`${x},${y}`,editing=()=>room.classList.contains('placing')||!panel.hidden||window.MonStudyFurnitureEditing===true;
function saved(){try{const v=JSON.parse(localStorage.getItem(STORE)||'null');return v&&Number.isInteger(v.x)&&Number.isInteger(v.y)?v:null}catch{return null}}
function current(){return window.MonStudyRoomFurniture?.sofa||saved()}
function horizontal(r=rotation){return r%2===0}
function cells(s=current(),r=rotation){if(!s)return[];return horizontal(r)?[{x:s.x,y:s.y},{x:s.x+1,y:s.y}]:[{x:s.x,y:s.y},{x:s.x,y:s.y+1}]}
function clearOwn(s=current()){if(!s)return;for(const c of [{x:s.x,y:s.y},{x:s.x+1,y:s.y},{x:s.x,y:s.y+1}])occupied.delete(key(c.x,c.y))}
function valid(){const s=current();if(!s)return false;clearOwn(s);return cells(s).every(c=>c.x>=0&&c.y>=0&&c.x<GRID&&c.y<GRID&&!occupied.has(key(c.x,c.y)))}
function addOcc(){const s=current();if(!s?.placed)return;clearOwn(s);for(const c of cells(s))if(c.x>=0&&c.y>=0&&c.x<GRID&&c.y<GRID)occupied.add(key(c.x,c.y))}

function applyAsset(){
  const back=rotation>=2;
  const src=back?backAsset:frontAsset;
  if(src&&img.src!==src)img.src=src;
  const flip=horizontal(rotation);
  img.style.transform=flip?'scaleX(-1)':'none';
  sofa.dataset.rotation=String(rotation);
}
function place(){
  const s=current();if(!s)return;
  const h=horizontal(rotation);
  const p=point((s.x+(h?1:.5))/GRID,(s.y+(h?.5:1))/GRID);
  const dx=[-4,0,-4,0][rotation],dy=[4,4,4,4][rotation];
  const l=`${(p.x+dx)/10}%`,t=`${(p.y+dy)/7.48}%`;
  if(sofa.style.left!==l)sofa.style.left=l;
  if(sofa.style.top!==t)sofa.style.top=t;
  sofa.style.zIndex=String(90+Math.round(p.y));
}
function preview(){if(!editing())return;grid.querySelectorAll('.grid-cell').forEach(e=>e.classList.remove('preview-valid','preview-invalid'));const yes=valid();for(const c of cells()){const e=grid.querySelector(`[data-x="${c.x}"][data-y="${c.y}"]`);if(e)e.classList.add(yes?'preview-valid':'preview-invalid')}hud.querySelector('[data-a="ok"]').disabled=!yes}
function hudPos(){if(hud.hidden)return;const rr=room.getBoundingClientRect(),sr=sofa.getBoundingClientRect(),w=hud.offsetWidth||132,h=hud.offsetHeight||152;let x=sr.right-rr.left+9,y=sr.top-rr.top+sr.height*.56;if(x+w>rr.width-8)x=sr.left-rr.left-w-9;hud.style.left=`${Math.max(8,Math.min(rr.width-w-8,x))}px`;hud.style.top=`${Math.max(h*.5+8,Math.min(rr.height-h*.5-8,y))}px`}
function sync(){applyAsset();place();hud.hidden=!editing();if(!hud.hidden)requestAnimationFrame(()=>{const s=current(),h=horizontal(),dis={ul:!s||s.x<=0,dr:!s||s.x>=(h?GRID-2:GRID-1),ur:!s||s.y<=0,dl:!s||s.y>=(h?GRID-1:GRID-2)};for(const d of Object.keys(moves)){const b=hud.querySelector(`[data-d="${d}"]`);if(b)b.disabled=dis[d]||!moves[d]}preview();hudPos()})}

sofa.addEventListener('click',e=>{if(sofa.hidden)return;e.preventDefault();e.stopPropagation();if(!editing()){backupRotation=rotation;clearOwn();sofaButton.click()}setTimeout(sync,0)},true);
hud.addEventListener('click',e=>{const d=e.target.closest('[data-d]')?.dataset.d;if(d){const b=moves[d];if(b&&!e.target.disabled)b.click();setTimeout(sync,0);return}const a=e.target.closest('[data-a]')?.dataset.a;if(a==='rotate'){rotation=(rotation+1)%4;applyAsset();place();sync();return}if(a==='ok'){if(!valid())return;localStorage.setItem(ROT,String(rotation));okOld.click();setTimeout(()=>{addOcc();sync()},0);return}if(a==='cancel'){rotation=backupRotation;cancelOld.click();setTimeout(()=>{applyAsset();addOcc();sync()},0)}});
sofaButton.addEventListener('click',()=>{if(!editing()){backupRotation=rotation;clearOwn()}setTimeout(sync,0)});
okOld.addEventListener('click',()=>setTimeout(()=>{localStorage.setItem(ROT,String(rotation));addOcc();sync()},0));
cancelOld.addEventListener('click',()=>setTimeout(()=>{rotation=backupRotation;applyAsset();addOcc();sync()},0));
new MutationObserver(()=>{if((rotation<2?frontAsset:backAsset)&&img.style.transform!==(horizontal()?'scaleX(-1)':'none'))applyAsset()}).observe(img,{attributes:true,attributeFilter:['src','style']});
new MutationObserver(sync).observe(room,{attributes:true,attributeFilter:['class']});
new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('resize',hudPos,{passive:true});

Promise.all(['se','ne'].map(async n=>{const r=await fetch(`assets/sofa-4dir/${n}.b64?v=4`,{cache:'force-cache'});if(!r.ok)throw Error(n);return`data:image/webp;base64,${(await r.text()).trim()}`})).then(([front,back])=>{frontAsset=front;backAsset=back;applyAsset();addOcc();sync()}).catch(console.error);
})();