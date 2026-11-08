import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {roomBackground} from '../pet-room/room-v4-art.js';
const root=new URL('../',import.meta.url);
const read=x=>fs.readFileSync(new URL(x,root),'utf8');
const room=read('pet-room/room-webp-v1.js');
const html=read('pet-room/room-webp-v1.html');
const css=read('pet-room/room-webp-v1.css');
test('Twelve independently-authored binary WebP assets, no SVG furniture fallback',()=>{
 for(let i=0;i<4;i++){
  const file=new URL('pet-room/assets/webp-v1/bed/bed_'+i+'.webp',root);
  const buf=fs.readFileSync(file);
  assert.equal(buf.toString('ascii',0,4),'RIFF');
  assert.equal(buf.toString('ascii',8,12),'WEBP');
  assert.ok(buf.length>5000,'Sprite must be artwork and not a placeholder');
 }
 for(let i=0;i<4;i++){
  const file=new URL('pet-room/assets/webp-v1/sofa/sofa_'+i+'.webp',root);
  const buf=fs.readFileSync(file);
  assert.equal(buf.toString('ascii',0,4),'RIFF');
  assert.equal(buf.toString('ascii',8,12),'WEBP');
  assert.ok(buf.length>25000,'Sofa must be real transparent pixel artwork');
 }
 for(let i=0;i<4;i++){
  const file=new URL('pet-room/assets/webp-v1/bookshelf/bookshelf_'+i+'.webp',root);
  const buf=fs.readFileSync(file);
  assert.equal(buf.toString('ascii',0,4),'RIFF','Bookshelf sprite has RIFF header');
  assert.equal(buf.toString('ascii',8,12),'WEBP','Bookshelf sprite is a genuine WebP');
  assert.ok(buf.length>20000,'Bookshelf must contain real drawn artwork');
 }
 assert.match(room,/WEBP_BOOKSHELF_ASSETS=/);
 assert.match(css,/\.webp-bookshelf-sprite/);
 assert.match(room,/WEBP_BED_ASSETS=/);
 assert.match(room,/WEBP_SOFA_ASSETS=/);
 assert.match(room,/WEBP_FURNITURE_ASSETS=/);
 assert.match(room,/const specs=\s*\[\s*\{id:'bed',/);
 assert.match(room,/class="webp-'\+item\.id\+'-sprite"/);
 assert.doesNotMatch(room,/facingFurnitureSVG|extraFurnitureSVG|ROOM_FOOTPRINTS|EXTRA_FURNITURE/);
 assert.doesNotMatch(room,/<svg.*?bed|CanvasRenderingContext2D|createElement\(['"]canvas/);
 assert.match(css,/\.webp-bed-sprite/);
 assert.match(css,/\.object\[data-item-id="bookshelf"\]\[data-facing="1"\] \.webp-bookshelf-sprite/);
 assert.match(css,/\.object\[data-item-id="bookshelf"\]\[data-facing="3"\] \.webp-bookshelf-sprite/);
 assert.match(css,/scale\(0\.6\)/);
 assert.match(css,/\.webp-bed-sprite,\.object \.webp-sofa-sprite,\.object \.webp-bookshelf-sprite/);
 assert.match(room,/el\.dataset\.facing=String\(item\.rotation\)/);
});
test('WebP bed, sofa and bookshelf use correct 90-degree-rotated tile footprints',()=>{
 assert.match(room,/w:1,h:2/);
 assert.match(room,/id:'sofa'.*w:2,h:1/);
 assert.match(room,/id:'bookshelf'.*w:2,h:1/);
 assert.match(room,/footprint:'bed1x2-sofa2x1-bookshelf2x1'/);
 assert.doesNotMatch(room,/w:2,h:2/);
 assert.match(css,/width:128%;height:128%/);
 assert.match(css,/object-fit:contain/);
 assert.match(css,/object-position:center center/);
 assert.doesNotMatch(room,/w:2,h:3/);
 assert.match(room,/const GRID=6,TX=132,TY=202,TILE=116,SIZE=960/);
 assert.match(room,/rotation%2===0\?\{w:item\.w,h:item\.h\}:\{w:item\.h,h:item\.w\}/);
 assert.match(room,/item\.x\+d\.w<=GRID&&item\.y\+d\.h<=GRID/);
 assert.match(room,/function rotateActive\(/);
 assert.match(room,/function updatePetPosition\(/);
 assert.match(room,/function petNeighbors\(/);
 assert.match(room,/const left=TX\+item\.x\*TILE,top=TY\+item\.y\*TILE/);
 const code=room.replace(/^import .*;\s*$/gm,'');
 assert.doesNotThrow(()=>new vm.Script(code),'Runtime code must parse before browser test');
});
test('Repeated 90 degree rotation never changes the furniture origin tile',()=>{
 const start=room.indexOf('function rotateActive(){');
 const end=room.indexOf('\nfunction drawItem(',start);
 assert.ok(start>=0&&end>start);
 const rot=room.slice(start,end);
 assert.match(rot,/const oldRotation=item\.rotation/);
 assert.match(rot,/item\.rotation=\(oldRotation\+1\)%4/);
 assert.match(rot,/item\.x\+next\.w>GRID\|\|item\.y\+next\.h>GRID/);
 assert.match(rot,/item\.rotation=oldRotation/);
 assert.doesNotMatch(rot,/item\.x\s*=|item\.y\s*=|Math\.round|fit\(item\)/);
});
test('Only the WebP room removes the window, curtains and outdoor view',()=>{
 const original=roomBackground();
 const start=room.indexOf('function windowlessRoomBackground(){');
 const end=room.indexOf('\nbackdrop.innerHTML=windowlessRoomBackground();',start);
 assert.ok(start>=0&&end>start,'WebP room must use its isolated background helper');
 const func=room.slice(start,end);
 const beta=vm.runInNewContext(func+'\nwindowlessRoomBackground()', {roomBackground});
 assert.ok(beta.startsWith('<svg')&&beta.endsWith('</svg>'));
 assert.ok(original.includes('<rect x="361" y="105"'),'Regular room retains its window');
 assert.ok(original.includes('<path d="M339 175h35m211 0h34"'),'Regular room retains curtains');
 assert.ok(!beta.includes('<rect x="361" y="105"'),'No window in beta');
 assert.ok(!beta.includes('<rect x="371" y="113"'),'No outdoor view in beta');
 assert.ok(!beta.includes('<path d="M339 175h35m211 0h34"'),'No curtains in beta');
 assert.ok(beta.includes('<rect x="124" y="101"'),'Original wall remains in beta');
 assert.ok(beta.includes('<rect x="132" y="202"'),'Original tiled floor remains in beta');
 assert.ok(beta.length<original.length,'Beta removes artwork rather than hiding it with an overlay');
});
test('Existing rooms stay unchanged and WebP beta saves separately',()=>{
 assert.match(room,/monstudy-pet-room-webp-v1:/);
 assert.doesNotMatch(room,/monstudy-pet-room-v4:|monstudy-pet-room-top-v1-|monstudy-pet-room-flat-v2-/);
 assert.match(room,/localStorage\.setItem\(layoutKey/);
 assert.match(room,/localStorage\.getItem\(layoutKey/);
 assert.match(read('pet-room/room-v4.js'),/monstudy-pet-room-v4:/);
 assert.match(html,/room-webp-v1\.js\?v=/);
 assert.match(html,/room-webp-v1\.css\?v=/);
 assert.match(html,/WebPベッド試験版/);
});
test('All pet-room versions remain directly accessible but none are listed in the PLAY menu',()=>{
 const shell=read('app-shell.js'),play=read('pet-play-menu-v164.js'),main=read('index.html'),version=read('version-badge-v176.js');
 const start=shell.indexOf('  const hiddenMaterials='),end=shell.indexOf('  const sidebarIcon =',start);
 assert.ok(start>=0&&end>start);
 const ctx={URL,root:new URL('https://k-oota-pixel.github.io/english-playroom/'),groups:[]};
 vm.runInNewContext(shell.slice(start,end)+'\nglobalThis.check=canOpen;',ctx);
 for(const name of ['room-v4.html','room-cozy.html','room-webp-v1.html'])
  assert.equal(ctx.check('https://k-oota-pixel.github.io/english-playroom/pet-room/'+name),true,name+' should open');
 assert.equal(ctx.check('https://k-oota-pixel.github.io/english-playroom/pet-room/fake.html'),false);
 assert.doesNotMatch(play,/href="\.\/pet-room\/room-webp-v1\.html/);
 assert.doesNotMatch(play,/href="\.\/pet-room\//,"All experimental and regular room modes must stay out of PLAY");
 for(const game of ["pet-adventure/","pet-catch/","pet-fishing/","pet-typing-defense/"]) assert.ok(play.includes(game),"Keep other PLAY games: "+game);
 assert.match(read('shell-bridge.js'),/target\.searchParams\.set\('material', material\)/);
 assert.match(shell,/if\(initial&&canOpen\(initial\)\)u=new URL\(initial,root\)/);
 assert.match(version,/const APP_VERSION='2\.4\.41'/);
 assert.match(main,/app-shell\.js\?v=2\.4\.41/);
});
