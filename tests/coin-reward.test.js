import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
async function rewards(){
 let wallet={coins:10,petName:'ふわ',petShop:{ownedItems:['crown']}},signedIn=true;
 const source=readFileSync(new URL('../coin-reward.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export .*;\r?\n/gm,'');
 const user={uid:'tester'};
 const context=vm.createContext({window:{},console,queueMicrotask,location:{pathname:'/',href:'https://home.test/'},document:{readyState:'loading',addEventListener(){}},
 initializeApp:()=>({}),getApps:()=>[{}],getApp:()=>({}),getAuth:()=>({currentUser:user}),getFirestore:()=>({}),doc:()=>({}),serverTimestamp:()=>0,
 onAuthStateChanged:(_,fn)=>queueMicrotask(()=>fn(user)),interviewAttemptPatch:()=>({attempted:true}),
 runTransaction:async(_,fn)=>fn({get:async()=>({exists:()=>true,data:()=>structuredClone(wallet)}),set:(_,patch)=>Object.assign(wallet,patch)})});
 vm.runInContext(source+'\n toast=()=>{};window.signOutForTest=()=>{currentUser=null;};',context);
 return {api:context.window.EnglishPlayroomCoins,wallet:()=>wallet,signOut:context.window.signOutForTest};
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
  assert.equal((await api[name](\`round-\${i}\`)).awarded,true);
  assert.equal((await api[name](\`round-\${i}\`)).awarded,false);
 }
 assert.equal(wallet().coins,34);
});
test('retry grants one coin for five distinct answered questions and retains the remainder',async()=>{
 const {api,wallet}=await rewards();
 for(let i=0;i<12;i++){const r=await api.recordRetryAttempt(\`q-\${i}\`);assert.equal(r.awarded,(i+1)%5===0);assert.equal((await api.recordRetryAttempt(\`q-\${i}\`)).counted,false);}
 assert.equal(wallet().coins,12);assert.equal(wallet().retryCoinProgress,2);
});
test('signed-out learners cannot earn coins',async()=>{
 const {api,wallet,signOut}=await rewards();await Promise.resolve();signOut();
 for(const name of ['awardListening','awardAteru','awardTalk','awardPre2Questions','awardPre2A'])assert.equal((await api[name]('1')).reason,'signed-out');
 assert.equal(wallet().coins,10);
});
