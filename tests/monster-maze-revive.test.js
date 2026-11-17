import test from 'node:test';
import assert from 'node:assert/strict';
import {unlockedMagic} from '../pet-dungeons-model.js';
import {revivalSpells,mazeSpells,reviveAlly,fallenAllies,selectedFallenAlly,playTurn} from '../monster-maze/model.js';
const meinon=revivalSpells.find(spell=>spell.id==='meinon');
const meinoora=revivalSpells.find(spell=>spell.id==='meinoora');
function makeRun(){
  const a={key:'1-0',name:'倒れた仲間A',hp:0,maxHp:100,ct:1,role:0};
  const b={key:'7-0',name:'倒れた仲間B',hp:0,maxHp:200,ct:1,role:1};
  return {caster:{name:'ぺっと',hp:80,maxHp:80,mp:50,maxMp:50,level:45,attack:10},
    team:[a,b],foes:[{name:'敵',hp:0,maxHp:40}],selectedSpell:'meinon',
    reviveTarget:b.key,guard:null,turns:0,correct:0};
}
function sequence(...values){let i=0;return ()=>values[i++]??0;}
test('revival levels, MP and quest-only inclusion',()=>{
  assert.equal(meinon.level,30);assert.equal(meinon.mpCost,8);assert.equal(meinon.successRate,0.5);
  assert.equal(meinoora.level,45);assert.equal(meinoora.mpCost,20);assert.equal(meinoora.successRate,1);
  assert.ok(!unlockedMagic(45).includes(meinon));
  assert.ok(mazeSpells.includes(meinon));assert.ok(mazeSpells.includes(meinoora));
});
test('Meinon spends MP on failure and rolls 25%-35% HP',()=>{
  const run=makeRun();
  assert.deepEqual(fallenAllies(run),run.team);
  assert.equal(selectedFallenAlly(run),run.team[1]);
  const fail=reviveAlly(run,meinon,run.team[0],sequence(0.6));
  assert.equal(fail.success,false);assert.equal(run.team[0].hp,0);assert.equal(run.caster.mp,42);
  const succeed=reviveAlly(run,meinon,run.team[0],sequence(0.3,0));
  assert.equal(succeed.amount,25);assert.equal(run.caster.mp,34);
  const second=reviveAlly(run,meinon,run.team[1],sequence(0.1,0.999));
  assert.equal(second.amount,70);
});
test('Meinoora always succeeds at 65%-80% HP and blocks invalid casts',()=>{
  const run=makeRun();
  assert.equal(reviveAlly(run,meinoora,run.team[1],sequence(0.999,0)).amount,130);
  assert.equal(run.caster.mp,30);
  assert.equal(reviveAlly(run,meinoora,run.team[0],sequence(0.999,0.999)).amount,80);
  assert.equal(reviveAlly(run,meinoora,run.team[0]),null);
  run.caster.mp=0;run.team[0].hp=0;
  assert.equal(reviveAlly(run,meinoora,run.team[0]),null);
});
test('Battle revival requires a correct answer and selects the requested ally',()=>{
  const run=makeRun(),events=[];
  assert.equal(playTurn(run,false,'revive',0,null,sequence(0),event=>events.push(event)),'won');
  assert.equal(run.team[1].hp,0);assert.equal(run.caster.mp,50);
  const next=makeRun(),successEvents=[];
  assert.equal(playTurn(next,true,'revive',0,null,sequence(0.4,0.999),event=>successEvents.push(event)),'won');
  assert.equal(next.team[0].hp,0);assert.equal(next.team[1].hp,70);
  assert.equal(next.caster.mp,42);
  assert.equal(successEvents[0].kind,'revive');
});
