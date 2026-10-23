import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {renderDogArt} from '../pet-dog-art.js';
import {renderCatArt} from '../pet-cat-art.js';
import {renderCompanionEyes} from '../pet-companion-eyes.js';
const originalDogHashes={"round":"c4167749dc89b86d5f35f012b3f1880caa1b3724ce9ae145a6d48638afbb1c2d","gentle":"e76898e7c2154b02e5936ede1b722dde050cce976ced3d27423ffa2c8aa2972d","watery":"7f97b06eefe62d31ba5d1d056699069c8b7a966f19b66d5b3be6ed76f9e57e74","smile":"2559900b566f9a51e80393c499f320cf05ee2c9515405c9707c7680a525d02c1","sleepy":"6d693459df377a540d0da792088daca71a2e962e3e0e61079c5c608db44a89fa","sparkle":"4104ab0236bc50b323fd13aa64aa8d65bec0a7b7e28bca9f36314006f49011a6"};
test('all six dog designs preserve approved paths and eyes inside the aligned head',()=>{
 for(const [style,hash] of Object.entries(originalDogHashes))assert.equal(createHash('sha256').update(renderDogArt('#efb478',style).replace(' transform="translate(16.8 30.38) scale(.86)"','')).digest('hex'),hash,style);
});
test('cat and dog use identical eye markup for every style',()=>{
 for(const style of Object.keys(originalDogHashes)){
  const eyes=renderCompanionEyes(style);
  assert.ok(renderDogArt('#efb478',style).includes(eyes),style+' dog');
  assert.ok(renderCatArt('#efb478',style).includes(eyes),style+' cat');
 }
});

test('whole companion artwork retains its original head-to-body proportions',()=>{
 const cat=renderCatArt('#efb478','round'),dog=renderDogArt('#efb478','round');
 assert.match(cat,/transform="translate\(51.2 57.04\) scale\(.5418\)"/);
 assert.match(dog,/transform="translate\(16.8 30.38\) scale\(.86\)"/);
 for(const art of [cat,dog])assert.doesNotMatch(art,/data-pet-head-aligned/);
});
