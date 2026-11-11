import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
async function rewards({trackActivity=false,trackTypingDefense=false}={}){
 let wallet={coins:10,petName:'ふわ',petShop:{ownedItems:['crown']}};
 let clock=Date.now(),activityCalls=0;const defenseEvents=[],rewardReceipts=new Map();
 const source=readFileSync(new URL('../coin-reward.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\r?\n/gm,'');
 const user={uid:'tester',getIdToken:async()=>'token'};
 const context=vm.createContext({window:{addEventListener(){}},announceTitles(){},console,queueMicrotask,Date:class extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}},...(trackActivity||trackTypingDefense?{fetch:async (url,options={})=>{
  if(url.endsWith('/api/learning/activity')){
   if(trackTypingDefense){
    const body=JSON.parse(options.body),duplicate=defenseEvents.some(x=>x.batchId===body.batchId);
    defenseEvents.push(body);
    return {ok:true,json:async()=>({ok:true,duplicate,freshTitles:[]})};
   }
   activityCalls++;
  }
  return {ok:true,json:async()=>({freshTitles:[]})};
 }}:{}),location:{pathname:'/',href:'https://home.test/'},document:{readyState:'loading',addEventListener(){}},
 installStandaloneMaterialRanking:()=>{},enableAppCheck:()=>null,initializeApp:()=>({}),getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({currentUser:user}),getFirestore:()=>({}),doc:(_db,...path)=>({path:path.join('/')}),serverTimestamp:()=>0,
 onAuthStateChanged:(_,fn)=>queueMicrotask(()=>fn(user)),interviewAttemptPatch:()=>({attempted:true}),
 runTransaction:async(_,fn)=>fn({get:async ref=>ref.path.includes('/typingDefenseRewards/')?({exists:()=>rewardReceipts.has(ref.path),data:()=>structuredClone(rewardReceipts.get(ref.path))}):({exists:()=>true,data:()=>structuredClone(wallet)}),set:(ref,patch)=>{if(ref.path.includes('/typingDefenseRewards/'))rewardReceipts.set(ref.path,patch);else Object.assign(wallet,patch);}})});
 vm.runInContext(source+'\n toast=()=>{};window.signOutForTest=()=>{currentUser=null;};',context);
 return {api:context.window.EnglishPlayroomCoins,wallet:()=>wallet,signOut:context.window.signOutForTest,activityCalls:()=>activityCalls,defenseEvents:()=>defenseEvents,advance:()=>clock+=2000,nextDay:()=>clock+=86400000,pendingRetries:()=>vm.runInContext("readRetryOutbox(RETRY_OUTBOX_PREFIX+'tester').length",context)};
}
test('daily rewards remain per stage, topic and question, without collisions between apps',async()=>{
 const {api,wallet}=await rewards();
 for(const name of ['awardBasic','awardCloze','awardTitle','awardTask','awardPre2A','awardTalk','awardPre2Questions','awardReading']){
    const call=(id)=>['awardCloze','awardTitle','awardReading'].includes(name)?api[name](id,true):api[name](id);
  assert.equal((await call('1')).awarded,true,name);
  assert.equal((await call('1')).awarded,false,name);
  assert.equal((await call('2')).awarded,true,name);
 }
 assert.equal(wallet().coins,26);assert.equal(wallet().petName,'ふわ');assert.deepEqual(wallet().petShop,{ownedItems:['crown']});
});
test('reading coins require a perfect first attempt and do not pay after a wrong first try',async()=>{
 const {api,wallet,nextDay}=await rewards();
 assert.equal((await api.awardCloze('bad',false)).awarded,false);
 assert.equal((await api.awardCloze('bad',true)).awarded,false,'a correct retry does not pay');
 assert.equal((await api.awardTitle('good',true)).awarded,true);
 assert.equal((await api.awardTitle('good',false)).awarded,false);
 assert.equal((await api.awardReading('exercise',false)).awarded,false);
 assert.equal((await api.awardReading('exercise',true)).awarded,false,'exercise and summary share the first attempt');
 assert.equal((await api.awardReading('another',true)).awarded,true);
 assert.equal((await api.awardReading('missing')).reason,'invalid-attempt');
 assert.equal(wallet().coins,12);
 assert.equal(wallet().readingFirstAttempts.length,4);
 assert.equal(wallet().coinsEarnedToday,2);
 nextDay();
 assert.equal((await api.awardCloze('bad',true)).awarded,true);
 assert.equal((await api.awardTitle('good',false)).awarded,false);
 assert.equal((await api.awardTitle('good',true)).awarded,false);
 assert.equal(wallet().coins,13);
 assert.equal(wallet().readingFirstAttempts.length,2);
 assert.equal(wallet().coinsEarnedToday,1);
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
 const {api,wallet,pendingRetries}=await rewards();
 for(let i=0;i<12;i++){const id='q-'+i;const r=await api.recordRetryAttempt(id);assert.equal(r.awarded,(i+1)%5===0);assert.equal((await api.recordRetryAttempt(id)).counted,false);}
 assert.equal(wallet().coins,12);assert.equal(wallet().retryCoinProgress,0);assert.equal(pendingRetries(),2,'the last two attempts stay queued until the next batch');
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
 await f.api.recordLearningActivity('task-quest');assert.equal(f.activityCalls(),2,'same action cannot create duplicate writes within one second');
 f.advance();f.signOut();await f.api.recordLearningActivity();assert.equal(f.activityCalls(),2);
});
test('retry activity and rewards are processed as five-question batches',async()=>{
 const f=await rewards({trackActivity:true});
 for(let i=1;i<=4;i++){await f.api.recordRetryAttempt('q'+i);await new Promise(r=>setTimeout(r,0));assert.equal(f.activityCalls(),0);assert.equal(f.wallet().coins,10);}
 assert.equal(f.pendingRetries(),4);
 await f.api.recordRetryAttempt('q5');await new Promise(r=>setTimeout(r,0));
 assert.equal(f.activityCalls(),1);assert.equal(f.wallet().coins,11);assert.equal(f.pendingRetries(),0);
});

test('typing defense easy, normal and hard have uncapped rewards, with duplicate retries paid only once',async()=>{
 const f=await rewards();
 for(const mode of ['easy','normal','hard']){
  for(let stage=1;stage<=5;stage++)for(let phase=1;phase<=5;phase++){
   if(mode==='easy'&&phase!==5)continue;
   const id='run1-'+mode+'-'+stage+'-'+phase;
   const result=await f.api.awardTypingDefenseClear(mode,stage,phase,id);
   assert.equal(result.awarded,true,id);
   assert.equal(result.amount,mode==='hard'?2:1);
   const retry=await f.api.awardTypingDefenseClear(mode,stage,phase,id);
   assert.equal(retry.awarded,false);
   assert.equal(retry.reason,'already-paid');
  }
 }
 assert.equal(f.wallet().coins,90,'5 easy + 25 normal + 50 hard coins');
 assert.equal(f.wallet().coinsEarnedToday,80);
 assert.equal((await f.api.awardTypingDefenseClear('easy',1,1,'invalid-phase')).reason,'invalid-clear');
 assert.equal((await f.api.awardTypingDefenseClear('normal',1,1,'run2-normal-1-1')).awarded,true,'replaying today earns another coin');
 assert.equal(f.wallet().coins,91);
});
test('typing defense stage activity has deterministic daily and per-mode receipts, with no wallet writes',async()=>{
 const f=await rewards({trackTypingDefense:true});
 const normal=await f.api.recordTypingDefenseStage('normal',2);
 const again=await f.api.recordTypingDefenseStage('normal',2);
 const hard=await f.api.recordTypingDefenseStage('hard',2);
 const easy=await f.api.recordTypingDefenseStage('easy',2);
 assert.equal(normal.recorded,true);
 assert.equal(again.duplicate,true);
 assert.equal(hard.recorded,true);
 assert.equal(easy.recorded,true);
 assert.equal(f.wallet().coins,10);
 assert.equal(f.defenseEvents().length,3,'replaying a cleared stage uses the local receipt cache');
 assert.equal(again.cached,true);
 const [n,h,e]=f.defenseEvents();
 assert.notEqual(n.batchId,h.batchId);
 assert.deepEqual(n.events.map(e=>e.appId),['pet-typing-defense-normal']);
 assert.deepEqual(h.events.map(e=>e.appId),['pet-typing-defense-hard']);
 assert.deepEqual(e.events.map(row=>row.appId),['pet-typing-defense-easy']);
 assert.equal((await f.api.recordTypingDefenseStage('hard',6)).reason,'invalid-stage');
});
