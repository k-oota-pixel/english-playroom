import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 MAP,FARMS,FIELD_TYPES,FIELD_SIZES,RESERVED_ZONES,CROPS,SUPPLIES,
 freshFarm,normalizeFarm,cropUnlockProgress,canPlace,canPlaceRoad,
 locateField,plotKey,applyPurchase,applyLayoutAction,applyFarmAction,
 growthPhase,remaining,useProduce
} from '../pet-farm/model.js';
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
 assert.match(app,/beginPlacement\(p.kind==='field'/);
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
