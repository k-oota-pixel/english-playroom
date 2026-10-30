import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../pet-strength.js',import.meta.url),'utf8');
function loader(){
 const start=source.indexOf('const titleCountCache='),end=source.indexOf('\nfunction generationOf');
 let calls=0,nextCount=12,fail=false;
 const context=vm.createContext({Map,Date,Number,Error,AbortSignal,titleCount:titles=>titles.filter(t=>t.unlocked).length,fetch:async()=>{
  calls++;await Promise.resolve();return {ok:!fail,json:async()=>({titles:[],unlockedTitleCount:nextCount})};
 }});
 vm.runInContext(source.slice(start,end).replace('export async function','async function')+';globalThis.load=loadStrengthTitles;',context);
 return {load:context.load,get calls(){return calls;},set count(n){nextCount=n;},set fail(value){fail=value;}};
}
const user={uid:'u',getIdToken:async()=>'token'};
const clean=count=>({unlockedTitleCount:count,titleCountSummaryVersion:1,titleCountRevision:4,titleCountSyncedRevision:4});
test('reopening strength with a current wallet count avoids all full title reads',async()=>{
 const h=loader();assert.equal(await h.load(user,{walletData:clean(9)}),9);
 assert.equal(await h.load(user,{walletData:clean(9)}),9);assert.equal(h.calls,0);
});
test('old counts are recomputed on first use, even when a recent in-memory count exists',async()=>{
 const h=loader();await h.load(user,{walletData:clean(9)});
 assert.equal(await h.load(user,{walletData:{unlockedTitleCount:0}}),12);assert.equal(h.calls,1);
});
test('an acquisition invalidates the recent cache and immediately exposes new points',async()=>{
 const h=loader();await h.load(user,{walletData:clean(9)});
 assert.equal(await h.load(user,{walletData:{...clean(9),titleCountRevision:5}}),12);assert.equal(h.calls,1);
});
test('simultaneous loads share a request and a failed load is retryable',async()=>{
 const h=loader(),dirty={...clean(9),titleCountRevision:5};
 const result=await Promise.all([h.load(user,{walletData:dirty}),h.load(user,{walletData:dirty})]);assert.deepEqual(result,[12,12]);assert.equal(h.calls,1);
 h.fail=true;await assert.rejects(()=>h.load(user,{walletData:dirty}),/称号/);
 h.fail=false;h.count=15;assert.equal(await h.load(user,{walletData:dirty}),15);assert.equal(h.calls,3);
});
