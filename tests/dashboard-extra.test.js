import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {extraDashboard,interviewAttemptPatch} from '../dashboard-extra.js';
import {readDashboardCache,writeDashboardCache} from '../dashboard-cache.js';
const today='2026-10-18',stamp=new Date(2026,9,18,14).getTime();
test('existing WORD BREAKER records and legacy interview claims appear without new play',()=>{
 const data={wordBreakerBests:{junior1:{score:28,combo:12},high1:{score:17,combo:15},fake:{score:999}},wordBreakerRuns:{one:{course:'junior1',opened:stamp}},coinRewardDate:today,coinRewardClaims:['eiken-pre2-interview-a:theme-1','eiken-pre2-interview-a:theme-1','eiken-pre2-interview-a:theme-20','other:theme-2','eiken-pre2-interview-a:theme-21']};
 assert.deepEqual(extraDashboard(data,today),{word:{score:28,combo:15,courses:2,today:true},interview:{attempted:2,today:true}});
 const patch=interviewAttemptPatch(data,2,today);
 assert.deepEqual(patch.attemptedIds,['1','2','20']);
 assert.deepEqual(interviewAttemptPatch({...data,pre2InterviewA:patch},2,today),patch);
 assert.equal(extraDashboard({...data,pre2InterviewA:patch},'2026-10-19').interview.attempted,3);
 assert.equal(extraDashboard({...data,pre2InterviewA:patch},'2026-10-19').interview.today,false);
});
test('empty, malformed and cross-midnight progress',()=>{
 assert.equal(extraDashboard({},today).word.score,0);
 assert.equal(extraDashboard({},today).interview.attempted,0);
 assert.equal(extraDashboard({wordBreakerLastPlayedDate:today},today).word.today,true);
 assert.equal(extraDashboard({wordBreakerBests:{basic:{score:Infinity}}},today).word.score,0);
 assert.throws(()=>interviewAttemptPatch({},21,today));
});
test('dashboard reads shared wallet once, displays eight subjects, and clears on logout',async()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.equal((html.match(/class="stat"><div class="stat-name">/g)||[]).length,8);
 assert.equal((html.match(/class="today-pill"/g)||[]).length,8);
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]),els={};
 for(const id of ids)els[id]={textContent:'',classList:{toggle(name,value){this[name]=value;},contains(name){return !!this[name];}},addEventListener(){}};
 const data={'english-playroom':{wordBreakerBests:{basic:{score:30,combo:25}},wordBreakerLastPlayedDate:today,pre2InterviewA:{attemptedIds:['1','2'],lastPlayedDate:today}}};
 const reads=[],context={...els,extraDashboard,readDashboardCache,writeDashboardCache,petDataUid:null,petData:{},Date,Number,Object,Array,console,localDateKey:()=>today,db:{},dashboardUser:{uid:'tester'},
  doc:(db,...parts)=>parts.join('/'),getDoc:async path=>{reads.push(path);return {exists:()=>true,data:()=>data[path.split('/').at(-1)]||{}};},window:{addEventListener(){}},document:{addEventListener(){}}};
 vm.createContext(context);
 const source=html.slice(html.indexOf('function dateKeyFromMs'),html.indexOf('loginBtn.addEventListener("click"'));
 vm.runInContext(source,context);await context.refreshDashboard();
 assert.equal(reads.length,7);assert.equal(els.wordBreakerStat.textContent,'30 SCORE');assert.match(els.wordBreakerSub.textContent,/最高COMBO 25/);
 assert.equal(els.interviewStat.textContent,'2 / 20');assert.match(els.dashNote.textContent,/2 \/ 8/);
 context.dashboardUser=null;await context.refreshDashboard();
 assert.equal(els.wordBreakerStat.textContent,'— SCORE');assert.equal(els.interviewStat.textContent,'— / 20');
 assert.equal(els.todayInterview.classList.done,false);
});
test('interview tracking is saved in the existing reward transaction without duplicate coins',async()=>{
 let wallet={coins:5,coinRewardDate:today,coinRewardClaims:['eiken-pre2-interview-a:theme-1']};
 const source=fs.readFileSync(new URL('../coin-reward.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export \{[^}]+\};/,'').replace(/function todayKey\(\)\{[\s\S]*?\n\}/,'function todayKey(){return "2026-10-18";}');
 const toast={classList:{add(){},remove(){}}};
 const context={interviewAttemptPatch,console,Date,Promise,Number,String,Math,setTimeout:()=>0,clearTimeout(){},window:{},
  getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({currentUser:{uid:'tester'}}),getFirestore:()=>({}),onAuthStateChanged:(a,fn)=>queueMicrotask(()=>fn(a.currentUser)),doc:()=>({}),serverTimestamp:()=>0,
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
