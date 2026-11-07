(()=>{
"use strict";
if(window.__monstudyTopFurnitureV1)return;
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
const FOUR_WAY=Object.freeze({
 bed:[[124,49,202,185],[374,60,322,176],[122,246,204,212],[374,246,322,218]],
 sofa:[[93,61,250,163],[374,26,321,222],[95,246,248,216],[374,246,318,248]],
 rug:[[108,49,205,171],[374,55,333,169],[124,246,173,212],[374,246,336,217]],
 table:[[97,44,251,192],[374,45,299,185],[99,246,247,205],[374,246,298,220]],
 shelf:[[169,13,150,228],[374,5,227,243],[172,246,151,246],[374,246,231,252]],
 plant:[[123,11,224,226],[374,19,255,218],[132,246,227,233],[374,246,298,233]],
 cabinet:[[127,23,235,211],[374,21,255,215],[137,246,231,227],[374,246,255,226]]
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
 const store="monstudy-pet-room-top-v1-"+def.id;
 try{const saved=JSON.parse(localStorage.getItem(store)||localStorage.getItem("monstudy-pet-room-flat-v2-"+def.id)||"null");if(saved&&Number.isInteger(saved.x)&&Number.isInteger(saved.y)&&Number.isInteger(saved.rotation))return{store,state:{x:saved.x,y:saved.y,placed:!!saved.placed},rotation:((saved.rotation%4)+4)%4}}catch{}
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
css.textContent="#sofaActor.flat-furniture{filter:none!important}#sofaActor.flat-furniture img{display:none!important}.flat-furniture{position:absolute;display:block;overflow:visible;cursor:pointer;pointer-events:auto;transform-origin:50% 50%;transition:left .18s ease,top .18s ease,transform .18s ease;filter:none!important}.flat-furniture[hidden]{display:none!important}.flat-furniture svg{display:block;width:100%;height:auto;overflow:hidden!important;filter:none!important}.flat-furniture.is-editing{filter:none!important}#room.placing .flat-furniture.is-editing{filter:none!important}#flatFurnitureHud{position:absolute;z-index:1400;width:140px;padding:8px;border:1px solid #5553;border-radius:16px;background:#fff;box-shadow:none;transform:translateY(-50%);touch-action:manipulation}#flatFurnitureHud[hidden]{display:none!important}.ff-pad{display:grid;grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px 38px;gap:1px;justify-content:center;align-items:center}.ff-key{appearance:none;border:1px solid #bbb;background:#fff;color:#426c53;border-radius:5px;font-size:22px;line-height:1}.ff-key:disabled{opacity:.28}.ff-mid{grid-column:2;grid-row:2;display:grid;place-items:center;width:30px;height:30px;margin:auto;border:1px solid #ddd}.ff-ul{grid-column:1;grid-row:1}.ff-ur{grid-column:3;grid-row:1}.ff-dl{grid-column:1;grid-row:3}.ff-dr{grid-column:3;grid-row:3}.ff-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.ff-action{appearance:none;min-height:32px;border:1px solid #bbb;border-radius:5px;background:#fff;color:#444;font-size:11px;font-weight:700}.ff-confirm{background:#4c765a;color:#fff;border-color:#4c765a}@media(max-width:700px){#flatFurnitureHud{width:132px;padding:7px}.ff-pad{grid-template-columns:35px 35px 35px;grid-template-rows:35px 35px 35px}.ff-action{font-size:10px}}";
css.textContent+="#sofaActor.flat-furniture img{display:none!important}.flat-furniture{transform-origin:50% 50%!important;filter:drop-shadow(0 4px 3px #614a2a38)!important}.flat-furniture svg{height:100%!important;overflow:visible!important}#flatFurnitureHud{background:#fffdf5;border:2px solid #d5b88d;box-shadow:0 5px 16px #46321b44}.ff-pad{grid-template-columns:38px 38px 38px;grid-template-rows:38px 38px}.ff-ul{grid-column:2;grid-row:1}.ff-ur{grid-column:3;grid-row:2}.ff-dl{grid-column:1;grid-row:2}.ff-dr{grid-column:2;grid-row:3}";document.head.append(css);
function fmt(n){return Number(n.toFixed(1))}
const ISOMETRIC_SPRITES=Object.freeze({
 bed:{file:"bed-isometric-4way-v3.png",width:1261,height:1247,views:[[20,600,600,620],[20,20,600,620],[650,20,600,620],[650,600,600,620]]},
 sofa:{file:"sofa-isometric-4way-v3.png",width:1309,height:1201,views:[[20,20,600,590],[20,600,600,590],[680,600,600,590],[680,20,600,590]]}
});
function makeSvg(item){
 const d=dims(item),W=item.w*100,H=item.h*100;
 const shapes={
 sofa:'<rect x="5" y="5" width="190" height="90" rx="18" fill="#805e41"/><rect x="10" y="10" width="180" height="80" rx="14" fill="#72b6a0"/><rect x="15" y="12" width="170" height="27" rx="10" fill="#4f8e7b"/><rect x="19" y="43" width="77" height="39" rx="10" fill="#9cdbbf" stroke="#4f8e7b" stroke-width="2"/><rect x="104" y="43" width="77" height="39" rx="10" fill="#9cdbbf" stroke="#4f8e7b" stroke-width="2"/><rect x="10" y="27" width="15" height="59" rx="7" fill="#65a590"/><rect x="175" y="27" width="15" height="59" rx="7" fill="#65a590"/>',
 bed:'<rect x="3" y="4" width="194" height="92" rx="13" fill="#987049"/><rect x="11" y="10" width="178" height="80" rx="8" fill="#f0eedc"/><rect x="16" y="18" width="50" height="64" rx="8" fill="#fafcf5" stroke="#d0d8bd" stroke-width="3"/><rect x="70" y="15" width="112" height="70" rx="8" fill="#a8caab"/><path d="M73 28H178M73 44H178M73 60H178M73 76H178" stroke="#d8e6cd" stroke-width="3" opacity=".8"/>',
 rug:'<rect x="10" y="10" width="180" height="180" rx="28" fill="#e2a9a0" stroke="#c17c6f" stroke-width="4"/><rect x="26" y="26" width="148" height="148" rx="23" fill="#f4d8c7" stroke="#fdf1df" stroke-width="4"/><path d="M100 38L161 100 100 162 39 100Z" fill="#eaaea0" stroke="#cc897f" stroke-width="5"/><circle cx="100" cy="100" r="22" fill="#f6e8ce" stroke="#c77f76" stroke-width="3"/>',
 table:'<ellipse cx="100" cy="53" rx="94" ry="44" fill="#6c4b31"/><ellipse cx="100" cy="48" rx="88" ry="41" fill="#b47a48"/><ellipse cx="100" cy="48" rx="76" ry="33" fill="#c7925c" stroke="#ddac77" stroke-width="3"/><rect x="72" y="31" width="39" height="28" rx="3" fill="#f7e9c0" transform="rotate(-8 91 45)"/><circle cx="139" cy="58" r="15" fill="#f5efe2" stroke="#7e5436" stroke-width="3"/><circle cx="139" cy="58" r="8" fill="#a77d55"/>',
 shelf:'<rect x="4" y="4" width="92" height="192" rx="7" fill="#795137"/><rect x="10" y="10" width="80" height="180" rx="4" fill="#b78554"/><path d="M11 60H89M11 106H89M11 153H89" stroke="#6c442a" stroke-width="7"/><path d="M22 15V52M33 15V52M45 15V52M59 15V52M73 15V52M23 68V100M37 68V100M51 68V100M65 68V100M78 68V100M23 114V146M39 114V146M56 114V146M73 114V146M24 160V183M38 160V183M55 160V183M72 160V183" stroke="#eac78a" stroke-width="8"/>',
 plant:'<ellipse cx="50" cy="55" rx="34" ry="34" fill="#75543c"/><circle cx="50" cy="48" r="30" fill="#a97751"/><circle cx="50" cy="48" r="23" fill="#54432e"/><g fill="#56985c" stroke="#397342" stroke-width="2"><ellipse cx="50" cy="24" rx="12" ry="28"/><ellipse cx="50" cy="24" rx="12" ry="28" transform="rotate(72 50 48)"/><ellipse cx="50" cy="24" rx="12" ry="28" transform="rotate(144 50 48)"/><ellipse cx="50" cy="24" rx="12" ry="28" transform="rotate(216 50 48)"/><ellipse cx="50" cy="24" rx="12" ry="28" transform="rotate(288 50 48)"/></g><circle cx="50" cy="48" r="9" fill="#9ccc73"/>',
 cabinet:'<rect x="7" y="9" width="86" height="86" rx="9" fill="#745238"/><rect x="12" y="8" width="76" height="78" rx="6" fill="#ba9064" stroke="#e2b383" stroke-width="3"/><path d="M22 22H78M22 74H78" stroke="#895f40" stroke-width="3"/><rect x="28" y="29" width="44" height="40" rx="5" fill="#d7ad7d"/><circle cx="50" cy="48" r="10" fill="#e8d5b7"/><circle cx="50" cy="48" r="5" fill="#80a9ad"/>'
 };
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(d.w*100)+' '+(d.h*100)+'" aria-hidden="true" focusable="false"><g transform="translate('+(d.w*50)+' '+(d.h*50)+') rotate('+(item.rotation*90)+') translate('+(-W/2)+' '+(-H/2)+')">'+shapes[item.id]+'</g></svg>';
}
function footprint(item){const d=dims(item),cells=[];for(let yy=0;yy<d.h;yy++)for(let xx=0;xx<d.w;xx++)cells.push({x:item.state.x+xx,y:item.state.y+yy});return cells}
function inBounds(c){return c.x>=0&&c.y>=0&&c.x<GRID&&c.y<GRID}
function fit(item){const d=dims(item);item.state.x=Math.max(0,Math.min(GRID-d.w,item.state.x));item.state.y=Math.max(0,Math.min(GRID-d.h,item.state.y))}
function removeOcc(item){if(!item.blocking)return;for(const c of footprint(item))occupied.delete(key(c.x,c.y))}
function addOcc(item){if(!item.state.placed||!item.blocking)return;for(const c of footprint(item))if(inBounds(c))occupied.add(key(c.x,c.y))}
function valid(item){return footprint(item).every(c=>inBounds(c)&&(!item.blocking||!occupied.has(key(c.x,c.y))))}
function save(item){localStorage.setItem(item.store,JSON.stringify({x:item.state.x,y:item.state.y,placed:item.state.placed,rotation:item.rotation}))}
function place(item){
 const d=dims(item),p=point((item.state.x+d.w/2)/GRID,(item.state.y+d.h/2)/GRID);
 item.actor.style.width=(d.w*768/GRID/10)+"%";
 item.actor.style.height=(d.h*768/GRID/10)+"%";
 item.actor.style.left=(p.x/10)+"%";
 item.actor.style.top=(p.y/10)+"%";
 item.actor.style.transform="translate(-50%,-50%)";
 item.actor.style.zIndex=String(item.id==="rug"?20:90+Math.round(p.y));
 item.actor.innerHTML=makeSvg(item);
 item.actor.hidden=!item.state.placed&&active!==item.id;
}
const hud=document.createElement("div");hud.id="flatFurnitureHud";hud.hidden=true;hud.innerHTML='<div class="ff-pad"><button class="ff-key ff-ul" data-d="ul">↑</button><button class="ff-key ff-ur" data-d="ur">→</button><div class="ff-mid">◇</div><button class="ff-key ff-dl" data-d="dl">←</button><button class="ff-key ff-dr" data-d="dr">↓</button></div><div class="ff-actions"><button class="ff-action" data-a="cancel">×戻す</button><button class="ff-action" data-a="rotate">↻回転</button><button class="ff-action" data-a="putAway">手元へ</button><button class="ff-action ff-confirm" data-a="ok">決定</button></div>';room.append(hud);
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
 const d=dims(item),blocked={ul:item.state.y<=0,dr:item.state.y>=GRID-d.h,ur:item.state.x>=GRID-d.w,dl:item.state.x<=0};
 for(const dir in blocked)hud.querySelector('[data-d="'+dir+'"]').disabled=blocked[dir];
 preview();requestAnimationFrame(hudPosition);
}
function findStart(item){for(let y=0;y<GRID;y++)for(let x=0;x<GRID;x++){item.state.x=x;item.state.y=y;fit(item);if(valid(item))return}item.state.x=0;item.state.y=0;fit(item)}
function start(item){
 if(active)return;backup={state:Object.assign({},item.state),rotation:item.rotation};removeOcc(item);
 if(!item.state.placed)findStart(item);
 active=item.id;gridWasShown=room.classList.contains("show-grid");window.MonStudyFurnitureEditing=true;grid.style.pointerEvents="auto";
 room.classList.add("placing");item.actor.hidden=false;
 if(note)note.textContent=item.label+"を上下左右キーで動かし、回転して配置できます。";
 sync();
}
function finish(){
 clearPreview();active=null;window.MonStudyFurnitureEditing=false;grid.style.pointerEvents="none";room.classList.remove("placing");
 if(!gridWasShown)room.classList.remove("show-grid");backup=null;
 if(note)note.textContent="家具をタップすると、位置や向きを変更できます。";
 sync();
}
function putAway(){
 const item=current();if(!item)return;
 item.state.placed=false;save(item);finish();
 if(note)note.textContent=item.label+"を手元に戻しました。";
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
 if(dir==="dl")item.state.x--;if(dir==="ur")item.state.x++;
 if(dir==="ul")item.state.y--;if(dir==="dr")item.state.y++;
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
 if(a.dataset.a==="rotate")rotate();if(a.dataset.a==="ok")confirm();if(a.dataset.a==="cancel")cancel();if(a.dataset.a==="putAway")putAway();
});
grid.addEventListener("click",event=>{const cell=event.target.closest(".grid-cell"),item=current();if(!cell||!item)return;const d=dims(item);item.state.x=Number(cell.dataset.x)-Math.floor(d.w/2);item.state.y=Number(cell.dataset.y)-Math.floor(d.h/2);fit(item);sync()});
window.addEventListener("keydown",event=>{if(!active)return;const dirs={ArrowUp:"ul",ArrowRight:"ur",ArrowLeft:"dl",ArrowDown:"dr"};if(!dirs[event.key]||["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;event.preventDefault();move(dirs[event.key])});
window.addEventListener("resize",hudPosition,{passive:true});
window.MonStudyRoomFurniture={get items(){return items.map(item=>({id:item.id,...item.state,rotation:item.rotation}))},get occupied(){return occupied}};
occupied.clear();
for(const item of items){fit(item);addOcc(item)}
sync();
})();