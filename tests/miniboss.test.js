import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {minibossForStage,chooseMinibossAction} from '../pet-adventure/miniboss.js';
const state=(floor=15)=>({boss:minibossForStage(floor),hp:35,maxHp:35,mp:10,playerHp:50,lastAction:null});
test('five dungeon minibosses have ascending MP and SVG assets',()=>{
 for(const [i,floor] of [15,30,45,60,75].entries()){
  const b=minibossForStage(floor);assert.equal(b.maxMp,10+i*5);
  assert.equal(minibossForStage(floor,'tower'),null);
  assert.match(fs.readFileSync(new URL(`../pet-adventure/bosses/${b.id}.svg`,import.meta.url),'utf8'),/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
 }
 for(const floor of [1,5,10,20,80,90])assert.equal(minibossForStage(floor),null);
});
test('AI heals when wounded, attacks opportunistically, and respects MP and cooldown',()=>{
 assert.equal(chooseMinibossAction({...state(),hp:17},()=>0).id,'mimuros');
 assert.equal(chooseMinibossAction(state(),()=>0).id,'mirogoro');
 assert.equal(chooseMinibossAction(state(),()=>.9),null);
 assert.equal(chooseMinibossAction({...state(),playerHp:13},()=>.9).id,'mirogoro');
 for(const mp of [0,4])assert.equal(chooseMinibossAction({...state(),hp:10,mp},()=>0),null);
 assert.equal(chooseMinibossAction({...state(),hp:10,lastAction:'spell'},()=>0),null);
 assert.equal(chooseMinibossAction({...state(),boss:null},()=>0),null);
 assert.equal(chooseMinibossAction({...state(),hp:0},()=>0),null);
});
test('a long battle cannot spend more than its initial MP or heal forever',()=>{
 for(const floor of [15,30,45,60,75]){
  const s={...state(floor),hp:10,maxHp:100,mp:minibossForStage(floor).maxMp};let casts=0;
  for(let i=0;i<100;i++){const action=chooseMinibossAction(s,()=>0);s.lastAction=action?'spell':'attack';if(action){s.mp-=action.mpCost;casts++;}assert.ok(s.mp>=0);}
  assert.equal(casts,s.boss.maxMp/5);assert.equal(s.mp,0);
 }
});

