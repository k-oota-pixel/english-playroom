import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 DISPLAY_TYPES,displayIds,freshFarm,normalizeFarm,applyPurchase,applyLayoutAction,
 applyDisplayAction,canPlace,canPlaceRoad,canPlaceFlower,canPlaceDisplay
} from '../pet-farm/model.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const place=(farm,type,x,y)=>applyLayoutAction(farm,{type:'place-display',displayType:type,x,y}).farm;

test('exactly two purchasable farm fixtures with appropriate capacity and crop restrictions',()=>{
 assert.deepEqual(displayIds,['crate','cooler']);
 assert.deepEqual(displayIds.map(id=>DISPLAY_TYPES[id].price),[30,60]);
 assert.deepEqual(displayIds.map(id=>DISPLAY_TYPES[id].capacity),[12,8]);
 assert.ok(DISPLAY_TYPES.crate.crops.includes('carrot'));
 assert.ok(DISPLAY_TYPES.cooler.crops.includes('strawberry'));
 assert.ok(!DISPLAY_TYPES.crate.crops.includes('strawberry'));
 assert.ok(!DISPLAY_TYPES.cooler.crops.includes('carrot'));
 let farm=freshFarm();
 assert.equal(farm.inventory.displays.crate,0);
 assert.deepEqual(farm.displays,[]);
 assert.equal(farm.schemaVersion,3,'do not reset the legacy schema migration');
 assert.equal(applyPurchase(farm,'display','crate',60,2).cost,60);
 farm=applyPurchase(farm,'display','crate',60,2).farm;
 assert.equal(farm.inventory.displays.crate,2);
 assert.throws(()=>applyPurchase(farm,'display','cooler',59),/コインが足りません/);
});

test('placement avoids existing farm objects and allows moving/packing without extra purchases',()=>{
 let farm=applyPurchase(freshFarm(),'display','crate',60).farm;
 farm=place(farm,'crate',9,3);
 const id=farm.displays[0].id;
 assert.equal(farm.inventory.displays.crate,0);
 assert.equal(canPlace(farm,'4',9,3),false);
 assert.equal(canPlaceRoad(farm,9,3),false);
 assert.equal(canPlaceFlower(farm,9,3),false);
 assert.equal(canPlaceDisplay(farm,'cooler',9,3),false);
 assert.equal(canPlaceDisplay(farm,'crate',9,3,id),true);
 assert.throws(()=>applyLayoutAction(farm,{type:'place-display',displayType:'crate',x:25,y:3}),/持ち物|置けません/);
 farm=applyLayoutAction(farm,{type:'move-display',id,x:12,y:3}).farm;
 assert.equal(farm.displays[0].x,12);
 farm=applyLayoutAction(farm,{type:'remove-display',id}).farm;
 assert.equal(farm.displays.length,0);
 assert.equal(farm.inventory.displays.crate,1);
});

test('restocking transfers only real harvested produce, and unstock returns it',()=>{
 let farm=applyPurchase(freshFarm(),'display','crate',100).farm;
 farm=place(farm,'crate',9,3);
 const id=farm.displays[0].id;
 farm.inventory.produce.carrot=15;
 const result=applyDisplayAction(farm,{type:'restock',id,crop:'carrot'});
 assert.equal(farm.inventory.produce.carrot,15,'input state is not mutated');
 farm=result.farm;
 assert.equal(farm.inventory.produce.carrot,3);
 assert.equal(farm.displays[0].quantity,12);
 assert.equal(farm.displays[0].crop,'carrot');
 assert.throws(()=>applyDisplayAction(farm,{type:'restock',id,crop:'carrot'}),/満杯/);
 assert.throws(()=>applyDisplayAction(farm,{type:'restock',id,crop:'lettuce'}),/別の作物/);
 assert.throws(()=>applyDisplayAction(farm,{type:'restock',id,crop:'carrot',quantity:0}),/満杯/);
 farm=normalizeFarm(JSON.parse(JSON.stringify(farm)));
 assert.equal(farm.displays[0].quantity,12,'single-doc save roundtrip retains stock');
 farm=applyDisplayAction(farm,{type:'unstock',id}).farm;
 assert.equal(farm.displays[0].quantity,0);
 assert.equal(farm.displays[0].crop,'');
 assert.equal(farm.inventory.produce.carrot,15);
});

test('cooler accepts strawberries, and removing stocked furniture refunds all produce',()=>{
 let farm=applyPurchase(freshFarm(),'display','cooler',60).farm;
 farm=place(farm,'cooler',10,3);
 const id=farm.displays[0].id;
 farm.inventory.produce.strawberry=10;
 assert.throws(()=>applyDisplayAction(farm,{type:'restock',id,crop:'carrot'}),/陳列できない/);
 farm=applyDisplayAction(farm,{type:'restock',id,crop:'strawberry'}).farm;
 assert.equal(farm.displays[0].quantity,8);
 assert.equal(farm.inventory.produce.strawberry,2);
 farm=applyLayoutAction(farm,{type:'remove-display',id}).farm;
 assert.equal(farm.inventory.produce.strawberry,10);
 assert.equal(farm.inventory.displays.cooler,1);
});

test('old farm records initialize empty fixture inventories, corrupt overlaps are rejected',()=>{
 const old=normalizeFarm({schemaVersion:3,fields:[],inventory:{produce:{lettuce:2}}});
 assert.deepEqual(old.displays,[]);
 assert.deepEqual(old.inventory.displays,{crate:0,cooler:0});
 const corrupt=normalizeFarm({
  schemaVersion:3,inventory:{displays:{crate:1}},
  roads:['10,3'],displays:[
   {id:'d1',type:'crate',x:10,y:3,crop:'carrot',quantity:10},
   {id:'d2',type:'crate',x:13,y:3,crop:'carrot',quantity:9999},
   {id:'d3',type:'crate',x:13,y:3,crop:'carrot',quantity:2}
  ]});
 assert.equal(corrupt.displays.length,1);
 assert.equal(corrupt.displays[0].id,'d2');
 assert.equal(corrupt.displays[0].quantity,12,'stock is capped to furniture capacity');
});

test('farm HTML and JS expose a shop tab, tile fixtures and restock flow without new reads',()=>{
 const html=source('pet-farm/index.html');
 const app=source('pet-farm/app.js');
 const css=source('pet-farm/style.css');
 assert.match(html,/id="displaysLayer"/);
 assert.match(html,/data-shop="display"/);
 assert.match(html,/id="displayDialog"/);
 assert.match(css,/#displaysLayer/);
 assert.match(app,/function renderDisplays\(\)/);
 assert.match(app,/function renderDisplayDialog\(\)/);
 assert.match(app,/beginPlacement\('display',id\)/);
 assert.match(app,/applyDisplayAction\(farm,action\)/);
 const start=app.indexOf('function applyDisplayOperation(action){');
 const end=app.indexOf('function openDisplay(id){',start);
 assert.ok(start>=0&&end>start);
 const operation=app.slice(start,end);
 assert.match(operation,/queueSave\(\)/);
 assert.doesNotMatch(operation,/getDoc|runTransaction|setDoc|onSnapshot/);
 assert.match(app,/getDoc\(farmRef\(\)\)/,'existing single farm load is reused');
});
