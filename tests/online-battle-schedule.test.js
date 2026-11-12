import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduledBattleMode,scheduledBattleEntry} from '../online-battle-schedule.js';

test('JSTの日付が切り替われば単語・問題が入れ替わる（Firebase不要）',()=>{
 const late=Date.parse('2026-11-13T14:59:59Z'); // 13日23:59:59 JST
 const next=Date.parse('2026-11-13T15:00:00Z'); // 14日00:00 JST
 assert.notEqual(scheduledBattleMode(late),scheduledBattleMode(next));
 assert.equal(scheduledBattleEntry(late).path.endsWith('.html'),true);
 assert.notEqual(scheduledBattleEntry(late).path,scheduledBattleEntry(next).path);
});

test('月末の奇数日も必ず翌日切り替わる',()=>{
 const jan31=Date.parse('2027-01-31T03:00:00Z');
 const feb1=Date.parse('2027-02-01T03:00:00Z');
 assert.notEqual(scheduledBattleMode(jan31),scheduledBattleMode(feb1));
});

test('両方のページURLは固定で、日替わりは導線だけ',()=>{
 const modes=new Set([
  scheduledBattleEntry(Date.parse('2026-11-13T03:00:00Z')).path,
  scheduledBattleEntry(Date.parse('2026-11-14T03:00:00Z')).path
 ]);
 assert.deepEqual(modes,new Set([
  'pet-adventure/online-battle.html',
  'pet-adventure/online-battle-questions.html'
 ]));
});
