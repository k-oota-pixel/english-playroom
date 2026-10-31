import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {chanceFor,departureChance,shouldDepart} from '../pet-lifetime-model.js';
import {previousHappy,yesterdayKey,feedReward,careState} from '../pet-care-model.js';
import {growthPatch} from '../pet-growth.js';
import {advanceHealth} from '../pet-health-model.js';
import {hasPet,normalizePetName,validPetName} from '../pet-model.js';
const today='2026-10-19',yesterday='2026-10-18';
const saved=happy=>({petCare:{happy,happyDate:yesterday}});
const source=fs.readFileSync(new URL('../pet-lifecycle-v141.js',import.meta.url),'utf8');
const ctx=vm.createContext({advanceHealth,growthPatch,hasPet,normalizePetName,validPetName,chanceFor,shouldDepart,LIFECYCLE_VERSION:141,MAX_MEMORIES:40});
vm.runInContext(source.slice(source.indexOf('function localDateKey'),source.indexOf('function ensureStyles')),ctx);
const advance=ctx.advanceLifecycle;
const pet=(days=45)=>({petHatched:true,petAdult:true,petAppearance:{species:'cat',bodyColor:'cream',eyes:'round',feature:'classic',pattern:'none',baseBackground:'ivory'},petName:'ふわ',petLifeDays:days,petLoginDays:100,petLastLoginDate:yesterday,petLastLifeLoginDate:yesterday,petLastLifeCheckDate:yesterday,petLifecycleVersion:141,petGrowthVersion:1428,petGeneration:2,coins:30,petShop:{ownedItems:['crown'],equipped:{head:'crown'}},petWaste:{count:2,day:20744}});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
test('illness death uses the existing memory and new egg path even before age checks begin',()=>{
 const data={...pet(3),petHealth:{generation:2,checkedDate:yesterday,sick:true,sickDays:0,zeroDays:0,wasteSeen:0,sickSince:yesterday}};
 let result;for(let i=0;i<2000;i++){result=advance(data,today,'ill-'+i);if(result.event==='departed')break;}
 assert.equal(result.event,'departed');assert.equal(result.memory.lifetimeDays,4);assert.equal(result.data.petHealth,null);assert.equal(result.data.petHatched,false);assert.equal(result.data.coins,30);
});
test('new illness day is protected from departure, including the age roll',()=>{
 const data=pet(25);let uid;for(let i=0;i<2000;i++){const id='new-sick-'+i;if(advanceHealth(data,today,id).patch.petHealth?.sick){uid=id;break;}}
 assert.ok(uid);const result=advance(data,today,uid);assert.equal(result.event,'');assert.equal(result.data.petHealth.sick,true);assert.equal(result.data.petHealth.sickDays,0);
});
test('all age band boundaries use the requested base probabilities',()=>{
 for(const [day,chance] of [[0,0],[5,0],[6,.03],[10,.03],[11,.08],[15,.08],[16,.12],[20,.12],[21,.15],[25,.15],[26,.20],[10000,.20]])assert.equal(chanceFor(day),chance);
});
test('only yesterday full gauge halves every age band; partial feeding gives no relief',()=>{
 for(const day of [1,5,6,10,11,15,16,20,21,25,26,10000]){
  for(let happy=0;happy<=10;happy++)close(departureChance(saved(happy),today,day),chanceFor(day)*(happy===10?.5:1));
 }
});
test('only yesterday counts; missing, old, future and undated totals give no relief',()=>{
 for(const petCare of [undefined,{happy:999},{happy:10,happyDate:today},{happy:10,happyDate:'2026-10-17'},{happy:10,happyDate:'2026-10-20'},{previousHappy:10,previousHappyDate:'2026-10-17'}])assert.equal(departureChance({petCare},today,26),.2);
 for(const happy of [-5,'bad',null])assert.equal(previousHappy(saved(happy),today),0);
 assert.equal(previousHappy(saved(999),today),10);
});
test('calendar yesterday crosses month, leap year and year boundaries',()=>{
 assert.equal(yesterdayKey('2027-01-01'),'2026-12-31');
 assert.equal(yesterdayKey('2024-03-01'),'2024-02-29');
 assert.equal(yesterdayKey('2026-03-01'),'2026-02-28');
});
test('FEED before daily check retains yesterday through repeated feeds, then expires',()=>{
 const data={...pet(),...saved(10)},original=structuredClone(data);
 const first=feedReward(data,'snack',today),second=feedReward({...data,...first},'meal',today);
 assert.equal(first.petCare.happy,1);assert.equal(second.petCare.happy,4);
 assert.equal(second.coins,26);assert.equal(previousHappy(second,today),10);
 assert.equal(departureChance(second,today,26),.1);
 assert.equal(previousHappy(second,'2026-10-20'),4);
 assert.equal(previousHappy(second,'2026-10-21'),0);
 assert.deepEqual(data,original);
 assert.equal(careState(data,today).happy,0);
});
test('daily draw is deterministic; six days starts checks and five days is safe',()=>{
 const before={...pet(4),...saved(0)},five=advance(before,today,'test-user');
 assert.equal(five.data.petLifeDays,5);assert.equal(five.patch.petLastLifeCheckDate,undefined);
 const six=advance({...pet(5),...saved(10)},today,'test-user');
 assert.equal(six.patch.petLastLifeCheckDate,today);
 assert.deepEqual(JSON.parse(JSON.stringify(six)),JSON.parse(JSON.stringify(advance({...pet(5),...saved(10)},today,'test-user'))));
 // Total account login days do not substitute for this pet's own days.
 assert.equal(five.data.petLoginDays,101);assert.equal(five.event,'');
});
test('repeat login/tab never increments or draws twice; skipped days add one login day',()=>{
 let uid='';for(let i=0;i<10000;i++)if(!shouldDepart('u'+i,2,today,26,saved(10))){uid='u'+i;break;}
 const first=advance({...pet(25),...saved(10)},today,uid);
 assert.equal(first.event,'');assert.equal(first.data.petLifeDays,26);
 const again=advance(first.data,today,uid);assert.equal(Object.keys(again.patch).length,0);
 const skipped=advance({...pet(4),petLastLifeLoginDate:'2026-10-01'},today,uid);
 assert.equal(skipped.data.petLifeDays,5);
});
test('26+ death preserves wallet/shop/memories when the daily draw is below 20%',()=>{
 let uid;for(let i=0;i<10000;i++){const id='departure-'+i;if(!advanceHealth(pet(25),today,id).patch.petHealth?.sick&&shouldDepart(id,2,today,26,saved(0))){uid=id;break;}}
 assert.ok(uid);
 const data={...pet(25),...saved(0)},result=advance(data,today,uid);
 assert.equal(result.event,'departed');assert.equal(result.data.petLifeDays,0);
 assert.equal(result.data.petGeneration,3);assert.equal(result.data.petHatched,false);
 assert.equal(result.memory.lifetimeDays,26);assert.equal(result.memory.name,'ふわ');
 assert.equal(result.data.coins,30);assert.equal(JSON.stringify(result.data.petShop),JSON.stringify(data.petShop));
 assert.equal(result.data.petWaste.count,0);assert.equal(result.data.petHealth,null);
 assert.equal(previousHappy(result.data,today),0);assert.equal(careState(result.data,today).happy,0);
 assert.equal(previousHappy(result.data,'2026-10-20'),0);
});
test('HAPPY MAX can survive after 26 days, even when FEED happens first',()=>{
 let uid='';for(let i=0;i<10000;i++)if(!shouldDepart('u'+i,2,today,26,saved(10))){uid='u'+i;break;}
 const data={...pet(25),...saved(10)},fed=feedReward(data,'special',today);
 const result=advance({...data,...fed},today,uid);
 assert.equal(result.event,'');assert.equal(result.data.petLifeDays,26);
 assert.equal(result.data.petCare.happy,5);assert.equal(result.data.coins,25);
 assert.equal(departureChance(result.data,today,26),.1);
});
test('old lifecycle migration does not perform an extra check or erase rewards',()=>{
 const data={...pet(),...saved(10),petLifecycleVersion:0},result=advance(data,today,'test-user');
 assert.equal(result.event,'migrated');assert.equal(result.data.petLifeDays,45);
 assert.equal(result.data.petCare.happy,10);assert.equal(result.data.coins,30);
});

test('26+ without yesterday full can survive; relief never changes illness death risk',()=>{
 let uid;for(let i=0;i<10000;i++){const id='survivor-'+i;if(!shouldDepart(id,2,today,26,saved(0))){uid=id;break;}}
 assert.ok(uid);assert.equal(advance({...pet(25),...saved(0)},today,uid).event,'');
 for(const days of [0,1,2,10]){
  const data={...pet(3),petHealth:{generation:2,checkedDate:yesterday,sick:true,sickDays:days}};
  assert.deepEqual(advanceHealth({...data,...saved(0)},today,'illness'),advanceHealth({...data,...saved(10)},today,'illness'));
 }
});
