import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPetSVG} from '../pet-art.js';
import {renderSparkleEyes} from '../pet-eye-art.js';
import {DEFAULT_APPEARANCE,OPTIONS} from '../pet-model.js';

test('all selectable animals and legacy saved sparkle eyes use the same shared design',()=>{
 for(const species of ['cat','dog','bird','hamster','panda','penguin'])for(const bodyColor of OPTIONS.bodyColor){
  for(const appearance of [{...DEFAULT_APPEARANCE,species,bodyColor:bodyColor.id,eyeStyle:'sparkle'},{...DEFAULT_APPEARANCE,species,bodyColor:bodyColor.id,eyes:'sparkle'}]){
   const before=JSON.stringify(appearance),svg=renderPetSVG(appearance);
   assert.equal((svg.match(/data-sparkle-eye="soft-star"/g)||[]).length,2,species);
   assert.ok(svg.includes(species==='dog'?renderSparkleEyes(96,144,106):renderSparkleEyes(94,146,114)),species);
   assert.equal(JSON.stringify(appearance),before);
  }
  for(const eyeStyle of ['round','gentle','watery','smile','sleepy'])assert.doesNotMatch(renderPetSVG({...DEFAULT_APPEARANCE,species,eyeStyle}),/data-sparkle-eye/);
 }
});
