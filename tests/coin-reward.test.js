import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
async function rewards({trackActivity=false}={}){
 let wallet={coins:10,petName:'ふわ',petShop:{ownedItems:['crown']}};
 let clock=Date.now(),activityCalls=0;
 const source=readFileSync(new URL('../coin-reward.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\r?\n/gm,'');
 const user={uid:'tester',getIdToken:async()=>'token'};
 const context=vm.createContext({window:{},console,queueMicrotask,Date:class extends Date{static now(){return clock;}},...(trackActivity?{fetch:async url=>{if(url.endsWith('/api/learning/activity'))activityCalls++;return {ok:true};}}:{}),location:{pathname:'/',href:'https://home.test/'},document:{readyState:'loading',addEventListener(){}},
 initializeApp:()=>({}),getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({currentUser:user}),getFirestore:()=>({}),doc:()=>({}),serverTimestamp:()=>0,
 onAuthStateChanged:(_,fn)=>queueMicrotask(()=>fn(user)),interviewAttemptPatch:()=>({attempted:true}),
 runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(wallet)}),set:(_,patch)=>Object.assign(wallet,patch)})});
 vm.runInContext(source+'\n toast=()=>{};window.signOutForTest=()=>{currentUser=null;};',context);
 return {api:context.window.EnglishPlayroomCoins,wallet:()=>wallet,signOut:context.window.signOutForTest,activityCalls:()=>activityCalls,advance:()=>clock+=2000};
}
test('daily rewards remain per stage, topic and question, without collisions between apps',async()=>{
 const {api,wallet}=await rewards();
 for(const name of ['awardBasic','awardCloze','awardTitle','awardTask','awardPre2A','awardTalk','awardPre2Questions']){
  assert.equal((await api[name]('1')).awarded,true,name);
  assert.equal((await api[name]('1')).awarded,false,name);
  assert.equal((await api[name]('2')).awarded,true,name);
 }
 assert.equal(wallet().coins,24);assert.equal(wallet().petName,'ふわ');assert.deepEqual(wallet().petShop,{ownedItems:['crown']});
});
test('listening sets and ateru rounds have no daily cap but cannot be paid twice',async()=>{
 const {api,wallet}=await rewards();
 for(let i=0;i<12;i++)for(const name of ['awardListening','awardAteru']){
  const id='round-'+i;
  assert.equal((await api[name](id)).awarded,true);
  assert.equal((await api[name](id)).awarded,false);
 }
 assert.equal(wallet().coins,34);
});
test('retry grants one coin for five distinct answered questions and retains the remainder',async()=>{
 const {api,wallet}=await rewards();
 for(let i=0;i<12;i++){const id='q-'+i;const r=await api.recordRetryAttempt(id);assert.equal(r.awarded,(i+1)%5===0);assert.equal((await api.recordRetryAttempt(id)).counted,false);}
 assert.equal(wallet().coins,12);assert.equal(wallet().retryCoinProgress,2);
});
test('signed-out learners cannot earn coins',async()=>{
 const {api,wallet,signOut}=await rewards();await Promise.resolve();signOut();
 for(const name of ['awardListening','awardAteru','awardTalk','awardPre2Questions','awardPre2A'])assert.equal((await api[name]('1')).reason,'signed-out');
 assert.equal(wallet().coins,10);
});
test('learning activity is recorded without another daily coin, but not on login or while signed out',async()=>{
 const f=await rewards({trackActivity:true});await Promise.resolve();assert.equal(f.activityCalls(),0);
 await f.api.awardTask('one');await new Promise(r=>setTimeout(r,0));assert.equal(f.activityCalls(),1);const coins=f.wallet().coins;
 f.advance();await f.api.awardTask('one');await new Promise(r=>setTimeout(r,0));assert.equal(f.activityCalls(),2);assert.equal(f.wallet().coins,coins);
 await f.api.recordLearningActivity();assert.equal(f.activityCalls(),2,'same action cannot create duplicate writes within one second');
 f.advance();f.signOut();await f.api.recordLearningActivity();assert.equal(f.activityCalls(),2);
});
