import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {interviewAttemptPatch} from '../dashboard-extra.js';

const today='2026-10-18';

test('interview attempts merge legacy claims with current ids and reject invalid questions',()=>{
  const data={coinRewardClaims:['eiken-pre2-interview-a:theme-1','eiken-pre2-interview-a:theme-1','eiken-pre2-interview-a:theme-20','other:theme-2','eiken-pre2-interview-a:theme-21'],
    pre2InterviewA:{attemptedIds:['2','2','bad']}};
  assert.deepEqual(interviewAttemptPatch(data,2,today),{attemptedIds:['1','2','20'],lastPlayedDate:today});
  assert.throws(()=>interviewAttemptPatch({},21,today),/問題番号が不正/);
});

test('interview tracking is saved in the existing reward transaction without duplicate coins',async()=>{
  let wallet={coins:5,coinRewardDate:today,coinRewardClaims:['eiken-pre2-interview-a:theme-1']};
  const source=readFileSync(new URL('../coin-reward.js',import.meta.url),'utf8')
    .replace(/^import .*;\r?\n/gm,'').replace(/export \{[^}]+\};/,'')
    .replace(/function todayKey\(\)\{[\s\S]*?\n\}/,'function todayKey(){return "2026-10-18";}');
  const toast={classList:{add(){},remove(){}}};
  const context={interviewAttemptPatch,console,Date,Promise,Number,String,Math,setTimeout:()=>0,clearTimeout(){},window:{},location:{pathname:'/',href:'https://home.test/'},
    enableAppCheck:()=>null,getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({currentUser:{uid:'tester'}}),getFirestore:()=>({}),onAuthStateChanged:(app,fn)=>queueMicrotask(()=>fn(app.currentUser)),doc:()=>({}),serverTimestamp:()=>0,
    document:{readyState:'loading',addEventListener(){},getElementById:()=>toast},
    runTransaction:async(db,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(wallet)}),set:(ref,patch)=>{wallet={...wallet,...patch};}})};
  vm.createContext(context);vm.runInContext(source,context);
  await context.window.EnglishPlayroomCoins.awardPre2A(1);
  assert.equal(wallet.coins,5);assert.equal(wallet.pre2InterviewA.attemptedIds.join(','),'1');
  await context.window.EnglishPlayroomCoins.awardPre2A(2);
  assert.equal(wallet.coins,6);assert.equal(wallet.pre2InterviewA.attemptedIds.join(','),'1,2');
  await context.window.EnglishPlayroomCoins.awardPre2A(2);
  assert.equal(wallet.coins,6);
});
