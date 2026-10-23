import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPetSVG,appearanceLabel} from '../pet-art.js';
import {DEFAULT_APPEARANCE,OPTIONS,equippedLayers} from '../pet-model.js';

test('dog supports every saved body color and six distinct eye styles without mutating saved data',()=>{
 const variants=new Set();
 for(const stage of ['baby','adult'])for(const color of OPTIONS.bodyColor)for(const eyeStyle of ['round','gentle','watery','smile','sleepy','sparkle']){
  const appearance={...DEFAULT_APPEARANCE,species:'dog',bodyColor:color.id,eyeStyle};
  const before=JSON.stringify(appearance),svg=renderPetSVG(appearance,{},stage);
  assert.match(svg,/data-pet-dog-art="editable"/);
  assert.ok(svg.includes(`data-dog-eye-style="${eyeStyle}"`));
  assert.ok(svg.includes(`fill="${color.color}"`));
  assert.doesNotMatch(svg,/<image|data-pet-redesign|data-eye-slot/);
  assert.equal(JSON.stringify(appearance),before);
  assert.doesNotMatch(appearanceLabel(appearance),/固定/);
  variants.add(svg);
 }
 assert.equal(variants.size,OPTIONS.bodyColor.length*6);
});
test('dog keeps shop layers and animation wrappers; other species and mystery retain their own art',()=>{
 const shop={ownedItems:['red-ribbon','sunglasses','red-bowtie'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie'}};
 const svg=renderPetSVG({...DEFAULT_APPEARANCE,species:'dog'},shop,'baby');
 assert.ok(svg.includes(equippedLayers(shop,'dog').accessories));
 assert.match(svg,/class="pet-jump-layer"/);assert.match(svg,/class="pet-character"/);
 for(const species of ['cat','bird','hamster','panda','penguin']){
  const other=renderPetSVG({...DEFAULT_APPEARANCE,species});
  assert.doesNotMatch(other,/data-pet-dog-art/);assert.match(other,/data-pet-eyes/);
 }
 assert.doesNotMatch(renderPetSVG(null),/data-pet-dog-art/);
});
