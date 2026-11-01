(()=>{
"use strict";
if(window.__monstudyFlatFurnitureV1)return;
window.__monstudyFlatFurnitureV1=true;
const api=window.MonStudyRoomGrid,room=api&&api.room,grid=api&&api.grid,point=api&&api.point,GRID=api&&api.GRID||6,occupied=window.MonStudyRoomOccupied,pet=document.getElementById("petActor"),note=document.getElementById("roomNote");
const sofa=document.getElementById("sofaActor"),sofaButton=document.getElementById("sofaButton");
if(!room||!grid||!point||!occupied||!sofa||!sofaButton)return;
const CELL_X=1000/15,CELL_Y=1000/30;
const SPRITES=Object.freeze({
 sofa:{x:38,y:264,w:242,h:214},
 bed:{x:283,y:267,w:255,h:221},
 rug:{x:540,y:297,w:254,h:150},
 table:{x:804,y:295,w:184,h:153},
 shelf:{x:82,y:498,w:159,h:266},
 plant:{x:342,y:498,w:145,h:244},
 cabinet:{x:575,y:532,w:207,h:212}
});
const defs=[
{id:"sofa",label:"ソファ",icon:"🛋️",w:2,h:1,elev:58,x:0,y:0,blocking:true},
{id:"bed",label:"ベッド",icon:"🛏️",w:2,h:1,elev:72,x:4,y:0,blocking:true},
{id:"rug",label:"ラグ",icon:"◇",w:2,h:2,elev:0,x:2,y:2,blocking:false},
{id:"table",label:"テーブル",icon:"▤",w:2,h:1,elev:60,x:2,y:4,blocking:true},
{id:"shelf",label:"本だな",icon:"▥",w:1,h:2,elev:125,x:0,y:3,blocking:true},
{id:"plant",label:"観葉植物",icon:"♧",w:1,h:1,elev:98,x:5,y:4,blocking:true},
{id:"cabinet",label:"キャビネット",icon:"▣",w:1,h:1,elev:48,x:3,y:0,blocking:true}
];
const key=(x,y)=>x+","+y;
function dims(item){return item.rotation%2===0?{w:item.w,h:item.h}:{w:item.h,h:item.w}}
function load(def){
 const store="monstudy-pet-room-flat-v2-"+def.id;
 try{const saved=JSON.parse(localStorage.getItem(store)||"null");if(saved&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&Number.isInteger(saved.rotation))return{store,state:{x:saved.x,y:saved.y,placed:!!saved.placed},rotation:((saved.rotation%4)+4)%4}}catch{}
 return{store,state:{x:def.x,y:def.y,placed:true},rotation:0};
}
const items=[];
let buttonAnchor=sofaButton;
for(const def of defs){
 const saved=load(def),actor=def.id==="sofa"?sofa:document.createElement("div");
 actor.id=def.id==="sofa"?"sofaActor":"flat-"+def.id+"Actor";
 actor.classList.add("flat-furniture");
 if(def.id!=="sofa"){actor.hidden=true;room.insertBefore(actor,pet||grid)}
 actor.setAttribute("role","button");actor.setAttribute("aria-label",def.label+"を移動");
 let button;if(def.id==="sofa"){button=sofaButton;button.textContent=def.label+"を移動";buttonAnchor=button}else{button=document.createElement("button");button.type="button";button.className="furniture-btn";button.textContent=def.label+"を移動";buttonAnchor.after(button);buttonAnchor=button}
 items.push(Object.assign({},def,saved,{actor,button}));
}
const css=document.createElement("style");
css.textContent="#sofaActor.flat-furniture{filter:none!important}#sofaActor.flat-furniture img{display:none!important}.flat-furniture{position:absolute;display:block;overflow:visible;cursor:pointer;pointer-events:auto;transform-origin:50% 50%;transition:left .18s ease,top .18s ease,transform .18s ease;filter:none!important}.flat-furniture[hidden]{display:none!important}.flat-furniture svg{display:block;width:100%;height:auto;overflow:visible;filter:none!important}.flat-furniture.is-editing{filter:none!important}#room.placing .flat-furniture.is-editing{filter:none!important}#flatFurnitureHud{position:absolute;z-index:1400;width:140px;padding:8px;border:1px solid #5553;border-radius:16px;background:#fff;box-shadow:none;transform:translateY(-50%);touch-action:manipulation}#flatFurnitureHud[hidden]{display:none!important}.ff-pad{display:grid;grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px 38px;gap:1px;justify-content:center;align-items:center}.ff-key{appearance:none;border:1px solid #bbb;background:#fff;color:#426c53;border-radius:5px;font-size:22px;line-height:1}.ff-key:disabled{opacity:.28}.ff-mid{grid-column:2;grid-row:2;display:grid;place-items:center;width:30px;height:30px;margin:auto;border:1px solid #ddd}.ff-ul{grid-column:1;grid-row:1}.ff-ur{grid-column:3;grid-row:1}.ff-dl{grid-column:1;grid-row:3}.ff-dr{grid-column:3;grid-row:3}.ff-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:6px}.ff-action{appearance:none;min-height:32px;border:1px solid #bbb;border-radius:5px;background:#fff;color:#444;font-size:11px;font-weight:700}.ff-confirm{background:#4c765a;color:#fff;border-color:#4c765a}@media(max-width:700px){#flatFurnitureHud{width:132px;padding:7px}.ff-pad{grid-template-columns:35px 35px 35px;grid-template-rows:35px 35px 35px}.ff-action{font-size:10px}}";
document.head.append(css);
function fmt(n){return Number(n.toFixed(1))}
function makeSvg(item){
 const s=SPRITES[item.id],r=((item.rotation%4)+4)%4;
 const transform=r===1?'translate('+(2*s.x+s.w)+' 0) scale(-1 1)':r===2?'translate('+(2*s.x+s.w)+' '+(2*s.y+s.h)+') scale(-1 -1)':r===3?'translate(0 '+(2*s.y+s.h)+') scale(1 -1)':'';
 const image='<image href="./assets/recraft-furniture.svg" x="0" y="0" width="1024" height="1024"/>';
 return'<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+s.x+' '+s.y+' '+s.w+' '+s.h+'" aria-hidden="true" focusable="false">'+(transform?'<g transform="'+transform+'">'+image+'</g>':image)+'</svg>';
}
function footprint(item){const d=dims(item),cells=[];for(let yy=0;yy<d.h;yy++)for(let xx=0;xx<d.w;xx++)cells.push({x:item.state.x+xx,y:item.state.y+yy});return cells}
function inBounds(c){return c.x>=0&&c.y>=0&&c.x<GRID&&c.y<GRID}
function fit(item){const d=dims(item);item.state.x=Math.max(0,Math.min(GRID-d.w,item.state.x));item.state.y=Math.max(0,Math.min(GRID-d.h,item.state.y))}
function removeOcc(item){if(!item.blocking)return;for(const c of footprint(item))occupied.delete(key(c.x,c.y))}
function addOcc(item){if(!item.state.placed||!item.blocking)return;for(const c of footprint(item))if(inBounds(c))occupied.add(key(c.x,c.y))}
function valid(item){return footprint(item).every(c=>inBounds(c)&&(!item.blocking||!occupied.has(key(c.x,c.y))))}
function save(item){localStorage.setItem(item.store,JSON.stringify({x:item.state.x,y:item.state.y,placed:item.state.placed,rotation:item.rotation}))}
function place(item){
 const d=dims(item),w=d.w,h=d.h,p=point((item.state.x+w/2)/GRID,(item.state.y+h/2)/GRID);
 const width=CELL_X*(w+h),floorH=CELL_Y*(w+h),sprite=SPRITES[item.id],artHeight=width*sprite.h/sprite.w,anchor=1-floorH/(2*artHeight);
 item.actor.style.width=(width/10)+"%";item.actor.style.left=(p.x/10)+"%";item.actor.style.top=(p.y/7.48)+"%";item.actor.style.transform="translate(-50%,-"+(100*anchor).toFixed(3)+"%)";item.actor.style.zIndex=String(90+Math.round(p.y));
 item.actor.innerHTML=makeSvg(item);item.actor.hidden=!item.state.placed&&active!==item.id;
}
const hud=document.createElement("div");hud.id="flatFurnitureHud";hud.hidden=true;hud.innerHTML='<div class="ff-pad"><button class="ff-key ff-ul" data-d="ul">↖</button><button class="ff-key ff-ur" data-d="ur">↗</button><div class="ff-mid">◇</div><button class="ff-key ff-dl" data-d="dl">↙</button><button class="ff-key ff-dr" data-d="dr">↘</button></div><div class="ff-actions"><button class="ff-action" data-a="cancel">×戻す</button><button class="ff-action" data-a="rotate">↻回転</button><button class="ff-action ff-confirm" data-a="ok">決定</button></div>';room.append(hud);
let active=null,backup=null,gridWasShown=false;
function current(){return active?items.find(item=>item.id===active):null}
function clearPreview(){grid.querySelectorAll(".grid-cell").forEach(cell=>cell.classList.remove("preview-valid","preview-invalid"))}
function preview(){
 clearPreview();const item=current();if(!item)return;const yes=valid(item);
 for(const c of footprint(item)){const cell=grid.querySelector('[data-x="'+c.x+'"][data-y="'+c.y+'"]');if(cell)cell.classList.add(yes?"preview-valid":"preview-invalid")}
 hud.querySelector('[data-a="ok"]').disabled=!yes;
}
function hudPosition(){
 const item=current();if(!item||hud.hidden)return;
 const rr=room.getBoundingClientRect(),ar=item.actor.getBoundingClientRect(),w=hud.offsetWidth||132,h=hud.offsetHeight||150;
 let x=ar.right-rr.left+8,y=ar.top-rr.top+ar.height*.55;
 if(x+w>rr.width-8)x=ar.left-rr.left-w-8;
 hud.style.left=Math.max(8,Math.min(rr.width-w-8,x))+"px";
 hud.style.top=Math.max(h*.5+8,Math.min(rr.height-h*.5-8,y))+"px";
}
function sync(){
 for(const item of items){
  place(item);item.button.textContent=item.state.placed?item.label+"を移動":item.label+"を置く";
  item.button.classList.toggle("active",active===item.id);item.button.disabled=!!(active&&active!==item.id);
  item.actor.classList.toggle("is-editing",active===item.id);item.actor.setAttribute("aria-label",item.label+"を移動");
 }
 const item=current();hud.hidden=!item;if(!item)return;
 hud.querySelector(".ff-mid").textContent=item.icon;
 const d=dims(item),blocked={ul:item.state.x<=0,dr:item.state.x>=GRID-d.w,ur:item.state.y<=0,dl:item.state.y>=GRID-d.h};
 for(const dir in blocked)hud.querySelector('[data-d="'+dir+'"]').disabled=blocked[dir];
 preview();requestAnimationFrame(hudPosition);
}
function findStart(item){for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){item.state.x=x;item.state.y=y;fit(item);if(valid(item))return}item.state.x=0;item.state.y=0;fit(item)}
function start(item){
 if(active)return;backup={state:Object.assign({},item.state),rotation:item.rotation};removeOcc(item);
 if(!item.state.placed)findStart(item);
 active=item.id;gridWasShown=room.classList.contains("show-grid");window.MonStudyFurnitureEditing=true;
 room.classList.add("placing");item.actor.hidden=false;
 if(note)note.textContent=item.label+"を斜めキーで動かし、回転して配置できます。";
 sync();
}
function finish(){
 clearPreview();active=null;window.MonStudyFurnitureEditing=false;room.classList.remove("placing");
 if(!gridWasShown)room.classList.remove("show-grid");backup=null;
 if(note)note.textContent="家具をタップすると、位置や向きを変更できます。";
 sync();
}
function confirm(){
 const item=current();if(!item||!valid(item))return;
 item.state.placed=true;save(item);addOcc(item);finish();
}
function cancel(){
 const item=current();if(!item)return;
 item.state=Object.assign({},backup.state);item.rotation=backup.rotation;addOcc(item);finish();
}
function move(dir){
 const item=current();if(!item)return;
 if(dir==="ul")item.state.x--;if(dir==="dr")item.state.x++;
 if(dir==="ur")item.state.y--;if(dir==="dl")item.state.y++;
 fit(item);sync();
}
function rotate(){const item=current();if(!item)return;item.rotation=(item.rotation+1)%4;fit(item);sync()}
for(const item of items){
 item.button.addEventListener("click",()=>start(item));
 item.actor.addEventListener("click",event=>{if(item.actor.hidden)return;event.preventDefault();event.stopPropagation();start(item)},true);
}
hud.addEventListener("click",event=>{
 const d=event.target.closest("[data-d]");if(d&&!d.disabled){move(d.dataset.d);return}
 const a=event.target.closest("[data-a]");if(!a)return;
 if(a.dataset.a==="rotate")rotate();if(a.dataset.a==="ok")confirm();if(a.dataset.a==="cancel")cancel();
});
window.addEventListener("resize",hudPosition,{passive:true});
window.MonStudyRoomFurniture={get items(){return items.map(item=>({id:item.id,...item.state,rotation:item.rotation}))},get occupied(){return occupied}};
occupied.clear();
for(const item of items){fit(item);addOcc(item)}
sync();
})();