import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPetSVG,appearanceLabel} from '../pet-art.js';
import {renderCatArt} from '../pet-cat-art.js';
import {DEFAULT_APPEARANCE,OPTIONS,equippedLayers} from '../pet-model.js';

test('cat supports all persisted colors and six eyes in both preview stages without changing data',()=>{
 const variants=new Set();
 for(const stage of ['baby','adult'])for(const color of OPTIONS.bodyColor)for(const eyeStyle of ['round','gentle','watery','smile','sleepy','sparkle']){
  const appearance={...DEFAULT_APPEARANCE,species:'cat',bodyColor:color.id,eyeStyle};
  const before=JSON.stringify(appearance),svg=renderPetSVG(appearance,{},stage);
  assert.match(svg,/data-pet-cat-art="editable"/);
  assert.ok(svg.includes(`data-cat-eye-style="${eyeStyle}"`));
  assert.ok(svg.includes(`fill="${color.color}"`));
  assert.match(svg,/data-pet-eyes="1"/);
  assert.doesNotMatch(svg,/<image|data-pet-redesign|data-eye-slot|__CAT_|__EYE_/);
  assert.equal(JSON.stringify(appearance),before);
  assert.ok(appearanceLabel(appearance).includes(color.label));
  variants.add(svg.replace(/pet-cat-\d+/g,'cat'));
 }
 assert.equal(variants.size,36);
});
test('cat keeps fixed white parts and unique local SVG references across simultaneous previews',()=>{
 const a=renderCatArt('#efb478','round'),b=renderCatArt('#a4cce9','round');
 for(const name of ['cat-muzzle','cat-chest','cat-paws','cat-tail','cat-face-fixed'])assert.ok(a.includes(name));
 assert.equal((a.match(/fill="#fff5dc"/g)||[]).length,5);
 assert.equal((b.match(/fill="#fff5dc"/g)||[]).length,5);
 const ids=s=>[...s.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(ids(a).every(id=>!ids(b).includes(id)));
 for(const s of [a,b])for(const ref of s.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids(s).includes(ref[1]));
});
test('cat preserves equipment, background, effects and animation containers; other animals are unchanged',()=>{
 const shop={ownedItems:['red-ribbon','sunglasses','red-bowtie','forest-bg','star-effect'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie',backgrounds:'forest-bg',effects:'star-effect'}};
 const svg=renderPetSVG({...DEFAULT_APPEARANCE,species:'cat'},shop);
 for(const layer of Object.values(equippedLayers(shop)).filter(Boolean))assert.ok(svg.includes(layer));
 assert.match(svg,/class="pet-jump-layer"/);assert.match(svg,/class="pet-character"/);
 for(const species of ['dog','bird','hamster','panda','penguin'])assert.doesNotMatch(renderPetSVG({...DEFAULT_APPEARANCE,species}),/data-pet-cat-art/);
 assert.doesNotMatch(renderPetSVG(null),/data-pet-cat-art/);
});
