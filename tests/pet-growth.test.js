import test from 'node:test';import assert from 'node:assert/strict';import {growthPatch,hatchPatch,hatchDay,growthDay,growthRoll,GROWTH_CHANCES} from '../pet-growth.js';
test('hatching records the login baseline, with no growth draw on hatch day',()=>{
 const d=hatchPatch('2026-10-01',2);
 assert.equal(d.petHatchLoginDays,2);
 assert.equal(d.petAppearance,null);
 assert.equal(d.petAdult,false);
 assert.deepEqual(growthPatch({...d,petLoginDays:2},'2026-10-01','a'),{});
});
test('third login has 60% chance and fourth login guarantees growth',()=>{
 assert.deepEqual(GROWTH_CHANCES.slice(2),[.6,1]);
 const d=hatchPatch('2026-10-01',2);
 assert.equal(growthDay({...d,petLoginDays:2},'2026-10-08'),1);
 assert.equal(growthDay({...d,petLoginDays:3},'2026-10-08'),2);
 assert.equal(growthDay({...d,petLoginDays:4},'2026-10-08'),3);
 let successCount=0;
 for(let i=0;i<200;i++){
  const uid=String(i);
  const third=growthPatch({...d,petLoginDays:3},'2026-10-08',uid);
  const succeeds=growthRoll(uid,1,2)<.6;
  assert.equal(!!third.petGrowthPending,succeeds);
  if(succeeds){successCount++;assert.deepEqual(growthPatch({...d,...third,petLoginDays:4},'2026-10-09',uid),{});}
  else{
   const fourth=growthPatch({...d,...third,petLoginDays:4},'2026-10-09',uid);
   assert.equal(fourth.petGrowthPending,true);
   assert.equal(fourth.petGrowthCheckedDay,3);
  }
 }
 assert.ok(successCount>50&&successCount<160);
 assert.equal(hatchDay(d,'2026-10-04'),4);
});
test('existing pets migrate as adults without overwriting wallet, name or appearance',()=>{
 const appearance={species:'panda'};
 assert.deepEqual(growthPatch({petHatched:true,petAppearance:appearance,coins:200,petName:'Leo'},'2026-10-01','a'),{petGrowthVersion:1428,petAdult:true});
});
test('existing juvenile pets without a hatch login baseline retain progress',()=>{
 const d={...hatchPatch('2026-10-01'),petGrowthVersion:1427};
 const p=growthPatch(d,'2026-10-04','a');
 assert.equal(p.petGrowthVersion,1428);
 assert.equal(p.petGrowthPending,true);
 assert.ok(p.petGrowthCheckedDay>=2&&p.petGrowthCheckedDay<=3);
});
