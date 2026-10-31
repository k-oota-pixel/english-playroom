import test from 'node:test';
import assert from 'node:assert/strict';
import {adminStatsAdjustment,ADMIN_STATS_ADJUSTMENT} from '../pet-admin-stats-adjustment.js';
import {strengthStatsFromAllocation,strengthState,allocationTotal,grantedStrengthPoints,allocatePoint,hasIndividualBaseStats} from '../pet-strength-model.js';
test('verified administrator receives exactly requested effective stats at every growth age and HP parity',()=>{
 for(const adult of [false,true])for(const days of [0,5,10,15,20,25,30,35,100])for(let hp=10;hp<=15;hp++){
 const data={petHatched:true,petAdult:adult,petLifeDays:days,petGeneration:3,petBaseStats:{hp,attack:6,defense:5,mp:11},petStrengthLevelPoints:400},patch=adminStatsAdjustment(data,true),updated={...data,...patch};
 assert.ok(hasIndividualBaseStats(patch.petBaseStats));assert.deepEqual(strengthStatsFromAllocation(patch.petStrength,patch.petBaseStats,{ageDays:days,adult}),{hp:100,attack:30,defense:30,mp:100});
 const panel=strengthState(3,patch.petStrength,patch.petBaseStats,{ageDays:days,adult,grantedPoints:grantedStrengthPoints(updated)});assert.deepEqual(panel.stats,{hp:100,attack:30,defense:30,mp:100});assert.ok(panel.available>=1);assert.equal(patch.petStrengthLevelPoints,400);
 assert.deepEqual(allocatePoint(3,patch.petStrength,'attack',grantedStrengthPoints(updated)),{...patch.petStrength,attack:patch.petStrength.attack+1});
 }
});
test('normal users are untouched and administrator adjustment runs once without resetting future allocations',()=>{
 const data={petGeneration:1,petHatched:true,petAdult:true,petBaseStats:{hp:11,attack:2,defense:2,mp:8},petStrength:{hp:2,attack:2,defense:2,mp:2},coins:70,petName:'えまゆん'};assert.equal(adminStatsAdjustment(data,false),null);
 const patch=adminStatsAdjustment(data,true);assert.equal(patch.petAdminStatsAdjustment,ADMIN_STATS_ADJUSTMENT);assert.equal('coins' in patch,false);assert.equal('petName' in patch,false);assert.equal(adminStatsAdjustment({...data,...patch,petStrength:{...patch.petStrength,attack:40}},true),null);
 assert.equal(grantedStrengthPoints({...data,...patch,petGeneration:2}),0);assert.ok(grantedStrengthPoints({...data,...patch})>=allocationTotal(patch.petStrength));
});

