import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIAGNOSTIC_REWARD_COINS,japanTodayKey,diagnosticCoinFields} from '../level-diagnostic/reward-model.js';

test('each new completed attempt earns three coins in both balance and daily earnings',()=>{
  assert.equal(DIAGNOSTIC_REWARD_COINS,3);
  assert.deepEqual(diagnosticCoinFields({coins:11,coinEarnedDate:'2026-11-17',coinsEarnedToday:4},'2026-11-17'),{
    coins:14,coinEarnedDate:'2026-11-17',coinsEarnedToday:7,coinSchemaVersion:1
  });
});
test('a new calendar day starts daily earnings from zero',()=>{
  assert.deepEqual(diagnosticCoinFields({coins:11,coinEarnedDate:'2026-11-16',coinsEarnedToday:200},'2026-11-17'),{
    coins:14,coinEarnedDate:'2026-11-17',coinsEarnedToday:3,coinSchemaVersion:1
  });
  assert.equal(japanTodayKey(new Date('2026-11-16T16:00:00.000Z')),'2026-11-17');
});
test('attempt receipt is checked before coins and history are saved atomically',()=>{
  const app=readFileSync(new URL('../level-diagnostic/app.js',import.meta.url),'utf8');
  const page=readFileSync(new URL('../level-diagnostic/index.html',import.meta.url),'utf8');
  assert.match(app,/runTransaction\(db,async tx=>/);
  assert.match(app,/const existing=await tx\.get\(historyDocument\)/);
  assert.match(app,/if\(existing\.exists\(\)\)/);
  assert.match(app,/tx\.set\(historyDocument,/);
  assert.match(app,/tx\.set\(wallet,/);
  assert.match(app,/rewardCoins:DIAGNOSTIC_REWARD_COINS/);
  assert.match(app,/diagnosticCoinFields\(data,japanTodayKey\(\)\)/);
  assert.match(app,/if\(!session\|\|session\.finished\|\|pendingSave\)return/);
  assert.match(page,/最後まで完了すると3コイン/);
});
