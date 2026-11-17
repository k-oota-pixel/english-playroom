import test from 'node:test';
import assert from 'node:assert/strict';
import {VALUE_PRESETS,CHOICES,blankState,normalizeState,calculate,sampleState} from '../career-matrix/model.js';

test('image sample totals are 27, 25, 31 and 23',()=>{
  const result=calculate(sampleState());
  assert.deepEqual(result.options.map(item=>item.score),[27,25,31,23]);
  assert.equal(result.maxPoints,50);
  assert.equal(result.filled,16);
  assert.equal(result.ready,true);
  assert.deepEqual(result.order.map(item=>item.name),['工学部','経済学部','経営学部','商学部']);
});
test('initial matrix has exactly four criteria and four options',()=>{
  const state=blankState();
  assert.equal(state.values.length,4);
  assert.equal(state.options.length,4);
  assert.equal(state.ratings.length,4);
  assert.deepEqual(state.ratings.map(row=>row.length),[4,4,4,4]);
  assert.equal(calculate(state).ready,false);
});
test('one to five stars and one to five ratings affect score immediately',()=>{
  const state=sampleState();
  state.values[0].weight=5;
  state.ratings[0][0]=5;
  const result=calculate(state);
  assert.equal(result.options[0].score,49);
  assert.equal(result.maxPoints,60);
  assert.equal(result.rows[0][0],25);
});
test('incomplete comparison is interim even when a candidate has 4 ratings',()=>{
  const state=sampleState();
  state.ratings[2][2]=0;
  const result=calculate(state);
  assert.equal(result.filled,15);
  assert.equal(result.ready,false);
  assert.equal(result.options[2].completed,3);
});
test('duplicates prevent a misleading final ranking',()=>{
  const state=sampleState();
  state.options[1].name=state.options[0].name;
  assert.equal(calculate(state).duplicateOptions,true);
  assert.equal(calculate(state).ready,false);
  state.options[1].name='経営学部';
  state.values[1].label=state.values[0].label;
  assert.equal(calculate(state).duplicateValues,true);
  assert.equal(calculate(state).ready,false);
});
test('invalid stored data is normalized to safe fixed-size matrix',()=>{
  const state=normalizeState({values:[{label:'test',weight:99}],options:[{kind:'invalid',name:'hello'}],ratings:[[-99,999]],updatedAt:-3});
  assert.equal(state.values[0].weight,3);
  assert.equal(state.options[0].kind,'faculty');
  assert.deepEqual(state.ratings[0],[0,0,0,0]);
  assert.equal(state.updatedAt,0);
});
test('four detailed category dictionaries are available',()=>{
  assert.ok(VALUE_PRESETS.length>=20);
  assert.deepEqual(Object.keys(CHOICES),['faculty','field','industry','job']);
  assert.ok(Object.values(CHOICES).every(category=>category.examples.length>=30));
});
