import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIONS,DEFAULT_APPEARANCE,validAppearance,normalizeAppearance,hasPet} from '../pet-model.js';
import {renderPetSVG,appearanceLabel} from '../pet-art.js';
test('all six novel designs render all six colors and ten shared eyes with equipped layers',()=>{
  for(const species of ['tree','cake','dragon','cactus','onigiri','robot'])for(const {id:bodyColor,color} of OPTIONS.bodyColor)for(const eyeStyle of ['round','gentle','watery','smile','sleepy','sparkle','oyoyo','mugyu','kiri','punsuka']){
    const a={...DEFAULT_APPEARANCE,species,bodyColor,eyeStyle};
    assert.ok(validAppearance(a));assert.equal(normalizeAppearance(a).species,species);assert.ok(hasPet({petHatched:true,petAppearance:a}));
    const svg=renderPetSVG(a,{ownedItems:['red-ribbon','sunglasses','red-bowtie','frame-sakura'],equipped:{head:'red-ribbon',face:'sunglasses',neck:'red-bowtie','pet-frame':'frame-sakura'}},'',{background:false});
    assert.ok(svg.includes('data-pet-species="'+species+'"'));assert.ok(svg.includes('data-pet-novel-art="'+species+'"'));assert.ok(svg.includes('data-pet-eye-style="'+eyeStyle+'"'));assert.ok(svg.includes(color));assert.ok(svg.includes('data-pet-shop-slot="head"'));assert.ok(svg.includes('data-pet-shop-slot="face"'));assert.ok(svg.includes('data-pet-shop-slot="neck"'));assert.ok(!/undefined|NaN/.test(svg));assert.ok(!svg.includes('width="240" height="240" rx="32"'));assert.ok(appearanceLabel(a).startsWith(({tree:'き',cake:'ケーキ',dragon:'ドラゴン',cactus:'サボテン',onigiri:'おにぎり',robot:'ロボット'})[species]+'・'));
  }
});
