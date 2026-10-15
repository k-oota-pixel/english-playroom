import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIONS,DEFAULT_APPEARANCE,normalizeAppearance,validAppearance,loginProgress,readyToHatch,hasPet,equippedLayers} from '../pet-model.js';
import {renderPetSVG} from '../pet-art.js';
test('11,520 valid SVG combinations, each safe to render',()=>{
  let count=0;
  function visit(keys,value){
    if(!keys.length){assert.ok(validAppearance(value));const svg=renderPetSVG(value);assert.ok(svg.startsWith('<svg'));assert.ok(!/undefined|NaN/.test(svg));count++;return;}
    const [key,...rest]=keys;for(const item of OPTIONS[key])visit(rest,{...value,[key]:item.id});
  }
  visit(Object.keys(OPTIONS),{});assert.equal(count,11520);
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
  assert.deepEqual(equippedLayers({ownedItems:['__proto__'],equipped:{accessories:'__proto__'}}),{backgrounds:'',patterns:'',accessories:'',effects:''});
});

import {chooseSpecies,PERSONALITY_POOLS,appearanceFromAnswers} from '../pet-model.js';
test('all ten species reachable for every answer, with equal-sized preference boosts',()=>{
 for(const preference of Object.keys(PERSONALITY_POOLS)){
  const counts={};for(let i=0;i<14;i++){const id=chooseSpecies(preference,()=> (i+.5)/14);counts[id]=(counts[id]||0)+1;}
  assert.equal(Object.keys(counts).length,10);
  for(const {id} of OPTIONS.species)assert.equal(counts[id],PERSONALITY_POOLS[preference].includes(id)?3:1);
  const a=appearanceFromAnswers({...DEFAULT_APPEARANCE,personality:preference},()=>.5);
  assert.ok(validAppearance(a));assert.equal(a.bodyColor,'cream');assert.equal('personality' in a,false);
 }
});

import {normalizePetName,validPetName} from '../pet-model.js';
test('pet names trim blanks, reject empty/long values and count Unicode code points',()=>{
 assert.equal(normalizePetName('  ぽんた  '),'ぽんた');
 for(const value of ['', '  ', null, {}, 'a'.repeat(13)])assert.equal(validPetName(value),false);
 for(const value of ['ぽんた','Luna','あ'.repeat(12),'🐱'.repeat(12)])assert.equal(validPetName(value),true);
 assert.equal(normalizePetName('A\nB'),'AB');
});

test('multiple accessory slots render together',()=>{
 const shop={ownedItems:['red-ribbon','sunglasses','red-bowtie','star-shirt'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie',body:'star-shirt'}};
 const layers=equippedLayers(shop);assert.ok(layers.accessories.includes('#e55f72'));assert.ok(layers.accessories.includes('#344b58'));assert.ok(layers.accessories.includes('#fff4cf'));
});
