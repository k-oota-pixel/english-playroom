import test from 'node:test';
import assert from 'node:assert/strict';
import {petReward,feedReward,petReaction,careState} from '../pet-care-model.js';
test('PET rewards three times, persists cap, resets next day without reducing friendship',()=>{
 let data={coins:20};for(let i=0;i<8;i++){const r=petReward(data,'2026-10-18');assert.equal(r.awarded,i<3);data={...data,petCare:r.petCare};}
 assert.equal(data.petCare.friendship,3);assert.equal(data.coins,20);
 assert.equal(petReward(data,'2026-10-19').petCare.friendship,4);
});
test('food costs and happy rewards; insufficient funds and invalid ID reject without mutation',()=>{
 for(const [id,cost] of [['snack',1],['meal',3],['special',5]]){const data={coins:5,petShop:{ownedItems:['crown']}};const r=feedReward(data,id);assert.equal(r.coins,5-cost);assert.equal(r.petCare.happy,cost);assert.equal(data.coins,5);assert.throws(()=>feedReward({coins:cost-1},id));}
 assert.throws(()=>feedReward({coins:100},'invalid'));
});
test('reaction thresholds and old saved data',()=>{
 assert.equal(petReaction(9,0),'music');assert.equal(petReaction(10,0),'jump');assert.equal(petReaction(10,1),'music');assert.equal(petReaction(30),'hearts');assert.equal(petReaction(50),'approach');assert.equal(petReaction(100),'celebrate');assert.equal(careState({}).friendship,0);
});
