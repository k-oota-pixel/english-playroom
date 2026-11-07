import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FARMS,CROPS,freshFarm,normalizeFarm,plotKey,locate,growthPhase,applyFarmAction,applyPurchase,useProduce} from '../pet-farm/model.js';

test('farm preview has four rectangular gardens with 35 total cells and only the first unlocked',()=>{
 assert.deepEqual(FARMS.map(a=>a.w*a.h),[4,6,9,16]);
 assert.equal(FARMS.reduce((n,a)=>n+a.w*a.h,0),35);
 assert.deepEqual(freshFarm().unlocked,[true,false,false,false]);
 assert.deepEqual(locate(3,15),{x:24,y:20});
});

test('seed, watering, growth, fertilizer and harvest are functional',()=>{
 let f=freshFarm();
 f=applyFarmAction(f,{area:0,index:0,type:'plant',crop:'carrot'},1000).farm;
 assert.equal(f.inventory.seeds.carrot,2);
 assert.equal(growthPhase(f.plots['0-0'],1500),'dry');
 assert.throws(()=>applyFarmAction(f,{area:0,index:0,type:'harvest'},999999));
 f=applyFarmAction(f,{area:0,index:0,type:'water'},1100).farm;
 assert.equal(f.inventory.water,2);
 assert.equal(f.plots['0-0'].readyAt,61100);
 f.inventory.fertilizer=1;
 f=applyFarmAction(f,{area:0,index:0,type:'fertilize'},2100).farm;
 assert.equal(f.inventory.fertilizer,0);
 assert.equal(f.plots['0-0'].readyAt,31600);
 assert.equal(growthPhase(f.plots['0-0'],31600),'ready');
 f=applyFarmAction(f,{area:0,index:0,type:'harvest'},31601).farm;
 assert.equal(f.inventory.produce.carrot,1);
 assert.equal(f.harvests,1);
 assert.equal(f.plots['0-0'],undefined);
});

test('fertilizer also works before first watering',()=>{
 let f=freshFarm();
 f.inventory.fertilizer=1;
 f=applyFarmAction(f,{area:0,index:1,type:'plant',crop:'carrot'},1000).farm;
 f=applyFarmAction(f,{area:0,index:1,type:'fertilize'},1100).farm;
 f=applyFarmAction(f,{area:0,index:1,type:'water'},1200).farm;
 assert.equal(f.plots['0-1'].readyAt,31200);
});

test('garden expansion must be sequential and cannot exceed balance',()=>{
 const base=freshFarm();
 assert.throws(()=>applyPurchase(base,'area','2',999));
 assert.throws(()=>applyPurchase(base,'area','1',29));
 const purchased=applyPurchase(base,'area','1',30);
 assert.equal(purchased.cost,30);
 assert.equal(purchased.farm.unlocked[1],true);
 assert.equal(base.unlocked[1],false);
});

test('produce can be fed to the pet or placed in a recoverable gift box',()=>{
 let f=freshFarm();
 f.inventory.produce.carrot=3;
 f=useProduce(f,'feed','carrot').farm;
 assert.equal(f.inventory.produce.carrot,2);
 assert.equal(f.bond,1);
 f=useProduce(f,'pack','carrot').farm;
 assert.equal(f.inventory.giftBox.carrot,1);
 assert.equal(f.inventory.produce.carrot,1);
 f=useProduce(f,'unpack','carrot').farm;
 assert.equal(f.inventory.giftBox.carrot,0);
 assert.equal(f.inventory.produce.carrot,2);
});

test('farm model is normalized and never modifies the main wallet',()=>{
 const f=freshFarm();
 const saved=normalizeFarm({...f,inventory:{...f.inventory,water:4.8}});
 assert.equal(saved.inventory.water,4);
 assert.equal(Object.hasOwn(saved,'coins'),false);
 const src=readFileSync(new URL('../pet-farm/index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../pet-farm/app.js',import.meta.url),'utf8');
 assert.match(src,/name="robots" content="noindex,nofollow,noarchive"/);
 assert.doesNotMatch(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/pet-farm\//);
 assert.match(app,/accountSession\(current\)/);
 assert.match(app,/runTransaction\(db/);
});
