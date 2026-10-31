import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {majorBossForStage} from '../pet-adventure/royal-guard.js';
import {chooseMinibossAction,minibossForStage} from '../pet-adventure/miniboss.js';
import {isBoss} from '../pet-adventure/core.js';
const state=(phase=1)=>({boss:majorBossForStage(50,'tower',phase),hp:45,maxHp:96,mp:phase===1?500:1000,playerHp:100,lastAction:'spell'});
test('both modes place magma at 30F, an ordinary boss at 45F, mage at 50F, and keep 90F guard',()=>{
 for(const mode of ['tower','dungeon']){
  assert.equal(minibossForStage(30,mode).id,'magmander');assert.equal(minibossForStage(45,mode),null);assert.equal(majorBossForStage(45,mode),null);assert.equal(isBoss(45),true);
  for(const [phase,mp] of [[1,500],[2,1000]]){const b=majorBossForStage(50,mode,phase);assert.equal(b.name,'闇の魔術師');assert.equal(b.maxMp,mp);assert.equal(b.mage,true);assert.equal(b.attackInterval,phase===1?2000:1500);assert.match(fs.readFileSync(new URL(`../pet-adventure/bosses/${b.image}`,import.meta.url),'utf8'),/<svg/);}
  assert.equal(majorBossForStage(90,mode).name,'魔王親衛隊');assert.equal(majorBossForStage(90,mode).maxMp,50);
 }
});
test('first form repeatedly heals even after casting; normal attacks sometimes interrupt, no attack magic',()=>{
 const s=state();assert.equal(chooseMinibossAction(s,()=>.1).id,'mimuros');assert.equal(chooseMinibossAction(s,()=>.95),null);
 assert.equal(chooseMinibossAction({...s,hp:96},()=>.1),null);assert.equal(chooseMinibossAction({...s,mp:4},()=>.1),null);
 for(let i=0;i<100;i++){const a=chooseMinibossAction(s,()=>.1);assert.equal(a.id,'mimuros');s.mp-=a.mpCost;assert.ok(s.mp>=0);}assert.equal(s.mp,0);
});
test('second form uses only Mimurose and Mirogoro, respects their costs, and waits when empty',()=>{
 const s=state(2);assert.equal(chooseMinibossAction(s,()=>.99).id,'mimurose');assert.equal(chooseMinibossAction({...s,hp:96},()=>0).id,'mirogoro');
 for(let i=0;i<100;i++){const a=chooseMinibossAction(s);assert.ok(['mimurose','mirogoro'].includes(a.id));s.mp-=a.mpCost;assert.ok(s.mp>=0);}assert.equal(s.mp,0);assert.equal(chooseMinibossAction(s).kind,'wait');
 assert.equal(chooseMinibossAction({...s,mp:5}).id,'mirogoro');assert.equal(chooseMinibossAction({...s,mp:4}).kind,'wait');
});

