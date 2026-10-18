import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const art=fs.readFileSync(new URL('../pet-art.js',import.meta.url),'utf8');
const fn=art.slice(art.indexOf('export function renderPetVisual')).replace('export function','function');
const freshWalk={animationName:'petWaddle',currentTime:0};
const freshShadow={animationName:'petShadowWalk',currentTime:0};
const oldWalk={animationName:'petWaddle',currentTime:4800};
const oldShadow={animationName:'petShadowWalk',currentTime:4800};
let replaced=0,current={dataset:{}};
const node=(animations,character)=>({getAnimations:()=>animations,classList:{contains:()=>character}});
const visual={
 querySelector(selector){return selector===':scope > svg'?current:selector==='.pet-character'?node([freshWalk],true):node([freshShadow],false);},
 querySelectorAll(){return [node([oldWalk],true),node([oldShadow],false)];},
 set innerHTML(value){replaced++;current={dataset:{}};}
};
const context={renderPetSVG:()=>'<svg/>',JSON};vm.createContext(context);vm.runInContext(fn,context);
const data={petAdult:true,petAppearance:{species:'cat'},petShop:{}};
assert.equal(context.renderPetVisual(visual,data),true);
assert.equal(freshWalk.currentTime,4800);assert.equal(freshShadow.currentTime,4800);
assert.equal(context.renderPetVisual(visual,{...data,petWaste:{count:0,day:100}}),false);
assert.equal(replaced,1);
assert.equal(context.renderPetVisual(visual,{...data,petAppearance:{species:'dog'}}),true);
assert.equal(freshWalk.currentTime,4800);
console.log('Walk phase retained across redraw; cleaning-only changes keep SVG identity');
