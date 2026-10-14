import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIONS,DEFAULT_APPEARANCE,normalizeAppearance,validAppearance,loginProgress,readyToHatch,hasPet,equippedLayers} from '../pet-model.js';
import {renderPetSVG} from '../pet-art.js';
test('4,608 valid SVG combinations, each safe to render',()=>{
  let count=0;
  function visit(keys,value){
    if(!keys.length){assert.ok(validAppearance(value));const svg=renderPetSVG(value);assert.ok(svg.startsWith('<svg'));assert.ok(!/undefined|NaN/.test(svg));count++;return;}
    const [key,...rest]=keys;for(const item of OPTIONS[key])visit(rest,{...value,[key]:item.id});
  }
  visit(Object.keys(OPTIONS),{});assert.equal(count,4608);
});
test('login counts distinct days, skips repeats and backwards clocks',()=>{
  assert.deepEqual(loginProgress({},'2026-10-14'),{petLoginDays:1,petLastLoginDate:'2026-10-14'});
  const day={petLoginDays:2,petLastLoginDate:'2026-10-14'};
  assert.equal(loginProgress(day,'2026-10-14').petLoginDays,2);
  assert.equal(loginProgress(day,'2026-10-13').petLoginDays,2);
  assert.equal(loginProgress(day,'2026-10-16').petLoginDays,3);
  assert.equal(loginProgress({petLoginDays:Infinity},'2026-10-14').petLoginDays,1);
});
test('third day and legacy hatch require a choice before showing a pet',()=>{
  assert.equal(readyToHatch({petLoginDays:2}),false);
  assert.equal(readyToHatch({petLoginDays:3}),true);
  assert.equal(readyToHatch({petHatched:true}),true);
  assert.equal(hasPet({petHatched:true}),false);
  assert.equal(hasPet({petHatched:true,petAppearance:DEFAULT_APPEARANCE}),true);
});
test('untrusted saved IDs do not become SVG or shop markup',()=>{
  const hostile={species:'<script>alert(1)</script>',bodyColor:'" onload="alert(1)'};
  assert.deepEqual(normalizeAppearance(hostile),DEFAULT_APPEARANCE);
  assert.equal(validAppearance(hostile),false);
  assert.ok(!renderPetSVG(hostile).includes('<script'));
  assert.deepEqual(equippedLayers({ownedItems:['__proto__'],equipped:{accessories:'__proto__'}}),{backgrounds:'',patterns:'',accessories:''});
});
