import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyAttackInterval,createAttackClock} from '../pet-adventure/realtime.js';

test('enemies get steadily faster with progression and keep a readable lower bound',()=>{
 for(const mode of ['tower','dungeon']){
  let prior=Infinity;
  for(let stage=1;stage<=2000;stage++){
   const interval=enemyAttackInterval(stage,mode);
   assert.ok(interval<=prior);assert.ok(interval>=(mode==='tower'?3000:5000));prior=interval;
  }
  assert.ok(enemyAttackInterval(20,mode)<enemyAttackInterval(1,mode));
 }
 assert.ok(enemyAttackInterval(1,'dungeon')>enemyAttackInterval(1,'tower'));
 assert.equal(enemyAttackInterval(-10),enemyAttackInterval(1));
});
test('enemy attacks repeat on elapsed active time, independently of player actions',()=>{
 const clock=createAttackClock(1000);let hits=0;
 for(let now=0;now<=3500;now+=100)if(clock.tick(now).attack)hits++;
 assert.equal(hits,3);assert.equal(clock.tick(3500).progress,.5);
});
test('pause preserves progress without hidden time or a burst on resume',()=>{
 const clock=createAttackClock(1000);clock.tick(0);clock.tick(250);clock.tick(500);
 assert.equal(clock.tick(100000,true).progress,.5);
 assert.equal(clock.tick(200000).attack,false);
 assert.equal(clock.tick(200250).progress,.75);
 assert.equal(clock.tick(200500).attack,true);
});
test('a stalled frame is capped, and a new enemy starts with a fresh gauge',()=>{
 const clock=createAttackClock(1000);clock.tick(0);
 assert.deepEqual(clock.tick(90000),{delta:250,attack:false,progress:.25});
 clock.reset(500);assert.equal(clock.tick(100000).progress,0);
 assert.equal(clock.tick(100250).attack,false);assert.equal(clock.tick(100500).attack,true);
});
