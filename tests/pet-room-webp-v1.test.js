import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=x=>fs.readFileSync(new URL(x,root),'utf8');
const room=read('pet-room/room-webp-v1.js');
const html=read('pet-room/room-webp-v1.html');
const css=read('pet-room/room-webp-v1.css');
test('Eight independently-authored binary WebP assets, no SVG furniture fallback',()=>{
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
 assert.match(room,/WEBP_BED_ASSETS=/);
 assert.match(room,/WEBP_SOFA_ASSETS=/);
 assert.match(room,/WEBP_FURNITURE_ASSETS=/);
 assert.match(room,/const specs=\s*\[\s*\{id:'bed',/);
 assert.match(room,/webp-.*?\+'-sprite'/);
 assert.doesNotMatch(room,/facingFurnitureSVG|extraFurnitureSVG|ROOM_FOOTPRINTS|EXTRA_FURNITURE/);
 assert.doesNotMatch(room,/<svg.*?bed|CanvasRenderingContext2D|createElement\(['"]canvas/);
 assert.match(css,/\.webp-bed-sprite/);
});
test('WebP bed and sofa use correct 90-degree-rotated tile footprints',()=>{
 assert.match(room,/w:1,h:2/);
 assert.match(room,/id:'sofa'.*w:2,h:1/);
 assert.match(room,/footprint:'bed1x2-sofa2x1'/);
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
 assert.match(version,/const APP_VERSION='2\.4\.34'/);
 assert.match(main,/app-shell\.js\?v=2\.4\.34/);
});
