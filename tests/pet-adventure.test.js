import test from 'node:test';
import assert from 'node:assert/strict';
import {elementMultiplier,towerLevelIndex,towerCardLevelIndexes,dungeonGradesForStage,isBoss,enemyMaxHp,attackPowerForGrade,calculateDamage,checkpointForBest} from '../pet-adventure/core.js';

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

test('dungeon replaces the easiest grade with pre-1 deeper down',()=>{
  assert.deepEqual(dungeonGradesForStage(1),['4級','3級','準2級','2級']);
  assert.deepEqual(dungeonGradesForStage(16),['3級','準2級','2級','準1級']);
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

test('checkpoints begin at the last ten-floor block',()=>{
  assert.equal(checkpointForBest(1),1);
  assert.equal(checkpointForBest(10),10);
  assert.equal(checkpointForBest(11),10);
  assert.equal(checkpointForBest(37),30);
});
