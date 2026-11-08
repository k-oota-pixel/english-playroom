import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 MAP,FARMS,FIELD_TYPES,FIELD_SIZES,RESERVED_ZONES,FLOWERS,flowerIds,CROPS,SUPPLIES,
 freshFarm,normalizeFarm,cropUnlockProgress,canPlace,canPlaceRoad,canPlaceFlower,
 locateField,findWorkStand,plotKey,applyPurchase,applyLayoutAction,applyFarmAction,
 growthPhase,remaining,useProduce
} from '../pet-farm/model.js';
import {flowerTileSVG} from '../pet-farm/flower-art.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function starter(){
 let f=applyPurchase(freshFarm(),'field','free',0).farm;
 const result=applyLayoutAction(f,{type:'place-field',size:'4',x:12,y:8,name:'わたしの畑'});
 return {f:result.farm,id:result.id};
}

test('new farmers start on a blank 32x16 canvas with a free starter available in SHOP',()=>{
 const f=freshFarm();
 assert.deepEqual(f.fields,[]);
 assert.deepEqual(f.roads,[]);
 assert.deepEqual(f.flowers,[]);
 assert.equal(f.starterClaimed,false);
 assert.equal(f.inventory.fields['4'],0);
 assert.equal(f.schemaVersion,3);
 assert.equal(MAP.w,32);
 assert.equal(MAP.h,16);
 assert.deepEqual(FIELD_SIZES,['4','6','9','16']);
 assert.deepEqual(FIELD_SIZES.map(id=>FIELD_TYPES[id].price),[50,100,150,200]);
 assert.equal(RESERVED_ZONES.length,2);
 assert.deepEqual(FARMS.map(a=>a.w*a.h),[4,6,9,16]);
});

test('free 4-cell field is claimed only once and paid plots may be bought repeatedly',()=>{
 const base=freshFarm();
 assert.throws(()=>applyPurchase(base,'field','4',50),/先に無料/);
 let f=applyPurchase(base,'field','free',0).farm;
 assert.equal(f.inventory.fields['4'],1);
 assert.equal(f.starterClaimed,true);
 assert.throws(()=>applyPurchase(f,'field','free',0),/受け取り済み/);
 assert.throws(()=>applyPurchase(base,'field','free',0,2),/1個/);
 const purchased=applyPurchase(f,'field','4',400,3);
 assert.equal(purchased.cost,150);
 f=purchased.farm;
 assert.equal(f.inventory.fields['4'],4);
 for(const [id,price] of [['6',100],['9',150],['16',200]]){
  const p=applyPurchase(f,'field',id,1000);
  assert.equal(p.cost,price);
  assert.equal(p.farm.inventory.fields[id],1);
 }
 assert.throws(()=>applyPurchase(f,'field','16',199),/コインが足りません/);
 assert.deepEqual(base.inventory.fields,{'4':0,'6':0,'9':0,'16':0});
});

test('field placement supports custom names and forbids out-of-bounds, buildings and overlap',()=>{
 const {f,id}=starter();
 assert.equal(f.fields[0].name,'わたしの畑');
 assert.equal(f.fields[0].size,'4');
 assert.deepEqual(locateField(f,id,3),{x:13,y:9});
 assert.equal(canPlace(f,'4',12,8),false);
 assert.equal(canPlace(f,'4',12,8,id),true);
 assert.equal(canPlace(f,'4',1,1),false);
 assert.equal(canPlace(f,'4',25,1),false);
 assert.equal(canPlace(f,'16',30,14),false);
 assert.throws(()=>applyLayoutAction(f,{type:'place-field',size:'4',x:12,y:8,name:'重なり'}),/配置できません|ありません/);
 const purchase=applyPurchase(f,'field','6',100).farm;
 assert.throws(()=>applyLayoutAction(purchase,{type:'place-field',size:'6',x:1,y:1,name:'おうち'}),/配置できません/);
 assert.throws(()=>applyLayoutAction(purchase,{type:'place-field',size:'6',x:30,y:13,name:'場外'}),/配置できません/);
 const placed=applyLayoutAction(purchase,{type:'place-field',size:'6',x:18,y:8,name:'給食畑'});
 assert.equal(placed.farm.fields.length,2);
 assert.equal(placed.farm.fields[1].name,'給食畑');
});

test('rename and move a field preserving all crop states',()=>{
 const {id}=starter();let f=starter().f;
 f=applyFarmAction(f,{type:'plant',area:id,index:0,crop:'lettuce'},1000).farm;
 const key=plotKey(id,0),original=f.plots[key];
 f=applyLayoutAction(f,{type:'move-field',id,x:16,y:10}).farm;
 assert.deepEqual(locateField(f,id,0),{x:16,y:10});
 assert.deepEqual(f.plots[key],original);
 f=applyLayoutAction(f,{type:'rename-field',id,name:'ミラクル農園'}).farm;
 assert.equal(f.fields[0].name,'ミラクル農園');
 assert.throws(()=>applyLayoutAction(f,{type:'rename-field',id,name:'   '}),/名前/);
 assert.throws(()=>applyLayoutAction(f,{type:'remove-field',id}),/収穫してから/);
 f=applyFarmAction(f,{type:'harvest',area:id,index:0},7201000).farm;
 f=applyLayoutAction(f,{type:'remove-field',id}).farm;
 assert.equal(f.fields.length,0);
 assert.equal(f.inventory.fields['4'],1);
 assert.equal(f.harvestCounts.lettuce,1);
});

test('soil road costs one coin per cell and may be laid and returned to inventory',()=>{
 let f=freshFarm();
 assert.equal(applyPurchase(f,'road','dirt',10,5).cost,5);
 f=applyPurchase(f,'road','dirt',10,5).farm;
 assert.equal(f.inventory.roads,5);
 assert.equal(canPlaceRoad(f,2,2),false);
 assert.equal(canPlaceRoad(f,29,10),true);
 f=applyLayoutAction(f,{type:'place-road',x:14,y:10}).farm;
 assert.deepEqual(f.roads,['14,10']);
 assert.equal(f.inventory.roads,4);
 assert.equal(canPlace(f,'4',14,10),false);
 assert.throws(()=>applyLayoutAction(f,{type:'place-road',x:14,y:10}),/道路を敷けません/);
 assert.throws(()=>applyLayoutAction(f,{type:'place-road',x:25,y:2}),/道路を敷けません/);
 f=applyLayoutAction(f,{type:'remove-road',x:14,y:10}).farm;
 assert.equal(f.inventory.roads,5);
 assert.deepEqual(f.roads,[]);
 assert.throws(()=>applyLayoutAction(f,{type:'remove-road',x:14,y:10}),/道路がありません/);
});

test('crop timer starts immediately and boosts are applied to remaining time',()=>{
 let {f,id}=starter();
 f=applyFarmAction(f,{type:'plant',area:id,index:0,crop:'lettuce'},1000).farm;
 assert.equal(f.plots[plotKey(id,0)].readyAt,7201000);
 assert.equal(growthPhase(f.plots[plotKey(id,0)],1500),'sprout');
 f=applyFarmAction(f,{type:'water',area:id,index:0},1000).farm;
 assert.equal(f.plots[plotKey(id,0)].readyAt,4801000);
 f.inventory.fertilizer=1;
 f=applyFarmAction(f,{type:'fertilize',area:id,index:0},1000).farm;
 assert.equal(f.plots[plotKey(id,0)].readyAt,1601000);
 assert.equal(remaining(f.plots[plotKey(id,0)],1000),'あと26分40秒');
 assert.throws(()=>applyFarmAction(f,{type:'fertilize',area:id,index:0},2000),/すでに|もう|肥料を使って/);
 assert.throws(()=>applyFarmAction(f,{type:'water',area:id,index:0},2000),/すでに/);
});

test('water and fertilizer give the same result at one moment, with time-sensitive later use',()=>{
 const {f,id}=starter();
 let base=applyFarmAction(f,{type:'plant',area:id,index:0,crop:'lettuce'},1000).farm;
 base.inventory.fertilizer=1;
 const wf=applyFarmAction(applyFarmAction(base,{type:'water',area:id,index:0},1000).farm,{type:'fertilize',area:id,index:0},1000).farm;
 const fw=applyFarmAction(applyFarmAction(base,{type:'fertilize',area:id,index:0},1000).farm,{type:'water',area:id,index:0},1000).farm;
 assert.equal(wf.plots[plotKey(id,0)].readyAt,fw.plots[plotKey(id,0)].readyAt);
 const later=applyFarmAction(base,{type:'water',area:id,index:0},3601000).farm;
 assert.equal(later.plots[plotKey(id,0)].readyAt,6001000);
});

test('older unlocked gardens become movable assets without losing planted crops',()=>{
 const raw={schemaVersion:2,unlocked:[true,true,true,false],nextFieldId:1,
  inventory:{seeds:{carrot:4},water:5,produce:{tomato:2},giftBox:{}},
  plots:{'0-0':{crop:'lettuce',plantedAt:1000,readyAt:7201000},
         '2-8':{crop:'tomato',plantedAt:2000,readyAt:182000}}};
 const f=normalizeFarm(raw);
 assert.equal(f.schemaVersion,3);
 assert.equal(f.starterClaimed,true);
 assert.deepEqual(f.fields.map(x=>x.id),['0','2']);
 assert.deepEqual(f.fields.map(x=>x.name),['第1農園','第3農園']);
 assert.equal(f.inventory.fields['6'],1);
 assert.equal(f.plots['0-0'].crop,'lettuce');
 assert.equal(f.plots['2-8'].crop,'tomato');
 assert.equal(f.inventory.seeds.carrot,4);
 assert.equal(f.inventory.produce.tomato,2);
 const copy=normalizeFarm(f);
 assert.deepEqual(copy.fields,f.fields);
 assert.deepEqual(copy.plots,f.plots);
 assert.equal(copy.inventory.fields['6'],1);
});

test('legacy starter lettuce is granted only once during version upgrades',()=>{
 const old={schemaVersion:1,inventory:{seeds:{carrot:3}},unlocked:[true,false,false,false]};
 const migrated=normalizeFarm(old);
 assert.equal(migrated.inventory.seeds.lettuce,3);
 assert.equal(normalizeFarm(migrated).inventory.seeds.lettuce,3);
 assert.equal(migrated.inventory.fields['4'],1);
 assert.equal(migrated.starterClaimed,true);
});

test('field storage changes do not modify the original wallet and inventory can be restored',()=>{
 const f=freshFarm();
 const changed=normalizeFarm({...f,inventory:{...f.inventory,water:4.8,roads:3,fields:{4:2,9:1}}});
 assert.equal(changed.inventory.water,4);
 assert.equal(changed.inventory.roads,3);
 assert.deepEqual(changed.inventory.fields,{'4':2,'6':0,'9':1,'16':0});
 assert.equal(Object.hasOwn(changed,'coins'),false);
});

test('the five crop progression stays intact after relocating fields',()=>{
 let {f,id}=starter();
 assert.deepEqual(['lettuce','carrot','pumpkin','strawberry','melon'].map(n=>CROPS[n].minutes),[120,240,480,840,1320]);
 assert.deepEqual(['lettuce','carrot','pumpkin','strawberry','melon'].map(n=>CROPS[n].fullness),[1,2,4,5,10]);
 assert.deepEqual(['lettuce','carrot','pumpkin','strawberry','melon'].map(n=>[CROPS[n].pack,CROPS[n].seed]),[[3,1],[2,1],[3,2],[1,1],[1,2]]);
 assert.equal(SUPPLIES.water.price,1);assert.equal(SUPPLIES.fertilizer.price,2);
 assert.equal(cropUnlockProgress(f,'carrot').unlocked,false);
 f.harvestCounts.lettuce=10;
 assert.equal(cropUnlockProgress(f,'carrot').unlocked,true);
 assert.equal(applyPurchase(f,'seed','carrot',100).farm.inventory.seeds.carrot,2);
 assert.equal(useProduce({...f,inventory:{...f.inventory,produce:{carrot:2}}},'feed','carrot').farm.inventory.produce.carrot,1);
});

test('home, shop and item button remain; fixed gardens, warehouse and preset paths are gone',()=>{
 const html=source('pet-farm/index.html'),app=source('pet-farm/app.js'),scenery=source('pet-farm/scenery.js');
 for(const id of ['house','shopBuilding','itemsBtn','itemsDialog','manageDialog','fieldNameDialog','placementBar','placementLayer','roadsLayer','plotLayer']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.doesNotMatch(html,/id="storageBuilding"|id="storageDialog"/);
 assert.match(app,/beginPlacement\(p.kind,p.id==='free'\?'4':p.id\)/);
 assert.match(app,/shopTab='field'/);
 assert.match(app,/applyLayoutAction\(farm,action\)/);
 assert.match(scenery,/\$\{home\(\)\}\$\{store\(\)\}/);
 assert.doesNotMatch(scenery,/\$\{FARMS\.map\(bed\)\.join\(''\)\}/);
 assert.doesNotMatch(scenery,/\$\{paths\(\)\}/);
 assert.doesNotMatch(source('index.html'),/pet-farm\//);
});

test('placement UI supports move, rename, removing road and removing crop-free fields',()=>{
 const app=source('pet-farm/app.js'),css=source('pet-farm/style.css');
 assert.match(app,/function beginPlacement\(/);
 assert.match(app,/function choosePlacement\(/);
 assert.match(app,/function confirmFieldName\(/);
 assert.match(app,/function openManage\(/);
 assert.match(app,/function stopPlacement\(/);
 assert.match(app,/applyLayout\(\{type:'remove-field'/);
 assert.match(app,/applyLayout\(\{type:'remove-road'/);
 assert.match(css,/#placementLayer\[hidden\]/);
 assert.match(css,/\.road-tile\{/);
 assert.match(css,/\.placement-bar\{/);
 assert.match(css,/#itemsDialog \.inventory/);
});

test('farm purchase stays transactional and the free starter never updates coin balance',()=>{
 const app=source('pet-farm/app.js');
 assert.match(app,/runTransaction\(db/);
 assert.match(app,/if\(purchased\.cost\)tx\.update\(walletRef\(\)/);
 assert.match(app,/tx\.set\(farmRef\(\)/);
 assert.match(app,/accountSession\(current\)/);
 assert.match(source('pet-farm/index.html'),/noindex,nofollow,noarchive/);
});

test('shop confirmation stays a fixed-height area and its scroll position is maintained',()=>{
 const css=source('pet-farm/style.css'),app=source('pet-farm/app.js');
 assert.match(css,/#shopDialog\[open\]/);
 assert.match(css,/#shopDialog #shopConfirmation/);
 assert.match(css,/#shopDialog #shopList/);
 assert.match(app,/list\.scrollTop=scroll/);
 assert.match(app,/shop-owned/);
 assert.match(css,/\.shop-item-details/);
});

test('user placement is not allowed under fixed buildings or on top of roads',()=>{
 const f=freshFarm();
 assert.equal(canPlace(f,'4',2,2),false);
 assert.equal(canPlace(f,'4',26,2),false);
 assert.equal(canPlaceRoad(f,3,3),false);
 assert.equal(canPlaceRoad(f,26,3),false);
 assert.equal(canPlace(f,'4',14,8),true);
 assert.equal(canPlaceRoad(f,14,8),true);
});

test('invalid field names and removal of occupied field are rejected without losing crops',()=>{
 const {f,id}=starter();
 assert.throws(()=>applyLayoutAction(f,{type:'rename-field',id,name:' '}),/名前/);
 assert.throws(()=>applyLayoutAction(f,{type:'move-field',id,x:1,y:1}),/移動できません/);
 assert.throws(()=>applyLayoutAction(f,{type:'place-road',x:12,y:8}),/道路がありません/);
});

test('seed shop hides locked crop icons and names, revealing only the next milestone',()=>{
 const app=source('pet-farm/app.js');
 const start=app.indexOf('function shopSeedReveal(state,id){');
 const end=app.indexOf('\nfunction shopItems(){',start);
 assert.ok(start>=0&&end>start,'shop mystery display helper must exist');
 const helper=app.slice(start,end);
 const reveal=new Function('CROPS','cropUnlockProgress','isCropUnlocked',
  helper+';return shopSeedReveal;')(CROPS,cropUnlockProgress,
   (farm,id)=>cropUnlockProgress(farm,id).unlocked);
 const farm=freshFarm();
 assert.equal(reveal(farm,'lettuce'),null);
 assert.deepEqual(reveal(farm,'carrot'),{
  icon:'❔',label:'？？？のタネ',requirement:'🔒 レタスをあと10個収穫'
 });
 for(const id of ['pumpkin','strawberry','melon']){
  assert.deepEqual(reveal(farm,id),{
   icon:'❔',label:'？？？のタネ',requirement:'🔒 ？？？をあと10個収穫'
  });
 }
 farm.harvestCounts.lettuce=7;
 assert.equal(reveal(farm,'carrot').requirement,'🔒 レタスをあと3個収穫');
 farm.harvestCounts.lettuce=10;
 assert.equal(reveal(farm,'carrot'),null);
 assert.deepEqual(reveal(farm,'pumpkin'),{
  icon:'❔',label:'？？？のタネ',requirement:'🔒 にんじんをあと10個収穫'
 });
 assert.equal(reveal(farm,'strawberry').requirement,'🔒 ？？？をあと10個収穫');
 farm.harvestCounts.carrot=4;
 assert.equal(reveal(farm,'pumpkin').requirement,'🔒 にんじんをあと6個収穫');
 farm.harvestCounts.carrot=10;
 assert.equal(reveal(farm,'pumpkin'),null);
 assert.equal(reveal(farm,'strawberry').requirement,'🔒 かぼちゃをあと10個収穫');
 farm.harvestCounts.pumpkin=10;
 assert.equal(reveal(farm,'strawberry'),null);
 assert.equal(reveal(farm,'melon').requirement,'🔒 いちごをあと10個収穫');
 farm.harvestCounts.strawberry=10;
 assert.equal(reveal(farm,'melon'),null);
 assert.match(app,/node\('strong','',secret\?\.label\|\|item\.label\)/);
 assert.match(app,/node\('span','emoji',secret\?\.icon\|\|item\.icon\)/);
 assert.match(app,/node\('span','shop-unlock',secret\.requirement\)/);
});

test('planting plays soft tile-centered particles instead of seed emoji bubbles',()=>{
 const app=source('pet-farm/app.js'),css=source('pet-farm/style.css');
 assert.match(app,/const effect=node\('div','work-effect work-effect--'\+kind\)/);
 assert.match(app,/effect\.appendChild\(node\('span','work-effect__ring'\)\)/);
 assert.match(app,/node\('span','work-effect__particle'\)/);
 assert.match(app,/node\('span','work-effect__spark'\)/);
 assert.match(app,/await showWork\(type,spot\.x\+\.5,spot\.y\+\.5\)/);
 assert.doesNotMatch(app,/effect-bubble|plant:'🌰/);
 assert.doesNotMatch(css,/\.effect-bubble\{/);
 assert.match(css,/@keyframes workDust/);
 assert.match(css,/@keyframes workRing/);
 assert.match(css,/@keyframes workSpark/);
 assert.match(css,/\.work-effect--water\{/);
 assert.match(css,/\.work-effect--fertilize\{/);
 assert.match(css,/\.work-effect--harvest\{/);
});

test('farm action dialog stays the same height and keeps confirmation in place before and after selecting a seed',()=>{
 const app=source('pet-farm/app.js'),css=source('pet-farm/style.css');
 const start=app.indexOf('function renderSelection(){');
 const end=app.indexOf('\n// Hide locked crops',start);
 assert.ok(start>=0&&end>start);
 const selection=app.slice(start,end);
 assert.match(selection,/const previousScroll=ctrl\.querySelector\('\.farm-action-choices'\)\?\.scrollTop\|\|0/);
 assert.match(selection,/const choices=node\('div','farm-action-choices'\)/);
 assert.match(selection,/const confirm=node\('div','farm-action-confirm'\)/);
 assert.match(selection,/const footer=node\('div','farm-action-footer'\)/);
 assert.match(selection,/ctrl\.append\(choices,confirm,footer\)/);
 assert.match(selection,/actionConfirmation\(confirm,label,verb,/);
 assert.match(selection,/choices\.scrollTop=previousScroll/);
 assert.match(selection,/farm-action-prompt/);
 assert.doesNotMatch(selection,/ctrl\.appendChild\(confirm\)/);
 assert.match(css,/#actionDialog\[open\]\{[\s\S]*?height:min\(530px,calc\(100dvh - 24px\)\)/);
 assert.match(css,/#actionDialog \.farm-action-choices\{[\s\S]*?overflow-y:auto/);
 assert.match(css,/#actionDialog \.farm-action-confirm\{[\s\S]*?flex:0 0 116px/);
 assert.match(css,/#actionDialog \.farm-action-footer\{[\s\S]*?flex:0 0 57px/);
 assert.match(css,/@media\(max-height:510px\)/);
});


test('dirt paths connect as horizontal, vertical, corner, T junction and crossings',()=>{
 const js=source('pet-farm/app.js');
 const start=js.indexOf('function roadConnections(keys,x,y){');
 const end=js.indexOf('\nfunction drawRoadGrain(',start);
 assert.ok(start>=0&&end>start,'roadConnections helper must be present');
 const connection=new Function(js.slice(start,end)+';return roadConnections;')();
 const at=(points,x=10,y=10)=>connection(new Set(points.map(([a,b])=>a+','+b)),x,y);
 assert.deepEqual(at([[9,10],[11,10]]),{n:false,e:true,s:false,w:true});
 assert.deepEqual(at([[10,9],[10,11]]),{n:true,e:false,s:true,w:false});
 assert.deepEqual(at([[10,9],[11,10]]),{n:true,e:true,s:false,w:false});
 assert.deepEqual(at([[10,9],[9,10],[11,10]]),{n:true,e:true,s:false,w:true});
 assert.deepEqual(at([[10,9],[11,10],[10,11],[9,10]]),{n:true,e:true,s:true,w:true});
 assert.deepEqual(at([]),{n:false,e:false,s:false,w:false});
});

test('soil path texture has no circle studs, plastic stripes or per-cell plank seams',()=>{
 const js=source('pet-farm/app.js'),css=source('pet-farm/style.css');
 const start=css.indexOf('.road-tile{'),end=css.indexOf('#plotLayer .farm-area{',start);
 const styles=css.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(js,/const roads=new Set\(farm\.roads\)/);
 assert.match(js,/const signature=\[\.\.\.roads\]\.sort\(\)\.join\('\|'\)/);
 assert.match(js,/connection=roadConnections\(roads,x,y\)/);
 assert.match(js,/if\(!connection\[side\]\)road\.appendChild\(node\('span','road-edge road-edge--'\+side\)\)/);
 assert.match(js,/drawRoadGrain\(road,x,y\)/);
 assert.match(js,/road\.style\.borderRadius=/);
 assert.match(styles,/border:0;overflow:hidden/);
 assert.match(styles,/box-shadow:none/);
 for(const side of ['n','e','s','w'])assert.match(styles,new RegExp('\\.road-edge--'+side+'\\{'));
 assert.match(styles,/\.road-grain/);
 assert.doesNotMatch(styles,/radial-gradient|repeating-linear-gradient|border:2px solid/);
 assert.doesNotMatch(styles,/\\.road-tile\\{[^}]*box-shadow:inset/);
});


test('admin preview loading is always bounded, with visible retry for auth and farm-data failures',()=>{
 const app=source('pet-farm/app.js');
 const html=source('pet-farm/index.html');
 const css=source('pet-farm/style.css');
 assert.match(app,/function gateStatus\(message,error=false\)/);
 assert.match(app,/function withLoadTimeout\(promise,ms,stage\)/);
 assert.match(app,/withLoadTimeout\(accountSession\(current\),18000,'管理者確認'\)/);
 assert.match(app,/withLoadTimeout\([\s\S]*?Promise\.all\(\[getDoc\(walletRef\(\)\),getDoc\(farmRef\(\)\)\]\),20000,'農園データの取得'/);
 const init=app.slice(app.indexOf('async function initialize(current){'),app.indexOf('async function visitBuilding('));
 const tryAt=init.indexOf('try{');
 const refreshAt=init.indexOf('refresh();');
 assert.ok(tryAt>=0&&refreshAt>tryAt,'first refresh must be protected by the try block');
 assert.match(app,/gateStatus\('農園を開けませんでした：'\+msg,true\)/);
 assert.match(app,/gateStatus\('認証エラー：'\+msg,true\)/);
 assert.match(html,/const gate=document\.getElementById\('previewGate'\)/);
 assert.match(html,/window\.addEventListener\('error'/);
 assert.match(html,/window\.addEventListener\('unhandledrejection'/);
 assert.match(html,/setTimeout\(\(\)=>recovery\('読み込みに時間がかかっています/);
 assert.match(html,/preview-retry/);
 assert.match(css,/#previewGate \.preview-retry/);
 assert.match(css,/#previewGate \.preview-back/);
 assert.doesNotMatch(init,/\\$\\('previewGate'\\)\.textContent=e\.message/);
});


test('farm shop cold-start renderer has working stock and purchase-limit helpers for every tab',()=>{
 const app=source('pet-farm/app.js');
 const start=app.indexOf('function shopStock(kind,id){');
 const end=app.indexOf('function renderInventory(){',start);
 assert.ok(start>=0&&end>start,'shop helper definitions must precede renderShop');
 const shopSection=app.slice(start,end);
 const createNode=(tag,cls='',value='')=>({
  tag,className:cls,textContent:value,children:[],scrollTop:0,
  classList:{toggle(){}},
  append(...children){this.children.push(...children);},
  appendChild(child){this.children.push(child);return child;},
  replaceChildren(...children){this.children=children;},
  setAttribute(){},addEventListener(){}
 });
 const elements={
  shopList:createNode('div'),shopBalance:createNode('span'),shopConfirmation:createNode('div')
 };
 const $=id=>elements[id];
 const tabs=['field','road','flower','seed','supply'].map(shop=>({dataset:{shop},classList:{toggle(){}}}));
 const shopFactory=new Function('farm','balance','CROPS','SUPPLIES','FIELD_TYPES','FIELD_SIZES','FLOWERS','flowerIds','flowerTileSVG',
  'cropIds','cropUnlockProgress','isCropUnlocked','node','$','document','actionButton','busy','ready',
  'shopTab','chosenPurchase',shopSection+';return {shopStock,maxPurchaseQuantity,renderShop};');
 const build=(farm,balance,tab,chosen=null)=>shopFactory(
  farm,balance,CROPS,SUPPLIES,FIELD_TYPES,FIELD_SIZES,FLOWERS,flowerIds,flowerTileSVG,
  ['lettuce','carrot','pumpkin','strawberry','melon'],cropUnlockProgress,
  (state,id)=>cropUnlockProgress(state,id).unlocked,createNode,$,
  {querySelectorAll(){return tabs;}},()=>createNode('button'),false,true,tab,chosen
 );
 const f=freshFarm();
 for(const tab of ['field','road','flower','seed','supply']){
  const shop=build(f,0,tab);
  assert.doesNotThrow(()=>shop.renderShop(),'the '+tab+' catalogue must render for a logged-in player');
  assert.ok(elements.shopList.children.length>0);
 }
 const field=build(f,0,'field');
 assert.equal(field.shopStock('field','4'),0);
 assert.equal(field.maxPurchaseQuantity({kind:'field',id:'free',price:0}),1);
 assert.equal(field.maxPurchaseQuantity({kind:'field',id:'4',price:50}),0);
 const stocked=applyPurchase(f,'field','free',0).farm;
 const supply=build(stocked,100,'supply');
 assert.equal(supply.shopStock('supply','water'),3);
 assert.equal(supply.maxPurchaseQuantity({kind:'supply',id:'water',price:1}),99);
 const seed=build(stocked,100,'seed',{kind:'seed',id:'lettuce',label:'レタスのタネ',icon:'🥬',price:1,units:3,quantity:2});
 assert.doesNotThrow(()=>seed.renderShop(),'selected seed confirmation must render too');
 assert.equal(seed.shopStock('seed','lettuce'),3);
 const flower=build(stocked,100,'flower');
 assert.equal(flower.shopStock('flower','rose'),0);
 assert.equal(flower.maxPurchaseQuantity({kind:'flower',id:'rose',price:50}),2);
});


test('pet stands completely off the crop and outside every field during farm work',()=>{
 const {f,id}=starter();
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const body=(pos)=>({x:pos.x-.9,y:pos.y-1.45,w:1.8,h:1.75});
 for(let i=0;i<4;i++){
  const stand=findWorkStand(f,id,i,12.5,7.5);
  const tile=locateField(f,id,i);
  assert.ok(stand,'a stand should be found for plot '+i);
  assert.equal(overlaps(body(stand),{...tile,w:1,h:1}),false);
  assert.equal(overlaps(body(stand),{x:12,y:8,w:2,h:2}),false);
  assert.ok(body(stand).x>=0&&body(stand).y>=0);
  assert.ok(body(stand).x+body(stand).w<=MAP.w);
  assert.ok(body(stand).y+body(stand).h<=MAP.h);
 }
});

test('pet work stand avoids neighbouring plots, buildings and field edges',()=>{
 let {f,id}=starter();
 f=applyPurchase(f,'field','4',200,3).farm;
 f=applyLayoutAction(f,{type:'place-field',size:'4',x:14,y:8,name:'おとなり'}).farm;
 f=applyLayoutAction(f,{type:'place-field',size:'4',x:12,y:6,name:'うえ'}).farm;
 const body=({x,y})=>({x:x-.9,y:y-1.45,w:1.8,h:1.75});
 const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(let i=0;i<4;i++){
  const stand=findWorkStand(f,id,i,12.5,9);
  assert.ok(stand,'found a nearby free position');
  const area=body(stand);
  for(const field of f.fields){
   const shape=FIELD_TYPES[field.size];
   assert.equal(overlaps(area,{x:field.x,y:field.y,w:shape.w,h:shape.h}),false);
  }
  for(const zone of RESERVED_ZONES)assert.equal(overlaps(area,zone),false);
 }
 let edge=freshFarm();
 edge=applyPurchase(edge,'field','free',0).farm;
 const placed=applyLayoutAction(edge,{type:'place-field',size:'4',x:28,y:12,name:'すみっこ'});
 edge=placed.farm;
 for(let i=0;i<4;i++){
  const stand=findWorkStand(edge,placed.id,i,29,13);
  assert.ok(stand);
  const area=body(stand);
  const plot=locateField(edge,placed.id,i);
  assert.equal(overlaps(area,{...plot,w:1,h:1}),false);
  assert.ok(area.x>=0&&area.y>=0&&area.x+area.w<=MAP.w&&area.y+area.h<=MAP.h);
 }
});

test('all crop actions move pet to the safe work spot while effects stay on the target tile',()=>{
 const js=source('pet-farm/app.js');
 const start=js.indexOf('async function actPlot(type,extra={}){');
 const end=js.indexOf('\nasync function produce(',start);
 assert.ok(start>=0&&end>start);
 const action=js.slice(start,end);
 assert.match(action,/findWorkStand\(farm,params\.area,params\.index,petX,petY\)/);
 assert.match(action,/if\(stand\)await walkTo\(stand\.x,stand\.y\)/);
 assert.match(action,/await showWork\(type,spot\.x\+\.5,spot\.y\+\.5\)/);
 assert.doesNotMatch(action,/walkTo\(spot\.x\+\.5,spot\.y\+\.77\)/);
});

test('six flowerbed products draw four borderless blooms per tile and preserve placement and stock',()=>{
 assert.deepEqual(flowerIds,['rose','sunflower','lavender','hydrangea','marigold','tulip']);
 let f=freshFarm();
 for(const id of flowerIds){
  assert.equal(FLOWERS[id].price,50);
  const svg=flowerTileSVG(id);
  assert.equal((svg.match(/data-bloom=/g)||[]).length,4,id+' must show exactly four blooms');
  assert.doesNotMatch(svg,/<rect|<foreignObject/i,'no painted tile border or planter');
  assert.match(svg,/viewBox="0 0 54 54"/);
  f=applyPurchase(f,'flower',id,500,2).farm;
  assert.equal(f.inventory.flowers[id],2);
 }
 assert.equal(applyPurchase(freshFarm(),'flower','rose',100,2).cost,100);
 assert.throws(()=>applyPurchase(freshFarm(),'flower','rose',49),/コインが足りません/);
 assert.throws(()=>applyPurchase(freshFarm(),'flower','unknown',100),/見つかりません/);
 assert.equal(canPlaceFlower(f,2,2),false,'house is reserved');
 assert.equal(canPlaceFlower(f,14,10),true);
 f=applyLayoutAction(f,{type:'place-flower',flower:'rose',x:14,y:10}).farm;
 f=applyLayoutAction(f,{type:'place-flower',flower:'sunflower',x:15,y:10}).farm;
 assert.equal(f.inventory.flowers.rose,1);
 assert.deepEqual(f.flowers,[{type:'rose',x:14,y:10},{type:'sunflower',x:15,y:10}]);
 assert.equal(canPlaceRoad(f,14,10),false);
 assert.equal(canPlace(f,'4',14,10),false);
 assert.throws(()=>applyLayoutAction(f,{type:'place-flower',flower:'tulip',x:14,y:10}),/置けません/);
 const restored=normalizeFarm(JSON.parse(JSON.stringify(f)));
 assert.deepEqual(restored.flowers,f.flowers);
 assert.equal(restored.inventory.flowers.rose,1);
 f=applyLayoutAction(restored,{type:'remove-flower',x:14,y:10}).farm;
 assert.equal(f.inventory.flowers.rose,2);
 assert.equal(f.flowers.length,1);
 assert.throws(()=>applyLayoutAction(f,{type:'remove-flower',x:14,y:10}),/ありません/);
 const tampered=normalizeFarm({...f,flowers:[{type:'unknown',x:3,y:10},{type:'rose',x:15,y:10},{type:'rose',x:15,y:10}]});
 assert.equal(tampered.flowers.length,1,'invalid and overlapping data is rejected');
});

test('moving placed roads and flowers uses one layout action and never changes inventory',()=>{
 let f=freshFarm();
 f=applyPurchase(f,'road','dirt',10,2).farm;
 f=applyPurchase(f,'flower','rose',100,2).farm;
 f=applyPurchase(f,'field','free',0).farm;
 f=applyLayoutAction(f,{type:'place-field',size:'4',x:12,y:8,name:'花壇の横'}).farm;
 f=applyLayoutAction(f,{type:'place-road',x:14,y:10}).farm;
 f=applyLayoutAction(f,{type:'place-flower',flower:'rose',x:15,y:10}).farm;
 const oldRoadStock=f.inventory.roads,oldFlowerStock=f.inventory.flowers.rose;
 assert.throws(()=>applyLayoutAction(f,{type:'move-road',fromX:14,fromY:10,x:15,y:10}),/移動できません/,'cannot move a road onto a flower');
 assert.throws(()=>applyLayoutAction(f,{type:'move-flower',fromX:15,fromY:10,x:12,y:8}),/移動できません/,'cannot move a flower onto a field');
 assert.throws(()=>applyLayoutAction(f,{type:'move-road',fromX:1,fromY:1,x:20,y:10}),/見つかりません/);
 assert.throws(()=>applyLayoutAction(f,{type:'move-flower',fromX:1,fromY:1,x:20,y:10}),/見つかりません/);
 assert.deepEqual(f.roads,['14,10'],'failed moves leave the source untouched');
 assert.deepEqual(f.flowers,[{type:'rose',x:15,y:10}]);
 f=applyLayoutAction(f,{type:'move-road',fromX:14,fromY:10,x:16,y:10}).farm;
 assert.deepEqual(f.roads,['16,10']);
 assert.equal(f.inventory.roads,oldRoadStock);
 f=applyLayoutAction(f,{type:'move-flower',fromX:15,fromY:10,x:17,y:10}).farm;
 assert.deepEqual(f.flowers,[{type:'rose',x:17,y:10}]);
 assert.equal(f.inventory.flowers.rose,oldFlowerStock);
 assert.equal(canPlaceRoad(f,16,10),false);
 assert.equal(canPlaceFlower(f,17,10),false);
 f=normalizeFarm(JSON.parse(JSON.stringify(f)));
 assert.deepEqual(f.roads,['16,10']);
 assert.deepEqual(f.flowers,[{type:'rose',x:17,y:10}]);
 f=applyLayoutAction(f,{type:'remove-road',x:16,y:10}).farm;
 f=applyLayoutAction(f,{type:'remove-flower',x:17,y:10}).farm;
 assert.equal(f.inventory.roads,oldRoadStock+1,'removed road returns to inventory');
 assert.equal(f.inventory.flowers.rose,oldFlowerStock+1,'removed flower returns to inventory');
 assert.deepEqual(f.roads,[]);assert.deepEqual(f.flowers,[]);
});

test('farm HUD tile edit mode can pick road or flower and choose move or return to inventory',()=>{
 const html=source('pet-farm/index.html'),app=source('pet-farm/app.js'),css=source('pet-farm/style.css');
 assert.ok(html.includes('id="tileManageBtn"'));
 assert.ok(html.includes('id="tileManageDialog"'));
 assert.ok(html.indexOf('id="tileManageBtn"')<html.indexOf('id="itemsBtn"'),'tile edit button precedes item box');
 assert.match(app,/function openTileManage\(x,y\)/);
 assert.match(app,/beginPlacement\('manage-tile',null\)/);
 assert.match(app,/beginPlacement\('move-tile',\{kind,fromX:x,fromY:y\}\)/);
 assert.match(app,/type:kind==='road'\?'move-road':'move-flower'/);
 assert.match(app,/type:kind==='road'\?'remove-road':'remove-flower'/);
 assert.match(css,/\.placement-cell\[hidden\]\{display:none!important\}/);
});
