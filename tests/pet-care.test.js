import test from 'node:test';
import assert from 'node:assert/strict';
import {feedReward,careState} from '../pet-care-model.js';
test('food costs, happy rewards, old friendship state is ignored',()=>{
 for(const [id,cost] of [['snack',1],['meal',3],['special',5]]){
  const data={coins:5,petCare:{happy:2,friendship:100,petCount:3},petShop:{ownedItems:['crown']}};
  const r=feedReward(data,id);
  assert.equal(r.coins,5-cost);assert.deepEqual(r.petCare,{happy:2+cost});assert.equal(data.coins,5);
  assert.throws(()=>feedReward({coins:cost-1},id));
 }
 assert.throws(()=>feedReward({coins:100},'invalid'));assert.deepEqual(careState({}),{happy:0});
});
