import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPetSVG} from '../pet-art.js';
import {DEFAULT_APPEARANCE} from '../pet-model.js';

test('battle pet omits base and purchased backgrounds while retaining character and equipment',()=>{
 const shop={ownedItems:['forest-bg','crown'],equipped:{backgrounds:'forest-bg',head:'crown'}};
 for(const value of [null,{...DEFAULT_APPEARANCE,species:'penguin'},{...DEFAULT_APPEARANCE,species:'cat'}]){
  const normal=renderPetSVG(value,shop,'adult');
  const battle=renderPetSVG(value,shop,'adult',{background:false});
  assert.match(normal,/<rect width="240" height="240"/);
  assert.match(normal,/data-pet-shop-slot="backgrounds"/);
  assert.doesNotMatch(battle,/<rect width="240" height="240"|data-pet-shop-slot="backgrounds"/);
  assert.match(battle,/class="pet-character"/);
  assert.match(battle,/data-pet-shop-item="crown"/);
 }
});
