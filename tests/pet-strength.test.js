import test from 'node:test';
import assert from 'node:assert/strict';
import {titleCount,strengthState,allocatePoint,incomingDamage} from '../pet-strength-model.js';
import {enemyAttack,enemyMaxHp,attackPowerForGrade} from '../pet-adventure/core.js';
test('only unique unlocked titles count, including previously collected titles',()=>{assert.equal(titleCount([{id:'a',unlocked:true},{id:'a',unlocked:true},{id:'b',unlocked:false},{id:'c',unlocked:true}]),2);});
test('every three titles grant one point with small initial stats',()=>{assert.deepEqual(strengthState(2).stats,{hp:10,attack:1,defense:1});assert.equal(strengthState(2).available,0);assert.equal(strengthState(3).available,1);assert.equal(strengthState(8).available,2);});
test('allocations persist and newly earned titles add only new points',()=>{let p=allocatePoint(6,{},'hp');p=allocatePoint(6,p,'attack');assert.deepEqual(strengthState(6,p).stats,{hp:12,attack:2,defense:1});assert.equal(strengthState(6,p).available,0);assert.throws(()=>allocatePoint(6,p,'defense'));assert.equal(strengthState(9,p).available,1);p=allocatePoint(9,p,'defense');assert.equal(strengthState(9,p).stats.defense,2);});
test('invalid allocations cannot exceed earned points',()=>{assert.equal(strengthState(3,{hp:999}).points.hp,1);assert.deepEqual(strengthState(6,{hp:-1,attack:1.2,defense:'bad'}).points,{hp:0,attack:0,defense:0});assert.throws(()=>allocatePoint(3,{},'other'));});
test('defense reduces incoming damage but never below one; opening enemies match small stats',()=>{assert.equal(incomingDamage(3,1),2);assert.equal(incomingDamage(3,2),1);assert.equal(incomingDamage(3,99),1);assert.equal(enemyMaxHp(1,0),6);assert.equal(enemyAttack(1,0),3);assert.equal(attackPowerForGrade('4級')+1,3);});
