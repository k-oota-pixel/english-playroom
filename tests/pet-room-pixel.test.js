import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const dir=new URL('../pet-room/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,dir),'utf8');
const html=read('room-pixel.html'),core=read('room-pixel-core.js'),art=read('room-pixel-art.js'),css=read('room-pixel.css');
test('pixel edition has required game controls and modules',()=>{
 for(const id of ['room','roomBackdrop','furnitureLayer','tileLayer','petInRoom','catalog','storageList','moveBtn','rotateBtn','storeBtn','saveBtn','modeBanner','cancelBtn','status','clearBtn']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.match(html,/room-pixel-core\.js\?v=/);
 assert.match(html,/room-pixel\.css\?v=/);
 assert.match(core,/room-pixel-art\.js\?v=/);
 assert.match(html,/通常版を見る/);
});
test('renderer builds an actual separate isometric image with standalone independent sprites',()=>{
 assert.match(art,/canvas/);
 assert.match(art,/function pixelRoom/);
 assert.match(art,/function manual/);
 assert.match(art,/function sheetSprite/);
 assert.match(art,/furniture-directional/);
 assert.match(css,/image-rendering:pixelated/);
 assert.doesNotMatch(html,/(?:room_full|room_base)\.(?:jpg|png)/);
 assert.doesNotMatch(core,/(?:room_full|room_base)\.(?:jpg|png)/);
 for(const type of ['bed','sofa','table','cabinet','bookshelf','plant','rug','tv','desk','kotatsu','mirror','petbed','lamp','bowl'])assert.match(art,new RegExp(type+':'));
});
test('new room uses its own Firestore doc, never the current regular room document',()=>{
 assert.match(core,/'apps','pet-room-pixel-v1'/);
 assert.doesNotMatch(core,/'apps','pet-room'\s*\)/);
 assert.match(core,/const GRID=10/);
 assert.match(core,/600\+\(x-y\)\*40/);
 assert.match(core,/Math\.round\(c\.Y\)/);
 assert.match(core,/function bfs\(/);
 assert.match(core,/const freshRoom=/);
 assert.match(core,/state=freshRoom\(\)/);
 assert.match(art,/g\.translate\(25,0\)/);
});
test('room modules parse as JavaScript',()=>{
 for(const module of [core,art]){
   const js=module.replace(/^import .*;\s*$/gm,'').replace(/^export /gm,'');
   assert.doesNotThrow(()=>new vm.Script(js));
 }
});
test('existing room variants are left intact and alternate entry points are reachable',()=>{
 const v4=read('room-v4.html'),cozy=read('room-cozy.html');
 assert.match(v4,/ぺっとのおへや|ペットのおへや/);
 assert.match(cozy,/ほっこり/);
});
