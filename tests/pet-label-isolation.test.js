import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIONS, normalizeAppearance} from '../pet-model.js';

test('legacy panda pet ID has its own lion label without changing stored species',()=>{
  assert.equal(OPTIONS.species.find(item=>item.id==='panda').label,'ライオン');
  assert.equal(normalizeAppearance({species:'panda'}).species,'panda');
});
