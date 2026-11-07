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
 assert.match(core,/600\+\(x-y\)\*48/);
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

test('pixel room is allowed through the homepage shell after a direct-link redirect',()=>{
 const appShell=fs.readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');
 const bridge=fs.readFileSync(new URL('../shell-bridge.js',import.meta.url),'utf8');
 const home=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const badge=fs.readFileSync(new URL('../version-badge-v176.js',import.meta.url),'utf8');
 const play=fs.readFileSync(new URL('../pet-play-menu-v164.js',import.meta.url),'utf8');
 const start=appShell.indexOf('  const hiddenMaterials=');
 const end=appShell.indexOf('  const sidebarIcon =',start);
 assert.ok(start>=0&&end>start,'Shell allowlist must exist');
 const context={URL,root:new URL('https://k-oota-pixel.github.io/english-playroom/'),groups:[]};
 vm.runInNewContext(appShell.slice(start,end)+'\nglobalThis.canOpenFromTest=canOpen;',context);
 const room='https://k-oota-pixel.github.io/english-playroom/pet-room/room-pixel.html';
 assert.equal(context.canOpenFromTest(room),true,'Direct pixel room URL must be accepted');
 assert.equal(context.canOpenFromTest('/english-playroom/pet-room/room-v4.html'),true,'Existing room stays accepted');
 assert.equal(context.canOpenFromTest('/english-playroom/pet-room/room-cozy.html'),true,'Cozy room stays accepted');
 assert.equal(context.canOpenFromTest('/english-playroom/pet-room/unknown.html'),false,'Unlisted pages stay blocked');
 assert.match(bridge,/target\.searchParams\.set\('material', material\)/,'Standalone URLs route via the shell');
 assert.match(appShell,/if\(initial&&canOpen\(initial\)\)u=new URL\(initial,root\)/,'Shell restores a deep-linked material');
 assert.match(play,/href="\.\/pet-room\/room-pixel\.html"/,'PLAY menu links to the new room');
 const version=badge.match(/const APP_VERSION='([^']+)'/)?.[1];
 assert.equal(version,'2.4.22');
 assert.ok(home.includes('app-shell.js?v='+version),'Homepage must load the shell with the updated cache version');
});
