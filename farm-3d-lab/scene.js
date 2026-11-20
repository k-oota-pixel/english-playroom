import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MAP,FIELD_TYPES,DISPLAY_TYPES,CROPS,FLOWERS,plotKey,growthPhase} from '../pet-farm/model.js?v=13';
export function createFarm3D(host,api){
 const scene=new T.Scene();scene.background=new T.Color(0xbcdde5);scene.fog=new T.Fog(0xbcdde5,55,105);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.append(renderer.domElement);
 const camera=new T.PerspectiveCamera(42,1,.1,125);camera.position.set(26,25,29);const ctl=new OrbitControls(camera,renderer.domElement);ctl.target.set(16,0,8);ctl.enableDamping=true;ctl.screenSpacePanning=false;ctl.minDistance=7;ctl.maxDistance=67;ctl.maxPolarAngle=Math.PI*.47;ctl.minPolarAngle=.18;ctl.mouseButtons={LEFT:T.MOUSE.PAN,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};ctl.update();
 scene.add(new T.HemisphereLight(0xfff7df,0x708c58,2));const light=new T.DirectionalLight(0xffe5b8,2.2);light.position.set(7,28,16);light.castShadow=true;Object.assign(light.shadow.camera,{left:-24,right:24,top:18,bottom:-18,near:.1,far:65});light.target.position.set(16,0,8);light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0005;scene.add(light,light.target);
 const materials=new Map();function mat(c){if(!materials.has(c))materials.set(c,new T.MeshStandardMaterial({color:c,roughness:.87}));return materials.get(c)}
 const geometries=new Map();function geo(k,fn){if(!geometries.has(k))geometries.set(k,fn());return geometries.get(k)}
 function obj(g,c,x,y,z){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
 function box(w,h,d,c,x,y,z){return obj(geo('b'+[w,h,d],()=>new T.BoxGeometry(w,h,d)),c,x,y,z)}
 function ball(r,c,x,y,z){return obj(geo('s'+r,()=>new T.IcosahedronGeometry(r,1)),c,x,y,z)}
 function cyl(a,b,h,c,x,y,z){return obj(geo('c'+[a,b,h],()=>new T.CylinderGeometry(a,b,h,8)),c,x,y,z)}
 scene.add(box(32,.42,16,0x9ec47c,16,-.22,8),box(32.2,.6,16.2,0x748a4a,16,-.73,8));
 const grid=new T.GridHelper(32,32,0x85a765,0x85a765);grid.scale.z=.5; // use exact one-tile spacing instead of scaled grid
 const points=[];for(let x=0;x<=32;x++)points.push(x,.004,0,x,.004,16);for(let z=0;z<=16;z++)points.push(0,.004,z,32,.004,z);
 const lines=new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:0x729753,transparent:true,opacity:.2}));scene.add(lines);
 const terrain=new T.Group(),dynamic=new T.Group();scene.add(terrain,dynamic);
 function building(x,z,name,c){const g=new T.Group();g.position.set(x,0,z);g.add(box(4,2.1,3.7,0xffe3b8,0,1.05,0),box(4.3,.2,4,0xb29371,0,.1,0));const s=new T.Shape();s.moveTo(-2.3,0);s.lineTo(2.3,0);s.lineTo(0,1.45);s.closePath();g.add(obj(new T.ExtrudeGeometry(s,{depth:4.2,bevelEnabled:false}),c,0,2.1,-2.1),box(.8,1.3,.08,0x946b4b,0,.68,1.9),box(.67,.67,.08,0x82bad0,-1.2,1.35,1.9),box(.67,.67,.08,0x82bad0,1.2,1.35,1.9));terrain.add(g);const l=label(name,2.8);l.position.set(x,3.95,z);terrain.add(l)}
 function label(s,w=2){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#254c38';ctx.beginPath();ctx.roundRect(4,8,504,112,28);ctx.fill();ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff8e8';ctx.fillText(s.slice(0,18),256,64,480);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(w,w/4,1);return sprite}
 building(4.5,3.8,'おへや',0xc3734f);building(27.5,3.8,'FARM SHOP',0x799caf);
 for(const [x,z] of [[.5,.5],[8.6,1],[11,.6],[20,.7],[23,.6],[31.4,.7],[.5,14.8],[31.4,15.1]]){terrain.add(cyl(.12,.18,1.1,0x8d6441,x,.55,z),ball(.75,0x548c50,x,1.6,z),ball(.48,0x75a958,x+.32,1.93,z))}
 const pet=new T.Group();scene.add(pet);pet.add(ball(.36,0xf2cd8d,0,.4,0),ball(.24,0xf2cd8d,0,.72,.1));let spriteURL='',petSerial=0;
 function updatePet(){const source=api.petSource();if(!source||source===spriteURL)return;spriteURL=source;const stamp=++petSerial;const root=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;root.setAttribute('width','384');root.setAttribute('height','384');root.querySelectorAll('.pet-frame-motion,.pet-shadow').forEach(n=>n.remove());const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));const image=new Image();image.onload=()=>{URL.revokeObjectURL(url);if(stamp!==petSerial)return;const c=document.createElement('canvas');c.width=c.height=384;const ctx=c.getContext('2d');ctx.drawImage(image,0,0,384,384);const pixels=ctx.getImageData(0,0,384,384).data;let x0=384,y0=384,x1=0,y1=0;for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(pixels[(y*384+x)*4+3]>12){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}if(x1<=x0||y1<=y0)return;const crop=document.createElement('canvas');crop.width=x1-x0+1;crop.height=y1-y0+1;crop.getContext('2d').drawImage(c,x0,y0,crop.width,crop.height,0,0,crop.width,crop.height);const tex=new T.CanvasTexture(crop);tex.colorSpace=T.SRGBColorSpace;pet.children.slice().forEach(o=>{pet.remove(o);if(o.isSprite){o.material.map?.dispose();o.material.dispose()}});const s=new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));s.center.set(.5,0);s.scale.set(1.1*crop.width/crop.height,1.1,1);pet.add(s)};image.onerror=()=>URL.revokeObjectURL(url);image.src=url}
 const color={lettuce:0x8dcc4e,carrot:0xe88e3d,pumpkin:0xe5a53e,strawberry:0xf55b6a,melon:0xaece72,tomato:0xd95349,potato:0xc4a06b,pepper:0xdb5340};
 function crop(g,p,x,z,phase){if(!p)return;const tall=phase==='sprout'?.15:phase==='growing'?.34:.53;const leaf=0x5a9e46;for(const [dx,dz] of [[-.23,-.18],[.22,-.15],[0,.22]]){g.add(cyl(.025,.035,tall,leaf,x+dx,tall/2+.1,z+dz));const a=ball(tall*.4,leaf,x+dx,tall+.07,z+dz);a.scale.set(1.2,.65,1.1);g.add(a);if(phase==='ready'){const fruit=ball(p.crop==='pumpkin'||p.crop==='melon'?.22:.15,color[p.crop]||0x88b950,x+dx,tall*.55+.13,z+dz);if(p.crop==='carrot')fruit.scale.set(.65,1.6,.65);g.add(fruit)}}}
 // Individual botanical silhouettes; instance batches share geometry and material.
 function renderFlowerBeds(flowers){
  const batches=new Map(),shape=geo('flower-unit',()=>new T.IcosahedronGeometry(1,1)),stemShape=geo('flower-stem',()=>new T.CylinderGeometry(1,1,1,7));
  const temp=new T.Object3D(),local=new T.Object3D();
  function part(root,g,c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0){
   local.position.set(x,y,z);local.rotation.set(rx,ry,rz);local.scale.set(sx,sy,sz);local.updateMatrix();
   const matrix=new T.Matrix4().multiplyMatrices(root,local.matrix),key=g.uuid+':'+c;
   if(!batches.has(key))batches.set(key,{g,c,matrices:[]});batches.get(key).matrices.push(matrix);
  }
  const round=(root,c,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>part(root,shape,c,x,y,z,sx,sy,sz,rx,ry,rz);
  function bloomRoot(root,y,tilt=0){temp.position.set(0,y,0);temp.rotation.set(tilt,0,0);temp.scale.set(1,1,1);temp.updateMatrix();return new T.Matrix4().multiplyMatrices(root,temp.matrix)}
  function ring(root,n,r,y,c,radial,width,height,turn=0,tilt=0){
   for(let i=0;i<n;i++){const a=turn+i*Math.PI*2/n;round(root,c,Math.cos(a)*r,y,Math.sin(a)*r,radial,height,width,0,-a,tilt)}
  }
  function plant(type,root){
   const heights={rose:.34,sunflower:.66,lavender:.43,hydrangea:.27,marigold:.25,tulip:.43},h=heights[type]||.3;
   part(root,stemShape,0x467846,0,h/2,0,.018,h,.018);
   const leaf=type==='lavender'?0x799a72:0x569c4c;
   round(root,leaf,-.065,h*.36,0,.11,.026,.045,0,0,-.42);
   round(root,0x75ad57,.06,h*.58,.02,.105,.025,.046,0,-.3,.48);
   if(type==='rose'){
    const b=bloomRoot(root,h,.16);
    ring(b,6,.075,.005,0xb32f50,.077,.043,.048,0,.48);
    ring(b,5,.052,.038,0xe05872,.062,.035,.04,.4,.52);
    ring(b,4,.027,.066,0xf18499,.042,.025,.03,.8,.56);
    round(b,0xa92c4c,0,.075,0,.032,.027,.031);
   }else if(type==='sunflower'){
    const b=bloomRoot(root,h,.68);
    ring(b,11,.126,0,0xe8a829,.091,.036,.025,0,.05);
    ring(b,11,.115,.018,0xffd64e,.083,.029,.024,.24,.05);
    round(b,0x63432c,0,.026,0,.089,.04,.089);
    round(b,0x95643a,0,.059,0,.064,.015,.064);
   }else if(type==='lavender'){
    for(let i=0;i<5;i++){const r=.045-i*.006;for(let j=0;j<3;j++){const a=j*2.094+i*.65;round(root,i%2?0xa48bd1:0x8561b4,Math.cos(a)*r,h-.09+i*.048,Math.sin(a)*r,.037,.045,.037)}}
    round(root,0xc0a3e6,0,h+.15,0,.025,.045,.025);
   }else if(type==='hydrangea'){
    const b=bloomRoot(root,h,.08);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const x=Math.cos(a)*.09,z=Math.sin(a)*.09;for(let j=0;j<4;j++){const q=j*Math.PI/2+a;round(b,i%2?0x8eb9e6:0x749cd8,x+Math.cos(q)*.026,.047,z+Math.sin(q)*.026,.035,.024,.035)}}
    for(let j=0;j<5;j++){const a=j*Math.PI*2/5;round(b,0xb3d1f2,Math.cos(a)*.04,.1,Math.sin(a)*.04,.045,.03,.045)}
   }else if(type==='marigold'){
    const b=bloomRoot(root,h,0);
    ring(b,8,.075,.01,0xd77b20,.065,.045,.047,0,.26);
    ring(b,7,.061,.05,0xf3a52d,.065,.043,.041,.42,.36);
    ring(b,5,.036,.087,0xffcd59,.049,.038,.037,.2,.35);
    round(b,0xf09a23,0,.09,0,.045,.038,.043);
   }else if(type==='tulip'){
    const b=bloomRoot(root,h,.09);
    round(b,0xc95b85,0,.015,0,.071,.045,.071);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;round(b,i%2?0xf7a5c0:0xe77eaa,Math.cos(a)*.043,.073,Math.sin(a)*.043,.054,.094,.039,0,-a,-.25)}
    round(b,0xe1a354,0,.061,0,.03,.026,.03);
   }
  }
  for(const f of flowers){
   for(const [i,[dx,dz]] of [[.23,.23],[.73,.27],[.28,.73],[.72,.72]].entries()){
    const n=(Math.imul(f.x+13,73856093)^Math.imul(f.y+17,19349663)^Math.imul(i+1,83492791))>>>0;
    const scale=.88+(n%25)/100,angle=(n%360)*Math.PI/180;
    temp.position.set(f.x+dx+((n%7)-3)*.008,0,f.y+dz+(((n>>>4)%7)-3)*.008);temp.rotation.set(0,angle,0);temp.scale.set(scale,scale,scale);temp.updateMatrix();plant(f.type,temp.matrix.clone());
   }
  }
  for(const {g,c,matrices} of batches.values()){
   const mesh=new T.InstancedMesh(g,mat(c),matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();dynamic.add(mesh);
  }
 }
 let sig='';function redraw(){const farm=api.farm(),now=Date.now();const next=JSON.stringify([farm.fields,farm.roads,farm.flowers,farm.displays,Object.entries(farm.plots).map(([k,p])=>[k,p.crop,growthPhase(p,now),!!p.wateredAt])]);if(sig===next)return;sig=next;dynamic.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isSprite){o.material.map?.dispose();o.material.dispose()}});dynamic.clear();
 for(const key of farm.roads){const [x,z]=key.split(',').map(Number);dynamic.add(box(1,.04,1,0xd7b78a,x+.5,.025,z+.5))}
 renderFlowerBeds(farm.flowers);
 for(const field of farm.fields){const sh=FIELD_TYPES[field.size];if(!sh)continue;for(let i=0;i<sh.w*sh.h;i++){const x=field.x+i%sh.w+.5,z=field.y+Math.floor(i/sh.w)+.5,p=farm.plots[plotKey(field.id,i)];dynamic.add(box(.94,.14,.94,p?.wateredAt?0x80563a:0xa77952,x,.07,z));for(const dz of [-.28,0,.28])dynamic.add(box(.82,.025,.035,0x7a5438,x,.147,z+dz));crop(dynamic,p,x,z,growthPhase(p,now))}const l=label(field.name,Math.max(1.65,sh.w*.8));l.position.set(field.x+sh.w/2,1.08,field.y-.15);dynamic.add(l)}
 for(const d of farm.displays){const s=DISPLAY_TYPES[d.type];if(!s)continue;const x=d.x+s.w/2,z=d.y+s.h/2;dynamic.add(box(s.w-.12,.65,s.h-.12,d.type==='cooler'?0xa2c6d3:0x9d7147,x,.325,z),box(s.w-.16,.09,s.h-.16,0xeac89b,x,.7,z));for(let i=0;i<Math.min(8,d.quantity||0);i++)dynamic.add(ball(.15,color[d.crop]||0x7ea754,x-.65+(i%4)*.43,.89,z-.23+Math.floor(i/4)*.46));const l=label(s.name+' '+d.quantity+'/'+s.capacity,2.3);l.position.set(x,1.42,z);dynamic.add(l)}
 }
 let from=new T.Vector3(8,0,6.5),to=from.clone(),start=performance.now(),duration=0;
 function position(x,z,ms){from.copy(pet.position);to.set(x,0,z);start=performance.now();duration=ms; if(!ms)pet.position.copy(to)}
 pet.position.copy(from);
 const highlight=new T.Mesh(new T.BoxGeometry(.98,.03,.98),new T.MeshBasicMaterial({color:0xffde83,transparent:true,opacity:.6}));highlight.visible=false;scene.add(highlight);
 const ray=new T.Raycaster(),vec=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0);
 function hit(e){const r=renderer.domElement.getBoundingClientRect();vec.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(vec,camera);const p=new T.Vector3();return ray.ray.intersectPlane(plane,p)&&p.x>=0&&p.x<32&&p.z>=0&&p.z<16?p:null}
 let down=null,multi=false,pointers=new Set();const canvas=renderer.domElement;canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1){multi=true;down=null}if(e.button===0&&!multi)down={x:e.clientX,y:e.clientY,id:e.pointerId}});canvas.addEventListener('pointermove',e=>{const p=hit(e);highlight.visible=!!p&&api.placing();if(p){highlight.position.set(Math.floor(p.x)+.5,.16,Math.floor(p.z)+.5);highlight.material.color.set(api.allowed(Math.floor(p.x),Math.floor(p.z))?0xffdf85:0xf18476)}});canvas.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);if(!pointers.size)multi=false;if(!down||down.id!==e.pointerId||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7){down=null;return}down=null;const p=hit(e);if(p)api.click(Math.floor(p.x),Math.floor(p.z))});canvas.addEventListener('pointercancel',e=>{down=null;pointers.delete(e.pointerId);if(!pointers.size)multi=false});canvas.addEventListener('pointerleave',()=>highlight.visible=false);
 const keys=new Set(),map={arrowup:'w',arrowdown:'s',arrowleft:'a',arrowright:'d'};function key(e){return map[e.key.toLowerCase()]||e.key.toLowerCase()}addEventListener('keydown',e=>{const k=key(e);if(!document.querySelector('dialog[open]')&&['w','a','s','d'].includes(k)){keys.add(k);e.preventDefault()}});addEventListener('keyup',e=>keys.delete(key(e)));addEventListener('blur',()=>keys.clear());
 document.querySelectorAll('[data-farm-key]').forEach(b=>{const k=b.dataset.farmKey;b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k)};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(k)});
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}}new ResizeObserver(resize).observe(host);resize();
 let last=performance.now(),lastRefresh=0,walking=false;function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;if(now-lastRefresh>700){lastRefresh=now;redraw();updatePet()}if(keys.size&&!document.querySelector('dialog[open]')){const f=ctl.target.clone().sub(camera.position);f.y=0;f.normalize();const r=new T.Vector3(-f.z,0,f.x),v=new T.Vector3();if(keys.has('w'))v.add(f);if(keys.has('s'))v.sub(f);if(keys.has('d'))v.add(r);if(keys.has('a'))v.sub(r);if(v.lengthSq()){v.normalize().multiplyScalar(dt*3.5);api.manual(v.x,v.z)}}const progress=duration?Math.min(1,(now-start)/duration):1;pet.position.lerpVectors(from,to,progress);walking=progress<1;pet.position.y=walking?Math.abs(Math.sin(now*.014))*.06:0;ctl.update();renderer.render(scene,camera)}requestAnimationFrame(frame);
 return {position,focus(x,z){const d=new T.Vector3(x,0,z).sub(ctl.target);ctl.target.add(d);camera.position.add(d);ctl.update()},zoom(f){const d=camera.position.clone().sub(ctl.target);d.setLength(T.MathUtils.clamp(d.length()*f,7,67));camera.position.copy(ctl.target).add(d);ctl.update()}};
}
