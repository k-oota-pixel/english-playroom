import test from 'node:test';
import assert from 'node:assert/strict';
import {feedReward,careState,happyDay,happyLabel} from '../pet-care-model.js';
const today='2026-10-18';
test('each food charges existing price and adds HAPPY without mutating other state',()=>{
 for(const [id,cost] of [['snack',1],['meal',3],['special',5]]){
  const data={coins:5,petCare:{happy:2,happyDate:today,friendship:100},petShop:{ownedItems:['crown']},petWaste:{count:2}};
  const original=structuredClone(data),r=feedReward(data,id,today);
  assert.deepEqual(r,{coins:5-cost,petCare:{happy:2+cost,happyDate:today}});
  assert.deepEqual(data,original);
  assert.throws(()=>feedReward({coins:cost-1},id,today));
 }
 assert.throws(()=>feedReward({coins:100},'invalid',today));
});
test('cap at ten, including FEED at MAX; coin costs still apply',()=>{
 for(const id of ['snack','meal','special']){
  for(const happy of [9,10,100]){
   const r=feedReward({coins:20,petCare:{happy,happyDate:today}},id,today);
   assert.equal(r.petCare.happy,10);assert.ok(r.coins<20);
  }
 }
});
test('day changes and undated legacy totals read as zero without writes',()=>{
 for(const petCare of [undefined,{happy:999},{happy:9,happyDate:'2026-10-17'},{happy:9,happyDate:'2026-10-19'}]){
  const data={coins:10,petCare},original=structuredClone(data);
  assert.deepEqual(careState(data,today),{happy:0});assert.deepEqual(data,original);
  assert.deepEqual(feedReward(data,'snack',today).petCare,{happy:1,happyDate:today,...(petCare?.happyDate==='2026-10-17'?{previousHappy:9,previousHappyDate:'2026-10-17'}:{})});
 }
});
test('local midnight and year rollover change the calendar key',()=>{
 assert.equal(happyDay(new Date(2026,11,31,23,59,59)),'2026-12-31');
 assert.equal(happyDay(new Date(2027,0,1,0,0,0)),'2027-01-01');
});
test('normalizes bad saved values and labels all boundaries',()=>{
 for(const happy of [-3,'bad',null])assert.equal(careState({petCare:{happy,happyDate:today}},today).happy,0);
 for(const [value,label] of [[0,'ふつう'],[3,'ふつう'],[4,'ごきげん！'],[6,'ごきげん！'],[7,'HAPPY!'],[9,'HAPPY!'],[10,'MAX HAPPY!']])assert.equal(happyLabel(value),label);
});
