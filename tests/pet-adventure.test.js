import test from 'node:test';
import assert from 'node:assert/strict';
import {elementMultiplier,towerLevelIndex,towerCardLevelIndexes,dungeonGradesForStage,dungeonAttackLayout,isBoss,enemyMaxHp,attackPowerForGrade,calculateDamage,checkpointForBest,unlockedStartFloors} from '../pet-adventure/core.js';

test('element weakness is one-way and doubles damage',()=>{
  assert.equal(elementMultiplier('water','fire'),2);
  assert.equal(elementMultiplier('fire','leaf'),2);
  assert.equal(elementMultiplier('leaf','water'),2);
  assert.equal(elementMultiplier('fire','water'),1);
  assert.equal(elementMultiplier('lightning','fire'),1);
});

test('tower difficulty rises every ten floors',()=>{
  assert.equal(towerLevelIndex(1),0);
  assert.equal(towerLevelIndex(10),0);
  assert.equal(towerLevelIndex(11),1);
  assert.equal(towerLevelIndex(41),4);
  assert.deepEqual(towerCardLevelIndexes(1),[0,0,0,1]);
});

test('dungeon grade counts and critical grade match every progression boundary',()=>{
 const bands=[
  [1,5,['4級','4級','4級','3級'],'3級'],
  [6,10,['4級','4級','3級','3級'],'3級'],
  [11,15,['3級','3級','3級','準2級'],'準2級'],
  [16,20,['3級','3級','準2級','準2級'],'準2級'],
  [21,25,['準2級','準2級','準2級','2級'],'2級'],
  [26,30,['準2級','準2級','2級','2級'],'2級'],
  [31,35,['2級','2級','2級','準1級'],'準1級'],
  [36,40,['2級','2級','準1級','準1級'],'準1級'],
  [41,100,['準1級','準1級','準1級','準1級'],'準1級']
 ];
 for(const [start,end,grades,criticalGrade] of bands)for(const stage of [start,end]){
  assert.deepEqual(dungeonGradesForStage(stage),grades);
  for(const enemy of ['fire','water','leaf'])for(const roll of [0,.5,.999]){
   const layout=dungeonAttackLayout(stage,enemy,()=>roll);
   assert.deepEqual(layout.map(c=>c.grade),grades);
   assert.equal(new Set(layout.map(c=>c.element)).size,4);
   const critical=layout.filter(c=>elementMultiplier(c.element,enemy)>1);
   assert.equal(critical.length,1);assert.equal(critical[0].grade,criticalGrade);
  }
 }
});

test('every fifth stage makes the single enemy a boss',()=>{
  assert.equal(isBoss(5,0),true);
  assert.equal(isBoss(5,1),false);
  assert.equal(isBoss(4,0),false);
  assert.ok(enemyMaxHp(5,0)>enemyMaxHp(4,0));
});

test('harder EIKEN grades reward greater attack power',()=>{
  assert.ok(attackPowerForGrade('準1級')>attackPowerForGrade('準2級'));
  assert.equal(calculateDamage(20,2),40);
});

test('checkpoints begin at the last five-floor block',()=>{
  assert.equal(checkpointForBest(1),1);
  assert.equal(checkpointForBest(10),10);
  assert.equal(checkpointForBest(11),10);
  assert.equal(checkpointForBest(37),35);
});

test('all reached five-floor starting points are available, never future floors',()=>{
 for(const [best,expected] of [[1,[1]],[4,[1]],[5,[1,5]],[9,[1,5]],[10,[1,5,10]],[14,[1,5,10]],[15,[1,5,10,15]],[20,[1,5,10,15,20]],[37,[1,5,10,15,20,25,30,35]],[NaN,[1]],[Infinity,[1]]])assert.deepEqual(unlockedStartFloors(best),expected);
});
