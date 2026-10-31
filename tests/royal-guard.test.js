import test from 'node:test';
import assert from 'node:assert/strict';
import {royalGuardForStage,royalGuardHp,adminAdventureBest} from '../pet-adventure/royal-guard.js';
import {minibossForStage,chooseMinibossAction} from '../pet-adventure/miniboss.js';
import fs from 'node:fs';
test('90th floor in both modes uses the approved black-crown forms with more MP than 75F',()=>{
 for(const mode of ['tower','dungeon'])for(const phase of [1,2]){
 const b=royalGuardForStage(90,mode,phase);assert.equal(b.phase,phase);assert.equal(b.royal,true);assert.ok(b.maxMp>minibossForStage(75,mode).maxMp);
 assert.match(fs.readFileSync(new URL(`../pet-adventure/bosses/${b.image}`,import.meta.url),'utf8'),/<svg/);
 }
 for(const floor of [75,85,91,100])assert.equal(royalGuardForStage(floor,'tower'),null);
 assert.ok(royalGuardHp(166,2)>royalGuardHp(166,1));
});
test('guard selects advanced magic, falls back to cheap magic, and never exceeds MP',()=>{
 const state={boss:royalGuardForStage(90,'tower'),hp:60,maxHp:166,mp:50,playerHp:100,lastAction:null};
 assert.equal(chooseMinibossAction(state,()=>0).id,'mimurose');
 assert.equal(chooseMinibossAction({...state,hp:166},()=>0).id,'mirogoron');
 assert.equal(chooseMinibossAction({...state,mp:5},()=>0).id,'mimuros');
 assert.equal(chooseMinibossAction({...state,hp:166,mp:5},()=>0).id,'mirogoro');
 assert.equal(chooseMinibossAction({...state,mp:4},()=>0),null);
 assert.equal(chooseMinibossAction({...state,lastAction:'spell'},()=>0),null);
});
test('admin-only 90F access preserves higher existing records and normal player progress',()=>{
 assert.equal(adminAdventureBest(32,true),90);assert.equal(adminAdventureBest(120,true),120);assert.equal(adminAdventureBest(32,false),32);assert.equal(adminAdventureBest(1,false),1);
});

